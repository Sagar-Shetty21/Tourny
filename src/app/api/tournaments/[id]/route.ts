import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserRole } from "@/lib/tournament-utils";

// GET /api/tournaments/[id] - Get tournament details
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

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        owners: true,
        participants: {
          include: {
            user: {
              select: { id: true, name: true, username: true, email: true },
            },
          },
        },
        matches: {
          orderBy: { createdAt: "asc" },
          include: {
            player1: { select: { id: true, name: true, username: true } },
            player2: { select: { id: true, name: true, username: true } },
            player3: { select: { id: true, name: true, username: true } },
            player4: { select: { id: true, name: true, username: true } },
          },
        },
        invites: true,
        finishVotes: true,
        _count: {
          select: {
            matches: true,
            participants: true,
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

    const role = await getUserRole(tournamentId, userId);

    if (!role) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // Map participants to include user details
    const participantsWithUserDetails = tournament.participants.map((participant) => ({
      ...participant,
      user: {
        id: participant.user.id,
        name: participant.user.name || participant.user.username,
        email: participant.user.email || null,
      },
    }));

    // Normalize player names in matches
    const normalizePlayer = (p: { id: string; name: string | null; username: string } | null) =>
      p ? { id: p.id, name: p.name || p.username } : null;

    const matchesWithPlayers = tournament.matches.map((match) => ({
      ...match,
      player1: normalizePlayer(match.player1),
      player2: normalizePlayer(match.player2),
      player3: normalizePlayer(match.player3),
      player4: normalizePlayer(match.player4),
    }));

    return NextResponse.json({
      success: true,
      tournament: {
        ...tournament,
        participants: participantsWithUserDetails,
        matches: matchesWithPlayers,
      },
      role,
      // Keep isOwner for backward compat during migration
      isOwner: role === "organizer" || role === "manager",
      isParticipant: role === "participant",
    });
  } catch (error) {
    console.error("Error fetching tournament:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/tournaments/[id] - Update tournament details (organizer only)
export async function PATCH(
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
    const body = await req.json();

    const role = await getUserRole(tournamentId, userId);

    if (role !== "organizer") {
      return NextResponse.json(
        { error: "Only the tournament organizer can update settings" },
        { status: 403 }
      );
    }

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      return NextResponse.json(
        { error: "Tournament not found" },
        { status: 404 }
      );
    }

    // Prevent updates if tournament has started
    if (tournament.status === "ONGOING" || tournament.status === "FINISHED") {
      return NextResponse.json(
        { error: "Cannot update tournament that has started" },
        { status: 400 }
      );
    }

    // Update tournament
    const updatedTournament = await prisma.tournament.update({
      where: { id: tournamentId },
      data: {
        name: body.name,
        maxParticipants: body.maxParticipants,
        joinExpiry: body.joinExpiry ? new Date(body.joinExpiry) : undefined,
      },
      include: {
        owners: true,
        participants: true,
      },
    });

    return NextResponse.json({
      success: true,
      tournament: updatedTournament,
      message: "Tournament updated successfully",
    });
  } catch (error) {
    console.error("Error updating tournament:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/tournaments/[id] - Delete tournament (organizer only)
export async function DELETE(
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

    const role = await getUserRole(tournamentId, userId);

    if (role !== "organizer") {
      return NextResponse.json(
        { error: "Only the tournament organizer can delete" },
        { status: 403 }
      );
    }

    // Delete tournament (cascade will delete related records)
    await prisma.tournament.delete({
      where: { id: tournamentId },
    });

    return NextResponse.json({
      success: true,
      message: "Tournament deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting tournament:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
