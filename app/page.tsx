import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getOptionalUserId } from "@/lib/auth";
import { LandingPage } from "./landing-page";

export default async function Home() {
  const userId = await getOptionalUserId();
  if (!userId) {
    return <LandingPage />;
  }

  const personCount = await prisma.person.count({ where: { userId } });
  redirect(personCount === 0 ? "/setup" : "/dashboard");
}
