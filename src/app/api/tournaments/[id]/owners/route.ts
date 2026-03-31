import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function fetchTournamentWithUserData(id: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      owners: true,
      participants: {
        include: {
          user: {
            select: { id: true, name: true, username: true, email: true },
          },
        },
      },
      matches: true,
      _count: {
        select: { participants: true, matches: true },
      },
    },
  });

  if (!tournament) return null;

  const participantsWithUserData = tournament.participants.map((p) => ({
    ...p,
    user: {
      id: p.user.id,
      name: p.user.name || p.user.username,
      email: p.user.email || "",
    },
  }));

  return { ...tournament, participants: participantsWithUserData };
}

// POST: Add a new owner to the tournament
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const currentUserId = session?.user?.id;
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

    const updatedTournament = await fetchTournamentWithUserData(id);

    return NextResponse.json({ tournament: updatedTournament });
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
    const session = await auth();
    const currentUserId = session?.user?.id;
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

    const updatedTournament = await fetchTournamentWithUserData(id);

    return NextResponse.json({ tournament: updatedTournament });
  } catch (error) {
    console.error("Error removing owner:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
