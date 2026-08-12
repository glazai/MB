export function parseMonthRange(value: string | undefined): { gte: Date; lt: Date } | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;

  return {
    gte: new Date(year, month - 1, 1),
    lt: new Date(year, month, 1),
  };
}

// A `new Date(garbage)` is still a Date object — and Date objects are always
// truthy — so `if (new Date(value))` never catches an invalid input. Only a
// value matching YYYY-MM-DD is accepted here.
export function parseDateParam(value: string | undefined): Date | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}
