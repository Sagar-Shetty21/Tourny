import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

// POST: Add a new owner to the tournament
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId: currentUserId } = await auth();
    if (!currentUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    // Check if tournament exists and current user is an owner
    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: {
        owners: true,
        participants: true,
      },
    });

    if (!tournament) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }

    // Verify current user is an owner
    const isOwner = tournament.owners.some((owner) => owner.userId === currentUserId);
    if (!isOwner) {
      return NextResponse.json({ error: "Only owners can manage owner privileges" }, { status: 403 });
    }

    // Check if target user is a participant
    const isParticipant = tournament.participants.some((p) => p.userId === userId);
    if (!isParticipant) {
      return NextResponse.json({ error: "User must be a participant first" }, { status: 400 });
    }

    // Check if user is already an owner
    const isAlreadyOwner = tournament.owners.some((owner) => owner.userId === userId);
    if (isAlreadyOwner) {
      return NextResponse.json({ error: "User is already an owner" }, { status: 400 });
    }

    // Add user as owner
    await prisma.tournamentOwner.create({
      data: {
        tournamentId: id,
        userId,
      },
    });

    // Fetch updated tournament with user data
    const updatedTournament = await prisma.tournament.findUnique({
      where: { id },
      include: {
        owners: true,
        participants: true,
        matches: true,
        _count: {
          select: {
            participants: true,
            matches: true,
          },
        },
      },
    });

    // Fetch user details for each participant
    const participantsWithUserData = await Promise.all(
      (updatedTournament?.participants || []).map(async (participant) => {
        try {
          const clerk = await clerkClient();
          const user = await clerk.users.getUser(participant.userId);
          return {
            ...participant,
            user: {
              id: user.id,
              name: user.firstName && user.lastName
                ? `${user.firstName} ${user.lastName}`
                : user.firstName || user.lastName || null,
              email: user.emailAddresses[0]?.emailAddress || "",
            },
          };
        } catch (error) {
          console.error(`Failed to fetch user ${participant.userId}:`, error);
          return {
            ...participant,
            user: {
              id: participant.userId,
              name: null,
              email: "",
            },
          };
        }
      })
    );

    return NextResponse.json({
      tournament: {
        ...updatedTournament,
        participants: participantsWithUserData,
      },
    });
  } catch (error) {
    console.error("Error adding owner:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE: Remove an owner from the tournament
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId: currentUserId } = await auth();
    if (!currentUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    // Check if tournament exists and current user is an owner
    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: {
        owners: true,
        participants: true,
      },
    });

    if (!tournament) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }

    // Verify current user is an owner
    const isOwner = tournament.owners.some((owner) => owner.userId === currentUserId);
    if (!isOwner) {
      return NextResponse.json({ error: "Only owners can manage owner privileges" }, { status: 403 });
    }

    // Prevent removing the last owner
    if (tournament.owners.length === 1) {
      return NextResponse.json({ error: "Cannot remove the last owner" }, { status: 400 });
    }

    // Check if target user is an owner
    const targetOwner = tournament.owners.find((owner) => owner.userId === userId);
    if (!targetOwner) {
      return NextResponse.json({ error: "User is not an owner" }, { status: 400 });
    }

    // Prevent removing the creator
    if (tournament.createdBy === userId) {
      return NextResponse.json({ error: "Cannot remove the tournament creator" }, { status: 400 });
    }

    // Remove owner privilege
    await prisma.tournamentOwner.delete({
      where: {
        id: targetOwner.id,
      },
    });

    // Fetch updated tournament with user data
    const updatedTournament = await prisma.tournament.findUnique({
      where: { id },
      include: {
        owners: true,
        participants: true,
        matches: true,
        _count: {
          select: {
            participants: true,
            matches: true,
          },
        },
      },
    });

    // Fetch user details for each participant
    const participantsWithUserData = await Promise.all(
      (updatedTournament?.participants || []).map(async (participant) => {
        try {
          const clerk = await clerkClient();
          const user = await clerk.users.getUser(participant.userId);
          return {
            ...participant,
            user: {
              id: user.id,
              name: user.firstName && user.lastName
                ? `${user.firstName} ${user.lastName}`
                : user.firstName || user.lastName || null,
              email: user.emailAddresses[0]?.emailAddress || "",
            },
          };
        } catch (error) {
          console.error(`Failed to fetch user ${participant.userId}:`, error);
          return {
            ...participant,
            user: {
              id: participant.userId,
              name: null,
              email: "",
            },
          };
        }
      })
    );

    return NextResponse.json({
      tournament: {
        ...updatedTournament,
        participants: participantsWithUserData,
      },
    });
  } catch (error) {
    console.error("Error removing owner:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
