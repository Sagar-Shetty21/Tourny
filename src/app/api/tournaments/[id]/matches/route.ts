import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    // Verify user has access to tournament
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
    const isParticipant = tournament.participants.some((p) => p.userId === userId);

    if (!isOwner && !isParticipant) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // Fetch matches with optional status filter
    const matches = await prisma.match.findMany({
      where: {
        tournamentId,
        ...(status && { status: status.toUpperCase() as any }),
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return NextResponse.json({
      success: true,
      matches,
      total: matches.length,
    });
  } catch (error) {
    console.error("Error fetching matches:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
