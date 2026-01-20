import { auth, clerkClient } from "@clerk/nextjs/server";
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

// Generate round-robin matches for doubles (2v2 matches)
function generateDoublesMatches(participantIds: string[]) {
  const matches = [];
  
  // Generate all unique combinations of 4 players
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
  
  // For each set of 4 players, generate all 3 possible team pairings
  for (const [p1, p2, p3, p4] of playerCombinations) {
    // Pairing 1: (p1, p2) vs (p3, p4)
    matches.push({
      player1Id: p1,
      player2Id: p2,
      player3Id: p3,
      player4Id: p4,
    });
    
    // Pairing 2: (p1, p3) vs (p2, p4)
    matches.push({
      player1Id: p1,
      player2Id: p3,
      player3Id: p2,
      player4Id: p4,
    });
    
    // Pairing 3: (p1, p4) vs (p2, p3)
    matches.push({
      player1Id: p1,
      player2Id: p4,
      player3Id: p2,
      player4Id: p3,
    });
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
          status: "PENDING",
          ...match,
        })),
      }),
    ]);

    // Fetch created matches
    const matches = await prisma.match.findMany({
      where: { tournamentId },
      orderBy: { createdAt: "asc" },
    });

    // Fetch user details for all players in the matches
    const uniquePlayerIds = new Set<string>();
    matches.forEach((match) => {
      if (match.player1Id) uniquePlayerIds.add(match.player1Id);
      if (match.player2Id) uniquePlayerIds.add(match.player2Id);
      if (match.player3Id) uniquePlayerIds.add(match.player3Id);
      if (match.player4Id) uniquePlayerIds.add(match.player4Id);
    });

    // Fetch all user details
    const client = await clerkClient();
    const userDetailsMap = new Map();
    
    await Promise.all(
      Array.from(uniquePlayerIds).map(async (playerId) => {
        try {
          const user = await client.users.getUser(playerId);
          userDetailsMap.set(playerId, {
            id: user.id,
            name: user.firstName && user.lastName 
              ? `${user.firstName} ${user.lastName}`
              : user.firstName || user.lastName || "Unknown Player",
            email: user.emailAddresses[0]?.emailAddress || null,
          });
        } catch (error) {
          console.error(`Failed to fetch user ${playerId}:`, error);
          userDetailsMap.set(playerId, {
            id: playerId,
            name: "Unknown Player",
            email: null,
          });
        }
      })
    );

    // Add user details to matches
    const matchesWithUserDetails = matches.map((match) => ({
      ...match,
      player1: match.player1Id ? userDetailsMap.get(match.player1Id) : null,
      player2: match.player2Id ? userDetailsMap.get(match.player2Id) : null,
      player3: match.player3Id ? userDetailsMap.get(match.player3Id) : null,
      player4: match.player4Id ? userDetailsMap.get(match.player4Id) : null,
    }));

    return NextResponse.json({
      success: true,
      tournament: updatedTournament,
      matches: matchesWithUserDetails,
      matchesCreated: matches.length,
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
