import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getUserRole, logActivity } from "@/lib/tournament-utils";
import { writeTournamentEvent } from "@/lib/firebase-events";

// POST /api/tournaments/[id]/reset - Reset tournament to OPEN status
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: tournamentId } = await params;

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: { owners: true },
    });

    if (!tournament) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }

    const role = await getUserRole(tournamentId, userId);
    if (role !== "organizer") {
      return NextResponse.json({ error: "Only the organizer can reset the tournament" }, { status: 403 });
    }

    if (tournament.status !== "ONGOING") {
      return NextResponse.json(
        { error: "Only ongoing tournaments can be reset" },
        { status: 400 }
      );
    }

    await prisma.$transaction([
      prisma.match.deleteMany({ where: { tournamentId } }),
      prisma.tournamentFinishVote.deleteMany({ where: { tournamentId } }),
      prisma.tournament.update({
        where: { id: tournamentId },
        data: {
          status: "OPEN",
          currentRound: 1,
          metadata: Prisma.DbNull,
        },
      }),
    ]);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, username: true },
    });
    const resetByName = user?.name || user?.username || "Organizer";

    await logActivity(tournamentId, userId, "tournament_reset");

    await writeTournamentEvent(tournamentId, "tournament_reset", {
      resetBy: userId,
      resetByName,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error resetting tournament:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
