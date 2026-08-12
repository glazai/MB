"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { syncBetTransactions } from "@/lib/bet-settlement";

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

async function resolveNames(
  names: string[],
  findExisting: (names: string[]) => Promise<{ id: string; name: string }[]>,
  createOne: (name: string) => Promise<{ id: string }>,
): Promise<{ map: Map<string, string>; created: string[] }> {
  const distinct = Array.from(new Set(names.map((n) => n.trim()).filter(Boolean)));
  const map = new Map<string, string>();
  const created: string[] = [];
  if (distinct.length === 0) return { map, created };

  const existing = await findExisting(distinct);
  const existingByLower = new Map(existing.map((e) => [e.name.toLowerCase(), e.id]));

  for (const name of distinct) {
    const key = name.toLowerCase();
    const existingId = existingByLower.get(key);
    if (existingId) {
      map.set(key, existingId);
    } else {
      const row = await createOne(name);
      map.set(key, row.id);
      created.push(name);
    }
  }

  return { map, created };
}

export async function importBets(rows: ImportRowPayload[]): Promise<ImportResult> {
  const userId = await requireUserId();

  const people = await resolveNames(
    rows.map((r) => r.personName),
    (names) => prisma.person.findMany({ where: { userId, name: { in: names, mode: "insensitive" } }, select: { id: true, name: true } }),
    (name) => prisma.person.create({ data: { userId, name }, select: { id: true } }),
  );

  const bookmakers = await resolveNames(
    rows.map((r) => r.bookmakerName),
    (names) => prisma.bookmaker.findMany({ where: { userId, name: { in: names, mode: "insensitive" } }, select: { id: true, name: true } }),
    (name) => prisma.bookmaker.create({ data: { userId, name }, select: { id: true } }),
  );

  const betTypes = await resolveNames(
    rows.map((r) => r.betTypeName),
    (names) => prisma.betType.findMany({ where: { userId, name: { in: names, mode: "insensitive" } }, select: { id: true, name: true } }),
    (name) => prisma.betType.create({ data: { userId, name }, select: { id: true } }),
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

  for (const key of accountKeys) {
    if (accountMap.has(key)) continue;
    const [personId, bookmakerId] = key.split(":");
    const createdAccount = await prisma.account.create({ data: { userId, personId, bookmakerId }, select: { id: true } });
    accountMap.set(key, createdAccount.id);
  }

  let createdCount = 0;
  for (const row of rows) {
    const personId = people.map.get(row.personName.trim().toLowerCase());
    const bookmakerId = bookmakers.map.get(row.bookmakerName.trim().toLowerCase());
    const betTypeId = betTypes.map.get(row.betTypeName.trim().toLowerCase());
    if (!personId || !bookmakerId || !betTypeId) continue;

    const accountId = accountMap.get(`${personId}:${bookmakerId}`);
    if (!accountId) continue;

    const eventDate = new Date(row.eventDateISO);
    if (Number.isNaN(eventDate.getTime())) continue;

    const bet = await prisma.bet.create({
      data: {
        userId,
        accountId,
        betTypeId,
        event: row.event,
        eventDate,
        bookmakerProfit: row.profit,
        status: row.profit !== null ? "SETTLED" : "PENDING",
        notes: row.notes,
        source: "MANUAL",
        // Backdate updatedAt to the event date so a bulk historical import
        // doesn't flood the Sports page's "settled today" view.
        updatedAt: eventDate,
      },
    });
    await syncBetTransactions(userId, bet.id);
    createdCount += 1;
  }

  revalidatePath("/sports");
  revalidatePath("/sports/history");
  revalidatePath("/dashboard");
  revalidatePath("/accounts");
  revalidatePath("/reports");

  return {
    created: createdCount,
    newPeople: people.created,
    newBookmakers: bookmakers.created,
    newBetTypes: betTypes.created,
  };
}
