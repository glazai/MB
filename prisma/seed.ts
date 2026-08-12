import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";
import { DEFAULT_BET_TYPES } from "../lib/defaults";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const userId = process.env.SEED_USER_ID;
if (!userId) {
  console.error("Set SEED_USER_ID to the id of the AuthUser to seed defaults for.");
  process.exit(1);
}

const PEOPLE = ["George", "Alex", "Noe", "Komnas"];

const BET_TYPES = DEFAULT_BET_TYPES;

const CASINO_OFFER_TYPES = [
  "Free Spins",
  "Deposit Bonus",
  "Cashback",
  "Wagering-Free Bonus",
  "Reload Bonus",
  "Other",
];

const BOOKMAKERS: { name: string; isExchange: boolean; commissionRate?: number }[] = [
  { name: "Bet365", isExchange: false },
  { name: "William Hill", isExchange: false },
  { name: "Ladbrokes", isExchange: false },
  { name: "Coral", isExchange: false },
  { name: "Paddy Power", isExchange: false },
  { name: "Sky Bet", isExchange: false },
  { name: "BetVictor", isExchange: false },
  { name: "BetMGM", isExchange: false },
  { name: "MrQ", isExchange: false },
  { name: "Betfred", isExchange: false },
  { name: "Betfair Exchange", isExchange: true, commissionRate: 2 },
  { name: "Smarkets", isExchange: true, commissionRate: 2 },
];

async function main() {
  for (const name of PEOPLE) {
    await prisma.person.upsert({
      where: { userId_name: { userId: userId!, name } },
      update: {},
      create: { userId, name },
    });
  }

  for (const name of BET_TYPES) {
    await prisma.betType.upsert({
      where: { userId_name: { userId: userId!, name } },
      update: {},
      create: { userId, name },
    });
  }

  for (const bookmaker of BOOKMAKERS) {
    await prisma.bookmaker.upsert({
      where: { userId_name: { userId: userId!, name: bookmaker.name } },
      update: {},
      create: { ...bookmaker, userId },
    });
  }

  for (const name of CASINO_OFFER_TYPES) {
    await prisma.casinoOfferType.upsert({
      where: { userId_name: { userId: userId!, name } },
      update: {},
      create: { userId, name },
    });
  }

  console.log(
    `Seeded ${PEOPLE.length} people, ${BET_TYPES.length} bet types, ${BOOKMAKERS.length} bookmakers, ${CASINO_OFFER_TYPES.length} casino offer types.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
