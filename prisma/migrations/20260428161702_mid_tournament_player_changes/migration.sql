-- AlterEnum
ALTER TYPE "MatchStatus" ADD VALUE 'STALE';

-- AlterTable
ALTER TABLE "Participant" ADD COLUMN     "removedAt" TIMESTAMP(3);
