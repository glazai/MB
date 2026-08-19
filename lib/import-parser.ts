import * as XLSX from "xlsx";

export type ParsedSheet = {
  headers: string[];
  rows: string[][];
};

export function parseSpreadsheet(buffer: ArrayBuffer): ParsedSheet {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const raw: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: false });

  const nonEmptyRows = raw.filter((row) => row.some((cell) => String(cell).trim() !== ""));
  if (nonEmptyRows.length === 0) return { headers: [], rows: [] };

  const [headerRow, ...dataRows] = nonEmptyRows;
  const headers = headerRow.map((cell) => String(cell).trim());
  const rows = dataRows.map((row) => headers.map((_, i) => String(row[i] ?? "").trim()));

  return { headers, rows };
}

// Target fields a spreadsheet column can be mapped to.
export const TARGET_FIELDS = ["eventDate", "bookmaker", "betType", "event", "profit", "notes"] as const;
export type TargetField = (typeof TARGET_FIELDS)[number];

const FIELD_HINTS: Record<TargetField, string[]> = {
  eventDate: ["eventtime", "event date", "eventdate", "date", "event time"],
  bookmaker: ["bookmaker", "book", "site", "source book"],
  betType: ["bettype", "bet type", "type", "offer"],
  event: ["event", "outcome", "description", "details", "selection"],
  profit: ["profit", "actualprofit", "net", "p/l", "pl"],
  notes: ["notes", "comment", "details"],
};

export function guessColumnMapping(headers: string[]): Partial<Record<TargetField, string>> {
  const mapping: Partial<Record<TargetField, string>> = {};
  const usedHeaders = new Set<string>();
  const normalized = headers.map((h) => ({ original: h, key: h.toLowerCase().replace(/[^a-z0-9]/g, "") }));

  // Walk hints in priority order (most specific first) rather than headers
  // in file order, so e.g. an exact "event" column wins over a same-list
  // synonym like "details" that happens to appear earlier in the file.
  for (const field of TARGET_FIELDS) {
    const hints = FIELD_HINTS[field].map((h) => h.replace(/[^a-z0-9]/g, ""));
    let found: string | undefined;
    for (const hint of hints) {
      const match = normalized.find((h) => h.key === hint && !usedHeaders.has(h.original));
      if (match) {
        found = match.original;
        break;
      }
    }
    if (found) {
      mapping[field] = found;
      usedHeaders.add(found);
    }
  }
  return mapping;
}

const MONTH_DAY_YEAR = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/;
const ISO_DATE = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s](\d{1,2}):(\d{2})(?::(\d{2}))?)?/;

// Handles native Date objects (from Excel cells), ISO strings, and the
// DD-MM-YYYY [HH:mm:ss] format common in UK matched-betting tracker exports.
// Ambiguous D/M vs M/D is resolved in favour of UK day-first, since this app
// is GBP/UK-only throughout.
export function parseImportDate(value: string | Date | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const iso = ISO_DATE.exec(trimmed);
  if (iso) {
    const [, y, m, d, h, min, s] = iso;
    return buildDate(Number(y), Number(m), Number(d), Number(h ?? 0), Number(min ?? 0), Number(s ?? 0));
  }

  const dmy = MONTH_DAY_YEAR.exec(trimmed);
  if (dmy) {
    const [, day, month, year, h, min, s] = dmy;
    return buildDate(Number(year), Number(month), Number(day), Number(h ?? 0), Number(min ?? 0), Number(s ?? 0));
  }

  const fallback = new Date(trimmed);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

// new Date(y, m, d, h, min, s) silently rolls invalid components over into
// the next unit (e.g. seconds: 79 becomes +1 minute, 19 seconds) instead of
// rejecting them — some exports (seen from OddsMonkey) contain out-of-range
// seconds. Treat those as unparseable rather than silently shifting the
// date/time.
function buildDate(year: number, month: number, day: number, h: number, min: number, s: number): Date | null {
  if (month < 1 || month > 12 || day < 1 || day > 31 || h > 23 || min > 59 || s > 59) return null;
  const date = new Date(year, month - 1, day, h, min, s);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parseImportNumber(value: string | undefined): number | null {
  if (value === undefined) return null;
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const cleaned = trimmed.replace(/[£,]/g, "");
  const num = Number(cleaned);
  return Number.isNaN(num) ? null : num;
}
