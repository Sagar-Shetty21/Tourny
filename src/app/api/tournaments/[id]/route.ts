import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

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

    // TODO: Fetch tournament from database by ID
    // TODO: Check if tournament exists
    // TODO: Include participant count, match data, and organizer info
    // TODO: Check user permissions (organizer or participant)

    return NextResponse.json({
      success: true,
      tournament: {
        id: tournamentId,
        name: "Placeholder Tournament",
        format: "single-elimination",
        status: "draft",
        maxParticipants: 16,
        currentParticipants: 0,
        organizerId: "placeholder_user_id",
        createdAt: new Date().toISOString(),
      },
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

    // TODO: Verify user is tournament organizer
    // TODO: Validate update fields
    // TODO: Update tournament in database
    // TODO: Prevent updates if tournament has started

    return NextResponse.json({
      success: true,
      tournament: {
        id: tournamentId,
        ...body,
        updatedAt: new Date().toISOString(),
      },
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

    // TODO: Verify user is tournament organizer
    // TODO: Delete tournament from database
    // TODO: Notify all participants
    // TODO: Clean up related matches and data

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
