import { prisma } from "@/lib/prisma";
import { decimalToNumber } from "@/lib/format";

export async function getBalancesByAccountIds(userId: string, accountIds: string[]): Promise<Map<string, number>> {
  if (accountIds.length === 0) return new Map();

  const totals = await prisma.transaction.groupBy({
    by: ["accountId"],
    where: { userId, accountId: { in: accountIds } },
    _sum: { amount: true },
  });

  const balances = new Map<string, number>();
  for (const id of accountIds) balances.set(id, 0);
  for (const total of totals) {
    balances.set(total.accountId, decimalToNumber(total._sum.amount) ?? 0);
  }
  return balances;
}
