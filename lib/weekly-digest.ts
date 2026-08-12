import { decimalToNumber } from "@/lib/format";
import { dayKey, dayLabel, type BetWithRelations } from "@/lib/bet-summary";
import type { CasinoOfferWithRelations } from "@/lib/casino-summary";

// Monday-start week, matching UK convention (this app is GBP/UK-only throughout).
export function getWeekStart(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export function summarizeWeekDays(bets: BetWithRelations[], offers: CasinoOfferWithRelations[], weekStart: Date) {
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

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    const key = dayKey(d);
    return { name: dayLabel(key), value: byDay.get(key) ?? 0 };
  });
}

export type DigestHighlight = { label: string; value: number };

export function bestAndWorst(
  bets: BetWithRelations[],
  offers: CasinoOfferWithRelations[],
): { best: DigestHighlight | null; worst: DigestHighlight | null } {
  const items: DigestHighlight[] = [
    ...bets.map((b) => ({
      label: b.event,
      value: (decimalToNumber(b.bookmakerProfit) ?? 0) + (decimalToNumber(b.exchangeProfit) ?? 0),
    })),
    ...offers.map((o) => ({ label: o.title, value: decimalToNumber(o.profit) ?? 0 })),
  ];

  if (items.length === 0) return { best: null, worst: null };

  const best = items.reduce((a, b) => (b.value > a.value ? b : a));
  const worst = items.reduce((a, b) => (b.value < a.value ? b : a));
  return { best, worst };
}
