import { decimalToNumber } from "@/lib/format";
import { monthKey, monthLabel, dayKey, dayLabel } from "@/lib/bet-summary";
import type { BetWithRelations } from "@/lib/bet-summary";
import type { CasinoOfferWithRelations } from "@/lib/casino-summary";

export type PersonPL = {
  personId: string;
  name: string;
  sportsNet: number;
  casinoNet: number;
  totalNet: number;
};

export function summarizePersonPL(
  bets: BetWithRelations[],
  offers: CasinoOfferWithRelations[],
  people: { id: string; name: string }[],
): PersonPL[] {
  const byPerson = new Map<string, { sportsNet: number; casinoNet: number }>();
  for (const person of people) byPerson.set(person.id, { sportsNet: 0, casinoNet: 0 });

  for (const bet of bets) {
    const net = (decimalToNumber(bet.bookmakerProfit) ?? 0) + (decimalToNumber(bet.exchangeProfit) ?? 0);
    const entry = byPerson.get(bet.account.personId);
    if (entry) entry.sportsNet += net;
  }

  for (const offer of offers) {
    const value = decimalToNumber(offer.profit) ?? 0;
    const entry = byPerson.get(offer.account.personId);
    if (entry) entry.casinoNet += value;
  }

  return people.map((person) => {
    const entry = byPerson.get(person.id) ?? { sportsNet: 0, casinoNet: 0 };
    return {
      personId: person.id,
      name: person.name,
      sportsNet: entry.sportsNet,
      casinoNet: entry.casinoNet,
      totalNet: entry.sportsNet + entry.casinoNet,
    };
  });
}

export function summarizeMonthlyPL(bets: BetWithRelations[], offers: CasinoOfferWithRelations[]) {
  const byMonth = new Map<string, number>();

  for (const bet of bets) {
    const net = (decimalToNumber(bet.bookmakerProfit) ?? 0) + (decimalToNumber(bet.exchangeProfit) ?? 0);
    const key = monthKey(bet.eventDate);
    byMonth.set(key, (byMonth.get(key) ?? 0) + net);
  }
  for (const offer of offers) {
    const value = decimalToNumber(offer.profit) ?? 0;
    const key = monthKey(offer.offerDate);
    byMonth.set(key, (byMonth.get(key) ?? 0) + value);
  }

  const keys = Array.from(byMonth.keys()).sort();
  return keys.map((key) => ({ name: monthLabel(key), value: byMonth.get(key) ?? 0 }));
}

export function summarizeDailyPL(bets: BetWithRelations[], offers: CasinoOfferWithRelations[]) {
  const byDay = new Map<string, number>();

  for (const bet of bets) {
    const net = (decimalToNumber(bet.bookmakerProfit) ?? 0) + (decimalToNumber(bet.exchangeProfit) ?? 0);
    const key = dayKey(bet.eventDate);
    byDay.set(key, (byDay.get(key) ?? 0) + net);
  }
  for (const offer of offers) {
    const value = decimalToNumber(offer.profit) ?? 0;
    const key = dayKey(offer.offerDate);
    byDay.set(key, (byDay.get(key) ?? 0) + value);
  }

  const keys = Array.from(byDay.keys()).sort();
  return keys.map((key) => ({ name: dayLabel(key), value: byDay.get(key) ?? 0 }));
}
