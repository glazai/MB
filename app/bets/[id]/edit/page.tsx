import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { getBalancesByAccountIds } from "@/lib/balance";
import { decimalToNumber } from "@/lib/format";
import { BetForm } from "../../bet-form";

export default async function EditBetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = await requireUserId();

  const [bet, people, accountRows, betTypes] = await Promise.all([
    prisma.bet.findFirst({
      where: { id, userId },
      include: { account: true },
    }),
    prisma.person.findMany({ where: { userId }, orderBy: { name: "asc" } }),
    prisma.account.findMany({
      where: { userId },
      select: {
        id: true,
        personId: true,
        bookmaker: { select: { id: true, name: true, isExchange: true } },
      },
      orderBy: { bookmaker: { name: "asc" } },
    }),
    prisma.betType.findMany({ where: { userId }, orderBy: { name: "asc" } }),
  ]);

  if (!bet) notFound();

  const balances = await getBalancesByAccountIds(userId, accountRows.map((a) => a.id));
  const accounts = accountRows.map((a) => ({ ...a, balance: balances.get(a.id) ?? 0 }));

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight mb-1">Edit Bet</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Update the details for this bet.
      </p>
      <BetForm
        mode="edit"
        betId={bet.id}
        people={people}
        accounts={accounts}
        betTypes={betTypes}
        defaultValues={{
          personId: bet.account.personId,
          accountId: bet.accountId,
          exchangeAccountId: bet.exchangeAccountId ?? "",
          betTypeId: bet.betTypeId,
          event: bet.event,
          eventDate: bet.eventDate.toISOString(),
          bookmakerProfit: decimalToNumber(bet.bookmakerProfit)?.toString() ?? "",
          stake: decimalToNumber(bet.stake)?.toString() ?? "",
          backStake: decimalToNumber(bet.backStake)?.toString() ?? "",
          backOdds: decimalToNumber(bet.backOdds)?.toString() ?? "",
          layOdds: decimalToNumber(bet.layOdds)?.toString() ?? "",
          commission: decimalToNumber(bet.commission)?.toString() ?? "",
          snr: bet.snr,
          outcome: bet.outcome ?? undefined,
          status: bet.status,
          notes: bet.notes ?? "",
        }}
      />
    </div>
  );
}
