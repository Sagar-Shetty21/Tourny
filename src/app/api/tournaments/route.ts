import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import { logActivity } from "@/lib/tournament-utils";

// POST /api/tournaments - Create a new tournament
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { name, type, matchmakingMethod, maxParticipants, joinExpiry, totalRounds, totalMatches } = body;

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

    // Validate matchmaking method
    const validMethods = ["ROUND_ROBIN", "SWISS", "ROTATING_PARTNER", "KING_OF_THE_COURT"];
    const method = matchmakingMethod || "ROUND_ROBIN";
    if (!validMethods.includes(method)) {
      return NextResponse.json(
        { error: "Invalid matchmaking method" },
        { status: 400 }
      );
    }

    // Rotating Partner is doubles only
    if (method === "ROTATING_PARTNER" && type !== "DOUBLES") {
      return NextResponse.json(
        { error: "Rotating Partner League is only available for Doubles" },
        { status: 400 }
      );
    }

    // Validate totalRounds for Swiss and Rotating Partner
    if (method === "SWISS" && (!totalRounds || totalRounds < 2)) {
      return NextResponse.json(
        { error: "Swiss System requires at least 2 rounds" },
        { status: 400 }
      );
    }

    if (method === "ROTATING_PARTNER" && (!totalRounds || totalRounds < 3 || totalRounds > 12)) {
      return NextResponse.json(
        { error: "Rotating Partner League requires 3-12 rounds" },
        { status: 400 }
      );
    }

    // Validate totalMatches for King of the Court
    if (method === "KING_OF_THE_COURT" && (!totalMatches || totalMatches < 3)) {
      return NextResponse.json(
        { error: "King of the Court requires at least 3 total matches" },
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
        matchmakingMethod: method,
        maxParticipants: maxParticipants || null,
        totalRounds: (method === "SWISS" || method === "ROTATING_PARTNER") ? totalRounds : null,
        totalMatches: method === "KING_OF_THE_COURT" ? totalMatches : null,
        joinExpiry: expiresAt,
        createdBy: userId,
        owners: {
          create: {
            userId,
            role: "ORGANIZER",
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

    await logActivity(tournament.id, userId, "TOURNAMENT_CREATED", { name: tournament.name });

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
    const session = await auth();
    const userId = session?.user?.id;

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
