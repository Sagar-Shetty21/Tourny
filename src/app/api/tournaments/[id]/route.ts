import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/tournaments/[id] - Get tournament details
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

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        owners: true,
        participants: true,
        matches: {
          orderBy: { createdAt: "asc" },
        },
        invites: true,
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

    // Check if user has access (owner or participant)
    const isOwner = tournament.owners.some((o) => o.userId === userId);
    const isParticipant = tournament.participants.some((p) => p.userId === userId);

    if (!isOwner && !isParticipant) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // Fetch user details from Clerk for all participants
    const participantsWithUserDetails = await Promise.all(
      tournament.participants.map(async (participant) => {
        try {
          const client = await clerkClient();
          const user = await client.users.getUser(participant.userId);
          return {
            ...participant,
            user: {
              id: user.id,
              name: user.firstName && user.lastName 
                ? `${user.firstName} ${user.lastName}`
                : user.firstName || user.lastName || null,
              email: user.emailAddresses[0]?.emailAddress || null,
            },
          };
        } catch (error) {
          console.error(`Failed to fetch user ${participant.userId}:`, error);
          return {
            ...participant,
            user: {
              id: participant.userId,
              name: null,
              email: null,
            },
          };
        }
      })
    );

    return NextResponse.json({
      success: true,
      tournament: {
        ...tournament,
        participants: participantsWithUserDetails,
      },
      isOwner,
      isParticipant,
    });
  } catch (error) {
    console.error("Error fetching tournament:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/tournaments/[id] - Update tournament details
export async function PATCH(
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
    const body = await req.json();

    // Verify user is tournament owner
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: { owners: true },
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
        { error: "Only tournament owners can update" },
        { status: 403 }
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

// DELETE /api/tournaments/[id] - Delete tournament
export async function DELETE(
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

    // Verify user is tournament owner
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: { owners: true },
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
        { error: "Only tournament owners can delete" },
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
