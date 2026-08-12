import { decimalToNumber } from "@/lib/format";
import type { Prisma } from "@/lib/generated/prisma/client";

export type BetWithRelations = Prisma.BetGetPayload<{
  include: { account: { include: { person: true; bookmaker: true } }; betType: true };
}>;

export function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-GB", {
    month: "short",
    year: "2-digit",
  });
}

export function dayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function dayLabel(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });
}

export function summarize(bets: BetWithRelations[]) {
  const byPerson = new Map<string, number>();
  const byBookmaker = new Map<string, number>();
  const byBetType = new Map<string, number>();
  const byMonth = new Map<string, number>();
  const byDay = new Map<string, number>();
  let totalNet = 0;

  const now = new Date();
  const thisMonthKey = monthKey(now);
  let thisMonthNet = 0;

  for (const bet of bets) {
    const net = (decimalToNumber(bet.bookmakerProfit) ?? 0) + (decimalToNumber(bet.exchangeProfit) ?? 0);
    totalNet += net;

    const personName = bet.account.person.name;
    byPerson.set(personName, (byPerson.get(personName) ?? 0) + net);

    const bookmakerName = bet.account.bookmaker.name;
    byBookmaker.set(bookmakerName, (byBookmaker.get(bookmakerName) ?? 0) + net);

    const betTypeName = bet.betType.name;
    byBetType.set(betTypeName, (byBetType.get(betTypeName) ?? 0) + net);

    const key = monthKey(bet.eventDate);
    byMonth.set(key, (byMonth.get(key) ?? 0) + net);
    if (key === thisMonthKey) thisMonthNet += net;

    const dKey = dayKey(bet.eventDate);
    byDay.set(dKey, (byDay.get(dKey) ?? 0) + net);
  }

  const monthKeys = Array.from(
    { length: 12 },
    (_, i) => monthKey(new Date(now.getFullYear(), now.getMonth() - (11 - i), 1)),
  );

  const dayKeys = Array.from(
    { length: 30 },
    (_, i) => dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - (29 - i))),
  );

  return {
    totalNet,
    thisMonthNet,
    count: bets.length,
    monthData: monthKeys.map((key) => ({ name: monthLabel(key), value: byMonth.get(key) ?? 0 })),
    dayData: dayKeys.map((key) => ({ name: dayLabel(key), value: byDay.get(key) ?? 0 })),
    personData: Array.from(byPerson.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value })),
    bookmakerData: Array.from(byBookmaker.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, value]) => ({ name, value })),
    betTypeData: Array.from(byBetType.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value })),
  };
}

export type CategorySummary = ReturnType<typeof summarize>;
