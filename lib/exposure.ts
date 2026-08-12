import { prisma } from "@/lib/prisma";
import { decimalToNumber } from "@/lib/format";
import { calcBackLayOutcomes } from "@/lib/bet-calculator";

type PendingExchangeBet = {
  accountId: string;
  exchangeAccountId: string | null;
  backStake: unknown;
  backOdds: unknown;
  layOdds: unknown;
  commission: unknown;
  snr: boolean;
};

function exchangeBetExposure(bet: PendingExchangeBet) {
  const backStake = decimalToNumber(bet.backStake as never);
  const backOdds = decimalToNumber(bet.backOdds as never);
  const layOdds = decimalToNumber(bet.layOdds as never);
  if (backStake === null || backOdds === null || layOdds === null) return null;
  const commission = decimalToNumber(bet.commission as never) ?? 0;
  const { liability } = calcBackLayOutcomes({ backStake, backOdds, layOdds, commission, snr: bet.snr });
  return { backStake, liability };
}

const pendingExchangeBetSelect = {
  accountId: true,
  exchangeAccountId: true,
  backStake: true,
  backOdds: true,
  layOdds: true,
  commission: true,
  snr: true,
} as const;

const pendingSingleLegBetSelect = {
  accountId: true,
  stake: true,
} as const;

export async function getExposureByAccountIds(userId: string, accountIds: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  for (const id of accountIds) map.set(id, 0);
  if (accountIds.length === 0) return map;

  const [exchangeBets, singleLegBets] = await Promise.all([
    prisma.bet.findMany({
      where: {
        userId,
        status: "PENDING",
        exchangeAccountId: { not: null },
        OR: [{ accountId: { in: accountIds } }, { exchangeAccountId: { in: accountIds } }],
      },
      select: pendingExchangeBetSelect,
    }),
    prisma.bet.findMany({
      where: { userId, status: "PENDING", exchangeAccountId: null, accountId: { in: accountIds }, stake: { not: null } },
      select: pendingSingleLegBetSelect,
    }),
  ]);

  for (const bet of exchangeBets) {
    const exposure = exchangeBetExposure(bet);
    if (!exposure) continue;
    if (map.has(bet.accountId)) map.set(bet.accountId, (map.get(bet.accountId) ?? 0) + exposure.backStake);
    if (bet.exchangeAccountId && map.has(bet.exchangeAccountId)) {
      map.set(bet.exchangeAccountId, (map.get(bet.exchangeAccountId) ?? 0) + exposure.liability);
    }
  }

  for (const bet of singleLegBets) {
    const stake = decimalToNumber(bet.stake);
    if (stake === null || !map.has(bet.accountId)) continue;
    map.set(bet.accountId, (map.get(bet.accountId) ?? 0) + stake);
  }

  return map;
}

export async function getTotalExposure(userId: string): Promise<number> {
  const [exchangeBets, singleLegBets] = await Promise.all([
    prisma.bet.findMany({
      where: { userId, status: "PENDING", exchangeAccountId: { not: null } },
      select: pendingExchangeBetSelect,
    }),
    prisma.bet.findMany({
      where: { userId, status: "PENDING", exchangeAccountId: null, stake: { not: null } },
      select: pendingSingleLegBetSelect,
    }),
  ]);

  let total = 0;
  for (const bet of exchangeBets) {
    const exposure = exchangeBetExposure(bet);
    if (!exposure) continue;
    total += exposure.backStake + exposure.liability;
  }
  for (const bet of singleLegBets) {
    total += decimalToNumber(bet.stake) ?? 0;
  }
  return total;
}
