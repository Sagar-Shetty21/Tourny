import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import { getUserRole, logActivity } from "@/lib/tournament-utils";

// POST /api/tournaments/[id]/invite - Generate or retrieve invitation token
export async function POST(
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
    const { expiresInDays, maxUses } = body;

    // Verify user is organizer or manager
    const role = await getUserRole(tournamentId, userId);
    if (role !== "organizer" && role !== "manager") {
      return NextResponse.json(
        { error: "Only organizers and managers can generate invites" },
        { status: 403 }
      );
    }

    // Verify tournament exists and is OPEN
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      return NextResponse.json(
        { error: "Tournament not found" },
        { status: 404 }
      );
    }

    if (tournament.status !== "OPEN" && tournament.status !== "ONGOING") {
      return NextResponse.json(
        { error: "Can only generate invites for tournaments that are open or ongoing" },
        { status: 400 }
      );
    }

    // For ONGOING tournaments, force single-use invites
    const isOngoing = tournament.status === "ONGOING";
    const effectiveMaxUses = isOngoing ? 1 : (maxUses || null);

    // Generate new invitation token
    const token = randomBytes(32).toString("hex");
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const invite = await prisma.invite.create({
      data: {
        tournamentId,
        token,
        expiresAt,
        maxUses: effectiveMaxUses,
      },
    });

    await logActivity(tournamentId, userId, "INVITE_GENERATED", {
      inviteId: invite.id,
      tournamentStatus: tournament.status,
      maxUses: effectiveMaxUses,
      singleUse: isOngoing,
    });

    return NextResponse.json({
      success: true,
      invitation: {
        ...invite,
        link: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/join/${token}`,
      },
      message: "Invitation created successfully",
    });
  } catch (error) {
    console.error("Error creating invitation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
