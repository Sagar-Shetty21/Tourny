import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserRole, logActivity } from "@/lib/tournament-utils";

// GET /api/tournaments/[id]/finish - Get finish vote status
export async function GET(
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

    const role = await getUserRole(tournamentId, userId);
    if (role !== "organizer" && role !== "manager") {
      return NextResponse.json(
        { error: "Only organizers and managers can view finish status" },
        { status: 403 }
      );
    }

    const [votes, managers, tournament] = await Promise.all([
      prisma.tournamentFinishVote.findMany({
        where: { tournamentId },
        include: {
          user: { select: { id: true, name: true, username: true } },
        },
      }),
      prisma.tournamentOwner.findMany({
        where: { tournamentId, role: "MANAGER" },
      }),
      prisma.tournament.findUnique({
        where: { id: tournamentId },
        select: { status: true },
      }),
    ]);

    const hasVoted = votes.some((v) => v.userId === userId);

    return NextResponse.json({
      votes: votes.map((v) => ({
        userId: v.userId,
        name: v.user.name || v.user.username,
        createdAt: v.createdAt,
      })),
      voteCount: votes.length,
      managerCount: managers.length,
      requiredVotes: 2,
      hasVoted,
      tournamentStatus: tournament?.status,
    });
  } catch (error) {
    console.error("Error fetching finish votes:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/tournaments/[id]/finish - Vote to finish or finish instantly (organizer)
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

    const role = await getUserRole(tournamentId, userId);
    if (role !== "organizer" && role !== "manager") {
      return NextResponse.json(
        { error: "Only organizers and managers can finish tournaments" },
        { status: 403 }
      );
    }

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      return NextResponse.json(
        { error: "Tournament not found" },
        { status: 404 }
      );
    }

    if (tournament.status !== "ONGOING") {
      return NextResponse.json(
        { error: "Only ongoing tournaments can be finished" },
        { status: 400 }
      );
    }

    // Organizer can finish instantly
    if (role === "organizer") {
      await prisma.tournament.update({
        where: { id: tournamentId },
        data: { status: "FINISHED" },
      });

      // Clean up any existing votes
      await prisma.tournamentFinishVote.deleteMany({
        where: { tournamentId },
      });

      await logActivity(tournamentId, userId, "TOURNAMENT_FINISHED", {
        method: "organizer_instant",
      });

      return NextResponse.json({
        success: true,
        finished: true,
        message: "Tournament has been finished",
      });
    }

    // Manager: cast a vote
    const existingVote = await prisma.tournamentFinishVote.findUnique({
      where: {
        tournamentId_userId: {
          tournamentId,
          userId,
        },
      },
    });

    if (existingVote) {
      return NextResponse.json(
        { error: "You have already voted to finish" },
        { status: 400 }
      );
    }

    await prisma.tournamentFinishVote.create({
      data: { tournamentId, userId },
    });

    await logActivity(tournamentId, userId, "FINISH_VOTE_CAST");

    // Check if enough votes (2+)
    const voteCount = await prisma.tournamentFinishVote.count({
      where: { tournamentId },
    });

    if (voteCount >= 2) {
      await prisma.tournament.update({
        where: { id: tournamentId },
        data: { status: "FINISHED" },
      });

      // Clean up votes
      await prisma.tournamentFinishVote.deleteMany({
        where: { tournamentId },
      });

      await logActivity(tournamentId, userId, "TOURNAMENT_FINISHED", {
        method: "manager_votes",
        totalVotes: voteCount,
      });

      return NextResponse.json({
        success: true,
        finished: true,
        message: "Tournament has been finished by manager votes",
      });
    }

    return NextResponse.json({
      success: true,
      finished: false,
      voteCount,
      requiredVotes: 2,
      message: `Vote recorded. ${voteCount}/2 votes to finish.`,
    });
  } catch (error) {
    console.error("Error finishing tournament:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
