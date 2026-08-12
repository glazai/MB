"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { CasinoOfferStatus } from "@/lib/generated/prisma/client";

const offerSchema = z.object({
  accountId: z.string().min(1, "Choose an account"),
  offerTypeId: z.string().min(1, "Choose an offer type"),
  title: z.string().trim().min(1, "Title is required"),
  offerDate: z.string().min(1, "Date is required"),
  profit: z.number({ error: "Enter a number" }),
  status: z.enum(["COMPLETED", "IN_PROGRESS", "FORFEITED"]),
  notes: z.string().optional().nullable(),
});

export type CasinoOfferInput = z.infer<typeof offerSchema>;

function toData(input: CasinoOfferInput) {
  const data = offerSchema.parse(input);
  return {
    accountId: data.accountId,
    offerTypeId: data.offerTypeId,
    title: data.title,
    offerDate: new Date(data.offerDate),
    profit: data.profit,
    status: data.status as CasinoOfferStatus,
    notes: data.notes || null,
  };
}

function revalidateCasinoPages() {
  revalidatePath("/casino");
  revalidatePath("/dashboard");
}

export async function createCasinoOffer(input: CasinoOfferInput) {
  const userId = await requireUserId();
  const data = toData(input);

  const [account, offerType] = await Promise.all([
    prisma.account.findFirst({ where: { id: data.accountId, userId } }),
    prisma.casinoOfferType.findFirst({ where: { id: data.offerTypeId, userId } }),
  ]);
  if (!account || !offerType) {
    throw new Error("Account or offer type not found.");
  }

  await prisma.casinoOffer.create({ data: { ...data, userId } });
  revalidateCasinoPages();
}

export async function updateCasinoOffer(id: string, input: CasinoOfferInput) {
  const userId = await requireUserId();
  const data = toData(input);
  await prisma.casinoOffer.update({ where: { id, userId }, data });
  revalidateCasinoPages();
}

export async function deleteCasinoOffer(id: string) {
  const userId = await requireUserId();
  await prisma.casinoOffer.delete({ where: { id, userId } });
  revalidateCasinoPages();
}
