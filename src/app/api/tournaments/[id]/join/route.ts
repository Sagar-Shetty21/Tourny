import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/tournaments/[id]/join - Join a tournament
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();

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

    // Check tournament status
    if (tournament.status !== "OPEN") {
      return NextResponse.json(
        { error: "Tournament is not accepting new participants" },
        { status: 400 }
      );
    }

    // Check if tournament is full
    if (
      tournament.maxParticipants &&
      tournament.participants.length >= tournament.maxParticipants
    ) {
      return NextResponse.json(
        { error: "Tournament is full" },
        { status: 400 }
      );
    }

    // Check if user is already a participant
    const existingParticipant = tournament.participants.find(
      (p) => p.userId === userId
    );

    if (existingParticipant) {
      return NextResponse.json(
        { error: "You are already a participant" },
        { status: 400 }
      );
    }

    // Add user as participant and increment invite usage
    const [participant] = await prisma.$transaction([
      prisma.participant.create({
        data: {
          tournamentId,
          userId,
        },
      }),
      prisma.invite.update({
        where: { id: invite.id },
        data: {
          usedCount: { increment: 1 },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      participation: participant,
      message: "Successfully joined tournament",
    });
  } catch (error) {
    console.error("Error joining tournament:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
