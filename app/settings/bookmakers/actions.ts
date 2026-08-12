"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";

const bookmakerSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  isExchange: z.boolean(),
  commissionRate: z
    .union([z.number(), z.nan()])
    .optional()
    .nullable(),
});

export type BookmakerInput = z.infer<typeof bookmakerSchema>;

export async function createBookmaker(input: BookmakerInput) {
  const userId = await requireUserId();
  const data = bookmakerSchema.parse(input);
  await prisma.bookmaker.create({
    data: {
      userId,
      name: data.name,
      isExchange: data.isExchange,
      commissionRate:
        data.commissionRate === null || data.commissionRate === undefined || Number.isNaN(data.commissionRate)
          ? null
          : data.commissionRate,
    },
  });
  revalidatePath("/settings/bookmakers");
}

export async function updateBookmaker(id: string, input: BookmakerInput) {
  const userId = await requireUserId();
  const data = bookmakerSchema.parse(input);
  await prisma.bookmaker.update({
    where: { id, userId },
    data: {
      name: data.name,
      isExchange: data.isExchange,
      commissionRate:
        data.commissionRate === null || data.commissionRate === undefined || Number.isNaN(data.commissionRate)
          ? null
          : data.commissionRate,
    },
  });
  revalidatePath("/settings/bookmakers");
}

export async function deleteBookmaker(id: string) {
  const userId = await requireUserId();
  await prisma.bookmaker.delete({ where: { id, userId } });
  revalidatePath("/settings/bookmakers");
}
