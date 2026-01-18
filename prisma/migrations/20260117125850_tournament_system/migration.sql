/*
  Warnings:

  - You are about to drop the column `ownerId` on the `Tournament` table. All the data in the column will be lost.
  - The `status` column on the `Tournament` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `type` to the `Tournament` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Tournament` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TournamentType" AS ENUM ('SINGLES', 'DOUBLES');

-- CreateEnum
CREATE TYPE "MatchmakingMethod" AS ENUM ('ROUND_ROBIN');

-- CreateEnum
CREATE TYPE "TournamentStatus" AS ENUM ('OPEN', 'ONGOING', 'FINISHED');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('PENDING', 'FINISHED');

-- AlterTable
ALTER TABLE "Tournament" DROP COLUMN "ownerId",
ADD COLUMN     "joinExpiry" TIMESTAMP(3),
ADD COLUMN     "matchmakingMethod" "MatchmakingMethod" NOT NULL DEFAULT 'ROUND_ROBIN',
ADD COLUMN     "maxParticipants" INTEGER,
ADD COLUMN     "type" "TournamentType" NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "TournamentStatus" NOT NULL DEFAULT 'OPEN';

-- CreateTable
CREATE TABLE "TournamentOwner" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TournamentOwner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Participant" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Participant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "player1Id" TEXT,
    "player2Id" TEXT,
    "player3Id" TEXT,
    "player4Id" TEXT,
    "status" "MatchStatus" NOT NULL DEFAULT 'PENDING',
    "result" JSONB,
    "scheduledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invite" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TournamentOwner_userId_idx" ON "TournamentOwner"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentOwner_tournamentId_userId_key" ON "TournamentOwner"("tournamentId", "userId");

-- CreateIndex
CREATE INDEX "Participant_userId_idx" ON "Participant"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Participant_tournamentId_userId_key" ON "Participant"("tournamentId", "userId");

-- CreateIndex
CREATE INDEX "Match_tournamentId_idx" ON "Match"("tournamentId");

-- CreateIndex
CREATE INDEX "Match_status_idx" ON "Match"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Invite_token_key" ON "Invite"("token");

-- CreateIndex
CREATE INDEX "Invite_token_idx" ON "Invite"("token");

-- CreateIndex
CREATE INDEX "Tournament_status_idx" ON "Tournament"("status");

-- AddForeignKey
ALTER TABLE "TournamentOwner" ADD CONSTRAINT "TournamentOwner_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;
