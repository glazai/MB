"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";

export type ImportRowPayload = {
  eventDateISO: string;
  personName: string;
  bookmakerName: string;
  betTypeName: string;
  event: string;
  profit: number | null;
  notes: string | null;
};

export type ImportResult = {
  created: number;
  newPeople: string[];
  newBookmakers: string[];
  newBetTypes: string[];
};

// Resolves a list of raw names to ids, batch-creating whatever doesn't
// already exist. Large imports (hundreds+ rows) previously created each
// missing name one at a time in a loop — with a serverless function time
// limit, a big file (1000+ rows, each needing several sequential DB
// round-trips) could exceed it and fail outright. Batching keeps the total
// query count small regardless of row count.
async function resolveNamesBatch(
  names: string[],
  findExisting: (names: string[]) => Promise<{ id: string; name: string }[]>,
  createMany: (names: string[]) => Promise<void>,
): Promise<{ map: Map<string, string>; created: string[] }> {
  const distinct = Array.from(new Set(names.map((n) => n.trim()).filter(Boolean)));
  const map = new Map<string, string>();
  if (distinct.length === 0) return { map, created: [] };

  const existing = await findExisting(distinct);
  const existingByLower = new Map(existing.map((e) => [e.name.toLowerCase(), e.id]));
  for (const [key, id] of existingByLower) map.set(key, id);

  // Dedupe case-insensitively so two differently-cased variants of the same
  // name (e.g. "Bet365" and "bet365") don't both get created.
  const missingByLower = new Map<string, string>();
  for (const name of distinct) {
    const key = name.toLowerCase();
    if (!existingByLower.has(key) && !missingByLower.has(key)) missingByLower.set(key, name);
  }
  const missing = Array.from(missingByLower.values());

  if (missing.length > 0) {
    await createMany(missing);
    const created = await findExisting(missing);
    for (const row of created) map.set(row.name.toLowerCase(), row.id);
  }

  return { map, created: missing };
}

export async function importBets(rows: ImportRowPayload[]): Promise<ImportResult> {
  const userId = await requireUserId();

  const people = await resolveNamesBatch(
    rows.map((r) => r.personName),
    (names) => prisma.person.findMany({ where: { userId, name: { in: names, mode: "insensitive" } }, select: { id: true, name: true } }),
    (names) => prisma.person.createMany({ data: names.map((name) => ({ userId, name })), skipDuplicates: true }).then(() => undefined),
  );

  const bookmakers = await resolveNamesBatch(
    rows.map((r) => r.bookmakerName),
    (names) => prisma.bookmaker.findMany({ where: { userId, name: { in: names, mode: "insensitive" } }, select: { id: true, name: true } }),
    (names) => prisma.bookmaker.createMany({ data: names.map((name) => ({ userId, name })), skipDuplicates: true }).then(() => undefined),
  );

  const betTypes = await resolveNamesBatch(
    rows.map((r) => r.betTypeName),
    (names) => prisma.betType.findMany({ where: { userId, name: { in: names, mode: "insensitive" } }, select: { id: true, name: true } }),
    (names) => prisma.betType.createMany({ data: names.map((name) => ({ userId, name })), skipDuplicates: true }).then(() => undefined),
  );

  const accountKeys = new Set<string>();
  for (const row of rows) {
    const personId = people.map.get(row.personName.trim().toLowerCase());
    const bookmakerId = bookmakers.map.get(row.bookmakerName.trim().toLowerCase());
    if (personId && bookmakerId) accountKeys.add(`${personId}:${bookmakerId}`);
  }

  const personIdsForAccountLookup = Array.from(new Set(Array.from(accountKeys).map((k) => k.split(":")[0])));
  const accountMap = new Map<string, string>();
  if (personIdsForAccountLookup.length > 0) {
    const existingAccounts = await prisma.account.findMany({
      where: { userId, personId: { in: personIdsForAccountLookup } },
      select: { id: true, personId: true, bookmakerId: true },
    });
    for (const acc of existingAccounts) accountMap.set(`${acc.personId}:${acc.bookmakerId}`, acc.id);
  }

  const newAccounts = Array.from(accountKeys)
    .filter((key) => !accountMap.has(key))
    .map((key) => {
      const [personId, bookmakerId] = key.split(":");
      const id = randomUUID();
      accountMap.set(key, id);
      return { id, userId, personId, bookmakerId };
    });
  if (newAccounts.length > 0) {
    await prisma.account.createMany({ data: newAccounts });
  }

  type BetRow = {
    id: string;
    accountId: string;
    betTypeId: string;
    event: string;
    eventDate: Date;
    profit: number | null;
    notes: string | null;
  };

  const betRows: BetRow[] = [];
  for (const row of rows) {
    const personId = people.map.get(row.personName.trim().toLowerCase());
    const bookmakerId = bookmakers.map.get(row.bookmakerName.trim().toLowerCase());
    const betTypeId = betTypes.map.get(row.betTypeName.trim().toLowerCase());
    if (!personId || !bookmakerId || !betTypeId) continue;

    const accountId = accountMap.get(`${personId}:${bookmakerId}`);
    if (!accountId) continue;

    const eventDate = new Date(row.eventDateISO);
    if (Number.isNaN(eventDate.getTime())) continue;

    betRows.push({
      id: randomUUID(),
      accountId,
      betTypeId,
      event: row.event,
      eventDate,
      profit: row.profit,
      notes: row.notes,
    });
  }

  if (betRows.length > 0) {
    await prisma.bet.createMany({
      data: betRows.map((b) => ({
        id: b.id,
        userId,
        accountId: b.accountId,
        betTypeId: b.betTypeId,
        event: b.event,
        eventDate: b.eventDate,
        bookmakerProfit: b.profit,
        status: b.profit !== null ? "SETTLED" : "PENDING",
        notes: b.notes,
        source: "MANUAL",
        // Backdate updatedAt to the event date so a bulk historical import
        // doesn't flood the Sports page's "settled today" view.
        updatedAt: b.eventDate,
      })),
    });

    const settlementTransactions = betRows
      .filter((b): b is BetRow & { profit: number } => b.profit !== null)
      .map((b) => ({
        id: randomUUID(),
        userId,
        accountId: b.accountId,
        betId: b.id,
        type: "BET_SETTLEMENT" as const,
        amount: b.profit,
        date: b.eventDate,
        notes: `Bet: ${b.event}`,
      }));

    if (settlementTransactions.length > 0) {
      await prisma.transaction.createMany({ data: settlementTransactions });
    }
  }

  revalidatePath("/sports");
  revalidatePath("/sports/history");
  revalidatePath("/dashboard");
  revalidatePath("/accounts");
  revalidatePath("/reports");

  return {
    created: betRows.length,
    newPeople: people.created,
    newBookmakers: bookmakers.created,
    newBetTypes: betTypes.created,
  };
}
