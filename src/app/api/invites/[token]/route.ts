import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/invites/[token] - Get tournament details from invite token
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const invite = await prisma.invite.findUnique({
      where: { token },
      include: {
        tournament: {
          include: {
            _count: {
              select: {
                participants: true,
              },
            },
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

    return NextResponse.json({
      success: true,
      tournament: {
        id: invite.tournament.id,
        name: invite.tournament.name,
        type: invite.tournament.type,
        status: invite.tournament.status,
        maxParticipants: invite.tournament.maxParticipants,
        participantCount: invite.tournament._count.participants,
        joinExpiry: invite.tournament.joinExpiry,
      },
    });
  } catch (error) {
    console.error("Error fetching invite:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
