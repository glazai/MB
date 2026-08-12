-- AlterTable: stake for single-leg bets (no exchange leg), so exposure can be tracked while Pending
ALTER TABLE "bets" ADD COLUMN "stake" DECIMAL(10,2);
