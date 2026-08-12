-- CreateEnum
CREATE TYPE "BetCategory" AS ENUM ('SPORTS', 'CASINO');

-- AlterTable
ALTER TABLE "bets" ADD COLUMN "category" "BetCategory" NOT NULL DEFAULT 'SPORTS';

-- CreateIndex
CREATE INDEX "bets_category_idx" ON "bets"("category");
