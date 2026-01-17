import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

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

    // TODO: Verify user is tournament organizer
    // TODO: Generate unique invitation token (or retrieve existing one)
    // TODO: Store token in database with expiration date
    // TODO: Optional: Send email invitations to provided email list

    return NextResponse.json({
      success: true,
      invitation: {
        token: `invite_${tournamentId}_${Date.now()}`,
        link: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/join/invite_${tournamentId}_${Date.now()}`,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
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
