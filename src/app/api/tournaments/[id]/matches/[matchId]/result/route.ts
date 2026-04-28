import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserRole, logActivity } from "@/lib/tournament-utils";
import { writeTournamentEvent } from "@/lib/firebase-events";
import { sendPushToUsers } from "@/lib/push-notifications";

// POST /api/tournaments/[id]/matches/[matchId]/result - Submit match result
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; matchId: string }> }
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

    const { id: tournamentId, matchId } = await params;
    const body = await req.json();
    const { result } = body;

    if (!result) {
      return NextResponse.json(
        { error: "Result is required" },
        { status: 400 }
      );
    }

    // Verify user is organizer or manager
    const role = await getUserRole(tournamentId, userId);
    if (role !== "organizer" && role !== "manager") {
      return NextResponse.json(
        { error: "Only organizers and managers can submit results" },
        { status: 403 }
      );
    }

    // Verify match exists and belongs to tournament
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        tournament: true,
      },
    });

    if (!match) {
      return NextResponse.json(
        { error: "Match not found" },
        { status: 404 }
      );
    }

    if (match.tournamentId !== tournamentId) {
      return NextResponse.json(
        { error: "Match does not belong to tournament" },
        { status: 400 }
      );
    }

    // Block if tournament is not ONGOING
    if (match.tournament.status !== "ONGOING") {
      return NextResponse.json(
        { error: "Can only submit results for ongoing tournaments" },
        { status: 400 }
      );
    }

    // Validate match status
    if (match.status === "FINISHED") {
      return NextResponse.json(
        { error: "Match result already submitted" },
        { status: 400 }
      );
    }

    // Update match with result
    const updatedMatch = await prisma.match.update({
      where: { id: matchId },
      data: {
        result,
        status: "FINISHED",
      },
    });

    await logActivity(tournamentId, userId, "MATCH_RESULT_SUBMITTED", {
      matchId,
      result,
    });

    // Get match details for the event
    const matchWithPlayers = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        player1: { select: { name: true, username: true } },
        player2: { select: { name: true, username: true } },
        player3: { select: { name: true, username: true } },
        player4: { select: { name: true, username: true } },
      },
    });
    const allMatches = await prisma.match.findMany({
      where: { tournamentId },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: { id: true },
    });
    const matchNumber = allMatches.findIndex((m) => m.id === matchId) + 1;
    const isDoubles = !!(matchWithPlayers?.player3 && matchWithPlayers?.player4);
    const t1Name = isDoubles
      ? `${matchWithPlayers?.player1?.name || matchWithPlayers?.player1?.username || "?"} & ${matchWithPlayers?.player2?.name || matchWithPlayers?.player2?.username || "?"}`
      : matchWithPlayers?.player1?.name || matchWithPlayers?.player1?.username || "?";
    const t2Name = isDoubles
      ? `${matchWithPlayers?.player3?.name || matchWithPlayers?.player3?.username || "?"} & ${matchWithPlayers?.player4?.name || matchWithPlayers?.player4?.username || "?"}`
      : matchWithPlayers?.player2?.name || matchWithPlayers?.player2?.username || "?";
    const resultText = result.winner === "draw" ? `${t1Name} vs ${t2Name} — Draw` : result.winner === "team1" ? `${t1Name} beat ${t2Name}` : `${t2Name} beat ${t1Name}`;

    await writeTournamentEvent(tournamentId, "match_completed", {
      matchId,
      matchNumber,
      resultText,
    });

    // Push to players in this match
    const matchPlayerIds = [match.player1Id, match.player2Id, match.player3Id, match.player4Id].filter(Boolean) as string[];
    sendPushToUsers(
      matchPlayerIds,
      "Match Result",
      `Match #${matchNumber} — ${resultText}`,
      `/tournaments/${tournamentId}/matches`
    ).catch(() => {});

    // Check if all matches are finished (inform frontend, but don't auto-finish)
    const pendingMatches = await prisma.match.count({
      where: {
        tournamentId,
        status: "PENDING",
      },
    });

    const allMatchesComplete = pendingMatches === 0;

    return NextResponse.json({
      success: true,
      match: updatedMatch,
      allMatchesComplete,
      message: "Match result submitted successfully",
    });
  } catch (error) {
    console.error("Error submitting match result:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET /api/tournaments/[id]/matches/[matchId]/result - Get match result
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; matchId: string }> }
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

    const { id: tournamentId, matchId } = await params;

    const match = await prisma.match.findUnique({
      where: { id: matchId },
    });

    if (!match) {
      return NextResponse.json(
        { error: "Match not found" },
        { status: 404 }
      );
    }

    if (match.tournamentId !== tournamentId) {
      return NextResponse.json(
        { error: "Match does not belong to tournament" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      match,
    });
  } catch (error) {
    console.error("Error fetching match result:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
