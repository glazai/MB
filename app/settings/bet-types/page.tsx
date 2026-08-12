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
import { BetTypeDialog } from "./bet-type-dialog";
import { DeleteBetTypeButton } from "./delete-bet-type-button";

export default async function BetTypesPage() {
  const userId = await requireUserId();
  const betTypes = await prisma.betType.findMany({ where: { userId }, orderBy: { name: "asc" } });

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight mb-1">Settings</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Canonical bookmaker, bet type, and casino offer type lists — edit here, no code changes needed.
      </p>
      <SettingsNav />
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Bet Types</h2>
        <BetTypeDialog
          mode="create"
          trigger={
            <Button>
              <Plus className="size-4" />
              Add Bet Type
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
            {betTypes.map((betType) => (
              <TableRow key={betType.id}>
                <TableCell className="font-medium">{betType.name}</TableCell>
                <TableCell className="text-right space-x-2">
                  <BetTypeDialog
                    mode="edit"
                    betType={{ id: betType.id, name: betType.name }}
                    trigger={
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    }
                  />
                  <DeleteBetTypeButton id={betType.id} name={betType.name} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
