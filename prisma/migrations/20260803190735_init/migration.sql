-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'RESTRICTED', 'GUBBED', 'CLOSED');

-- CreateEnum
CREATE TYPE "BetStatus" AS ENUM ('SETTLED', 'PENDING', 'VOID');

-- CreateEnum
CREATE TYPE "BetSource" AS ENUM ('MANUAL', 'ODDSMONKEY');

-- CreateTable
CREATE TABLE "people" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "people_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookmakers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isExchange" BOOLEAN NOT NULL DEFAULT false,
    "commissionRate" DECIMAL(5,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bookmakers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "bookmakerId" TEXT NOT NULL,
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bet_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bet_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bets" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "exchangeAccountId" TEXT,
    "betTypeId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "bookmakerProfit" DECIMAL(10,2) NOT NULL,
    "exchangeProfit" DECIMAL(10,2),
    "status" "BetStatus" NOT NULL DEFAULT 'SETTLED',
    "source" "BetSource" NOT NULL DEFAULT 'MANUAL',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "people_name_key" ON "people"("name");

-- CreateIndex
CREATE UNIQUE INDEX "bookmakers_name_key" ON "bookmakers"("name");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_personId_bookmakerId_key" ON "accounts"("personId", "bookmakerId");

-- CreateIndex
CREATE UNIQUE INDEX "bet_types_name_key" ON "bet_types"("name");

-- CreateIndex
CREATE INDEX "bets_accountId_idx" ON "bets"("accountId");

-- CreateIndex
CREATE INDEX "bets_betTypeId_idx" ON "bets"("betTypeId");

-- CreateIndex
CREATE INDEX "bets_eventDate_idx" ON "bets"("eventDate");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_personId_fkey" FOREIGN KEY ("personId") REFERENCES "people"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_bookmakerId_fkey" FOREIGN KEY ("bookmakerId") REFERENCES "bookmakers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bets" ADD CONSTRAINT "bets_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bets" ADD CONSTRAINT "bets_exchangeAccountId_fkey" FOREIGN KEY ("exchangeAccountId") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bets" ADD CONSTRAINT "bets_betTypeId_fkey" FOREIGN KEY ("betTypeId") REFERENCES "bet_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
