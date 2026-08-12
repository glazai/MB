import Link from "next/link";
import { CalendarRange, FileBarChart, Landmark, ShieldAlert, Wallet } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { getBalancesByAccountIds } from "@/lib/balance";
import { getExposureByAccountIds } from "@/lib/exposure";
import { summarizePersonPL, summarizeMonthlyPL, summarizeDailyPL } from "@/lib/reports";
import { parseDateParam } from "@/lib/month-filter";
import { formatCurrency, formatSignedCurrency } from "@/lib/format";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProfitBarChart } from "@/components/charts/profit-bar-chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ReportFilters } from "./filters";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const userId = await requireUserId();
  const personId = params.person;
  const from = parseDateParam(params.from);
  const toDateOnly = parseDateParam(params.to);
  const to = toDateOnly
    ? new Date(toDateOnly.getFullYear(), toDateOnly.getMonth(), toDateOnly.getDate(), 23, 59, 59, 999)
    : undefined;

  const dateWhere: { gte?: Date; lte?: Date } = {};
  if (from) dateWhere.gte = from;
  if (to) dateWhere.lte = to;
  const hasDateFilter = Boolean(from || to);

  const [people, accounts] = await Promise.all([
    prisma.person.findMany({ where: { userId }, orderBy: { name: "asc" } }),
    prisma.account.findMany({
      where: { userId, ...(personId ? { personId } : {}) },
      include: { person: true, bookmaker: true },
      orderBy: [{ person: { name: "asc" } }, { bookmaker: { name: "asc" } }],
    }),
  ]);

  const accountIds = accounts.map((account) => account.id);

  const [balances, exposures, bets, offers] = await Promise.all([
    getBalancesByAccountIds(userId, accountIds),
    getExposureByAccountIds(userId, accountIds),
    prisma.bet.findMany({
      where: {
        userId,
        status: "SETTLED",
        ...(personId ? { account: { personId } } : {}),
        ...(hasDateFilter ? { eventDate: dateWhere } : {}),
      },
      include: {
        account: { include: { person: true, bookmaker: true } },
        betType: true,
      },
    }),
    prisma.casinoOffer.findMany({
      where: {
        userId,
        status: { not: "IN_PROGRESS" },
        ...(personId ? { account: { personId } } : {}),
        ...(hasDateFilter ? { offerDate: dateWhere } : {}),
      },
      include: {
        account: { include: { person: true, bookmaker: true } },
        offerType: true,
      },
    }),
  ]);

  const totalBalance = Array.from(balances.values()).reduce((sum, value) => sum + value, 0);
  const totalExposure = Array.from(exposures.values()).reduce((sum, value) => sum + value, 0);

  const relevantPeople = personId ? people.filter((person) => person.id === personId) : people;
  const personPL = summarizePersonPL(bets, offers, relevantPeople).sort((a, b) => b.totalNet - a.totalNet);
  const monthlyPL = summarizeMonthlyPL(bets, offers);
  const dailyPL = summarizeDailyPL(bets, offers);
  const grandTotal = personPL.reduce((sum, row) => sum + row.totalNet, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-1 flex-wrap gap-3">
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <FileBarChart className="size-6" />
          Reports
        </h1>
        <Button asChild variant="outline" size="sm">
          <Link href="/reports/weekly">
            <CalendarRange className="size-4" />
            Weekly digest
          </Link>
        </Button>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Balances, exposure, and profit across every person — filter by person or date range.
      </p>

      <ReportFilters people={people} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard
          icon={Wallet}
          label={hasDateFilter || personId ? "Net profit (filtered)" : "Net profit (all time)"}
          value={formatSignedCurrency(grandTotal)}
          tone={grandTotal >= 0 ? "emerald" : "red"}
        />
        <StatCard
          icon={Landmark}
          label="Total balance"
          value={formatSignedCurrency(totalBalance)}
          tone={totalBalance >= 0 ? "emerald" : "red"}
        />
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
            <CardTitle>Profit by month</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfitBarChart data={monthlyPL} emptyMessage="No settled activity in this range." />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Profit by day</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfitBarChart data={dailyPL} emptyMessage="No settled activity in this range." />
          </CardContent>
        </Card>
      </div>

      <h2 className="text-lg font-semibold tracking-tight mb-4">Profit by person</h2>
      <div className="rounded-lg border bg-card mb-8">
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
            {personPL.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                  No people yet.
                </TableCell>
              </TableRow>
            )}
            {personPL.map((row) => (
              <TableRow key={row.personId}>
                <TableCell className="font-medium">{row.name}</TableCell>
                <TableCell className="text-right font-mono tabular-nums">{formatSignedCurrency(row.sportsNet)}</TableCell>
                <TableCell className="text-right font-mono tabular-nums">{formatSignedCurrency(row.casinoNet)}</TableCell>
                <TableCell
                  className={`text-right font-mono tabular-nums font-medium ${row.totalNet >= 0 ? "text-emerald-600" : "text-red-600"}`}
                >
                  {formatSignedCurrency(row.totalNet)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <h2 className="text-lg font-semibold tracking-tight mb-4">Balance sheet</h2>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Person</TableHead>
              <TableHead>Bookmaker</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead className="text-right">At risk</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                  No accounts yet.
                </TableCell>
              </TableRow>
            )}
            {accounts.map((account) => {
              const balance = balances.get(account.id) ?? 0;
              const exposure = exposures.get(account.id) ?? 0;
              return (
                <TableRow key={account.id}>
                  <TableCell className="font-medium">{account.person.name}</TableCell>
                  <TableCell>{account.bookmaker.name}</TableCell>
                  <TableCell>
                    {account.bookmaker.isExchange ? (
                      <Badge variant="secondary">Exchange</Badge>
                    ) : (
                      <Badge variant="outline">Bookmaker</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{account.status}</Badge>
                  </TableCell>
                  <TableCell
                    className={`text-right font-mono tabular-nums font-medium ${balance >= 0 ? "text-emerald-600" : "text-red-600"}`}
                  >
                    {formatSignedCurrency(balance)}
                  </TableCell>
                  <TableCell className={`text-right font-mono tabular-nums ${exposure > 0 ? "text-amber-600 font-medium" : "text-muted-foreground"}`}>
                    {exposure > 0 ? formatCurrency(exposure) : "—"}
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
