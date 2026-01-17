import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

// GET /api/tournaments/[id]/matches - Get all matches for a tournament
export async function GET(
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

    // TODO: Fetch all matches for this tournament from database
    // TODO: Include participant details
    // TODO: Include match results and scores
    // TODO: Order by round and match number
    // TODO: Filter by status (optional query param: ?status=pending|completed)

    return NextResponse.json({
      success: true,
      matches: [
        // Placeholder empty array
        // Example structure:
        // {
        //   id: "match_1",
        //   tournamentId,
        //   round: 1,
        //   matchNumber: 1,
        //   player1Id: "user_1",
        //   player2Id: "user_2",
        //   winnerId: null,
        //   score: null,
        //   status: "pending",
        //   scheduledAt: null,
        //   completedAt: null,
        // }
      ],
      total: 0,
    });
  } catch (error) {
    console.error("Error fetching matches:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
