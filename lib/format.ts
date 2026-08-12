import type { Prisma } from "@/lib/generated/prisma/client";

export function decimalToNumber(value: Prisma.Decimal | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  return Number(value);
}

const currencyFormatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
});

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return currencyFormatter.format(value);
}

export function formatSignedCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const formatted = currencyFormatter.format(Math.abs(value));
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `-${formatted}`;
  return formatted;
}

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function formatDate(value: Date | string): string {
  return dateFormatter.format(new Date(value));
}
