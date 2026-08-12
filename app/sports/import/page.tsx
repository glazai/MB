import Link from "next/link";
import { ArrowLeft, Upload } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { ImportWizard } from "./import-wizard";

export default async function ImportBetsPage() {
  const userId = await requireUserId();
  const [people, bookmakers, betTypes] = await Promise.all([
    prisma.person.findMany({ where: { userId }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.bookmaker.findMany({ where: { userId }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.betType.findMany({ where: { userId }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <Link
        href="/sports"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="size-4" />
        Sports
      </Link>

      <h1 className="text-2xl font-semibold tracking-tight mb-1 flex items-center gap-2">
        <Upload className="size-6" />
        Import Bets
      </h1>
      <p className="text-sm text-muted-foreground mb-6">
        Bring in bet history from a CSV, XLS, or XLSX export — any column layout, we'll map it.
      </p>

      <ImportWizard people={people} bookmakers={bookmakers} betTypes={betTypes} />
    </div>
  );
}
