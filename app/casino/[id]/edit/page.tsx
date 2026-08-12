import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { decimalToNumber } from "@/lib/format";
import { CasinoOfferForm } from "../../casino-offer-form";

export default async function EditCasinoOfferPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = await requireUserId();

  const [offer, people, accounts, offerTypes] = await Promise.all([
    prisma.casinoOffer.findFirst({
      where: { id, userId },
      include: { account: true },
    }),
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

  if (!offer) notFound();

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight mb-1">Edit Casino Offer</h1>
      <p className="text-sm text-muted-foreground mb-6">Update the details for this offer.</p>
      <CasinoOfferForm
        mode="edit"
        offerId={offer.id}
        people={people}
        accounts={accounts}
        offerTypes={offerTypes}
        defaultValues={{
          personId: offer.account.personId,
          accountId: offer.accountId,
          offerTypeId: offer.offerTypeId,
          title: offer.title,
          offerDate: offer.offerDate.toISOString(),
          profit: decimalToNumber(offer.profit)?.toString() ?? "",
          status: offer.status,
          notes: offer.notes ?? "",
        }}
      />
    </div>
  );
}
