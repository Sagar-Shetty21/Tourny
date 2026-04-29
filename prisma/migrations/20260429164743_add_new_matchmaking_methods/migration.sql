-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MatchmakingMethod" ADD VALUE 'SWISS';
ALTER TYPE "MatchmakingMethod" ADD VALUE 'ROTATING_PARTNER';
ALTER TYPE "MatchmakingMethod" ADD VALUE 'KING_OF_THE_COURT';

-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "round" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "Tournament" ADD COLUMN     "currentRound" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "totalMatches" INTEGER,
ADD COLUMN     "totalRounds" INTEGER;
