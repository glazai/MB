"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { decimalToNumber } from "@/lib/format";
import { syncBetTransactions } from "@/lib/bet-settlement";
import { calcBackLayOutcomes } from "@/lib/bet-calculator";
import type { BetStatus, BetOutcome } from "@/lib/generated/prisma/client";

const betSchema = z
  .object({
    accountId: z.string().min(1, "Choose an account"),
    exchangeAccountId: z.string().optional().nullable(),
    betTypeId: z.string().min(1, "Choose a bet type"),
    event: z.string().trim().min(1, "Event is required"),
    eventDate: z.string().min(1, "Date is required"),
    bookmakerProfit: z.number().optional().nullable(),
    stake: z.number().optional().nullable(),
    backStake: z.number().optional().nullable(),
    backOdds: z.number().optional().nullable(),
    layOdds: z.number().optional().nullable(),
    commission: z.number().optional().nullable(),
    snr: z.boolean().optional(),
    outcome: z.enum(["BOOKMAKER", "EXCHANGE"]).optional().nullable(),
    status: z.enum(["SETTLED", "PENDING", "VOID"]),
    notes: z.string().optional().nullable(),
  })
  .refine((data) => Boolean(data.exchangeAccountId) || data.status !== "SETTLED" || data.bookmakerProfit !== null, {
    message: "Enter the Profit/Loss to mark this bet settled.",
    path: ["bookmakerProfit"],
  })
  .refine(
    (data) =>
      !data.exchangeAccountId ||
      (data.backStake != null && data.backOdds != null && data.layOdds != null),
    {
      message: "Enter Back Stake, Back Odds, and Lay Odds for bets with an exchange leg.",
      path: ["backStake"],
    },
  )
  .refine((data) => !data.exchangeAccountId || data.status !== "SETTLED" || Boolean(data.outcome), {
    message: "Choose which side won to mark this bet settled.",
    path: ["outcome"],
  });

export type BetInput = z.infer<typeof betSchema>;

function toData(input: BetInput) {
  const data = betSchema.parse(input);
  const hasExchange = Boolean(data.exchangeAccountId);

  if (!hasExchange) {
    return {
      accountId: data.accountId,
      exchangeAccountId: null,
      betTypeId: data.betTypeId,
      event: data.event,
      eventDate: new Date(data.eventDate),
      stake: data.stake ?? null,
      backStake: null,
      backOdds: null,
      layOdds: null,
      commission: null,
      snr: false,
      outcome: (data.status === "SETTLED" ? data.outcome : null) as BetOutcome | null,
      bookmakerProfit: data.bookmakerProfit ?? null,
      exchangeProfit: null,
      status: data.status as BetStatus,
      notes: data.notes || null,
    };
  }

  const commission = data.commission ?? 0;
  const snr = data.snr ?? false;
  let bookmakerProfit: number | null = null;
  let exchangeProfit: number | null = null;
  let outcome: BetOutcome | null = null;

  if (data.status === "SETTLED" && data.outcome) {
    const outcomes = calcBackLayOutcomes({
      backStake: data.backStake!,
      backOdds: data.backOdds!,
      layOdds: data.layOdds!,
      commission,
      snr,
    });
    const picked = data.outcome === "BOOKMAKER" ? outcomes.ifBookmakerWins : outcomes.ifExchangeWins;
    bookmakerProfit = picked.bookmakerProfit;
    exchangeProfit = picked.exchangeProfit;
    outcome = data.outcome;
  }

  return {
    accountId: data.accountId,
    exchangeAccountId: data.exchangeAccountId || null,
    betTypeId: data.betTypeId,
    event: data.event,
    eventDate: new Date(data.eventDate),
    stake: null,
    backStake: data.backStake,
    backOdds: data.backOdds,
    layOdds: data.layOdds,
    commission,
    snr,
    outcome,
    bookmakerProfit,
    exchangeProfit,
    status: data.status as BetStatus,
    notes: data.notes || null,
  };
}

async function revalidateBetPages(userId: string, betId: string) {
  revalidatePath("/sports");
  revalidatePath("/dashboard");
  revalidatePath("/accounts");
  const bet = await prisma.bet.findFirst({
    where: { id: betId, userId },
    select: { account: { select: { personId: true } } },
  });
  if (bet) revalidatePath(`/accounts/${bet.account.personId}`);
}

export async function createBet(input: BetInput) {
  const userId = await requireUserId();
  const data = toData(input);

  const idsToCheck = [data.accountId, data.betTypeId, ...(data.exchangeAccountId ? [data.exchangeAccountId] : [])];
  const [accountCount, betTypeCount] = await Promise.all([
    prisma.account.count({ where: { id: { in: idsToCheck }, userId } }),
    prisma.betType.count({ where: { id: data.betTypeId, userId } }),
  ]);
  if (accountCount < (data.exchangeAccountId ? 2 : 1) || betTypeCount < 1) {
    throw new Error("Account or bet type not found.");
  }

  const bet = await prisma.bet.create({ data: { ...data, userId } });
  await syncBetTransactions(userId, bet.id);
  await revalidateBetPages(userId, bet.id);
}

export async function updateBet(id: string, input: BetInput) {
  const userId = await requireUserId();
  const data = toData(input);
  await prisma.bet.update({ where: { id, userId }, data });
  await syncBetTransactions(userId, id);
  await revalidateBetPages(userId, id);
}

export async function deleteBet(id: string) {
  const userId = await requireUserId();
  const bet = await prisma.bet.findFirst({
    where: { id, userId },
    select: { account: { select: { personId: true } } },
  });
  await prisma.bet.delete({ where: { id, userId } });
  revalidatePath("/sports");
  revalidatePath("/dashboard");
  revalidatePath("/accounts");
  if (bet) revalidatePath(`/accounts/${bet.account.personId}`);
}

export async function settleBet(id: string, outcome: "BOOKMAKER" | "EXCHANGE") {
  const userId = await requireUserId();
  const bet = await prisma.bet.findFirst({ where: { id, userId } });
  if (!bet) return;

  if (bet.exchangeAccountId) {
    const backStake = decimalToNumber(bet.backStake);
    const backOdds = decimalToNumber(bet.backOdds);
    const layOdds = decimalToNumber(bet.layOdds);
    if (backStake === null || backOdds === null || layOdds === null) {
      throw new Error("Enter Back Stake, Back Odds, and Lay Odds on this bet first, then settle it.");
    }
    const commission = decimalToNumber(bet.commission) ?? 0;
    const outcomes = calcBackLayOutcomes({ backStake, backOdds, layOdds, commission, snr: bet.snr });
    const picked = outcome === "BOOKMAKER" ? outcomes.ifBookmakerWins : outcomes.ifExchangeWins;

    await prisma.bet.update({
      where: { id, userId },
      data: {
        status: "SETTLED",
        outcome,
        bookmakerProfit: picked.bookmakerProfit,
        exchangeProfit: picked.exchangeProfit,
      },
    });
  } else {
    const bookmakerProfit = decimalToNumber(bet.bookmakerProfit);
    if (bookmakerProfit === null) {
      throw new Error("Enter the Profit/Loss on this bet first, then settle it.");
    }

    if (bookmakerProfit !== 0) {
      const wonBookmaker = bookmakerProfit > 0;
      if ((outcome === "BOOKMAKER") !== wonBookmaker) {
        throw new Error("That doesn't match the P/L already on this bet — edit the bet if the numbers are wrong.");
      }
    }

    await prisma.bet.update({ where: { id, userId }, data: { status: "SETTLED", outcome } });
  }

  await syncBetTransactions(userId, id);
  await revalidateBetPages(userId, id);
}
