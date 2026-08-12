import Link from "next/link";
import { ArrowRight, CalendarDays, CheckCircle2, Dices, Landmark, ShieldAlert, Trophy, Wallet } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { summarize } from "@/lib/bet-summary";
import { summarizeOffers } from "@/lib/casino-summary";
import { getBalancesByAccountIds } from "@/lib/balance";
import { getTotalExposure } from "@/lib/exposure";
import { formatCurrency, formatSignedCurrency } from "@/lib/format";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/stat-card";
import { ProfitBarChart } from "@/components/charts/profit-bar-chart";

export default async function DashboardPage() {
  const userId = await requireUserId();
  const [bets, offers, accounts] = await Promise.all([
    prisma.bet.findMany({
      where: { userId, status: "SETTLED" },
      include: {
        account: { include: { person: true, bookmaker: true } },
        betType: true,
      },
    }),
    prisma.casinoOffer.findMany({
      where: { userId, status: { not: "IN_PROGRESS" } },
      include: {
        account: { include: { person: true, bookmaker: true } },
        offerType: true,
      },
    }),
    prisma.account.findMany({ where: { userId }, select: { id: true } }),
  ]);

  const [balances, totalExposure] = await Promise.all([
    getBalancesByAccountIds(userId, accounts.map((account) => account.id)),
    getTotalExposure(userId),
  ]);
  const totalBalance = Array.from(balances.values()).reduce((sum, value) => sum + value, 0);

  const sports = summarize(bets);
  const casino = summarizeOffers(offers);

  const totalNet = sports.totalNet + casino.totalNet;
  const thisMonthNet = sports.thisMonthNet + casino.thisMonthNet;
  const totalEntries = sports.count + casino.count;
  const combinedMonthData = sports.monthData.map((entry, i) => ({
    name: entry.name,
    value: entry.value + casino.monthData[i].value,
  }));
  const combinedDayData = sports.dayData.map((entry, i) => ({
    name: entry.name,
    value: entry.value + casino.dayData[i].value,
  }));

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight mb-1">Dashboard</h1>
      <p className="text-sm text-muted-foreground mb-6">
        A quick look across everything — head to Sports or Casino for the full breakdown.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <StatCard
          icon={Wallet}
          label="Total profit"
          value={formatSignedCurrency(totalNet)}
          tone={totalNet >= 0 ? "emerald" : "red"}
        />
        <StatCard
          icon={CalendarDays}
          label="This month"
          value={formatSignedCurrency(thisMonthNet)}
          tone={thisMonthNet >= 0 ? "emerald" : "red"}
        />
        <StatCard icon={CheckCircle2} label="Total entries" value={String(totalEntries)} />
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardContent className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Trophy className="size-5" />
              </span>
              <div>
                <p className="text-sm text-muted-foreground">Sports profit</p>
                <p
                  className={`font-mono tabular-nums text-2xl font-semibold ${
                    sports.totalNet >= 0 ? "text-emerald-600" : "text-red-600"
                  }`}
                >
                  {formatSignedCurrency(sports.totalNet)}
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">{sports.count} settled bets</p>
              </div>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/sports">
                View Sports
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Dices className="size-5" />
              </span>
              <div>
                <p className="text-sm text-muted-foreground">Casino value</p>
                <p
                  className={`font-mono tabular-nums text-2xl font-semibold ${
                    casino.totalNet >= 0 ? "text-emerald-600" : "text-red-600"
                  }`}
                >
                  {formatSignedCurrency(casino.totalNet)}
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">{casino.count} offers</p>
              </div>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/casino">
                View Casino
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Profit by month (sports + casino)</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfitBarChart data={combinedMonthData} emptyMessage="No activity yet." />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Profit by day (last 30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfitBarChart data={combinedDayData} emptyMessage="No activity yet." />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
