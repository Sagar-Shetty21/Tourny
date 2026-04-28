import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/tournament-utils";
import { writeTournamentEvent } from "@/lib/firebase-events";

// POST /api/tournaments/[id]/join - Join a tournament
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized - Please sign in to join" },
        { status: 401 }
      );
    }

    const { id: tournamentId } = await params;
    const body = await req.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { error: "Invitation token is required" },
        { status: 400 }
      );
    }

    // Validate invitation token
    const invite = await prisma.invite.findUnique({
      where: { token },
      include: {
        tournament: {
          include: {
            participants: true,
          },
        },
      },
    });

    if (!invite) {
      return NextResponse.json(
        { error: "Invalid invitation token" },
        { status: 404 }
      );
    }

    if (invite.tournamentId !== tournamentId) {
      return NextResponse.json(
        { error: "Token does not match tournament" },
        { status: 400 }
      );
    }

    // Check if invite has expired
    if (invite.expiresAt && invite.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "Invitation has expired" },
        { status: 400 }
      );
    }

    // Check if max uses reached
    if (invite.maxUses && invite.usedCount >= invite.maxUses) {
      return NextResponse.json(
        { error: "Invitation has reached maximum uses" },
        { status: 400 }
      );
    }

    const tournament = invite.tournament;

    // For ONGOING tournaments, enforce single-use regardless of invite's maxUses
    if (tournament.status === "ONGOING" && invite.usedCount >= 1) {
      return NextResponse.json(
        { error: "This invitation link has already been used. During an ongoing tournament, each invite link can only be used once." },
        { status: 400 }
      );
    }

    // Check tournament status - allow OPEN and ONGOING
    if (tournament.status !== "OPEN" && tournament.status !== "ONGOING") {
      return NextResponse.json(
        { error: "Tournament is not accepting new participants" },
        { status: 400 }
      );
    }

    // Check if tournament is full (only count active participants)
    const activeParticipants = tournament.participants.filter(
      (p) => p.removedAt === null
    );
    if (
      tournament.maxParticipants &&
      activeParticipants.length >= tournament.maxParticipants
    ) {
      return NextResponse.json(
        { error: "Tournament is full" },
        { status: 400 }
      );
    }

    // Check if user is already an active participant
    const existingParticipant = tournament.participants.find(
      (p) => p.userId === userId
    );

    if (existingParticipant && existingParticipant.removedAt === null) {
      return NextResponse.json(
        { error: "You are already a participant" },
        { status: 400 }
      );
    }

    const isRejoining = existingParticipant && existingParticipant.removedAt !== null;

    // Add user as participant (or re-add if previously removed) and increment invite usage
    if (isRejoining) {
      await prisma.$transaction([
        prisma.participant.update({
          where: { id: existingParticipant.id },
          data: { removedAt: null },
        }),
        prisma.invite.update({
          where: { id: invite.id },
          data: { usedCount: { increment: 1 } },
        }),
      ]);
    } else {
      await prisma.$transaction([
        prisma.participant.create({
          data: {
            tournamentId,
            userId,
          },
        }),
        prisma.invite.update({
          where: { id: invite.id },
          data: { usedCount: { increment: 1 } },
        }),
      ]);
    }

    // Get the user's name for logging
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, username: true, email: true },
    });

    await logActivity(tournamentId, userId, "PLAYER_JOINED", {
      userId,
      playerName: user?.name || user?.username || "Unknown",
      tournamentStatus: tournament.status,
      inviteId: invite.id,
      rejoined: !!isRejoining,
    });

    await writeTournamentEvent(tournamentId, "player_joined", {
      playerName: user?.name || user?.username || "Unknown",
      rejoined: !!isRejoining,
    });

    return NextResponse.json({
      success: true,
      message: isRejoining ? "Successfully re-joined tournament" : "Successfully joined tournament",
    });
  } catch (error) {
    console.error("Error joining tournament:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
