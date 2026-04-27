import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserRole, logActivity } from "@/lib/tournament-utils";

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

// POST: Add a new manager to the tournament (organizer only)
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

    // Only organizer can manage roles
    const role = await getUserRole(id, currentUserId);
    if (role !== "organizer") {
      return NextResponse.json({ error: "Only the organizer can manage roles" }, { status: 403 });
    }

    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: { owners: true, participants: true },
    });

    if (!tournament) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }

    // Check if target user is a participant
    const isParticipant = tournament.participants.some((p) => p.userId === userId);
    if (!isParticipant) {
      return NextResponse.json({ error: "User must be a participant first" }, { status: 400 });
    }

    // Check if user is already a manager/owner
    const isAlreadyOwner = tournament.owners.some((owner) => owner.userId === userId);
    if (isAlreadyOwner) {
      return NextResponse.json({ error: "User already has a role" }, { status: 400 });
    }

    // Add user as manager
    await prisma.tournamentOwner.create({
      data: {
        tournamentId: id,
        userId,
        role: "MANAGER",
      },
    });

    await logActivity(id, currentUserId, "ROLE_CHANGED", {
      targetUserId: userId,
      newRole: "MANAGER",
    });

    const updatedTournament = await fetchTournamentWithUserData(id);

    return NextResponse.json({ tournament: updatedTournament });
  } catch (error) {
    console.error("Error adding manager:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE: Remove a manager from the tournament (organizer only)
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

    // Only organizer can manage roles
    const role = await getUserRole(id, currentUserId);
    if (role !== "organizer") {
      return NextResponse.json({ error: "Only the organizer can manage roles" }, { status: 403 });
    }

    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: { owners: true },
    });

    if (!tournament) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }

    // Find the target owner entry
    const targetOwner = tournament.owners.find((owner) => owner.userId === userId);
    if (!targetOwner) {
      return NextResponse.json({ error: "User is not a manager" }, { status: 400 });
    }

    // Cannot remove the organizer
    if (targetOwner.role === "ORGANIZER") {
      return NextResponse.json({ error: "Cannot remove the tournament organizer" }, { status: 400 });
    }

    // Remove manager privilege
    await prisma.tournamentOwner.delete({
      where: { id: targetOwner.id },
    });

    await logActivity(id, currentUserId, "ROLE_CHANGED", {
      targetUserId: userId,
      newRole: "REMOVED",
    });

    const updatedTournament = await fetchTournamentWithUserData(id);

    return NextResponse.json({ tournament: updatedTournament });
  } catch (error) {
    console.error("Error removing manager:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
