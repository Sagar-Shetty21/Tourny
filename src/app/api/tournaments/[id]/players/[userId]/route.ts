import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserRole, logActivity } from "@/lib/tournament-utils";
import { writeTournamentEvent } from "@/lib/firebase-events";

// DELETE /api/tournaments/[id]/players/[userId] - Remove a player from the tournament
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const session = await auth();
    const currentUserId = session?.user?.id;

    if (!currentUserId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id: tournamentId, userId: targetUserId } = await params;

    // Only organizer can remove players
    const role = await getUserRole(tournamentId, currentUserId);
    if (role !== "organizer") {
      return NextResponse.json(
        { error: "Only the tournament organizer can remove players" },
        { status: 403 }
      );
    }

    // Cannot remove yourself
    if (targetUserId === currentUserId) {
      return NextResponse.json(
        { error: "You cannot remove yourself from the tournament" },
        { status: 400 }
      );
    }

    // Find the participant
    const participant = await prisma.participant.findUnique({
      where: { tournamentId_userId: { tournamentId, userId: targetUserId } },
    });

    if (!participant) {
      return NextResponse.json(
        { error: "Player not found in this tournament" },
        { status: 404 }
      );
    }

    if (participant.removedAt !== null) {
      return NextResponse.json(
        { error: "Player has already been removed" },
        { status: 400 }
      );
    }

    // Get the player's info for logging
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { name: true, username: true, email: true },
    });

    // Check if the removed player was a manager
    const targetOwner = await prisma.tournamentOwner.findUnique({
      where: { tournamentId_userId: { tournamentId, userId: targetUserId } },
    });

    // Soft-delete: set removedAt, and remove from owners if manager
    await prisma.$transaction(async (tx) => {
      await tx.participant.update({
        where: { id: participant.id },
        data: { removedAt: new Date() },
      });

      if (targetOwner && targetOwner.role === "MANAGER") {
        await tx.tournamentOwner.delete({
          where: { id: targetOwner.id },
        });
      }
    });

    await logActivity(tournamentId, currentUserId, "PLAYER_REMOVED", {
      removedUserId: targetUserId,
      removedPlayerName: targetUser?.name || targetUser?.username || "Unknown",
      wasManager: !!targetOwner && targetOwner.role === "MANAGER",
    });

    await writeTournamentEvent(tournamentId, "player_removed", {
      removedPlayerName: targetUser?.name || targetUser?.username || "Unknown",
    });

    return NextResponse.json({
      success: true,
      message: "Player removed from tournament",
    });
  } catch (error) {
    console.error("Error removing player:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
