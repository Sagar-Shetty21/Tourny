import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

// POST /api/tournaments/[id]/matches/[matchId]/result - Submit match result
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; matchId: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id: tournamentId, matchId } = await params;
    const body = await req.json();
    const { winnerId, score } = body;

    // TODO: Verify user is tournament organizer or match participant
    // TODO: Validate match exists and belongs to tournament
    // TODO: Validate match is in 'pending' or 'in-progress' status
    // TODO: Validate winnerId is one of the match participants
    // TODO: Update match with result and status = 'completed'
    // TODO: Update bracket (advance winner to next round)
    // TODO: Check if tournament is completed (no more pending matches)
    // TODO: If completed, update tournament status and determine champion

    return NextResponse.json({
      success: true,
      match: {
        id: matchId,
        tournamentId,
        winnerId,
        score,
        status: "completed",
        completedAt: new Date().toISOString(),
      },
      nextMatch: null, // ID of next match if winner advances
      tournamentComplete: false,
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
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id: tournamentId, matchId } = await params;

    // TODO: Fetch match details from database
    // TODO: Include participant information
    // TODO: Include score and result if completed

    return NextResponse.json({
      success: true,
      match: {
        id: matchId,
        tournamentId,
        round: 1,
        player1Id: "user_1",
        player2Id: "user_2",
        winnerId: null,
        score: null,
        status: "pending",
      },
    });
  } catch (error) {
    console.error("Error fetching match result:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
