import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { CasinoOfferForm } from "../casino-offer-form";

export default async function NewCasinoOfferPage() {
  const userId = await requireUserId();
  const [people, accounts, offerTypes] = await Promise.all([
    prisma.person.findMany({ where: { userId }, orderBy: { name: "asc" } }),
    prisma.account.findMany({
      where: { userId },
      select: {
        id: true,
        personId: true,
        bookmaker: { select: { id: true, name: true } },
      },
      orderBy: { bookmaker: { name: "asc" } },
    }),
    prisma.casinoOfferType.findMany({ where: { userId }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight mb-1">Add Casino Offer</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Log a casino offer for any person's account.
      </p>
      <CasinoOfferForm mode="create" people={people} accounts={accounts} offerTypes={offerTypes} />
    </div>
  );
}
