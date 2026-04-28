import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserRole, logActivity } from "@/lib/tournament-utils";
import { writeTournamentEvent } from "@/lib/firebase-events";
import { sendPushToUsers } from "@/lib/push-notifications";

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

      // Compute top 3 standings for the chat event
      const finishedMatches = await prisma.match.findMany({
        where: { tournamentId, status: "FINISHED" },
        include: {
          player1: { select: { id: true, name: true, username: true } },
          player2: { select: { id: true, name: true, username: true } },
          player3: { select: { id: true, name: true, username: true } },
          player4: { select: { id: true, name: true, username: true } },
        },
      });
      const standingsMap = new Map<string, { name: string; points: number }>();
      for (const m of finishedMatches) {
        if (!m.result || !(m.result as any).winner) continue;
        const isD = !!(m.player3 && m.player4);
        const t1 = isD ? [m.player1, m.player2].filter(Boolean) : [m.player1].filter(Boolean);
        const t2 = isD ? [m.player3, m.player4].filter(Boolean) : [m.player2].filter(Boolean);
        for (const p of [...t1, ...t2]) {
          if (p && !standingsMap.has(p.id)) standingsMap.set(p.id, { name: p.name || p.username || "?", points: 0 });
        }
        const winner = (m.result as any).winner;
        if (winner === "draw") {
          for (const p of [...t1, ...t2]) { if (p) standingsMap.get(p.id)!.points += 1; }
        } else if (winner === "team1") {
          for (const p of t1) { if (p) standingsMap.get(p.id)!.points += 3; }
        } else {
          for (const p of t2) { if (p) standingsMap.get(p.id)!.points += 3; }
        }
      }
      const top3 = Array.from(standingsMap.values()).sort((a, b) => b.points - a.points).slice(0, 3);
      await writeTournamentEvent(tournamentId, "tournament_finished", { top3 });

      // Push to all participants
      const participants = await prisma.participant.findMany({
        where: { tournamentId, removedAt: null },
        select: { userId: true },
      });
      const winnerName = top3[0]?.name || "N/A";
      sendPushToUsers(
        participants.map((p) => p.userId),
        "Tournament Complete!",
        `${tournament.name} has ended. Winner: ${winnerName}`,
        `/tournaments/${tournamentId}`
      ).catch(() => {});

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

      // Compute top 3 standings for the chat event
      const finishedMatchesMgr = await prisma.match.findMany({
        where: { tournamentId, status: "FINISHED" },
        include: {
          player1: { select: { id: true, name: true, username: true } },
          player2: { select: { id: true, name: true, username: true } },
          player3: { select: { id: true, name: true, username: true } },
          player4: { select: { id: true, name: true, username: true } },
        },
      });
      const standingsMapMgr = new Map<string, { name: string; points: number }>();
      for (const m of finishedMatchesMgr) {
        if (!m.result || !(m.result as any).winner) continue;
        const isD = !!(m.player3 && m.player4);
        const t1 = isD ? [m.player1, m.player2].filter(Boolean) : [m.player1].filter(Boolean);
        const t2 = isD ? [m.player3, m.player4].filter(Boolean) : [m.player2].filter(Boolean);
        for (const p of [...t1, ...t2]) {
          if (p && !standingsMapMgr.has(p.id)) standingsMapMgr.set(p.id, { name: p.name || p.username || "?", points: 0 });
        }
        const winner = (m.result as any).winner;
        if (winner === "draw") {
          for (const p of [...t1, ...t2]) { if (p) standingsMapMgr.get(p.id)!.points += 1; }
        } else if (winner === "team1") {
          for (const p of t1) { if (p) standingsMapMgr.get(p.id)!.points += 3; }
        } else {
          for (const p of t2) { if (p) standingsMapMgr.get(p.id)!.points += 3; }
        }
      }
      const top3Mgr = Array.from(standingsMapMgr.values()).sort((a, b) => b.points - a.points).slice(0, 3);
      await writeTournamentEvent(tournamentId, "tournament_finished", { top3: top3Mgr });

      // Push to all participants
      const mgrParticipants = await prisma.participant.findMany({
        where: { tournamentId, removedAt: null },
        select: { userId: true },
      });
      const mgrWinnerName = top3Mgr[0]?.name || "N/A";
      sendPushToUsers(
        mgrParticipants.map((p) => p.userId),
        "Tournament Complete!",
        `${tournament.name} has ended. Winner: ${mgrWinnerName}`,
        `/tournaments/${tournamentId}`
      ).catch(() => {});

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
