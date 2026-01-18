import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
    const { result } = body;

    if (!result) {
      return NextResponse.json(
        { error: "Result is required" },
        { status: 400 }
      );
    }

    // Verify match exists and belongs to tournament
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        tournament: {
          include: { owners: true },
        },
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

    // Verify user is tournament owner
    const isOwner = match.tournament.owners.some((o) => o.userId === userId);

    if (!isOwner) {
      return NextResponse.json(
        { error: "Only tournament owners can submit results" },
        { status: 403 }
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

    // Check if all matches are finished
    const pendingMatches = await prisma.match.count({
      where: {
        tournamentId,
        status: "PENDING",
      },
    });

    let tournamentComplete = false;

    // If no pending matches, mark tournament as finished
    if (pendingMatches === 0) {
      await prisma.tournament.update({
        where: { id: tournamentId },
        data: { status: "FINISHED" },
      });
      tournamentComplete = true;
    }

    return NextResponse.json({
      success: true,
      match: updatedMatch,
      tournamentComplete,
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
