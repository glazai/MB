import Link from "next/link";
import { Plus, Gift, CalendarDays, CheckCircle2, Wallet, Dices } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import type { Prisma } from "@/lib/generated/prisma/client";
import { decimalToNumber, formatDate, formatSignedCurrency } from "@/lib/format";
import { summarizeOffers } from "@/lib/casino-summary";
import { parseMonthRange } from "@/lib/month-filter";
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
import { CasinoOfferFilters } from "./filters";
import { DeleteOfferButton } from "./delete-offer-button";
import { StatusBadge, casinoOfferStatusTone, casinoOfferStatusLabel } from "@/components/status-badge";

export default async function CasinoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const userId = await requireUserId();
  const where: Prisma.CasinoOfferWhereInput = { userId };

  const accountWhere: { personId?: string; bookmakerId?: string } = {};
  if (params.person) accountWhere.personId = params.person;
  if (params.bookmaker) accountWhere.bookmakerId = params.bookmaker;
  if (Object.keys(accountWhere).length > 0) where.account = accountWhere;

  if (params.offerType) where.offerTypeId = params.offerType;
  if (params.status) where.status = params.status as "COMPLETED" | "IN_PROGRESS" | "FORFEITED";
  const monthRange = parseMonthRange(params.month);
  if (monthRange) where.offerDate = monthRange;

  const [offers, people, bookmakers, offerTypes, allOffers] = await Promise.all([
    prisma.casinoOffer.findMany({
      where,
      include: {
        account: { include: { person: true, bookmaker: true } },
        offerType: true,
      },
      orderBy: { offerDate: "desc" },
      take: 200,
    }),
    prisma.person.findMany({ where: { userId }, orderBy: { name: "asc" } }),
    prisma.bookmaker.findMany({
      where: { userId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.casinoOfferType.findMany({ where: { userId }, orderBy: { name: "asc" } }),
    prisma.casinoOffer.findMany({
      where: { userId, status: { not: "IN_PROGRESS" } },
      include: {
        account: { include: { person: true, bookmaker: true } },
        offerType: true,
      },
    }),
  ]);

  const summary = summarizeOffers(allOffers);
  const completedCount = allOffers.filter((offer) => offer.status === "COMPLETED").length;
  const hasFilters = Object.keys(params).length > 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Dices className="size-6" />
          Casino
        </h1>
        <Button asChild>
          <Link href="/casino/new">
            <Plus className="size-4" />
            Add Offer
          </Link>
        </Button>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Free spins, deposit bonuses, and cashback across every person and account.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard
          icon={Wallet}
          label="Total value"
          value={formatSignedCurrency(summary.totalNet)}
          tone={summary.totalNet >= 0 ? "emerald" : "red"}
        />
        <StatCard
          icon={CalendarDays}
          label="This month"
          value={formatSignedCurrency(summary.thisMonthNet)}
          tone={summary.thisMonthNet >= 0 ? "emerald" : "red"}
        />
        <StatCard icon={CheckCircle2} label="Completed offers" value={String(completedCount)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Value by person</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfitBarChart data={summary.personData} emptyMessage="No casino offers yet." />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Value by month</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfitBarChart data={summary.monthData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Value by day (last 30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfitBarChart data={summary.dayData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Value by bookmaker</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfitBarChart data={summary.bookmakerData} emptyMessage="No casino offers yet." />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Value by offer type</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfitBarChart data={summary.offerTypeData} emptyMessage="No casino offers yet." />
          </CardContent>
        </Card>
      </div>

      <h2 className="text-lg font-semibold tracking-tight mb-4">Offers</h2>

      <CasinoOfferFilters people={people} bookmakers={bookmakers} offerTypes={offerTypes} />

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Person</TableHead>
              <TableHead>Bookmaker</TableHead>
              <TableHead>Offer Type</TableHead>
              <TableHead>Title</TableHead>
              <TableHead className="text-right">Value</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {offers.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-12">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <Gift className="size-5" />
                    </span>
                    <p className="font-medium">
                      {hasFilters ? "No offers match these filters" : "No casino offers yet"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {hasFilters
                        ? "Try clearing a filter to see more."
                        : "Add your first free spins, deposit bonus, or cashback offer."}
                    </p>
                    {!hasFilters && (
                      <Button asChild size="sm" className="mt-2">
                        <Link href="/casino/new">
                          <Plus className="size-4" />
                          Add Offer
                        </Link>
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )}
            {offers.map((offer) => {
              const value = decimalToNumber(offer.profit) ?? 0;
              return (
                <TableRow key={offer.id}>
                  <TableCell>{formatDate(offer.offerDate)}</TableCell>
                  <TableCell>{offer.account.person.name}</TableCell>
                  <TableCell>{offer.account.bookmaker.name}</TableCell>
                  <TableCell>{offer.offerType.name}</TableCell>
                  <TableCell className="max-w-52 truncate">{offer.title}</TableCell>
                  <TableCell
                    className={`text-right font-mono tabular-nums font-medium ${value >= 0 ? "text-emerald-600" : "text-red-600"}`}
                  >
                    {formatSignedCurrency(value)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      label={casinoOfferStatusLabel(offer.status)}
                      tone={casinoOfferStatusTone(offer.status)}
                    />
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/casino/${offer.id}/edit`}>Edit</Link>
                    </Button>
                    <DeleteOfferButton id={offer.id} />
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
