import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

// POST /api/tournaments/[id]/invite - Generate or retrieve invitation token
export async function POST(
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
    const { expiresInDays, maxUses } = body;

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
        { error: "Only tournament owners can generate invites" },
        { status: 403 }
      );
    }

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
        maxUses: maxUses || null,
      },
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
