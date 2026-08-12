-- CreateEnum
CREATE TYPE "BetOutcome" AS ENUM ('WON', 'LOST');

-- AlterEnum
ALTER TYPE "TransactionType" ADD VALUE 'BET_SETTLEMENT';

-- AlterTable: add forecast + outcome columns (nullable first, for backfill)
ALTER TABLE "bets" ADD COLUMN "bookmakerProfitIfWin" DECIMAL(10,2);
ALTER TABLE "bets" ADD COLUMN "bookmakerProfitIfLose" DECIMAL(10,2);
ALTER TABLE "bets" ADD COLUMN "exchangeProfitIfWin" DECIMAL(10,2);
ALTER TABLE "bets" ADD COLUMN "exchangeProfitIfLose" DECIMAL(10,2);
ALTER TABLE "bets" ADD COLUMN "outcome" "BetOutcome";

-- Backfill forecast columns from existing realized values (best effort for historical rows)
UPDATE "bets" SET
  "bookmakerProfitIfWin" = "bookmakerProfit",
  "bookmakerProfitIfLose" = "bookmakerProfit",
  "exchangeProfitIfWin" = "exchangeProfit",
  "exchangeProfitIfLose" = "exchangeProfit",
  "outcome" = CASE
    WHEN status = 'SETTLED' AND "bookmakerProfit" >= 0 THEN 'WON'::"BetOutcome"
    WHEN status = 'SETTLED' THEN 'LOST'::"BetOutcome"
    ELSE NULL
  END;

-- Forecast columns are always required going forward
ALTER TABLE "bets" ALTER COLUMN "bookmakerProfitIfWin" SET NOT NULL;
ALTER TABLE "bets" ALTER COLUMN "bookmakerProfitIfLose" SET NOT NULL;

-- Realized bookmakerProfit is now only set once settled
ALTER TABLE "bets" ALTER COLUMN "bookmakerProfit" DROP NOT NULL;

-- New bets start PENDING until an outcome is recorded
ALTER TABLE "bets" ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- AlterTable: link transactions back to the bet that generated them
ALTER TABLE "transactions" ADD COLUMN "betId" TEXT;

-- CreateIndex
CREATE INDEX "transactions_betId_idx" ON "transactions"("betId");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_betId_fkey" FOREIGN KEY ("betId") REFERENCES "bets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
