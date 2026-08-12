-- Drop the two-scenario forecast columns and outcome; realized bookmakerProfit/
-- exchangeProfit already hold the correct settled values and are unaffected.
ALTER TABLE "bets" DROP COLUMN "bookmakerProfitIfWin";
ALTER TABLE "bets" DROP COLUMN "bookmakerProfitIfLose";
ALTER TABLE "bets" DROP COLUMN "exchangeProfitIfWin";
ALTER TABLE "bets" DROP COLUMN "exchangeProfitIfLose";
ALTER TABLE "bets" DROP COLUMN "outcome";

-- DropEnum
DROP TYPE "BetOutcome";
