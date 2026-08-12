import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";

export default async function Home() {
  const userId = await requireUserId();
  const personCount = await prisma.person.count({ where: { userId } });
  redirect(personCount === 0 ? "/setup" : "/dashboard");
}
