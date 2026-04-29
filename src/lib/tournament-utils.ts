import { prisma } from "@/lib/prisma";

export type UserRole = "organizer" | "manager" | "participant" | null;

// ─── Types ─────────────────────────────────────────────────

export interface MatchData {
  player1Id: string;
  player2Id: string;
  player3Id?: string | null;
  player4Id?: string | null;
  round: number;
}

export interface PlayerStandingEntry {
  id: string;
  points: number;
  wins: number;
  losses: number;
  draws: number;
}

export interface KotcState {
  court: string[];       // player IDs currently on court (2 for singles, 4 for doubles)
  bench: string[];       // ordered queue of waiting players
  streak: number;        // current defender win streak
  defenders: string[];   // the "staying" team/player IDs
  forbiddenPairs: string[][]; // doubles: pairs that already lost together and can't reteam
  benchCounts: Record<string, number>; // how many times each player has sat on bench
  matchesPlayed: number; // total matches played so far
}

// ─── Minimum Players per Format ─────────────────────────────

export function getMinPlayers(
  matchmakingMethod: string,
  type: string
): number {
  switch (matchmakingMethod) {
    case "SWISS":
      return type === "SINGLES" ? 4 : 8;
    case "ROTATING_PARTNER":
      return 8; // doubles only
    case "KING_OF_THE_COURT":
      return type === "SINGLES" ? 4 : 6;
    case "ROUND_ROBIN":
    default:
      return type === "SINGLES" ? 2 : 4;
  }
}

// ─── Suggested Rounds ───────────────────────────────────────

export function suggestSwissRounds(playerCount: number): number {
  return Math.max(3, Math.ceil(Math.log2(playerCount)));
}

// ─── Fisher-Yates Shuffle ────────────────────────────────────

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ═══════════════════════════════════════════════════════════
// SWISS SYSTEM
// ═══════════════════════════════════════════════════════════

/**
 * Generate one round of Swiss pairings for SINGLES.
 * - Round 1: random pairing
 * - Round N: sort by standings, pair adjacent, avoid rematches
 * - Odd count: lowest-ranked without a previous bye gets a bye
 */
export function generateSwissRoundSingles(
  participantIds: string[],
  standings: PlayerStandingEntry[],
  round: number,
  pastPairings: Set<string>
): MatchData[] {
  const matches: MatchData[] = [];
  let players = [...participantIds];

  if (round === 1) {
    players = shuffle(players);
  } else {
    // Sort by points desc, then wins desc
    const standingMap = new Map(standings.map((s) => [s.id, s]));
    players.sort((a, b) => {
      const sa = standingMap.get(a) || { points: 0, wins: 0 };
      const sb = standingMap.get(b) || { points: 0, wins: 0 };
      return sb.points - sa.points || sb.wins - sa.wins;
    });
  }

  // Handle bye for odd number of players
  let byePlayer: string | null = null;
  if (players.length % 2 !== 0) {
    // Find lowest-ranked player who hasn't had a bye
    for (let i = players.length - 1; i >= 0; i--) {
      const byeKey = pairKey(players[i], "BYE");
      if (!pastPairings.has(byeKey)) {
        byePlayer = players[i];
        players.splice(i, 1);
        break;
      }
    }
    // If everyone had a bye, just give it to the lowest-ranked
    if (!byePlayer) {
      byePlayer = players.pop()!;
    }
  }

  // Pair adjacent players, avoiding rematches by sliding down
  const used = new Set<number>();

  for (let i = 0; i < players.length; i++) {
    if (used.has(i)) continue;

    for (let j = i + 1; j < players.length; j++) {
      if (used.has(j)) continue;

      const key = pairKey(players[i], players[j]);
      if (!pastPairings.has(key) || j === players.length - 1) {
        // Accept this pairing (or forced if last option)
        matches.push({
          player1Id: players[i],
          player2Id: players[j],
          round,
        });
        used.add(i);
        used.add(j);
        break;
      }
    }
  }

  // Bye match (auto-win for the bye player)
  if (byePlayer) {
    matches.push({
      player1Id: byePlayer,
      player2Id: "BYE",
      round,
    });
  }

  return matches;
}

/**
 * Generate one round of Swiss pairings for DOUBLES.
 * Partners assigned by interleaving standings (top+bottom), avoid repeat partnerships.
 * Then paired teams play against each other, avoiding rematches.
 * Players who sit out (when count not divisible by 4) get bye matches.
 */
export function generateSwissRoundDoubles(
  participantIds: string[],
  standings: PlayerStandingEntry[],
  round: number,
  pastTeamPairings: Set<string>,
  pastMatchPairings: Set<string>,
  pastPairings?: Set<string>
): MatchData[] {
  const matches: MatchData[] = [];
  let players = [...participantIds];

  if (round === 1) {
    players = shuffle(players);
  } else {
    const standingMap = new Map(standings.map((s) => [s.id, s]));
    players.sort((a, b) => {
      const sa = standingMap.get(a) || { points: 0, wins: 0 };
      const sb = standingMap.get(b) || { points: 0, wins: 0 };
      return sb.points - sa.points || sb.wins - sa.wins;
    });
  }

  // Handle sit-out if not divisible by 4
  // Pick lowest-ranked players who haven't had a bye yet
  const sitOutPlayers: string[] = [];
  const sitOutCount = players.length % 4;
  if (sitOutCount > 0) {
    for (let attempt = 0; attempt < sitOutCount; attempt++) {
      let found = false;
      for (let i = players.length - 1; i >= 0; i--) {
        const byeKey = pairKey(players[i], "BYE");
        if (!pastPairings || !pastPairings.has(byeKey)) {
          sitOutPlayers.push(players[i]);
          players.splice(i, 1);
          found = true;
          break;
        }
      }
      if (!found) {
        sitOutPlayers.push(players.pop()!);
      }
    }
  }

  // Form teams by interleaving: top with bottom
  const teams: [string, string][] = [];
  const half = Math.floor(players.length / 2);
  for (let i = 0; i < half; i++) {
    const p1 = players[i];
    const p2 = players[players.length - 1 - i];
    const teamKey = pairKey(p1, p2);

    // Try to avoid repeat partnerships
    if (pastTeamPairings.has(teamKey) && i + 1 < half) {
      // Swap with next bottom player
      const alt = players[players.length - 2 - i];
      if (!pastTeamPairings.has(pairKey(p1, alt))) {
        teams.push([p1, alt]);
        // Adjust: give p2 the other partner later
        players[players.length - 2 - i] = p2;
        continue;
      }
    }
    teams.push([p1, p2]);
  }

  // Pair teams against each other
  const usedTeams = new Set<number>();
  for (let i = 0; i < teams.length; i++) {
    if (usedTeams.has(i)) continue;

    let bestJ = -1;
    for (let j = i + 1; j < teams.length; j++) {
      if (usedTeams.has(j)) continue;

      const matchKey = doublesMatchPairKey(teams[i], teams[j]);
      if (!pastMatchPairings.has(matchKey)) {
        bestJ = j;
        break;
      }
      // Track first available as fallback (accept rematch over skipping)
      if (bestJ === -1) bestJ = j;
    }

    if (bestJ !== -1) {
      matches.push({
        player1Id: teams[i][0],
        player2Id: teams[i][1],
        player3Id: teams[bestJ][0],
        player4Id: teams[bestJ][1],
        round,
      });
      usedTeams.add(i);
      usedTeams.add(bestJ);
    }
  }

  // Bye matches for sit-out players
  for (const sitOutId of sitOutPlayers) {
    matches.push({
      player1Id: sitOutId,
      player2Id: "BYE",
      round,
    });
  }

  return matches;
}

// ═══════════════════════════════════════════════════════════
// ROTATING PARTNER LEAGUE (Doubles only, all rounds upfront)
// ═══════════════════════════════════════════════════════════

/**
 * Generate full schedule for Rotating Partner League.
 * Uses a modified circle method to minimize repeated teammates/opponents.
 * Handles non-divisible-by-4 player counts with fair sit-out rotation.
 */
export function generateRotatingPartnerSchedule(
  participantIds: string[],
  totalRounds: number
): MatchData[] {
  const matches: MatchData[] = [];
  const players = [...participantIds];
  const n = players.length;
  if (n < 4) return matches;

  // Track how many times each player has sat out to ensure fairness
  const sitOutCounts = new Map<string, number>();
  for (const p of players) sitOutCounts.set(p, 0);

  for (let round = 1; round <= totalRounds; round++) {
    // Create a rotated arrangement for this round using circle method
    // Fix first player, rotate the rest
    const rotated = [players[0]];
    for (let i = 1; i < n; i++) {
      const idx = ((i - 1 + (round - 1)) % (n - 1)) + 1;
      rotated.push(players[idx]);
    }

    // Determine how many players can play (must be divisible by 4)
    const playableCount = Math.floor(n / 4) * 4;
    const sitOutCount = n - playableCount;

    let roundPlayers = [...rotated];

    if (sitOutCount > 0) {
      // Pick sit-out players: prefer those who have sat out least (to even it out)
      // Break ties by position in rotation (later = lower priority = sit out first)
      const candidates = roundPlayers.map((p, idx) => ({
        p,
        idx,
        soc: sitOutCounts.get(p) || 0,
      }));
      candidates.sort((a, b) => a.soc - b.soc || b.idx - a.idx);

      const roundSitOuts: string[] = [];
      for (let i = 0; i < sitOutCount; i++) {
        roundSitOuts.push(candidates[i].p);
        sitOutCounts.set(
          candidates[i].p,
          (sitOutCounts.get(candidates[i].p) || 0) + 1
        );
      }

      roundPlayers = roundPlayers.filter((p) => !roundSitOuts.includes(p));
    }

    // Form teams of 2 from adjacent positions
    const teams: [string, string][] = [];
    for (let i = 0; i + 1 < roundPlayers.length; i += 2) {
      teams.push([roundPlayers[i], roundPlayers[i + 1]]);
    }

    // Pair teams into matches (groups of 2 teams)
    for (let i = 0; i + 1 < teams.length; i += 2) {
      matches.push({
        player1Id: teams[i][0],
        player2Id: teams[i][1],
        player3Id: teams[i + 1][0],
        player4Id: teams[i + 1][1],
        round,
      });
    }
  }

  return matches;
}

// ═══════════════════════════════════════════════════════════
// KING OF THE COURT
// ═══════════════════════════════════════════════════════════

/**
 * Initialize KotC state and generate the first match.
 */
export function generateKotcFirstMatch(
  participantIds: string[],
  type: "SINGLES" | "DOUBLES"
): { match: MatchData; metadata: KotcState } {
  const players = shuffle(participantIds);
  const courtSize = type === "SINGLES" ? 2 : 4;

  const court = players.slice(0, courtSize);
  const bench = players.slice(courtSize);

  const benchCounts: Record<string, number> = {};
  for (const id of participantIds) {
    benchCounts[id] = 0;
  }
  // Players starting on bench get 1 bench count
  for (const id of bench) {
    benchCounts[id] = 1;
  }

  const match: MatchData =
    type === "SINGLES"
      ? { player1Id: court[0], player2Id: court[1], round: 1 }
      : {
          player1Id: court[0],
          player2Id: court[1],
          player3Id: court[2],
          player4Id: court[3],
          round: 1,
        };

  const metadata: KotcState = {
    court,
    bench,
    streak: 0,
    defenders: court.slice(0, type === "SINGLES" ? 1 : 2), // team1 are initial defenders
    forbiddenPairs: [],
    benchCounts,
    matchesPlayed: 0,
  };

  return { match, metadata };
}

/**
 * Generate next KotC match based on previous result.
 * Winners stay, losers go to bench. New challengers pulled from bench.
 * For doubles: losing pair added to forbidden pairs (can't team up again).
 */
export function generateKotcNextMatch(
  metadata: KotcState,
  winner: "team1" | "team2",
  type: "SINGLES" | "DOUBLES",
  totalMatches: number
): { match: MatchData | null; metadata: KotcState; tournamentComplete: boolean } {
  const state = { ...metadata };
  state.matchesPlayed = (state.matchesPlayed || 0) + 1;

  if (state.matchesPlayed >= totalMatches) {
    return { match: null, metadata: state, tournamentComplete: true };
  }

  const courtSize = type === "SINGLES" ? 2 : 4;
  const teamSize = type === "SINGLES" ? 1 : 2;

  // Determine winners and losers from court
  let winners: string[];
  let losers: string[];

  if (type === "SINGLES") {
    winners = winner === "team1" ? [state.court[0]] : [state.court[1]];
    losers = winner === "team1" ? [state.court[1]] : [state.court[0]];
  } else {
    winners =
      winner === "team1"
        ? [state.court[0], state.court[1]]
        : [state.court[2], state.court[3]];
    losers =
      winner === "team1"
        ? [state.court[2], state.court[3]]
        : [state.court[0], state.court[1]];
  }

  // Update streak
  const defendersSet = new Set(state.defenders);
  const winnersAreDefenders = winners.every((w) => defendersSet.has(w));

  if (winnersAreDefenders) {
    state.streak += 1;
  } else {
    state.streak = 1;
  }
  state.defenders = winners;

  // For doubles: add loser pair to forbidden pairs
  if (type === "DOUBLES") {
    const loserPair = losers.sort();
    const alreadyForbidden = state.forbiddenPairs.some(
      (fp) => fp[0] === loserPair[0] && fp[1] === loserPair[1]
    );
    if (!alreadyForbidden) {
      state.forbiddenPairs.push(loserPair);
    }
  }

  // Losers go to end of bench
  state.bench.push(...losers);

  // Pull challengers from bench
  const challengers: string[] = [];

  if (type === "SINGLES") {
    // Just pull the first bench player
    challengers.push(state.bench.shift()!);
  } else {
    // Pull 2 players from bench, avoiding forbidden pairs
    const available = [...state.bench];

    // Try to find a valid pair (not forbidden)
    let found = false;
    for (let i = 0; i < available.length && !found; i++) {
      for (let j = i + 1; j < available.length && !found; j++) {
        const pair = [available[i], available[j]].sort();
        const isForbidden = state.forbiddenPairs.some(
          (fp) => fp[0] === pair[0] && fp[1] === pair[1]
        );
        if (!isForbidden) {
          challengers.push(available[i], available[j]);
          // Remove from bench
          state.bench = state.bench.filter(
            (id) => id !== available[i] && id !== available[j]
          );
          found = true;
        }
      }
    }

    // If no valid pair found (all forbidden), just take first two
    if (!found) {
      challengers.push(state.bench.shift()!, state.bench.shift()!);
    }
  }

  // Update bench counts for players still on bench
  for (const id of state.bench) {
    state.benchCounts[id] = (state.benchCounts[id] || 0) + 1;
  }

  // Build new court: winners stay (team1 position), challengers as team2
  state.court =
    type === "SINGLES"
      ? [winners[0], challengers[0]]
      : [winners[0], winners[1], challengers[0], challengers[1]];

  const round = state.matchesPlayed + 1;
  const match: MatchData =
    type === "SINGLES"
      ? { player1Id: state.court[0], player2Id: state.court[1], round }
      : {
          player1Id: state.court[0],
          player2Id: state.court[1],
          player3Id: state.court[2],
          player4Id: state.court[3],
          round,
        };

  return { match, metadata: state, tournamentComplete: false };
}

// ─── Helper Functions ────────────────────────────────────────

function pairKey(a: string, b: string): string {
  return [a, b].sort().join("-");
}

function doublesMatchPairKey(
  team1: [string, string],
  team2: [string, string]
): string {
  const t1 = [...team1].sort().join(",");
  const t2 = [...team2].sort().join(",");
  return [t1, t2].sort().join("-vs-");
}

/**
 * Build past pairings set from finished matches for Swiss.
 */
export function buildPastPairings(
  matches: Array<{
    player1Id: string | null;
    player2Id: string | null;
    player3Id?: string | null;
    player4Id?: string | null;
    status: string;
    result?: any;
  }>,
  type: "SINGLES" | "DOUBLES"
): { pastPairings: Set<string>; pastTeamPairings: Set<string>; pastMatchPairings: Set<string> } {
  const pastPairings = new Set<string>();
  const pastTeamPairings = new Set<string>();
  const pastMatchPairings = new Set<string>();

  for (const m of matches) {
    // Track bye matches: stored with one player as null, result.bye === true
    if (m.result?.bye) {
      const byePlayerId = m.player1Id || m.player2Id;
      if (byePlayerId) {
        pastPairings.add(pairKey(byePlayerId, "BYE"));
      }
      continue;
    }

    if (type === "SINGLES") {
      if (m.player1Id && m.player2Id) {
        pastPairings.add(pairKey(m.player1Id, m.player2Id));
      }
    } else {
      if (m.player1Id && m.player2Id) {
        pastTeamPairings.add(pairKey(m.player1Id, m.player2Id));
      }
      if (m.player3Id && m.player4Id) {
        pastTeamPairings.add(pairKey(m.player3Id, m.player4Id));
      }
      if (m.player1Id && m.player2Id && m.player3Id && m.player4Id) {
        pastMatchPairings.add(
          doublesMatchPairKey(
            [m.player1Id, m.player2Id],
            [m.player3Id, m.player4Id]
          )
        );
      }
    }
  }

  return { pastPairings, pastTeamPairings, pastMatchPairings };
}

/**
 * Compute simple standings from match results.
 */
export function computeStandingsFromMatches(
  matches: Array<{
    player1Id: string | null;
    player2Id: string | null;
    player3Id?: string | null;
    player4Id?: string | null;
    status: string;
    result: any;
  }>,
  type: "SINGLES" | "DOUBLES"
): PlayerStandingEntry[] {
  const map = new Map<string, PlayerStandingEntry>();

  const ensure = (id: string) => {
    if (!map.has(id))
      map.set(id, { id, points: 0, wins: 0, losses: 0, draws: 0 });
  };

  for (const m of matches) {
    if (m.status !== "FINISHED" || !m.result?.winner) continue;
    if (m.player2Id === "BYE" || m.player1Id === "BYE") {
      // Bye: auto-win for the non-BYE player
      const realPlayer = m.player1Id === "BYE" ? m.player2Id : m.player1Id;
      if (realPlayer) {
        ensure(realPlayer);
        const s = map.get(realPlayer)!;
        s.wins++;
        s.points += 3;
      }
      continue;
    }

    const team1 =
      type === "DOUBLES"
        ? [m.player1Id, m.player2Id].filter(Boolean) as string[]
        : [m.player1Id].filter(Boolean) as string[];
    const team2 =
      type === "DOUBLES"
        ? [m.player3Id, m.player4Id].filter(Boolean) as string[]
        : [m.player2Id].filter(Boolean) as string[];

    for (const id of [...team1, ...team2]) ensure(id);

    const defenderBonus = m.result.defenderBonus || 0;

    if (m.result.winner === "draw") {
      for (const id of [...team1, ...team2]) {
        const s = map.get(id)!;
        s.draws++;
        s.points += 1;
      }
    } else if (m.result.winner === "team1") {
      for (const id of team1) {
        const s = map.get(id)!;
        s.wins++;
        s.points += 3 + defenderBonus;
      }
      for (const id of team2) {
        const s = map.get(id)!;
        s.losses++;
      }
    } else {
      for (const id of team2) {
        const s = map.get(id)!;
        s.wins++;
        s.points += 3 + defenderBonus;
      }
      for (const id of team1) {
        const s = map.get(id)!;
        s.losses++;
      }
    }
  }

  return Array.from(map.values()).sort(
    (a, b) => b.points - a.points || b.wins - a.wins
  );
}

// ─── Core utility functions (DB access) ──────────────────────

/**
 * Get the user's role in a tournament.
 * Returns "organizer", "manager", "participant", or null (no access).
 */
export async function getUserRole(tournamentId: string, userId: string): Promise<UserRole> {
  const owner = await prisma.tournamentOwner.findUnique({
    where: { tournamentId_userId: { tournamentId, userId } },
  });

  if (owner) {
    return owner.role === "ORGANIZER" ? "organizer" : "manager";
  }

  const participant = await prisma.participant.findUnique({
    where: { tournamentId_userId: { tournamentId, userId } },
  });

  return participant ? "participant" : null;
}

/**
 * Log an activity event for a tournament.
 */
export async function logActivity(
  tournamentId: string,
  userId: string,
  action: string,
  details?: Record<string, unknown>
) {
  await prisma.activityLog.create({
    data: {
      tournamentId,
      userId,
      action,
      details: details ? (details as any) : undefined,
    },
  });
}
