"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";

const offerTypeSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
});

export async function createCasinoOfferType(input: { name: string }) {
  const userId = await requireUserId();
  const data = offerTypeSchema.parse(input);
  await prisma.casinoOfferType.create({ data: { ...data, userId } });
  revalidatePath("/settings/casino-offer-types");
}

export async function updateCasinoOfferType(id: string, input: { name: string }) {
  const userId = await requireUserId();
  const data = offerTypeSchema.parse(input);
  await prisma.casinoOfferType.update({ where: { id, userId }, data });
  revalidatePath("/settings/casino-offer-types");
}

export async function deleteCasinoOfferType(id: string) {
  const userId = await requireUserId();
  await prisma.casinoOfferType.delete({ where: { id, userId } });
  revalidatePath("/settings/casino-offer-types");
}
