import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// DELETE /api/tournaments/[id]/invite/[inviteId] - Delete an invitation
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; inviteId: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id: tournamentId, inviteId } = await params;

    // Verify user is tournament owner
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: { 
        owners: true,
        invites: true,
      },
    });

    if (!tournament) {
      return NextResponse.json(
        { error: "Tournament not found" },
        { status: 404 }
      );
    }

    const isOwner = tournament.owners.some((o) => o.userId === userId);

    if (!isOwner) {
      return NextResponse.json(
        { error: "Only tournament owners can delete invitations" },
        { status: 403 }
      );
    }

    // Check if this is the last invite
    if (tournament.invites.length <= 1) {
      return NextResponse.json(
        { error: "Cannot delete the last invitation. You must keep at least one active invite." },
        { status: 400 }
      );
    }

    // Verify the invite exists and belongs to this tournament
    const invite = await prisma.invite.findUnique({
      where: { id: inviteId },
    });

    if (!invite) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    if (invite.tournamentId !== tournamentId) {
      return NextResponse.json(
        { error: "Invitation does not belong to this tournament" },
        { status: 400 }
      );
    }

    // Delete the invitation
    await prisma.invite.delete({
      where: { id: inviteId },
    });

    return NextResponse.json({
      success: true,
      message: "Invitation deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting invitation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
