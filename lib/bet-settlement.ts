import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";

export async function syncBetTransactions(userId: string, betId: string) {
  const bet = await prisma.bet.findFirst({ where: { id: betId, userId } });
  if (!bet) return;

  await prisma.$transaction(async (tx) => {
    await tx.transaction.deleteMany({ where: { betId, userId } });

    if (bet.status !== "SETTLED") return;

    const rows: {
      userId: string;
      accountId: string;
      betId: string;
      type: "BET_SETTLEMENT";
      amount: Prisma.Decimal;
      date: Date;
      notes: string;
    }[] = [];

    if (bet.bookmakerProfit !== null) {
      rows.push({
        userId,
        accountId: bet.accountId,
        betId: bet.id,
        type: "BET_SETTLEMENT",
        amount: bet.bookmakerProfit,
        date: bet.eventDate,
        notes: `Bet: ${bet.event}`,
      });
    }

    if (bet.exchangeAccountId && bet.exchangeProfit !== null) {
      rows.push({
        userId,
        accountId: bet.exchangeAccountId,
        betId: bet.id,
        type: "BET_SETTLEMENT",
        amount: bet.exchangeProfit,
        date: bet.eventDate,
        notes: `Bet: ${bet.event}`,
      });
    }

    for (const row of rows) {
      await tx.transaction.create({ data: row });
    }
  });
}
