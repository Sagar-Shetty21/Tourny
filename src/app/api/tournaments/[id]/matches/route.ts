import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/tournaments/[id]/matches - Get all matches for a tournament
export async function GET(
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
      orderBy: [
        { createdAt: "asc" },
        { id: "asc" },
      ],
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
      matches: matchesWithUserDetails,
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
