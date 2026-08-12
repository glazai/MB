import Link from "next/link";
import { ArrowLeft, History, Receipt } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import type { Prisma } from "@/lib/generated/prisma/client";
import { decimalToNumber, formatCurrency, formatDate, formatSignedCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
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

export default async function BetHistoryPage({
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
  if (params.status) where.status = params.status as "SETTLED" | "PENDING" | "VOID";

  const [bets, people, bookmakers, betTypes] = await Promise.all([
    prisma.bet.findMany({
      where,
      include: {
        account: { include: { person: true, bookmaker: true } },
        exchangeAccount: { include: { bookmaker: true } },
        betType: true,
      },
      orderBy: { eventDate: "desc" },
      take: 500,
    }),
    prisma.person.findMany({ where: { userId }, orderBy: { name: "asc" } }),
    prisma.bookmaker.findMany({
      where: { userId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.betType.findMany({ where: { userId }, orderBy: { name: "asc" } }),
  ]);

  const hasFilters = Object.keys(params).length > 0;

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
        <History className="size-6" />
        Bet History
      </h1>
      <p className="text-sm text-muted-foreground mb-6">
        Every sports bet ever logged, in full detail.
      </p>

      <BetFilters people={people} bookmakers={bookmakers} betTypes={betTypes} />

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Person</TableHead>
              <TableHead>Bookmaker</TableHead>
              <TableHead>Exchange</TableHead>
              <TableHead>Bet Type</TableHead>
              <TableHead>Event</TableHead>
              <TableHead className="text-right">Stake</TableHead>
              <TableHead className="text-right">Odds</TableHead>
              <TableHead className="text-right">Bookmaker P/L</TableHead>
              <TableHead className="text-right">Exchange P/L</TableHead>
              <TableHead className="text-right">Net</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bets.length === 0 && (
              <TableRow>
                <TableCell colSpan={13} className="py-12">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <Receipt className="size-5" />
                    </span>
                    <p className="font-medium">{hasFilters ? "No bets match these filters" : "No bets yet"}</p>
                    <p className="text-sm text-muted-foreground">
                      {hasFilters ? "Try clearing a filter to see more." : "Bets you log will show up here."}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
            {bets.map((bet) => {
              const hasExchange = Boolean(bet.exchangeAccountId);
              const bookmakerProfit = decimalToNumber(bet.bookmakerProfit);
              const exchangeProfit = decimalToNumber(bet.exchangeProfit);
              const net =
                bet.status === "SETTLED" && bookmakerProfit !== null ? bookmakerProfit + (exchangeProfit ?? 0) : null;

              const backOdds = decimalToNumber(bet.backOdds);
              const layOdds = decimalToNumber(bet.layOdds);
              const stake = hasExchange ? decimalToNumber(bet.backStake) : decimalToNumber(bet.stake);
              const odds = hasExchange && backOdds !== null && layOdds !== null
                ? `${backOdds.toFixed(2)} / ${layOdds.toFixed(2)}`
                : null;

              return (
                <TableRow key={bet.id}>
                  <TableCell>{formatDate(bet.eventDate)}</TableCell>
                  <TableCell>{bet.account.person.name}</TableCell>
                  <TableCell>{bet.account.bookmaker.name}</TableCell>
                  <TableCell>
                    {bet.exchangeAccount ? (
                      bet.exchangeAccount.bookmaker.name
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>{bet.betType.name}</TableCell>
                  <TableCell className="max-w-52 truncate" title={bet.notes ?? undefined}>
                    {bet.event}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {stake !== null ? formatCurrency(stake) : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {odds ?? <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {bookmakerProfit !== null ? (
                      formatSignedCurrency(bookmakerProfit)
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {hasExchange && exchangeProfit !== null ? (
                      formatSignedCurrency(exchangeProfit)
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {net !== null ? (
                      <span className={`font-medium ${net >= 0 ? "text-emerald-600" : "text-red-600"}`}>
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
                      <SettleBetButton id={bet.id} event={bet.event} hasExchange={hasExchange} />
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
