import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

// POST /api/tournaments/[id]/join - Join a tournament
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized - Please sign in to join" },
        { status: 401 }
      );
    }

    const { id: tournamentId } = await params;
    const body = await req.json();
    const { token } = body;

    // TODO: Validate invitation token
    // TODO: Check if tournament exists and is accepting participants
    // TODO: Verify tournament hasn't started
    // TODO: Check if user is already a participant
    // TODO: Check if tournament is full (maxParticipants)
    // TODO: Add user to participants list
    // TODO: Generate user seed/bracket position

    return NextResponse.json({
      success: true,
      participation: {
        tournamentId,
        userId,
        joinedAt: new Date().toISOString(),
        seed: null, // Will be assigned when tournament starts
      },
      message: "Successfully joined tournament",
    });
  } catch (error) {
    console.error("Error joining tournament:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
