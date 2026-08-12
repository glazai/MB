import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { SettingsNav } from "@/components/settings-nav";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CasinoOfferTypeDialog } from "./casino-offer-type-dialog";
import { DeleteOfferTypeButton } from "./delete-offer-type-button";

export default async function CasinoOfferTypesPage() {
  const userId = await requireUserId();
  const offerTypes = await prisma.casinoOfferType.findMany({ where: { userId }, orderBy: { name: "asc" } });

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight mb-1">Settings</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Canonical bookmaker, bet type, and casino offer type lists — edit here, no code changes needed.
      </p>
      <SettingsNav />
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Casino Offer Types</h2>
        <CasinoOfferTypeDialog
          mode="create"
          trigger={
            <Button>
              <Plus className="size-4" />
              Add Offer Type
            </Button>
          }
        />
      </div>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {offerTypes.map((offerType) => (
              <TableRow key={offerType.id}>
                <TableCell className="font-medium">{offerType.name}</TableCell>
                <TableCell className="text-right space-x-2">
                  <CasinoOfferTypeDialog
                    mode="edit"
                    offerType={{ id: offerType.id, name: offerType.name }}
                    trigger={
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    }
                  />
                  <DeleteOfferTypeButton id={offerType.id} name={offerType.name} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
