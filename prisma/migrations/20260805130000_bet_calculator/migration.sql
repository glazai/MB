-- CreateEnum
CREATE TYPE "BetOutcome" AS ENUM ('BOOKMAKER', 'EXCHANGE');

-- AlterTable: back/lay calculator inputs, only meaningful when exchangeAccountId is set
ALTER TABLE "bets" ADD COLUMN "backStake" DECIMAL(10,2);
ALTER TABLE "bets" ADD COLUMN "backOdds" DECIMAL(6,3);
ALTER TABLE "bets" ADD COLUMN "layOdds" DECIMAL(6,3);
ALTER TABLE "bets" ADD COLUMN "commission" DECIMAL(5,2);
ALTER TABLE "bets" ADD COLUMN "snr" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "bets" ADD COLUMN "outcome" "BetOutcome";
