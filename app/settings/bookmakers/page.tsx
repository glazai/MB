import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { decimalToNumber } from "@/lib/format";
import { SettingsNav } from "@/components/settings-nav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BookmakerDialog } from "./bookmaker-dialog";
import { DeleteBookmakerButton } from "./delete-bookmaker-button";

export default async function BookmakersPage() {
  const userId = await requireUserId();
  const bookmakers = await prisma.bookmaker.findMany({
    where: { userId },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight mb-1">Settings</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Canonical bookmaker, bet type, and casino offer type lists — edit here, no code changes needed.
      </p>
      <SettingsNav />
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Bookmakers</h2>
        <BookmakerDialog
          mode="create"
          trigger={
            <Button>
              <Plus className="size-4" />
              Add Bookmaker
            </Button>
          }
        />
      </div>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Commission</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookmakers.map((bookmaker) => (
              <TableRow key={bookmaker.id}>
                <TableCell className="font-medium">{bookmaker.name}</TableCell>
                <TableCell>
                  {bookmaker.isExchange ? (
                    <Badge variant="secondary">Exchange</Badge>
                  ) : (
                    <Badge variant="outline">Bookmaker</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {bookmaker.commissionRate
                    ? `${decimalToNumber(bookmaker.commissionRate)}%`
                    : "—"}
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <BookmakerDialog
                    mode="edit"
                    bookmaker={{
                      id: bookmaker.id,
                      name: bookmaker.name,
                      isExchange: bookmaker.isExchange,
                      commissionRate: decimalToNumber(bookmaker.commissionRate),
                    }}
                    trigger={
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    }
                  />
                  <DeleteBookmakerButton id={bookmaker.id} name={bookmaker.name} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
