import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/tournaments/[id]/public - Public tournament view (no auth required)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tournamentId } = await params;

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
        createdAt: true,
        participants: {
          where: { removedAt: null },
          select: {
            id: true,
            user: {
              select: { name: true, username: true },
            },
          },
        },
        matches: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            player1: { select: { name: true, username: true } },
            player2: { select: { name: true, username: true } },
            player3: { select: { name: true, username: true } },
            player4: { select: { name: true, username: true } },
            result: true,
            status: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            participants: { where: { removedAt: null } },
            matches: true,
          },
        },
      },
    });

    if (!tournament) {
      return NextResponse.json(
        { error: "Tournament not found" },
        { status: 404 }
      );
    }

    // Map participant names
    const participants = tournament.participants.map((p) => ({
      id: p.id,
      displayName: p.user.name || p.user.username,
    }));

    return NextResponse.json({
      tournament: {
        id: tournament.id,
        name: tournament.name,
        type: tournament.type,
        status: tournament.status,
        createdAt: tournament.createdAt,
        participantCount: tournament._count.participants,
        matchCount: tournament._count.matches,
      },
      participants,
      matches: tournament.matches.map((m) => {
        const isDoubles = !!(m.player3 && m.player4);
        const p1Name = m.player1?.name || m.player1?.username || "?";
        const p2Name = m.player2?.name || m.player2?.username || "?";
        const p3Name = m.player3?.name || m.player3?.username || "?";
        const p4Name = m.player4?.name || m.player4?.username || "?";
        return {
          id: m.id,
          team1: isDoubles ? `${p1Name} & ${p2Name}` : p1Name,
          team2: isDoubles ? `${p3Name} & ${p4Name}` : p2Name,
          team1Players: isDoubles ? [p1Name, p2Name] : [p1Name],
          team2Players: isDoubles ? [p3Name, p4Name] : [p2Name],
          result: m.result,
          status: m.status,
          createdAt: m.createdAt,
        };
      }),
    });
  } catch (error) {
    console.error("Error fetching public tournament:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
