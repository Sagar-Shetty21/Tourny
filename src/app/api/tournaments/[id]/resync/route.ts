import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserRole, logActivity } from "@/lib/tournament-utils";

// Generate round-robin matches for singles
function generateSinglesMatches(participantIds: string[]) {
  const matches: { player1Id: string; player2Id: string }[] = [];
  for (let i = 0; i < participantIds.length; i++) {
    for (let j = i + 1; j < participantIds.length; j++) {
      matches.push({
        player1Id: participantIds[i],
        player2Id: participantIds[j],
      });
    }
  }
  return matches;
}

// Generate round-robin matches for doubles (2v2)
function generateDoublesMatches(participantIds: string[]) {
  const matches: {
    player1Id: string;
    player2Id: string;
    player3Id: string;
    player4Id: string;
  }[] = [];

  const playerCombinations: string[][] = [];
  for (let i = 0; i < participantIds.length; i++) {
    for (let j = i + 1; j < participantIds.length; j++) {
      for (let k = j + 1; k < participantIds.length; k++) {
        for (let l = k + 1; l < participantIds.length; l++) {
          playerCombinations.push([
            participantIds[i],
            participantIds[j],
            participantIds[k],
            participantIds[l],
          ]);
        }
      }
    }
  }

  for (const [p1, p2, p3, p4] of playerCombinations) {
    matches.push({ player1Id: p1, player2Id: p2, player3Id: p3, player4Id: p4 });
    matches.push({ player1Id: p1, player2Id: p3, player3Id: p2, player4Id: p4 });
    matches.push({ player1Id: p1, player2Id: p4, player3Id: p2, player4Id: p3 });
  }

  return matches;
}

// Create a match key for comparison (order-independent)
function singlesMatchKey(p1: string, p2: string): string {
  return [p1, p2].sort().join("-");
}

function doublesMatchKey(p1: string, p2: string, p3: string, p4: string): string {
  const team1 = [p1, p2].sort().join(",");
  const team2 = [p3, p4].sort().join(",");
  return [team1, team2].sort().join("-vs-");
}

// POST /api/tournaments/[id]/resync - Resync matches after player changes
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id: tournamentId } = await params;

    const role = await getUserRole(tournamentId, userId);
    if (role !== "organizer") {
      return NextResponse.json(
        { error: "Only the tournament organizer can resync matches" },
        { status: 403 }
      );
    }

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        participants: true,
        matches: true,
      },
    });

    if (!tournament) {
      return NextResponse.json(
        { error: "Tournament not found" },
        { status: 404 }
      );
    }

    if (tournament.status !== "ONGOING") {
      return NextResponse.json(
        { error: "Can only resync matches for ongoing tournaments" },
        { status: 400 }
      );
    }

    const activeParticipantIds = tournament.participants
      .filter((p) => p.removedAt === null)
      .map((p) => p.userId);

    const removedParticipantIds = new Set(
      tournament.participants
        .filter((p) => p.removedAt !== null)
        .map((p) => p.userId)
    );

    // Get existing non-STALE matches
    const existingMatches = tournament.matches.filter(
      (m) => m.status !== "STALE"
    );

    const isSingles = tournament.type === "SINGLES";

    let matchesCreated = 0;
    let matchesDeleted = 0;
    let matchesStaled = 0;

    if (isSingles) {
      // --- SINGLES LOGIC ---

      // Build set of existing match keys
      const existingMatchKeys = new Set(
        existingMatches.map((m) =>
          singlesMatchKey(m.player1Id!, m.player2Id!)
        )
      );

      // Generate expected matches for active participants
      const expectedMatches = generateSinglesMatches(activeParticipantIds);

      // Find NEW matches (in expected but not in existing)
      const newMatches = expectedMatches.filter(
        (m) => !existingMatchKeys.has(singlesMatchKey(m.player1Id, m.player2Id))
      );

      // Handle removed players' matches
      const matchesToDelete: string[] = [];
      const matchesToStale: string[] = [];

      for (const match of existingMatches) {
        const involvesRemoved =
          removedParticipantIds.has(match.player1Id!) ||
          removedParticipantIds.has(match.player2Id!);

        if (involvesRemoved) {
          if (match.status === "PENDING") {
            matchesToDelete.push(match.id);
          } else if (match.status === "FINISHED") {
            matchesToStale.push(match.id);
          }
        }
      }

      // Execute all changes in a transaction
      await prisma.$transaction(async (tx) => {
        if (newMatches.length > 0) {
          await tx.match.createMany({
            data: newMatches.map((m) => ({
              tournamentId,
              status: "PENDING" as const,
              player1Id: m.player1Id,
              player2Id: m.player2Id,
            })),
          });
          matchesCreated = newMatches.length;
        }

        if (matchesToDelete.length > 0) {
          await tx.match.deleteMany({
            where: { id: { in: matchesToDelete } },
          });
          matchesDeleted = matchesToDelete.length;
        }

        if (matchesToStale.length > 0) {
          await tx.match.updateMany({
            where: { id: { in: matchesToStale } },
            data: { status: "STALE" },
          });
          matchesStaled = matchesToStale.length;
        }
      });
    } else {
      // --- DOUBLES LOGIC ---

      // Build set of existing match keys
      const existingMatchKeys = new Set(
        existingMatches.map((m) =>
          doublesMatchKey(m.player1Id!, m.player2Id!, m.player3Id!, m.player4Id!)
        )
      );

      // Generate expected matches for active participants
      const expectedMatches = generateDoublesMatches(activeParticipantIds);

      // Find NEW matches
      const newMatches = expectedMatches.filter(
        (m) =>
          !existingMatchKeys.has(
            doublesMatchKey(m.player1Id, m.player2Id, m.player3Id, m.player4Id)
          )
      );

      // Handle removed players' matches
      const matchesToDelete: string[] = [];
      const matchesToStale: string[] = [];

      for (const match of existingMatches) {
        const playerIds = [
          match.player1Id,
          match.player2Id,
          match.player3Id,
          match.player4Id,
        ].filter(Boolean) as string[];

        const involvesRemoved = playerIds.some((id) =>
          removedParticipantIds.has(id)
        );

        if (involvesRemoved) {
          if (match.status === "PENDING") {
            matchesToDelete.push(match.id);
          } else if (match.status === "FINISHED") {
            matchesToStale.push(match.id);
          }
        }
      }

      await prisma.$transaction(async (tx) => {
        if (newMatches.length > 0) {
          await tx.match.createMany({
            data: newMatches.map((m) => ({
              tournamentId,
              status: "PENDING" as const,
              player1Id: m.player1Id,
              player2Id: m.player2Id,
              player3Id: m.player3Id,
              player4Id: m.player4Id,
            })),
          });
          matchesCreated = newMatches.length;
        }

        if (matchesToDelete.length > 0) {
          await tx.match.deleteMany({
            where: { id: { in: matchesToDelete } },
          });
          matchesDeleted = matchesToDelete.length;
        }

        if (matchesToStale.length > 0) {
          await tx.match.updateMany({
            where: { id: { in: matchesToStale } },
            data: { status: "STALE" },
          });
          matchesStaled = matchesToStale.length;
        }
      });
    }

    await logActivity(tournamentId, userId, "MATCHES_RESYNCED", {
      matchesCreated,
      matchesDeleted,
      matchesStaled,
      activePlayerCount: activeParticipantIds.length,
      removedPlayerCount: removedParticipantIds.size,
      tournamentType: tournament.type,
    });

    return NextResponse.json({
      success: true,
      matchesCreated,
      matchesDeleted,
      matchesStaled,
      message: "Matches resynced successfully",
    });
  } catch (error) {
    console.error("Error resyncing matches:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
