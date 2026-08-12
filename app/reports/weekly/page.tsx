import Link from "next/link";
import {
  ArrowLeft,
  CalendarRange,
  CheckCircle2,
  Dices,
  Landmark,
  ShieldAlert,
  Trophy,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { summarize } from "@/lib/bet-summary";
import { summarizeOffers } from "@/lib/casino-summary";
import { summarizePersonPL } from "@/lib/reports";
import { getWeekStart, summarizeWeekDays, bestAndWorst } from "@/lib/weekly-digest";
import { getTotalExposure } from "@/lib/exposure";
import { formatCurrency, formatDate, formatSignedCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/stat-card";
import { ProfitBarChart } from "@/components/charts/profit-bar-chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function WeeklyDigestPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const userId = await requireUserId();
  const requestedStart = params.start ? new Date(params.start) : new Date();
  const anchor = Number.isNaN(requestedStart.getTime()) ? new Date() : requestedStart;
  const weekStart = getWeekStart(anchor);
  const weekEndExclusive = new Date(weekStart);
  weekEndExclusive.setDate(weekEndExclusive.getDate() + 7);
  const weekEndDisplay = new Date(weekStart);
  weekEndDisplay.setDate(weekEndDisplay.getDate() + 6);

  const prevWeekStart = new Date(weekStart);
  prevWeekStart.setDate(prevWeekStart.getDate() - 7);
  const nextWeekStart = new Date(weekStart);
  nextWeekStart.setDate(nextWeekStart.getDate() + 7);

  const isCurrentWeek = getWeekStart(new Date()).getTime() === weekStart.getTime();

  const betInclude = { account: { include: { person: true, bookmaker: true } }, betType: true } as const;
  const offerInclude = { account: { include: { person: true, bookmaker: true } }, offerType: true } as const;

  const [bets, offers, prevBets, prevOffers, people, totalExposure] = await Promise.all([
    prisma.bet.findMany({
      where: { userId, status: "SETTLED", eventDate: { gte: weekStart, lt: weekEndExclusive } },
      include: betInclude,
    }),
    prisma.casinoOffer.findMany({
      where: { userId, status: { not: "IN_PROGRESS" }, offerDate: { gte: weekStart, lt: weekEndExclusive } },
      include: offerInclude,
    }),
    prisma.bet.findMany({
      where: { userId, status: "SETTLED", eventDate: { gte: prevWeekStart, lt: weekStart } },
      include: betInclude,
    }),
    prisma.casinoOffer.findMany({
      where: { userId, status: { not: "IN_PROGRESS" }, offerDate: { gte: prevWeekStart, lt: weekStart } },
      include: offerInclude,
    }),
    prisma.person.findMany({ where: { userId }, orderBy: { name: "asc" } }),
    getTotalExposure(userId),
  ]);

  const sports = summarize(bets);
  const casino = summarizeOffers(offers);
  const totalNet = sports.totalNet + casino.totalNet;

  const prevTotalNet = summarize(prevBets).totalNet + summarizeOffers(prevOffers).totalNet;
  const delta = totalNet - prevTotalNet;

  const personPL = summarizePersonPL(bets, offers, people).sort((a, b) => b.totalNet - a.totalNet);
  const weekDays = summarizeWeekDays(bets, offers, weekStart);
  const { best, worst } = bestAndWorst(bets, offers);

  const bookmakersUsed = new Set([
    ...bets.map((b) => b.account.bookmaker.name),
    ...offers.map((o) => o.account.bookmaker.name),
  ]);

  return (
    <div>
      <Link
        href="/reports"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="size-4" />
        Reports
      </Link>

      <div className="flex items-center justify-between mb-1 flex-wrap gap-3">
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <CalendarRange className="size-6" />
          Weekly Digest
        </h1>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/reports/weekly?start=${prevWeekStart.toISOString().slice(0, 10)}`}>
              <ArrowLeft className="size-4" />
              Previous week
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`/reports/weekly?start=${nextWeekStart.toISOString().slice(0, 10)}`}>
              Next week
            </Link>
          </Button>
        </div>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        {formatDate(weekStart)} – {formatDate(weekEndDisplay)}
        {isCurrentWeek ? " · this week so far" : ""}
      </p>

      <Card className="mb-8">
        <CardContent className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
              Net profit this week
            </p>
            <p
              className={`font-mono tabular-nums text-4xl font-semibold ${
                totalNet >= 0 ? "text-emerald-600" : "text-red-600"
              }`}
            >
              {formatSignedCurrency(totalNet)}
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm font-mono tabular-nums">
            {delta >= 0 ? (
              <TrendingUp className="size-4 text-emerald-600" />
            ) : (
              <TrendingDown className="size-4 text-red-600" />
            )}
            <span className={delta >= 0 ? "text-emerald-600" : "text-red-600"}>{formatSignedCurrency(delta)}</span>
            <span className="text-muted-foreground font-sans">
              vs last week ({formatSignedCurrency(prevTotalNet)})
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Trophy} label="Bets settled" value={String(sports.count)} />
        <StatCard icon={Dices} label="Casino offers" value={String(casino.count)} />
        <StatCard icon={Landmark} label="Bookmakers used" value={String(bookmakersUsed.size)} />
        <StatCard
          icon={ShieldAlert}
          label="Exposure now"
          value={formatCurrency(totalExposure)}
          tone={totalExposure > 0 ? "amber" : undefined}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Day by day</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfitBarChart data={weekDays} emptyMessage="No activity this week." />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Highlights</CardTitle>
          </CardHeader>
          <CardContent>
            {best && worst ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="size-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-sm text-muted-foreground">Best result</p>
                    <p className="font-medium truncate">{best.label}</p>
                    <p className="font-mono tabular-nums text-emerald-600 font-medium">
                      {formatSignedCurrency(best.value)}
                    </p>
                  </div>
                </div>
                {worst.label !== best.label && (
                  <div className="flex items-start gap-3">
                    <TrendingDown className="size-5 text-red-600 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-sm text-muted-foreground">Worst result</p>
                      <p className="font-medium truncate">{worst.label}</p>
                      <p className="font-mono tabular-nums text-red-600 font-medium">
                        {formatSignedCurrency(worst.value)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4">Nothing settled this week yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <h2 className="text-lg font-semibold tracking-tight mb-4">By person</h2>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Person</TableHead>
              <TableHead className="text-right">Sports</TableHead>
              <TableHead className="text-right">Casino</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {personPL.map((row) => (
              <TableRow key={row.personId}>
                <TableCell className="font-medium">{row.name}</TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {formatSignedCurrency(row.sportsNet)}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {formatSignedCurrency(row.casinoNet)}
                </TableCell>
                <TableCell
                  className={`text-right font-mono tabular-nums font-medium ${
                    row.totalNet >= 0 ? "text-emerald-600" : "text-red-600"
                  }`}
                >
                  {formatSignedCurrency(row.totalNet)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
