import { Sparkles } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { DEFAULT_BET_TYPES } from "@/lib/defaults";
import { SetupWizard } from "./setup-wizard";

export default async function SetupPage() {
  const userId = await requireUserId();

  const betTypeCount = await prisma.betType.count({ where: { userId } });
  if (betTypeCount === 0) {
    await prisma.betType.createMany({
      data: DEFAULT_BET_TYPES.map((name) => ({ userId, name })),
    });
  }

  const [people, bookmakers, betTypes, accounts] = await Promise.all([
    prisma.person.findMany({ where: { userId }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.bookmaker.findMany({ where: { userId }, select: { id: true, name: true, isExchange: true }, orderBy: { name: "asc" } }),
    prisma.betType.findMany({ where: { userId }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.account.findMany({ where: { userId }, select: { personId: true, bookmakerId: true } }),
  ]);

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-semibold tracking-tight mb-1 flex items-center gap-2">
        <Sparkles className="size-6" />
        Open your ledger
      </h1>
      <p className="text-sm text-muted-foreground mb-6">
        Add the people you're tracking, chalk up their bookmaker accounts, and confirm your bet types.
      </p>

      <SetupWizard people={people} bookmakers={bookmakers} betTypes={betTypes} accounts={accounts} />
    </div>
  );
}
