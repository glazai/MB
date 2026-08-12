import Link from "next/link";
import { Plus, Receipt, CalendarDays, CheckCircle2, History, ShieldAlert, Upload, Wallet, Trophy } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import type { Prisma } from "@/lib/generated/prisma/client";
import { decimalToNumber, formatCurrency, formatDate, formatSignedCurrency } from "@/lib/format";
import { summarize } from "@/lib/bet-summary";
import { getTotalExposure } from "@/lib/exposure";
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
import { BetFilters } from "@/app/bets/filters";
import { DeleteBetButton } from "@/app/bets/delete-bet-button";
import { SettleBetButton } from "@/app/bets/settle-bet-button";
import { StatusBadge, betStatusTone } from "@/components/status-badge";

export default async function SportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const userId = await requireUserId();
  const where: Prisma.BetWhereInput = { userId };

  const accountWhere: { personId?: string; bookmakerId?: string } = {};
  if (params.person) accountWhere.personId = params.person;
  if (params.bookmaker) accountWhere.bookmakerId = params.bookmaker;
  if (Object.keys(accountWhere).length > 0) where.account = accountWhere;

  if (params.betType) where.betTypeId = params.betType;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  where.OR = [{ status: "PENDING" }, { status: "SETTLED", updatedAt: { gte: startOfToday, lte: endOfToday } }];

  const [bets, people, bookmakers, betTypes, settledBets, totalExposure] = await Promise.all([
    prisma.bet.findMany({
      where,
      include: {
        account: { include: { person: true, bookmaker: true } },
        betType: true,
      },
      orderBy: { eventDate: "desc" },
      take: 200,
    }),
    prisma.person.findMany({ where: { userId }, orderBy: { name: "asc" } }),
    prisma.bookmaker.findMany({
      where: { userId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.betType.findMany({ where: { userId }, orderBy: { name: "asc" } }),
    prisma.bet.findMany({
      where: { userId, status: "SETTLED" },
      include: {
        account: { include: { person: true, bookmaker: true } },
        betType: true,
      },
    }),
    getTotalExposure(userId),
  ]);

  const summary = summarize(settledBets);
  const hasFilters = Object.keys(params).length > 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Trophy className="size-6" />
          Sports
        </h1>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/sports/import">
              <Upload className="size-4" />
              Import
            </Link>
          </Button>
          <Button asChild>
            <Link href="/bets/new">
              <Plus className="size-4" />
              Add Bet
            </Link>
          </Button>
        </div>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Every sports bet across every person and account.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={Wallet}
          label="Total profit"
          value={formatSignedCurrency(summary.totalNet)}
          tone={summary.totalNet >= 0 ? "emerald" : "red"}
        />
        <StatCard
          icon={CalendarDays}
          label="This month"
          value={formatSignedCurrency(summary.thisMonthNet)}
          tone={summary.thisMonthNet >= 0 ? "emerald" : "red"}
        />
        <StatCard icon={CheckCircle2} label="Settled bets" value={String(summary.count)} />
        <StatCard
          icon={ShieldAlert}
          label="Exposure"
          value={formatCurrency(totalExposure)}
          tone={totalExposure > 0 ? "amber" : undefined}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Profit by person</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfitBarChart data={summary.personData} emptyMessage="No bets yet." />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Profit by month</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfitBarChart data={summary.monthData} emptyMessage="No bets yet." />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Profit by day (last 30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfitBarChart data={summary.dayData} emptyMessage="No bets yet." />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Profit by bookmaker</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfitBarChart data={summary.bookmakerData} emptyMessage="No bets yet." />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Profit by bet type</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfitBarChart data={summary.betTypeData} emptyMessage="No bets yet." />
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Today&apos;s activity</h2>
          <p className="text-sm text-muted-foreground">Pending bets, plus anything settled today.</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/sports/history">
            <History className="size-4" />
            Full history
          </Link>
        </Button>
      </div>

      <BetFilters people={people} bookmakers={bookmakers} betTypes={betTypes} showStatus={false} />

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Person</TableHead>
              <TableHead>Bookmaker</TableHead>
              <TableHead>Bet Type</TableHead>
              <TableHead>Event</TableHead>
              <TableHead className="text-right">Net</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bets.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-12">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <Receipt className="size-5" />
                    </span>
                    <p className="font-medium">
                      {hasFilters ? "No bets match these filters" : "Nothing pending, nothing settled today"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {hasFilters
                        ? "Try clearing a filter to see more."
                        : "You're all caught up — past bets live in the full history."}
                    </p>
                    {!hasFilters && (
                      <div className="flex gap-2 mt-2">
                        <Button asChild size="sm">
                          <Link href="/bets/new">
                            <Plus className="size-4" />
                            Add Bet
                          </Link>
                        </Button>
                        <Button asChild size="sm" variant="outline">
                          <Link href="/sports/history">
                            <History className="size-4" />
                            Full history
                          </Link>
                        </Button>
                      </div>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )}
            {bets.map((bet) => {
              const bookmakerProfit = decimalToNumber(bet.bookmakerProfit);
              const exchangeProfit = decimalToNumber(bet.exchangeProfit) ?? 0;
              const net = bet.status === "SETTLED" && bookmakerProfit !== null ? bookmakerProfit + exchangeProfit : null;
              return (
                <TableRow key={bet.id}>
                  <TableCell>{formatDate(bet.eventDate)}</TableCell>
                  <TableCell>{bet.account.person.name}</TableCell>
                  <TableCell>{bet.account.bookmaker.name}</TableCell>
                  <TableCell>{bet.betType.name}</TableCell>
                  <TableCell className="max-w-52 truncate">{bet.event}</TableCell>
                  <TableCell className="text-right">
                    {net !== null ? (
                      <span className={`font-mono tabular-nums font-medium ${net >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {formatSignedCurrency(net)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge label={bet.status} tone={betStatusTone(bet.status)} />
                  </TableCell>
                  <TableCell className="text-right space-x-2 whitespace-nowrap">
                    {bet.status === "PENDING" && (
                      <SettleBetButton id={bet.id} event={bet.event} hasExchange={Boolean(bet.exchangeAccountId)} />
                    )}
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/bets/${bet.id}/edit`}>Edit</Link>
                    </Button>
                    <DeleteBetButton id={bet.id} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
