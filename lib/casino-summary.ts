import { decimalToNumber } from "@/lib/format";
import { monthKey, monthLabel, dayKey, dayLabel } from "@/lib/bet-summary";
import type { Prisma } from "@/lib/generated/prisma/client";

export type CasinoOfferWithRelations = Prisma.CasinoOfferGetPayload<{
  include: { account: { include: { person: true; bookmaker: true } }; offerType: true };
}>;

export function summarizeOffers(offers: CasinoOfferWithRelations[]) {
  const byPerson = new Map<string, number>();
  const byBookmaker = new Map<string, number>();
  const byOfferType = new Map<string, number>();
  const byMonth = new Map<string, number>();
  const byDay = new Map<string, number>();
  let totalNet = 0;

  const now = new Date();
  const thisMonthKey = monthKey(now);
  let thisMonthNet = 0;

  for (const offer of offers) {
    const value = decimalToNumber(offer.profit) ?? 0;
    totalNet += value;

    const personName = offer.account.person.name;
    byPerson.set(personName, (byPerson.get(personName) ?? 0) + value);

    const bookmakerName = offer.account.bookmaker.name;
    byBookmaker.set(bookmakerName, (byBookmaker.get(bookmakerName) ?? 0) + value);

    const offerTypeName = offer.offerType.name;
    byOfferType.set(offerTypeName, (byOfferType.get(offerTypeName) ?? 0) + value);

    const key = monthKey(offer.offerDate);
    byMonth.set(key, (byMonth.get(key) ?? 0) + value);
    if (key === thisMonthKey) thisMonthNet += value;

    const dKey = dayKey(offer.offerDate);
    byDay.set(dKey, (byDay.get(dKey) ?? 0) + value);
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
    count: offers.length,
    monthData: monthKeys.map((key) => ({ name: monthLabel(key), value: byMonth.get(key) ?? 0 })),
    dayData: dayKeys.map((key) => ({ name: dayLabel(key), value: byDay.get(key) ?? 0 })),
    personData: Array.from(byPerson.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value })),
    bookmakerData: Array.from(byBookmaker.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, value]) => ({ name, value })),
    offerTypeData: Array.from(byOfferType.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value })),
  };
}
