import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getUserRole,
  logActivity,
  generateSwissRoundSingles,
  generateSwissRoundDoubles,
  generateKotcNextMatch,
  buildPastPairings,
  computeStandingsFromMatches,
  KotcState,
} from "@/lib/tournament-utils";
import { writeTournamentEvent } from "@/lib/firebase-events";
import { sendPushToUsers } from "@/lib/push-notifications";

// POST /api/tournaments/[id]/matches/[matchId]/result - Submit match result
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; matchId: string }> }
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

    const { id: tournamentId, matchId } = await params;
    const body = await req.json();
    const { result } = body;

    if (!result) {
      return NextResponse.json(
        { error: "Result is required" },
        { status: 400 }
      );
    }

    // Verify user is organizer or manager
    const role = await getUserRole(tournamentId, userId);
    if (role !== "organizer" && role !== "manager") {
      return NextResponse.json(
        { error: "Only organizers and managers can submit results" },
        { status: 403 }
      );
    }

    // Verify match exists and belongs to tournament
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        tournament: true,
      },
    });

    if (!match) {
      return NextResponse.json(
        { error: "Match not found" },
        { status: 404 }
      );
    }

    if (match.tournamentId !== tournamentId) {
      return NextResponse.json(
        { error: "Match does not belong to tournament" },
        { status: 400 }
      );
    }

    // Block if tournament is not ONGOING
    if (match.tournament.status !== "ONGOING") {
      return NextResponse.json(
        { error: "Can only submit results for ongoing tournaments" },
        { status: 400 }
      );
    }

    // Validate match status
    if (match.status === "FINISHED") {
      return NextResponse.json(
        { error: "Match result already submitted" },
        { status: 400 }
      );
    }

    // King of the Court: draws are not allowed
    if (
      match.tournament.matchmakingMethod === "KING_OF_THE_COURT" &&
      result.winner === "draw"
    ) {
      return NextResponse.json(
        { error: "Draws are not allowed in King of the Court" },
        { status: 400 }
      );
    }

    // For KotC: add defender bonus to result before saving
    let finalResult = result;
    if (match.tournament.matchmakingMethod === "KING_OF_THE_COURT") {
      const metadata = match.tournament.metadata as KotcState | null;
      if (metadata && metadata.streak > 0) {
        // Check if winning team are the current defenders
        const defendersSet = new Set(metadata.defenders || []);
        let winnersAreDefenders = false;
        if (match.tournament.type === "SINGLES") {
          const winnerId = result.winner === "team1" ? match.player1Id : match.player2Id;
          winnersAreDefenders = winnerId ? defendersSet.has(winnerId) : false;
        } else {
          const winnerIds = result.winner === "team1"
            ? [match.player1Id, match.player2Id]
            : [match.player3Id, match.player4Id];
          winnersAreDefenders = winnerIds.every((id) => id && defendersSet.has(id));
        }
        if (winnersAreDefenders) {
          finalResult = { ...result, defenderBonus: metadata.streak };
        }
      }
    }

    // Update match with result
    const updatedMatch = await prisma.match.update({
      where: { id: matchId },
      data: {
        result: finalResult,
        status: "FINISHED",
      },
    });

    await logActivity(tournamentId, userId, "MATCH_RESULT_SUBMITTED", {
      matchId,
      result: finalResult,
    });

    // Get match details for the event
    const matchWithPlayers = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        player1: { select: { name: true, username: true } },
        player2: { select: { name: true, username: true } },
        player3: { select: { name: true, username: true } },
        player4: { select: { name: true, username: true } },
      },
    });
    const allMatches = await prisma.match.findMany({
      where: { tournamentId },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: { id: true },
    });
    const matchNumber = allMatches.findIndex((m) => m.id === matchId) + 1;
    const isDoubles = !!(matchWithPlayers?.player3 && matchWithPlayers?.player4);
    const t1Name = isDoubles
      ? `${matchWithPlayers?.player1?.name || matchWithPlayers?.player1?.username || "?"} & ${matchWithPlayers?.player2?.name || matchWithPlayers?.player2?.username || "?"}`
      : matchWithPlayers?.player1?.name || matchWithPlayers?.player1?.username || "?";
    const t2Name = isDoubles
      ? `${matchWithPlayers?.player3?.name || matchWithPlayers?.player3?.username || "?"} & ${matchWithPlayers?.player4?.name || matchWithPlayers?.player4?.username || "?"}`
      : matchWithPlayers?.player2?.name || matchWithPlayers?.player2?.username || "?";
    const resultText = result.winner === "draw" ? `${t1Name} vs ${t2Name} — Draw` : result.winner === "team1" ? `${t1Name} beat ${t2Name}` : `${t2Name} beat ${t1Name}`;

    await writeTournamentEvent(tournamentId, "match_completed", {
      matchId,
      matchNumber,
      resultText,
    });

    // Push to players in this match
    const matchPlayerIds = [match.player1Id, match.player2Id, match.player3Id, match.player4Id].filter(Boolean) as string[];
    sendPushToUsers(
      matchPlayerIds,
      "Match Result",
      `Match #${matchNumber} — ${resultText}`,
      `/tournaments/${tournamentId}/matches`
    ).catch(() => {});

    // ─── Dynamic match generation for Swiss and KotC ───

    let newRoundGenerated = false;
    let allRoundsComplete = false;
    let nextMatchCreated = false;
    let kotcStatus: { streak?: number; benchStatus?: string[] } | null = null;

    if (match.tournament.matchmakingMethod === "SWISS") {
      // Check if all matches in current round are finished
      const currentRound = match.tournament.currentRound || 1;
      const pendingInRound = await prisma.match.count({
        where: {
          tournamentId,
          round: currentRound,
          status: "PENDING",
        },
      });

      if (pendingInRound === 0) {
        const totalRounds = match.tournament.totalRounds || 1;

        if (currentRound < totalRounds) {
          // Generate next round
          const nextRound = currentRound + 1;
          const allFinishedMatches = await prisma.match.findMany({
            where: { tournamentId, status: "FINISHED" },
          });

          const activeParticipants = await prisma.participant.findMany({
            where: { tournamentId, removedAt: null },
          });
          const participantIds = activeParticipants.map((p) => p.userId);

          const standings = computeStandingsFromMatches(
            allFinishedMatches as any,
            match.tournament.type as "SINGLES" | "DOUBLES"
          );

          const { pastPairings, pastTeamPairings, pastMatchPairings } =
            buildPastPairings(allFinishedMatches as any, match.tournament.type as "SINGLES" | "DOUBLES");

          let newMatches;
          if (match.tournament.type === "SINGLES") {
            newMatches = generateSwissRoundSingles(
              participantIds, standings, nextRound, pastPairings
            );
          } else {
            newMatches = generateSwissRoundDoubles(
              participantIds, standings, nextRound, pastTeamPairings, pastMatchPairings, pastPairings
            );
          }

          // Create new round matches
          const realMatches = newMatches.filter((m) => m.player2Id !== "BYE" && m.player1Id !== "BYE");
          const byeMatches = newMatches.filter((m) => m.player2Id === "BYE" || m.player1Id === "BYE");

          await prisma.$transaction([
            prisma.tournament.update({
              where: { id: tournamentId },
              data: { currentRound: nextRound },
            }),
            prisma.match.createMany({
              data: [
                ...realMatches.map((m) => ({
                  tournamentId,
                  status: "PENDING" as const,
                  player1Id: m.player1Id,
                  player2Id: m.player2Id,
                  player3Id: m.player3Id || null,
                  player4Id: m.player4Id || null,
                  round: m.round,
                })),
                ...byeMatches.map((m) => ({
                  tournamentId,
                  status: "FINISHED" as const,
                  player1Id: m.player1Id === "BYE" ? null : m.player1Id,
                  player2Id: m.player2Id === "BYE" ? null : m.player2Id,
                  player3Id: null,
                  player4Id: null,
                  round: m.round,
                  result: { winner: m.player1Id === "BYE" ? "team2" : "team1", bye: true } as any,
                })),
              ],
            }),
          ]);

          newRoundGenerated = true;

          await writeTournamentEvent(tournamentId, "round_completed", {
            completedRound: currentRound,
            newRound: nextRound,
            totalRounds,
          });
        } else {
          allRoundsComplete = true;
        }
      }
    }

    if (match.tournament.matchmakingMethod === "KING_OF_THE_COURT") {
      const metadata = match.tournament.metadata as unknown as KotcState;
      const totalMatchesLimit = match.tournament.totalMatches || 10;

      // Purge removed players from KotC state so they don't participate
      const activeKotcParticipants = await prisma.participant.findMany({
        where: { tournamentId, removedAt: null },
      });
      const activeKotcIds = new Set(activeKotcParticipants.map((p) => p.userId));
      metadata.bench = metadata.bench.filter((id) => activeKotcIds.has(id));
      metadata.court = metadata.court.filter((id) => activeKotcIds.has(id));
      // If court is short (a player was removed from court), pull from bench
      const courtSize = match.tournament.type === "DOUBLES" ? 4 : 2;
      while (metadata.court.length < courtSize && metadata.bench.length > 0) {
        metadata.court.push(metadata.bench.shift()!);
      }
      metadata.defenders = metadata.defenders.filter((id) => activeKotcIds.has(id));

      const { match: nextMatch, metadata: updatedMetadata, tournamentComplete } =
        generateKotcNextMatch(
          metadata,
          result.winner as "team1" | "team2",
          match.tournament.type as "SINGLES" | "DOUBLES",
          totalMatchesLimit
        );

      if (tournamentComplete) {
        allRoundsComplete = true;
        await prisma.tournament.update({
          where: { id: tournamentId },
          data: { metadata: updatedMetadata as any },
        });
      } else if (nextMatch) {
        await prisma.$transaction([
          prisma.tournament.update({
            where: { id: tournamentId },
            data: {
              metadata: updatedMetadata as any,
              currentRound: updatedMetadata.matchesPlayed + 1,
            },
          }),
          prisma.match.create({
            data: {
              tournamentId,
              status: "PENDING",
              player1Id: nextMatch.player1Id,
              player2Id: nextMatch.player2Id,
              player3Id: nextMatch.player3Id || null,
              player4Id: nextMatch.player4Id || null,
              round: nextMatch.round,
            },
          }),
        ]);
        nextMatchCreated = true;
        kotcStatus = {
          streak: updatedMetadata.streak,
          benchStatus: updatedMetadata.bench,
        };

        // Fire chat event for KotC next match
        const kotcPlayerIds = [nextMatch.player1Id, nextMatch.player2Id, nextMatch.player3Id, nextMatch.player4Id].filter(Boolean) as string[];
        const kotcPlayers = await prisma.user.findMany({
          where: { id: { in: kotcPlayerIds } },
          select: { id: true, name: true, username: true },
        });
        const kotcNameMap = new Map(kotcPlayers.map((p) => [p.id, p.name || p.username || "?"]));
        const kotcIsDoubles = !!(nextMatch.player3Id && nextMatch.player4Id);
        const challengerName = kotcIsDoubles
          ? `${kotcNameMap.get(nextMatch.player1Id) || "?"} & ${kotcNameMap.get(nextMatch.player2Id!) || "?"}`
          : kotcNameMap.get(nextMatch.player1Id) || "?";
        const defenderName = kotcIsDoubles
          ? `${kotcNameMap.get(nextMatch.player3Id!) || "?"} & ${kotcNameMap.get(nextMatch.player4Id!) || "?"}`
          : kotcNameMap.get(nextMatch.player2Id!) || "?";

        await writeTournamentEvent(tournamentId, "kotc_match_created", {
          matchNumber: updatedMetadata.matchesPlayed + 1,
          challengerName,
          defenderName,
          streak: updatedMetadata.streak,
        });
      }
    }

    // Check if all matches are finished (inform frontend, but don't auto-finish)
    const pendingMatches = await prisma.match.count({
      where: {
        tournamentId,
        status: "PENDING",
      },
    });

    const allMatchesComplete = pendingMatches === 0 || allRoundsComplete;

    return NextResponse.json({
      success: true,
      match: updatedMatch,
      allMatchesComplete,
      newRoundGenerated,
      allRoundsComplete,
      nextMatchCreated,
      kotcStatus,
      message: "Match result submitted successfully",
    });
  } catch (error) {
    console.error("Error submitting match result:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET /api/tournaments/[id]/matches/[matchId]/result - Get match result
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; matchId: string }> }
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

    const { id: tournamentId, matchId } = await params;

    const match = await prisma.match.findUnique({
      where: { id: matchId },
    });

    if (!match) {
      return NextResponse.json(
        { error: "Match not found" },
        { status: 404 }
      );
    }

    if (match.tournamentId !== tournamentId) {
      return NextResponse.json(
        { error: "Match does not belong to tournament" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      match,
    });
  } catch (error) {
    console.error("Error fetching match result:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
