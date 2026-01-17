import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

// POST /api/tournaments - Create a new tournament
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();

    // TODO: Validate request body (name, format, maxParticipants, startDate)
    // TODO: Create tournament in database
    // TODO: Generate unique tournament ID
    // TODO: Generate invitation token
    // TODO: Set userId as tournament organizer

    return NextResponse.json(
      {
        success: true,
        tournament: {
          id: "tournament_placeholder_id",
          name: body.name,
          format: body.format,
          status: "draft",
          organizerId: userId,
          createdAt: new Date().toISOString(),
        },
        message: "Tournament created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating tournament:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET /api/tournaments - Get all tournaments (user's tournaments or public ones)
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // TODO: Fetch tournaments from database
    // TODO: Filter by userId (tournaments created by user)
    // TODO: Include tournaments user is participating in
    // TODO: Add pagination support

    return NextResponse.json({
      success: true,
      tournaments: [
        // Placeholder empty array
      ],
      total: 0,
    });
  } catch (error) {
    console.error("Error fetching tournaments:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
