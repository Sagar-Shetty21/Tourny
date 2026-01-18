import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

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
    const { name, type, matchmakingMethod, maxParticipants, joinExpiry } = body;

    // Validate required fields
    if (!name || !type) {
      return NextResponse.json(
        { error: "Name and type are required" },
        { status: 400 }
      );
    }

    // Validate tournament type
    if (!["SINGLES", "DOUBLES"].includes(type)) {
      return NextResponse.json(
        { error: "Type must be SINGLES or DOUBLES" },
        { status: 400 }
      );
    }

    // Generate invitation token
    const inviteToken = randomBytes(32).toString("hex");
    const expiresAt = joinExpiry ? new Date(joinExpiry) : null;

    // Create tournament with owner and invite
    const tournament = await prisma.tournament.create({
      data: {
        name,
        type,
        matchmakingMethod: matchmakingMethod || "ROUND_ROBIN",
        maxParticipants: maxParticipants || null,
        joinExpiry: expiresAt,
        createdBy: userId,
        owners: {
          create: {
            userId,
          },
        },
        invites: {
          create: {
            token: inviteToken,
            expiresAt,
            maxUses: null,
          },
        },
      },
      include: {
        owners: true,
        invites: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        tournament,
        inviteLink: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/join/${inviteToken}`,
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

    // Fetch tournaments where user is owner or participant
    const [ownedTournaments, participatingTournaments] = await Promise.all([
      prisma.tournament.findMany({
        where: {
          owners: {
            some: {
              userId,
            },
          },
        },
        include: {
          owners: true,
          participants: true,
          _count: {
            select: {
              matches: true,
              participants: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
      prisma.tournament.findMany({
        where: {
          participants: {
            some: {
              userId,
            },
          },
        },
        include: {
          owners: true,
          participants: true,
          _count: {
            select: {
              matches: true,
              participants: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
    ]);

    // Combine and deduplicate tournaments
    const tournamentMap = new Map();
    [...ownedTournaments, ...participatingTournaments].forEach((t) => {
      tournamentMap.set(t.id, t);
    });

    const tournaments = Array.from(tournamentMap.values());

    return NextResponse.json({
      success: true,
      tournaments,
      total: tournaments.length,
    });
  } catch (error) {
    console.error("Error fetching tournaments:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
