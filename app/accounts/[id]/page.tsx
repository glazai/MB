import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Landmark, Trophy, Dices, ShieldAlert, Wallet } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { summarize } from "@/lib/bet-summary";
import { summarizeOffers } from "@/lib/casino-summary";
import { getBalancesByAccountIds } from "@/lib/balance";
import { getExposureByAccountIds } from "@/lib/exposure";
import { decimalToNumber, formatCurrency, formatSignedCurrency } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/stat-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AccountStatusSelect } from "../account-status-select";
import { EditPersonDialog } from "./edit-person-dialog";
import { AddBookmakerDialog } from "./add-bookmaker-dialog";
import { DeleteAccountButton } from "./delete-account-button";
import { TransactionsDialog } from "./transactions-dialog";

export default async function PersonProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = await requireUserId();

  const person = await prisma.person.findFirst({ where: { id, userId } });
  if (!person) notFound();

  const [accounts, allBookmakers, settledBets, casinoOffers] = await Promise.all([
    prisma.account.findMany({
      where: { personId: id, userId },
      include: { bookmaker: true },
      orderBy: { bookmaker: { name: "asc" } },
    }),
    prisma.bookmaker.findMany({
      where: { userId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.bet.findMany({
      where: { status: "SETTLED", account: { personId: id }, userId },
      include: {
        account: { include: { person: true, bookmaker: true } },
        betType: true,
      },
    }),
    prisma.casinoOffer.findMany({
      where: { status: { not: "IN_PROGRESS" }, account: { personId: id }, userId },
      include: {
        account: { include: { person: true, bookmaker: true } },
        offerType: true,
      },
    }),
  ]);

  const accountIds = accounts.map((account) => account.id);

  const [balances, exposures, transactions] = await Promise.all([
    getBalancesByAccountIds(userId, accountIds),
    getExposureByAccountIds(userId, accountIds),
    prisma.transaction.findMany({
      where: { accountId: { in: accountIds }, userId },
      orderBy: { date: "desc" },
    }),
  ]);

  const transactionsByAccount = new Map<string, typeof transactions>();
  for (const transaction of transactions) {
    const existing = transactionsByAccount.get(transaction.accountId) ?? [];
    existing.push(transaction);
    transactionsByAccount.set(transaction.accountId, existing);
  }

  const totalBalance = Array.from(balances.values()).reduce((sum, value) => sum + value, 0);
  const totalExposure = Array.from(exposures.values()).reduce((sum, value) => sum + value, 0);

  const sports = summarize(settledBets);
  const casino = summarizeOffers(casinoOffers);
  const existingBookmakerIds = new Set(accounts.map((account) => account.bookmakerId));
  const availableBookmakers = allBookmakers.filter((b) => !existingBookmakerIds.has(b.id));

  return (
    <div>
      <Link
        href="/accounts"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="size-4" />
        Account
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary text-lg font-semibold">
            {person.name.slice(0, 1)}
          </span>
          <h1 className="text-2xl font-semibold tracking-tight">{person.name}</h1>
        </div>
        <EditPersonDialog personId={person.id} name={person.name} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Link href={`/sports?person=${person.id}`} className="block transition-opacity hover:opacity-80">
          <StatCard
            icon={Trophy}
            label="Sports profit"
            value={formatSignedCurrency(sports.totalNet)}
            tone={sports.totalNet >= 0 ? "emerald" : "red"}
          />
        </Link>
        <Link href={`/casino?person=${person.id}`} className="block transition-opacity hover:opacity-80">
          <StatCard
            icon={Dices}
            label="Casino value"
            value={formatSignedCurrency(casino.totalNet)}
            tone={casino.totalNet >= 0 ? "emerald" : "red"}
          />
        </Link>
        <StatCard
          icon={Wallet}
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

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold tracking-tight">Bookmaker Accounts</h2>
        <AddBookmakerDialog personId={person.id} bookmakers={availableBookmakers} />
      </div>

      <Card>
        <CardContent>
          {accounts.length === 0 ? (
            <div className="flex items-center gap-3 text-sm text-muted-foreground py-2">
              <Landmark className="size-4" />
              No bookmaker accounts yet for {person.name}.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bookmaker</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-right">At risk</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((account) => {
                  const balance = balances.get(account.id) ?? 0;
                  const exposure = exposures.get(account.id) ?? 0;
                  const accountTransactions = (transactionsByAccount.get(account.id) ?? []).map(
                    (transaction) => ({
                      id: transaction.id,
                      type: transaction.type,
                      amount: decimalToNumber(transaction.amount) ?? 0,
                      date: transaction.date.toISOString(),
                      notes: transaction.notes,
                    }),
                  );
                  return (
                    <TableRow key={account.id}>
                      <TableCell className="font-medium">{account.bookmaker.name}</TableCell>
                      <TableCell>
                        {account.bookmaker.isExchange ? (
                          <Badge variant="secondary">Exchange</Badge>
                        ) : (
                          <Badge variant="outline">Bookmaker</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <AccountStatusSelect accountId={account.id} status={account.status} />
                      </TableCell>
                      <TableCell
                        className={`text-right font-mono tabular-nums font-medium ${balance >= 0 ? "text-emerald-600" : "text-red-600"}`}
                      >
                        {formatSignedCurrency(balance)}
                      </TableCell>
                      <TableCell className={`text-right font-mono tabular-nums ${exposure > 0 ? "text-amber-600 font-medium" : "text-muted-foreground"}`}>
                        {exposure > 0 ? formatCurrency(exposure) : "—"}
                      </TableCell>
                      <TableCell className="text-right space-x-2 whitespace-nowrap">
                        <TransactionsDialog
                          accountId={account.id}
                          bookmakerName={account.bookmaker.name}
                          balance={balance}
                          transactions={accountTransactions}
                        />
                        <DeleteAccountButton id={account.id} bookmakerName={account.bookmaker.name} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
