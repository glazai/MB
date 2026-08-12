"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { AccountStatus, TransactionType } from "@/lib/generated/prisma/client";

const createAccountSchema = z.object({
  personId: z.string().min(1),
  bookmakerId: z.string().min(1),
});

function revalidateAccountPages(personId: string) {
  revalidatePath("/accounts");
  revalidatePath(`/accounts/${personId}`);
}

export async function createAccount(input: { personId: string; bookmakerId: string }) {
  const userId = await requireUserId();
  const data = createAccountSchema.parse(input);

  const [person, bookmaker] = await Promise.all([
    prisma.person.findFirst({ where: { id: data.personId, userId } }),
    prisma.bookmaker.findFirst({ where: { id: data.bookmakerId, userId } }),
  ]);
  if (!person || !bookmaker) {
    throw new Error("Person or bookmaker not found.");
  }

  await prisma.account.create({ data: { ...data, userId } });
  revalidateAccountPages(data.personId);
}

const createAccountWithBalanceSchema = createAccountSchema.extend({
  balance: z.number().optional().nullable(),
});

export async function createAccountWithBalance(input: {
  personId: string;
  bookmakerId: string;
  balance?: number | null;
}) {
  const userId = await requireUserId();
  const data = createAccountWithBalanceSchema.parse(input);

  const [person, bookmaker] = await Promise.all([
    prisma.person.findFirst({ where: { id: data.personId, userId } }),
    prisma.bookmaker.findFirst({ where: { id: data.bookmakerId, userId } }),
  ]);
  if (!person || !bookmaker) {
    throw new Error("Person or bookmaker not found.");
  }

  await prisma.$transaction(async (tx) => {
    const account = await tx.account.create({
      data: { personId: data.personId, bookmakerId: data.bookmakerId, userId },
    });
    if (data.balance) {
      await tx.transaction.create({
        data: {
          userId,
          accountId: account.id,
          type: "ADJUSTMENT",
          amount: data.balance,
          date: new Date(),
          notes: "Starting balance",
        },
      });
    }
  });

  revalidateAccountPages(data.personId);
}

export async function updateAccountStatus(id: string, status: AccountStatus) {
  const userId = await requireUserId();
  const account = await prisma.account.update({ where: { id, userId }, data: { status } });
  revalidateAccountPages(account.personId);
}

export async function deleteAccount(id: string) {
  const userId = await requireUserId();
  const [betCount, offerCount, transactionCount] = await Promise.all([
    prisma.bet.count({ where: { userId, OR: [{ accountId: id }, { exchangeAccountId: id }] } }),
    prisma.casinoOffer.count({ where: { userId, accountId: id } }),
    prisma.transaction.count({ where: { userId, accountId: id } }),
  ]);
  if (betCount > 0 || offerCount > 0 || transactionCount > 0) {
    throw new Error("This account still has bets, offers, or transactions — remove those first.");
  }

  const account = await prisma.account.delete({ where: { id, userId } });
  revalidateAccountPages(account.personId);
}

const nameSchema = z.string().trim().min(1, "Name is required");

export async function updatePersonName(id: string, name: string) {
  const userId = await requireUserId();
  const parsed = nameSchema.parse(name);
  await prisma.person.update({ where: { id, userId }, data: { name: parsed } });
  revalidateAccountPages(id);
}

export async function createPerson(name: string) {
  const userId = await requireUserId();
  const parsed = nameSchema.parse(name);
  const existing = await prisma.person.findFirst({ where: { userId, name: { equals: parsed, mode: "insensitive" } } });
  if (existing) {
    throw new Error("That name is already used.");
  }

  const person = await prisma.person.create({ data: { userId, name: parsed } });
  revalidatePath("/accounts");
  revalidatePath("/setup");
  return person;
}

export async function deletePerson(id: string) {
  const userId = await requireUserId();
  const accountCount = await prisma.account.count({ where: { userId, personId: id } });
  if (accountCount > 0) {
    throw new Error("This person has accounts — remove those first.");
  }

  await prisma.person.delete({ where: { id, userId } });
  revalidatePath("/accounts");
  revalidatePath("/setup");
}

const transactionSchema = z.object({
  accountId: z.string().min(1),
  type: z.enum(["DEPOSIT", "WITHDRAWAL", "ADJUSTMENT"]),
  amount: z.number(),
  date: z.string().min(1),
  notes: z.string().optional().nullable(),
});

export type TransactionInput = z.infer<typeof transactionSchema>;

export async function createTransaction(input: TransactionInput) {
  const userId = await requireUserId();
  const data = transactionSchema.parse(input);

  const account = await prisma.account.findFirst({ where: { id: data.accountId, userId } });
  if (!account) {
    throw new Error("Account not found.");
  }

  const created = await prisma.transaction.create({
    data: {
      userId,
      accountId: data.accountId,
      type: data.type as TransactionType,
      amount: data.amount,
      date: new Date(data.date),
      notes: data.notes || null,
    },
    include: { account: { select: { personId: true } } },
  });

  revalidateAccountPages(created.account.personId);
}

export async function deleteTransaction(id: string) {
  const userId = await requireUserId();
  const existing = await prisma.transaction.findFirst({ where: { id, userId } });
  if (existing?.betId) {
    throw new Error("This entry came from a bet — edit or delete the bet instead.");
  }

  const transaction = await prisma.transaction.delete({
    where: { id, userId },
    include: { account: { select: { personId: true } } },
  });
  revalidateAccountPages(transaction.account.personId);
}
