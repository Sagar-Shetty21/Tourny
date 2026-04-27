import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserRole, logActivity } from "@/lib/tournament-utils";
import { Prisma } from "@prisma/client";

// POST /api/tournaments/[id]/matches/[matchId]/reset - Reset a match result (organizer only, within 24h)
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

    // Only organizer can reset matches
    const role = await getUserRole(tournamentId, userId);
    if (role !== "organizer") {
      return NextResponse.json(
        { error: "Only the organizer can reset match results" },
        { status: 403 }
      );
    }

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: { tournament: true },
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

    if (match.status !== "FINISHED") {
      return NextResponse.json(
        { error: "Only finished matches can be reset" },
        { status: 400 }
      );
    }

    // Check 24h window from when match was last updated
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    if (match.updatedAt < twentyFourHoursAgo) {
      return NextResponse.json(
        { error: "Match can only be reset within 24 hours of the result being submitted" },
        { status: 400 }
      );
    }

    // Reset match
    const updatedMatch = await prisma.match.update({
      where: { id: matchId },
      data: {
        result: Prisma.DbNull,
        status: "PENDING",
      },
    });

    await logActivity(tournamentId, userId, "MATCH_RESET", {
      matchId,
      previousResult: match.result,
    });

    return NextResponse.json({
      success: true,
      match: updatedMatch,
      message: "Match result has been reset",
    });
  } catch (error) {
    console.error("Error resetting match:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
