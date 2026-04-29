import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getUserRole,
  logActivity,
  getMinPlayers,
  shuffle,
  generateSwissRoundSingles,
  generateSwissRoundDoubles,
  generateRotatingPartnerSchedule,
  generateKotcFirstMatch,
  buildPastPairings,
} from "@/lib/tournament-utils";
import { writeTournamentEvent } from "@/lib/firebase-events";
import { sendPushToUsers } from "@/lib/push-notifications";

// Generate round-robin matches for singles
function generateSinglesMatches(participantIds: string[]) {
  const matches = [];
  
  for (let i = 0; i < participantIds.length; i++) {
    for (let j = i + 1; j < participantIds.length; j++) {
      matches.push({
        player1Id: participantIds[i],
        player2Id: participantIds[j],
        round: 1,
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
    matches.push({
      player1Id: p1, player2Id: p2, player3Id: p3, player4Id: p4, round: 1,
    });
    matches.push({
      player1Id: p1, player2Id: p3, player3Id: p2, player4Id: p4, round: 1,
    });
    matches.push({
      player1Id: p1, player2Id: p4, player3Id: p2, player4Id: p3, round: 1,
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
    const session = await auth();
    const userId = session?.user?.id;

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

    const role = await getUserRole(tournamentId, userId);

    if (role !== "organizer") {
      return NextResponse.json(
        { error: "Only the tournament organizer can start the tournament" },
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
    const minParticipants = getMinPlayers(tournament.matchmakingMethod, tournament.type);
    if (tournament.participants.length < minParticipants) {
      return NextResponse.json(
        { 
          error: `Not enough participants. Minimum ${minParticipants} required for ${tournament.matchmakingMethod.replace(/_/g, ' ')}.`,
          currentCount: tournament.participants.length 
        },
        { status: 400 }
      );
    }

    // Generate matches based on matchmaking method
    const participantIds = tournament.participants.map((p) => p.userId);
    let matchData: Array<{
      player1Id: string;
      player2Id: string;
      player3Id?: string | null;
      player4Id?: string | null;
      round: number;
    }>;
    let tournamentUpdateData: Record<string, any> = { status: "ONGOING" };

    switch (tournament.matchmakingMethod) {
      case "SWISS": {
        // Generate only round 1
        if (tournament.type === "SINGLES") {
          matchData = generateSwissRoundSingles(
            participantIds, [], 1, new Set()
          );
        } else {
          matchData = generateSwissRoundDoubles(
            participantIds, [], 1, new Set(), new Set()
          );
        }
        tournamentUpdateData.currentRound = 1;
        break;
      }

      case "ROTATING_PARTNER": {
        matchData = generateRotatingPartnerSchedule(
          participantIds,
          tournament.totalRounds || 6
        );
        break;
      }

      case "KING_OF_THE_COURT": {
        const { match, metadata } = generateKotcFirstMatch(
          participantIds,
          tournament.type as "SINGLES" | "DOUBLES"
        );
        matchData = [match];
        tournamentUpdateData.metadata = metadata;
        tournamentUpdateData.currentRound = 1;
        break;
      }

      case "ROUND_ROBIN":
      default: {
        matchData = shuffle(
          tournament.type === "SINGLES"
            ? generateSinglesMatches(participantIds)
            : generateDoublesMatches(participantIds)
        );
        break;
      }
    }

    // Filter out BYE matches (for Swiss with odd players) — create them as special records
    const realMatches = matchData.filter((m) => m.player2Id !== "BYE" && m.player1Id !== "BYE");
    const byeMatches = matchData.filter((m) => m.player2Id === "BYE" || m.player1Id === "BYE");

    // Create matches and update tournament status in a transaction
    const [updatedTournament, createdMatches] = await prisma.$transaction([
      prisma.tournament.update({
        where: { id: tournamentId },
        data: tournamentUpdateData,
        include: {
          owners: true,
          participants: true,
        },
      }),
      prisma.match.createMany({
        data: [
          ...realMatches.map((match) => ({
            tournamentId,
            status: "PENDING" as const,
            player1Id: match.player1Id,
            player2Id: match.player2Id,
            player3Id: match.player3Id || null,
            player4Id: match.player4Id || null,
            round: match.round,
          })),
          // Bye matches are auto-finished
          ...byeMatches.map((match) => ({
            tournamentId,
            status: "FINISHED" as const,
            player1Id: match.player1Id === "BYE" ? null : match.player1Id,
            player2Id: match.player2Id === "BYE" ? null : match.player2Id,
            player3Id: null,
            player4Id: null,
            round: match.round,
            result: { winner: match.player1Id === "BYE" ? "team2" : "team1", bye: true } as any,
          })),
        ],
      }),
    ]);

    await logActivity(tournamentId, userId, "TOURNAMENT_STARTED", {
      matchCount: matchData.length,
    });

    await writeTournamentEvent(tournamentId, "tournament_started", {
      matchCount: matchData.length,
    });

    // Push to all participants
    sendPushToUsers(
      participantIds,
      "Tournament Started!",
      `${tournament.name} has started with ${matchData.length} matches`,
      `/tournaments/${tournamentId}`
    ).catch(() => {});

    // Fetch created matches
    const matches = await prisma.match.findMany({
      where: { tournamentId },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });

    // Fetch user details for all players in the matches
    const uniquePlayerIds = new Set<string>();
    matches.forEach((match) => {
      if (match.player1Id) uniquePlayerIds.add(match.player1Id);
      if (match.player2Id) uniquePlayerIds.add(match.player2Id);
      if (match.player3Id) uniquePlayerIds.add(match.player3Id);
      if (match.player4Id) uniquePlayerIds.add(match.player4Id);
    });

    // Fetch all user details from local DB
    const users = await prisma.user.findMany({
      where: { id: { in: Array.from(uniquePlayerIds) } },
      select: { id: true, name: true, username: true, email: true },
    });
    const userDetailsMap = new Map(
      users.map((u) => [u.id, { id: u.id, name: u.name || u.username, email: u.email }])
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
