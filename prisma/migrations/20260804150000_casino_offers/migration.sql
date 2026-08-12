-- AlterTable: drop the Bet category concept (Casino is now its own model)
ALTER TABLE "bets" DROP COLUMN "category";

-- DropEnum
DROP TYPE "BetCategory";

-- CreateTable
CREATE TABLE "casino_offer_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "casino_offer_types_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "casino_offer_types_name_key" ON "casino_offer_types"("name");

-- CreateEnum
CREATE TYPE "CasinoOfferStatus" AS ENUM ('COMPLETED', 'IN_PROGRESS', 'FORFEITED');

-- CreateTable
CREATE TABLE "casino_offers" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "offerTypeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "offerDate" TIMESTAMP(3) NOT NULL,
    "profit" DECIMAL(10,2) NOT NULL,
    "status" "CasinoOfferStatus" NOT NULL DEFAULT 'COMPLETED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "casino_offers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "casino_offers_accountId_idx" ON "casino_offers"("accountId");

-- CreateIndex
CREATE INDEX "casino_offers_offerTypeId_idx" ON "casino_offers"("offerTypeId");

-- CreateIndex
CREATE INDEX "casino_offers_offerDate_idx" ON "casino_offers"("offerDate");

-- AddForeignKey
ALTER TABLE "casino_offers" ADD CONSTRAINT "casino_offers_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "casino_offers" ADD CONSTRAINT "casino_offers_offerTypeId_fkey" FOREIGN KEY ("offerTypeId") REFERENCES "casino_offer_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
