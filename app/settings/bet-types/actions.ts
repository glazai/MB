"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";

const betTypeSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
});

export async function createBetType(input: { name: string }) {
  const userId = await requireUserId();
  const data = betTypeSchema.parse(input);
  await prisma.betType.create({ data: { ...data, userId } });
  revalidatePath("/settings/bet-types");
}

export async function updateBetType(id: string, input: { name: string }) {
  const userId = await requireUserId();
  const data = betTypeSchema.parse(input);
  await prisma.betType.update({ where: { id, userId }, data });
  revalidatePath("/settings/bet-types");
}

export async function deleteBetType(id: string) {
  const userId = await requireUserId();
  await prisma.betType.delete({ where: { id, userId } });
  revalidatePath("/settings/bet-types");
}
