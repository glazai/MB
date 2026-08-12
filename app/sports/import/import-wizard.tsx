"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UploadCloud, ArrowRight, ArrowLeft, CheckCircle2, AlertTriangle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  parseSpreadsheet,
  guessColumnMapping,
  parseImportDate,
  parseImportNumber,
  TARGET_FIELDS,
  type TargetField,
  type ParsedSheet,
} from "@/lib/import-parser";
import { formatDate, formatSignedCurrency } from "@/lib/format";
import { importBets, type ImportRowPayload, type ImportResult } from "./actions";

type Entity = { id: string; name: string };
type Step = "upload" | "map" | "resolve" | "preview" | "result";

const FIELD_LABELS: Record<TargetField, string> = {
  eventDate: "Event date",
  bookmaker: "Bookmaker",
  betType: "Bet type",
  event: "Event / description",
  profit: "Profit (P/L)",
  notes: "Notes",
};

const REQUIRED_FIELDS: TargetField[] = ["eventDate", "bookmaker"];
const NONE = "__none__";
const PREVIEW_LIMIT = 50;

export function ImportWizard({
  people,
  bookmakers,
  betTypes,
}: {
  people: Entity[];
  bookmakers: Entity[];
  betTypes: Entity[];
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("upload");
  const [sheet, setSheet] = useState<ParsedSheet | null>(null);
  const [mapping, setMapping] = useState<Partial<Record<TargetField, string>>>({});
  const [personMode, setPersonMode] = useState<"fixed" | "column">("fixed");
  const [fixedPersonId, setFixedPersonId] = useState(people[0]?.id ?? "");
  const [personColumn, setPersonColumn] = useState("");
  const [bookmakerResolutions, setBookmakerResolutions] = useState<Record<string, string>>({});
  const [betTypeResolutions, setBetTypeResolutions] = useState<Record<string, string>>({});
  const [personResolutions, setPersonResolutions] = useState<Record<string, string>>({});
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const existingBookmakerNames = useMemo(() => new Set(bookmakers.map((b) => b.name.toLowerCase())), [bookmakers]);
  const existingBetTypeNames = useMemo(() => new Set(betTypes.map((b) => b.name.toLowerCase())), [betTypes]);
  const existingPeopleNames = useMemo(() => new Set(people.map((p) => p.name.toLowerCase())), [people]);

  function columnIndex(header: string) {
    return sheet ? sheet.headers.indexOf(header) : -1;
  }

  function distinctValues(header: string): string[] {
    if (!sheet) return [];
    const idx = columnIndex(header);
    if (idx === -1) return [];
    const values = new Set<string>();
    for (const row of sheet.rows) {
      const v = row[idx]?.trim();
      if (v) values.add(v);
    }
    return Array.from(values).sort();
  }

  async function handleFile(file: File) {
    setFileError(null);
    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseSpreadsheet(buffer);
      if (parsed.rows.length === 0) {
        setFileError("Couldn't find any data rows in that file.");
        return;
      }
      setSheet(parsed);
      setMapping(guessColumnMapping(parsed.headers));
      setStep("map");
    } catch {
      setFileError("Couldn't read that file. Make sure it's a valid CSV, XLS, or XLSX.");
    }
  }

  const mappingValid =
    REQUIRED_FIELDS.every((f) => Boolean(mapping[f])) &&
    (personMode === "fixed" ? Boolean(fixedPersonId) : Boolean(personColumn));

  function goToResolve() {
    const bookmakerValues = mapping.bookmaker ? distinctValues(mapping.bookmaker) : [];
    const betTypeValues = mapping.betType ? distinctValues(mapping.betType) : [];
    const personValues = personMode === "column" && personColumn ? distinctValues(personColumn) : [];

    const seed = (values: string[]) => Object.fromEntries(values.map((v) => [v, v]));
    setBookmakerResolutions(seed(bookmakerValues));
    setBetTypeResolutions(seed(betTypeValues));
    setPersonResolutions(seed(personValues));
    setStep("resolve");
  }

  type PreviewRow = {
    eventDate: Date | null;
    person: string;
    bookmaker: string;
    betType: string;
    event: string;
    profit: number | null;
    notes: string | null;
    error: string | null;
  };

  const previewRows: PreviewRow[] = useMemo(() => {
    if (!sheet) return [];
    const dateIdx = mapping.eventDate ? columnIndex(mapping.eventDate) : -1;
    const bookmakerIdx = mapping.bookmaker ? columnIndex(mapping.bookmaker) : -1;
    const betTypeIdx = mapping.betType ? columnIndex(mapping.betType) : -1;
    const eventIdx = mapping.event ? columnIndex(mapping.event) : -1;
    const profitIdx = mapping.profit ? columnIndex(mapping.profit) : -1;
    const notesIdx = mapping.notes ? columnIndex(mapping.notes) : -1;
    const personIdx = personMode === "column" && personColumn ? columnIndex(personColumn) : -1;
    const fixedPersonName = people.find((p) => p.id === fixedPersonId)?.name ?? "";

    return sheet.rows.map((row): PreviewRow => {
      const rawBookmaker = bookmakerIdx >= 0 ? row[bookmakerIdx] : "";
      const rawBetType = betTypeIdx >= 0 ? row[betTypeIdx] : "";
      const rawPerson = personIdx >= 0 ? row[personIdx] : "";

      const resolvedBookmaker = (bookmakerResolutions[rawBookmaker] ?? rawBookmaker).trim();
      const resolvedBetType = (rawBetType ? betTypeResolutions[rawBetType] ?? rawBetType : "Imported").trim();
      const resolvedPerson = (personMode === "fixed" ? fixedPersonName : personResolutions[rawPerson] ?? rawPerson).trim();

      const eventDate = dateIdx >= 0 ? parseImportDate(row[dateIdx]) : null;
      const profit = profitIdx >= 0 ? parseImportNumber(row[profitIdx]) : null;
      const event = (eventIdx >= 0 ? row[eventIdx] : "").trim();
      const notes = notesIdx >= 0 ? row[notesIdx]?.trim() || null : null;

      let error: string | null = null;
      if (!eventDate) error = "Couldn't parse date";
      else if (!resolvedBookmaker) error = "Missing bookmaker";
      else if (!resolvedPerson) error = "Missing person";

      return {
        eventDate,
        person: resolvedPerson,
        bookmaker: resolvedBookmaker,
        betType: resolvedBetType || "Imported",
        event: event || "Imported bet",
        profit,
        notes,
        error,
      };
    });
  }, [sheet, mapping, bookmakerResolutions, betTypeResolutions, personResolutions, personMode, personColumn, fixedPersonId, people]);

  const validRows = useMemo(() => previewRows.filter((r) => !r.error), [previewRows]);
  const errorRows = useMemo(() => previewRows.filter((r) => r.error), [previewRows]);

  const newBookmakers = useMemo(
    () => Array.from(new Set(validRows.map((r) => r.bookmaker))).filter((n) => !existingBookmakerNames.has(n.toLowerCase())),
    [validRows, existingBookmakerNames],
  );
  const newBetTypes = useMemo(
    () => Array.from(new Set(validRows.map((r) => r.betType))).filter((n) => !existingBetTypeNames.has(n.toLowerCase())),
    [validRows, existingBetTypeNames],
  );
  const newPeople = useMemo(
    () => Array.from(new Set(validRows.map((r) => r.person))).filter((n) => !existingPeopleNames.has(n.toLowerCase())),
    [validRows, existingPeopleNames],
  );

  async function handleImport() {
    setIsImporting(true);
    setImportError(null);
    try {
      const payload: ImportRowPayload[] = validRows.map((r) => ({
        eventDateISO: r.eventDate!.toISOString(),
        personName: r.person,
        bookmakerName: r.bookmaker,
        betTypeName: r.betType,
        event: r.event,
        profit: r.profit,
        notes: r.notes,
      }));
      const res = await importBets(payload);
      setResult(res);
      setStep("result");
      toast.success(`Imported ${res.created} bets`);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Something went wrong importing that file.");
    } finally {
      setIsImporting(false);
    }
  }

  function reset() {
    setStep("upload");
    setSheet(null);
    setMapping({});
    setResult(null);
    setImportError(null);
    setFileError(null);
  }

  // ---------- Upload ----------
  if (step === "upload") {
    return (
      <Card>
        <CardContent>
          <label className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed py-16 cursor-pointer hover:bg-muted/40 transition-colors">
            <UploadCloud className="size-8 text-muted-foreground" />
            <div className="text-center">
              <p className="font-medium">Click to choose a file</p>
              <p className="text-sm text-muted-foreground">CSV, XLS, or XLSX</p>
            </div>
            <input
              type="file"
              accept=".csv,.xls,.xlsx"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
          </label>
          {fileError && <p className="text-sm text-destructive mt-3">{fileError}</p>}
        </CardContent>
      </Card>
    );
  }

  // ---------- Map columns ----------
  if (step === "map" && sheet) {
    return (
      <Card>
        <CardContent className="space-y-5">
          <div>
            <Label className="mb-2">Which person is this file for?</Label>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  checked={personMode === "fixed"}
                  onChange={() => setPersonMode("fixed")}
                />
                All rows are for one person
                {personMode === "fixed" && (
                  <Select value={fixedPersonId} onValueChange={setFixedPersonId}>
                    <SelectTrigger className="w-40 ml-2">
                      <SelectValue placeholder="Choose person" />
                    </SelectTrigger>
                    <SelectContent>
                      {people.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  checked={personMode === "column"}
                  onChange={() => setPersonMode("column")}
                />
                Use a column from the file
                {personMode === "column" && (
                  <Select value={personColumn} onValueChange={setPersonColumn}>
                    <SelectTrigger className="w-48 ml-2">
                      <SelectValue placeholder="Choose column" />
                    </SelectTrigger>
                    <SelectContent>
                      {sheet.headers.map((h) => (
                        <SelectItem key={h} value={h}>
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {TARGET_FIELDS.map((field) => (
              <div key={field}>
                <Label className="mb-2">
                  {FIELD_LABELS[field]}
                  {REQUIRED_FIELDS.includes(field) && <span className="text-destructive">*</span>}
                </Label>
                <Select
                  value={mapping[field] ?? NONE}
                  onValueChange={(v) => setMapping((prev) => ({ ...prev, [field]: v === NONE ? undefined : v }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Not mapped" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Not mapped</SelectItem>
                    {sheet.headers.map((h) => (
                      <SelectItem key={h} value={h}>
                        {h}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>

          <p className="text-sm text-muted-foreground">
            Found {sheet.rows.length} rows. Bet type defaults to &quot;Imported&quot; and Profit defaults to Pending
            if left unmapped.
          </p>

          <div className="flex gap-2">
            <Button variant="outline" onClick={reset}>
              <ArrowLeft className="size-4" />
              Start over
            </Button>
            <Button onClick={goToResolve} disabled={!mappingValid}>
              Next
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ---------- Resolve categorical values ----------
  if (step === "resolve") {
    const sections: { title: string; values: string[]; resolutions: Record<string, string>; set: (v: Record<string, string>) => void; existing: Set<string> }[] = [
      { title: "Bookmaker", values: Object.keys(bookmakerResolutions), resolutions: bookmakerResolutions, set: setBookmakerResolutions, existing: existingBookmakerNames },
      { title: "Bet type", values: Object.keys(betTypeResolutions), resolutions: betTypeResolutions, set: setBetTypeResolutions, existing: existingBetTypeNames },
      { title: "Person", values: Object.keys(personResolutions), resolutions: personResolutions, set: setPersonResolutions, existing: existingPeopleNames },
    ].filter((s) => s.values.length > 0);

    return (
      <Card>
        <CardContent className="space-y-6">
          {sections.length === 0 && (
            <p className="text-sm text-muted-foreground">Nothing to resolve — moving straight to preview.</p>
          )}
          {sections.map((section) => (
            <div key={section.title}>
              <h3 className="font-medium mb-2">{section.title} values found in your file</h3>
              <div className="space-y-2">
                {section.values.map((raw) => {
                  const resolved = section.resolutions[raw] ?? raw;
                  const isKnown = section.existing.has(resolved.trim().toLowerCase());
                  return (
                    <div key={raw} className="flex items-center gap-3">
                      <span className="w-40 shrink-0 truncate text-sm text-muted-foreground" title={raw}>
                        {raw}
                      </span>
                      <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
                      <Input
                        value={resolved}
                        onChange={(e) => section.set({ ...section.resolutions, [raw]: e.target.value })}
                        className="max-w-56"
                      />
                      {isKnown ? (
                        <Badge variant="secondary">matches existing</Badge>
                      ) : (
                        <Badge variant="outline">will create</Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep("map")}>
              <ArrowLeft className="size-4" />
              Back
            </Button>
            <Button onClick={() => setStep("preview")}>
              Next
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ---------- Preview ----------
  if (step === "preview") {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent>
              <p className="text-sm text-muted-foreground">Ready to import</p>
              <p className="text-2xl font-semibold text-emerald-600">{validRows.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <p className="text-sm text-muted-foreground">Will be skipped</p>
              <p className="text-2xl font-semibold text-red-600">{errorRows.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <p className="text-sm text-muted-foreground">New entities</p>
              <p className="text-2xl font-semibold">{newPeople.length + newBookmakers.length + newBetTypes.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <p className="text-sm text-muted-foreground">Total rows</p>
              <p className="text-2xl font-semibold">{previewRows.length}</p>
            </CardContent>
          </Card>
        </div>

        {(newPeople.length > 0 || newBookmakers.length > 0 || newBetTypes.length > 0) && (
          <Card>
            <CardContent className="text-sm space-y-1">
              <p className="font-medium flex items-center gap-1.5 mb-1">
                <Sparkles className="size-4" />
                This will create:
              </p>
              {newPeople.length > 0 && <p>People: {newPeople.join(", ")}</p>}
              {newBookmakers.length > 0 && <p>Bookmakers: {newBookmakers.join(", ")}</p>}
              {newBetTypes.length > 0 && <p>Bet types: {newBetTypes.join(", ")}</p>}
            </CardContent>
          </Card>
        )}

        {errorRows.length > 0 && (
          <Card>
            <CardContent className="text-sm">
              <p className="font-medium flex items-center gap-1.5 mb-1 text-amber-600">
                <AlertTriangle className="size-4" />
                {errorRows.length} row{errorRows.length === 1 ? "" : "s"} will be skipped
              </p>
              <p className="text-muted-foreground">
                Usually an unparseable date or a missing bookmaker/person. Go back and check your mapping if this
                number looks too high.
              </p>
            </CardContent>
          </Card>
        )}

        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Person</TableHead>
                <TableHead>Bookmaker</TableHead>
                <TableHead>Bet Type</TableHead>
                <TableHead>Event</TableHead>
                <TableHead className="text-right">Profit</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {previewRows.slice(0, PREVIEW_LIMIT).map((row, i) => (
                <TableRow key={i}>
                  <TableCell>{row.eventDate ? formatDate(row.eventDate) : "—"}</TableCell>
                  <TableCell>{row.person || "—"}</TableCell>
                  <TableCell>{row.bookmaker || "—"}</TableCell>
                  <TableCell>{row.betType}</TableCell>
                  <TableCell className="max-w-52 truncate">{row.event}</TableCell>
                  <TableCell className="text-right">
                    {row.profit !== null ? formatSignedCurrency(row.profit) : "—"}
                  </TableCell>
                  <TableCell>
                    {row.error ? (
                      <Badge variant="destructive">{row.error}</Badge>
                    ) : (
                      <Badge variant="secondary">{row.profit !== null ? "Settled" : "Pending"}</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {previewRows.length > PREVIEW_LIMIT && (
            <p className="text-sm text-muted-foreground p-3">
              Showing first {PREVIEW_LIMIT} of {previewRows.length} rows.
            </p>
          )}
        </div>

        {importError && <p className="text-sm text-destructive">{importError}</p>}

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setStep("resolve")} disabled={isImporting}>
            <ArrowLeft className="size-4" />
            Back
          </Button>
          <Button onClick={handleImport} disabled={validRows.length === 0 || isImporting}>
            {isImporting ? "Importing…" : `Import ${validRows.length} bets`}
          </Button>
        </div>
      </div>
    );
  }

  // ---------- Result ----------
  if (step === "result" && result) {
    return (
      <Card>
        <CardContent className="text-center py-10 space-y-3">
          <CheckCircle2 className="size-10 text-emerald-600 mx-auto" />
          <p className="text-xl font-semibold">Imported {result.created} bets</p>
          <p className="text-sm text-muted-foreground">
            {result.newPeople.length > 0 && `${result.newPeople.length} new people. `}
            {result.newBookmakers.length > 0 && `${result.newBookmakers.length} new bookmakers. `}
            {result.newBetTypes.length > 0 && `${result.newBetTypes.length} new bet types.`}
          </p>
          <div className="flex gap-2 justify-center pt-2">
            <Button variant="outline" onClick={reset}>
              Import another file
            </Button>
            <Button onClick={() => router.push("/sports/history")}>View history</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}
