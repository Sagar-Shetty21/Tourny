/*
  Warnings:

  - Added the required column `createdBy` to the `Tournament` table without a default value. This is not possible if the table is not empty.

*/
-- Step 1: Add column as nullable first
ALTER TABLE "Tournament" ADD COLUMN "createdBy" TEXT;

-- Step 2: Set createdBy to the first owner's userId for existing tournaments
UPDATE "Tournament" t
SET "createdBy" = (
  SELECT "userId" 
  FROM "TournamentOwner" 
  WHERE "tournamentId" = t."id" 
  LIMIT 1
)
WHERE "createdBy" IS NULL;

-- Step 3: Make the column NOT NULL
ALTER TABLE "Tournament" ALTER COLUMN "createdBy" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Tournament_createdBy_idx" ON "Tournament"("createdBy");
