import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Generate round-robin matches for singles
function generateSinglesMatches(participantIds: string[]) {
  const matches = [];
  
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

// Generate round-robin matches for doubles (4-player matches)
function generateDoublesMatches(participantIds: string[]) {
  const matches = [];
  
  // Generate all unique combinations of 4 players
  for (let i = 0; i < participantIds.length; i++) {
    for (let j = i + 1; j < participantIds.length; j++) {
      for (let k = j + 1; k < participantIds.length; k++) {
        for (let l = k + 1; l < participantIds.length; l++) {
          matches.push({
            player1Id: participantIds[i],
            player2Id: participantIds[j],
            player3Id: participantIds[k],
            player4Id: participantIds[l],
          });
        }
      }
    }
  }
  
  return matches;
}

// POST /api/tournaments/[id]/start - Start the tournament
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id: tournamentId } = await params;

    // Verify user is tournament owner
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        owners: true,
        participants: true,
      },
    });

    if (!tournament) {
      return NextResponse.json(
        { error: "Tournament not found" },
        { status: 404 }
      );
    }

    const isOwner = tournament.owners.some((o) => o.userId === userId);

    if (!isOwner) {
      return NextResponse.json(
        { error: "Only tournament owners can start the tournament" },
        { status: 403 }
      );
    }

    // Validate tournament status
    if (tournament.status !== "OPEN") {
      return NextResponse.json(
        { error: "Tournament can only be started from OPEN status" },
        { status: 400 }
      );
    }

    // Check minimum participants
    const minParticipants = tournament.type === "SINGLES" ? 2 : 4;
    if (tournament.participants.length < minParticipants) {
      return NextResponse.json(
        { 
          error: `Not enough participants. Minimum ${minParticipants} required.`,
          currentCount: tournament.participants.length 
        },
        { status: 400 }
      );
    }

    // Generate matches based on tournament type
    const participantIds = tournament.participants.map((p) => p.userId);
    const matchData = tournament.type === "SINGLES" 
      ? generateSinglesMatches(participantIds)
      : generateDoublesMatches(participantIds);

    // Create matches and update tournament status in a transaction
    const [updatedTournament, createdMatches] = await prisma.$transaction([
      prisma.tournament.update({
        where: { id: tournamentId },
        data: { status: "ONGOING" },
        include: {
          owners: true,
          participants: true,
        },
      }),
      prisma.match.createMany({
        data: matchData.map((match) => ({
          tournamentId,
          ...match,
        })),
      }),
    ]);

    // Fetch created matches
    const matches = await prisma.match.findMany({
      where: { tournamentId },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      success: true,
      tournament: updatedTournament,
      matches,
      message: "Tournament started successfully",
    });
  } catch (error) {
    console.error("Error starting tournament:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
