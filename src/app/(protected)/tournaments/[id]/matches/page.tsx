"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { useFirebase } from "@/components/FirebaseProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Info,
  Trophy,
  Clock,
  CheckCircle2,
  Users,
  Gamepad2,
  UserPlus,
  Minus,
  BarChart3,
  Loader2,
  MessageCircle,
  Filter,
  X,
  Swords,
} from "lucide-react";
import { toast } from "sonner";
import { useTournament, useTournamentMatches, invalidateTournament, invalidateMatches } from "@/lib/swr";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Player {
  id: string;
  name: string;
  email: string | null;
}

interface Match {
  id: string;
  player1Id: string | null;
  player2Id: string | null;
  player3Id: string | null;
  player4Id: string | null;
  player1: Player | null;
  player2: Player | null;
  player3: Player | null;
  player4: Player | null;
  status: string;
  result: { winner?: string; defenderBonus?: number; bye?: boolean } | null;
  round: number;
  createdAt: string;
}

interface PlayerStanding {
  id: string;
  name: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  points: number;
  bonus: number;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const AVATAR_COLORS = [
  "bg-blue-600",
  "bg-purple-600",
  "bg-emerald-600",
  "bg-rose-600",
  "bg-amber-600",
  "bg-cyan-600",
  "bg-indigo-600",
  "bg-pink-600",
];

function avatarColor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function PlayerAvatar({ player, size = "sm" }: { player: Player | null; size?: "sm" | "md" }) {
  if (!player) return null;
  const s = size === "sm" ? "h-7 w-7 text-[10px]" : "h-9 w-9 text-xs";
  return (
    <div className={`${s} ${avatarColor(player.id)} rounded-full flex items-center justify-center text-white font-bold shrink-0`}>
      {getInitials(player.name)}
    </div>
  );
}

function getResultLabel(match: Match): { text: string; type: "win1" | "win2" | "draw" } | null {
  if (!match.result?.winner) return null;
  if (match.result.winner === "draw") return { text: "Draw", type: "draw" };
  const isDoubles = !!(match.player3 && match.player4);
  if (match.result.winner === "team1") {
    if (isDoubles) {
      return { text: `${match.player1?.name || "?"} & ${match.player2?.name || "?"} won`, type: "win1" };
    }
    return { text: `${match.player1?.name || "?"} won`, type: "win1" };
  }
  if (isDoubles) {
    return { text: `${match.player3?.name || "?"} & ${match.player4?.name || "?"} won`, type: "win2" };
  }
  return { text: `${match.player2?.name || "?"} won`, type: "win2" };
}

function computeStandings(matches: Match[]): PlayerStanding[] {
  const map = new Map<string, PlayerStanding>();

  const ensure = (p: Player | null) => {
    if (!p) return;
    if (!map.has(p.id)) map.set(p.id, { id: p.id, name: p.name, played: 0, won: 0, drawn: 0, lost: 0, points: 0, bonus: 0 });
  };

  for (const m of matches) {
    if (m.status !== "FINISHED" || !m.result?.winner) continue;
    if (m.result.bye) continue; // Skip bye matches in standings
    const isDoubles = !!(m.player3 && m.player4);
    const team1: Player[] = [m.player1, m.player2].filter(Boolean) as Player[];
    const team2: Player[] = isDoubles
      ? ([m.player3, m.player4].filter(Boolean) as Player[])
      : ([m.player2].filter(Boolean) as Player[]);
    // For singles, team1=[player1], team2=[player2]
    const singlesTeam1 = isDoubles ? team1 : [m.player1].filter(Boolean) as Player[];
    const singlesTeam2 = isDoubles ? team2 : [m.player2].filter(Boolean) as Player[];

    for (const p of [...singlesTeam1, ...singlesTeam2]) ensure(p);

    const defenderBonus = m.result.defenderBonus || 0;

    if (m.result.winner === "draw") {
      for (const p of [...singlesTeam1, ...singlesTeam2]) {
        const s = map.get(p.id)!;
        s.played++;
        s.drawn++;
        s.points += 1;
      }
    } else if (m.result.winner === "team1") {
      for (const p of singlesTeam1) {
        const s = map.get(p.id)!;
        s.played++;
        s.won++;
        s.points += 3 + defenderBonus;
        s.bonus += defenderBonus;
      }
      for (const p of singlesTeam2) {
        const s = map.get(p.id)!;
        s.played++;
        s.lost++;
      }
    } else {
      for (const p of singlesTeam2) {
        const s = map.get(p.id)!;
        s.played++;
        s.won++;
        s.points += 3 + defenderBonus;
        s.bonus += defenderBonus;
      }
      for (const p of singlesTeam1) {
        const s = map.get(p.id)!;
        s.played++;
        s.lost++;
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => b.points - a.points || b.won - a.won);
}

function getRankBadge(rank: number) {
  if (rank === 1) return <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">1</span>;
  if (rank === 2) return <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-gray-200 text-gray-600 text-xs font-bold">2</span>;
  if (rank === 3) return <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-orange-100 text-orange-600 text-xs font-bold">3</span>;
  return <span className="inline-flex items-center justify-center h-6 w-6 text-xs text-gray-500 font-medium">{rank}</span>;
}

export default function MatchesPage() {
  const params = useParams();
  const id = params?.id as string;
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id;
  const userName = (session?.user as any)?.username || session?.user?.name || "Anonymous";
  const { isFirebaseReady } = useFirebase();

  const { tournament: tournamentData, role, isLoading: loadingTournament } = useTournament(id);
  const { matches, isLoading: loadingMatches, mutate: mutateMatches } = useTournamentMatches(id);
  const loading = loadingTournament || loadingMatches;
  const tournamentType = tournamentData?.type ?? "SINGLES";
  const tournamentStatus = tournamentData?.status ?? "OPEN";
  const matchmakingMethod = tournamentData?.matchmakingMethod ?? "ROUND_ROBIN";
  const isRoundBased = matchmakingMethod === "SWISS" || matchmakingMethod === "ROTATING_PARTNER" || matchmakingMethod === "KING_OF_THE_COURT";
  const isKotc = matchmakingMethod === "KING_OF_THE_COURT";
  const [filter, setFilter] = useState<string>("all");
  const searchParams = useSearchParams();
  const [resetting, setResetting] = useState<string | null>(null);

  // Initialize filter from URL param
  useEffect(() => {
    if (searchParams.get("view") === "standings") {
      setFilter("standings");
    }
  }, [searchParams]);

  // Result dialog state
  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Player filter state
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [invitingMatch, setInvitingMatch] = useState<string | null>(null);

  // Get unique active players from tournament participants
  const activePlayers = useMemo(() => {
    if (!tournamentData?.participants) return [];
    const playerIds = new Set<string>();
    const players: { id: string; name: string }[] = [];
    for (const p of tournamentData.participants) {
      if (p.removedAt) continue;
      const uid = p.userId || p.user?.id;
      const name = p.user?.name || p.user?.username || "Unknown";
      if (uid && !playerIds.has(uid)) {
        playerIds.add(uid);
        players.push({ id: uid, name });
      }
    }
    return players;
  }, [tournamentData]);

  // Availability from Firestore
  const [availablePlayerIds, setAvailablePlayerIds] = useState<Set<string>>(new Set());
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);

  useEffect(() => {
    if (!id || !isFirebaseReady) return;
    const availRef = collection(getDb(), "tournaments", id, "availability");
    const unsub = onSnapshot(availRef, (snapshot) => {
      const now = new Date();
      const ids = new Set<string>();
      snapshot.docs.forEach((d) => {
        const data = d.data();
        if (!data.available) return;
        if (data.expiresAt && (data.expiresAt as Timestamp).toDate() < now) return;
        ids.add(d.id);
      });
      setAvailablePlayerIds(ids);
    });
    return () => unsub();
  }, [id, isFirebaseReady]);

  // Filter logic
  const isDoublesType = tournamentType === "DOUBLES";
  const fullTeamSize = isDoublesType ? 4 : 2;
  const filterMode = selectedPlayerIds.length === 0
    ? "none"
    : selectedPlayerIds.length >= fullTeamSize
    ? "full"
    : "semi";

  const displayPlayers = useMemo(() => {
    if (!showAvailableOnly) return activePlayers;
    return activePlayers.filter((p) => availablePlayerIds.has(p.id));
  }, [activePlayers, showAvailableOnly, availablePlayerIds]);

  const togglePlayer = (playerId: string) => {
    setSelectedPlayerIds((prev) =>
      prev.includes(playerId) ? prev.filter((id) => id !== playerId) : [...prev, playerId]
    );
  };

  const filteredMatches = useMemo(() => {
    let result = matches;

    // Apply status filter
    if (filter === "pending") result = result.filter((m) => m.status === "PENDING");
    else if (filter === "finished") result = result.filter((m) => m.status === "FINISHED");
    else if (filter === "stale") result = result.filter((m) => m.status === "STALE");
    else if (filter === "my") result = result.filter((m) =>
      m.player1Id === userId || m.player2Id === userId || m.player3Id === userId || m.player4Id === userId
    );

    // Apply player filter
    if (selectedPlayerIds.length > 0 && filter !== "standings") {
      if (filterMode === "semi") {
        // Semi-match: show matches where ANY selected player is involved
        result = result.filter((m) =>
          selectedPlayerIds.some((pid) =>
            m.player1Id === pid || m.player2Id === pid || m.player3Id === pid || m.player4Id === pid
          )
        );
      } else if (filterMode === "full") {
        // Full-match: show matches where EXACTLY those players play
        const selectedSet = new Set(selectedPlayerIds.slice(0, fullTeamSize));
        result = result.filter((m) => {
          const matchPlayerIds = [m.player1Id, m.player2Id, m.player3Id, m.player4Id].filter(Boolean) as string[];
          return matchPlayerIds.length === selectedSet.size && matchPlayerIds.every((pid) => selectedSet.has(pid));
        });
      }
    }

    return result;
  }, [filter, matches, selectedPlayerIds, filterMode, fullTeamSize, userId]);

  const standings = useMemo(() => computeStandings(matches.filter((m) => m.status !== "STALE")), [matches]);

  const canManage = role === "organizer" || role === "manager";
  const isOrganizer = role === "organizer";

  const handleSubmitResult = async (winner: "team1" | "team2" | "draw") => {
    if (!selectedMatch) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/tournaments/${id}/matches/${selectedMatch.id}/result`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ result: { winner } }),
      });
      const data = await res.json();
      if (res.ok) {
        mutateMatches();
        invalidateTournament(id);
        toast.success("Result submitted successfully");
        if (data.newRoundGenerated) {
          toast.info("New round generated! Scroll down to see new matches.");
        }
        if (data.nextMatchCreated) {
          toast.info(`Next match is ready! Streak: ${data.kotcStatus?.streak || 0}`);
        }
        if (data.allMatchesComplete) {
          toast.info("All matches completed! You can now finish the tournament from the Overview page.");
        }
      } else {
        toast.error(data.error || "Failed to submit result");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSubmitting(false);
      setResultDialogOpen(false);
      setSelectedMatch(null);
    }
  };

  const handleResetMatch = async (matchId: string) => {
    setResetting(matchId);
    try {
      const res = await fetch(`/api/tournaments/${id}/matches/${matchId}/reset`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        mutateMatches();
        invalidateTournament(id);
        toast.success("Match result has been reset");
      } else {
        toast.error(data.error || "Failed to reset match");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setResetting(null);
    }
  };

  const isDoubles = tournamentType === "DOUBLES";
  const team1Label = isDoubles ? "Team 1" : "Player 1";
  const team2Label = isDoubles ? "Team 2" : "Player 2";

  const renderMatchCard = (match: Match) => {
    const matchNumber = matches.indexOf(match) + 1;
    const result = getResultLabel(match);
    const isDoublesMatch = !!(match.player3 && match.player4);
    const bonus = match.result?.defenderBonus;

    return (
      <div
        key={match.id}
        className={`group relative rounded-xl border bg-white overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${
          match.status === "STALE"
            ? "border-l-[3px] border-l-gray-300 opacity-60"
            : match.status === "FINISHED"
            ? "border-l-[3px] border-l-emerald-500"
            : "border-l-[3px] border-l-amber-400"
        }`}
      >
        <div className="p-4 sm:p-5">
          {/* Top bar: match number + status */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center justify-center h-6 px-2.5 rounded-full bg-gray-100 text-[11px] font-semibold text-gray-600 uppercase tracking-wide">
                Match {matchNumber}
              </span>
              {match.status === "STALE" ? (
                <Badge variant="secondary" className="bg-gray-100 text-gray-500 border border-gray-200 text-[11px]">
                  Stale
                </Badge>
              ) : match.status === "PENDING" ? (
                <Badge variant="secondary" className="bg-amber-50 text-amber-700 border border-amber-200 text-[11px]">
                  <Clock className="h-3 w-3 mr-1" />
                  Pending
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px]">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Completed
                </Badge>
              )}
              {bonus != null && bonus > 0 && (
                <Badge variant="secondary" className="bg-orange-50 text-orange-700 border border-orange-200 text-[10px]">
                  +{bonus} streak bonus
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {match.status === "PENDING" && canManage && tournamentStatus === "ONGOING" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-8 hover:bg-gray-900 hover:text-white transition-colors"
                  onClick={() => {
                    setSelectedMatch(match);
                    setResultDialogOpen(true);
                  }}
                >
                  Submit Result
                </Button>
              )}
              {match.status === "FINISHED" && isOrganizer && (() => {
                const updatedAt = new Date(match.createdAt);
                const hoursSince = (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60);
                return hoursSince <= 24;
              })() && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-8 text-amber-600 border-amber-200 hover:bg-amber-50"
                  disabled={resetting === match.id}
                  onClick={() => handleResetMatch(match.id)}
                >
                  {resetting === match.id ? "Resetting..." : "Reset"}
                </Button>
              )}
              {match.status === "PENDING" && tournamentStatus === "ONGOING" && filter === "my" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-8 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                  disabled={invitingMatch === match.id}
                  onClick={() => handleInviteToPlay(match)}
                >
                  {invitingMatch === match.id ? "Sending..." : "Invite to Play"}
                </Button>
              )}
            </div>
          </div>

          {/* Players / Teams */}
          {isDoublesMatch ? (
            <div className="flex items-stretch gap-2 sm:gap-3">
              {/* Team 1 */}
              <div className={`flex-1 rounded-lg p-3 border transition-colors ${
                result?.type === "win1"
                  ? "bg-emerald-50 border-emerald-200"
                  : "bg-gradient-to-br from-blue-50 to-indigo-50/50 border-blue-100"
              }`}>
                <p className="text-[10px] font-semibold text-blue-500 uppercase tracking-wider mb-2">Team 1</p>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <PlayerAvatar player={match.player1} />
                    <span className="text-sm font-medium text-gray-900 truncate">{match.player1?.name || "TBD"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <PlayerAvatar player={match.player2} />
                    <span className="text-sm font-medium text-gray-900 truncate">{match.player2?.name || "TBD"}</span>
                  </div>
                </div>
                {result?.type === "win1" && (
                  <Badge className="mt-2 bg-emerald-600 text-white text-[10px]">
                    <Trophy className="h-3 w-3 mr-1" />Won
                  </Badge>
                )}
              </div>

              {/* VS divider */}
              <div className="flex items-center">
                <div className="h-10 w-10 rounded-full bg-gray-100 border-2 border-white shadow-sm flex items-center justify-center">
                  <span className="text-xs font-black text-gray-400">VS</span>
                </div>
              </div>

              {/* Team 2 */}
              <div className={`flex-1 rounded-lg p-3 border transition-colors ${
                result?.type === "win2"
                  ? "bg-emerald-50 border-emerald-200"
                  : "bg-gradient-to-br from-purple-50 to-fuchsia-50/50 border-purple-100"
              }`}>
                <p className="text-[10px] font-semibold text-purple-500 uppercase tracking-wider mb-2">Team 2</p>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <PlayerAvatar player={match.player3} />
                    <span className="text-sm font-medium text-gray-900 truncate">{match.player3?.name || "TBD"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <PlayerAvatar player={match.player4} />
                    <span className="text-sm font-medium text-gray-900 truncate">{match.player4?.name || "TBD"}</span>
                  </div>
                </div>
                {result?.type === "win2" && (
                  <Badge className="mt-2 bg-emerald-600 text-white text-[10px]">
                    <Trophy className="h-3 w-3 mr-1" />Won
                  </Badge>
                )}
              </div>
            </div>
          ) : (
            /* Singles */
            <div className="flex items-center gap-2 sm:gap-3">
              <div className={`flex-1 rounded-lg p-3 sm:p-4 border text-center transition-colors ${
                result?.type === "win1"
                  ? "bg-emerald-50 border-emerald-200"
                  : "bg-gradient-to-br from-blue-50 to-indigo-50/50 border-blue-100"
              }`}>
                <div className="flex flex-col items-center gap-1.5">
                  <PlayerAvatar player={match.player1} size="md" />
                  <span className="text-sm font-semibold text-gray-900 truncate max-w-full">
                    {match.player1?.name || "TBD"}
                  </span>
                  {result?.type === "win1" && (
                    <Badge className="bg-emerald-600 text-white text-[10px]">
                      <Trophy className="h-3 w-3 mr-1" />Won
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center">
                <div className="h-10 w-10 rounded-full bg-gray-100 border-2 border-white shadow-sm flex items-center justify-center">
                  <span className="text-xs font-black text-gray-400">VS</span>
                </div>
              </div>

              <div className={`flex-1 rounded-lg p-3 sm:p-4 border text-center transition-colors ${
                result?.type === "win2"
                  ? "bg-emerald-50 border-emerald-200"
                  : "bg-gradient-to-br from-purple-50 to-fuchsia-50/50 border-purple-100"
              }`}>
                <div className="flex flex-col items-center gap-1.5">
                  <PlayerAvatar player={match.player2} size="md" />
                  <span className="text-sm font-semibold text-gray-900 truncate max-w-full">
                    {match.player2?.name || "TBD"}
                  </span>
                  {result?.type === "win2" && (
                    <Badge className="bg-emerald-600 text-white text-[10px]">
                      <Trophy className="h-3 w-3 mr-1" />Won
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Result banner */}
          {result && (
            <div className={`mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ${
              result.type === "draw"
                ? "bg-amber-50 text-amber-700 border border-amber-200"
                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
            }`}>
              {result.type === "draw" ? (
                <Minus className="h-3.5 w-3.5" />
              ) : (
                <Trophy className="h-3.5 w-3.5" />
              )}
              {result.text}
            </div>
          )}
        </div>
      </div>
    );
  };

  const handleInviteToPlay = async (match: Match) => {
    if (!userId || !id || !isFirebaseReady) return;
    setInvitingMatch(match.id);
    try {
      const matchNumber = matches.indexOf(match) + 1;
      const playerIds = [match.player1Id, match.player2Id, match.player3Id, match.player4Id].filter(Boolean) as string[];
      const playerNames: Record<string, string> = {};
      if (match.player1) playerNames[match.player1.id] = match.player1.name;
      if (match.player2) playerNames[match.player2.id] = match.player2.name;
      if (match.player3) playerNames[match.player3.id] = match.player3.name;
      if (match.player4) playerNames[match.player4.id] = match.player4.name;

      // Create match invite in Firestore
      const inviteRef = await addDoc(collection(getDb(), "tournaments", id, "matchInvites"), {
        matchId: match.id,
        matchNumber,
        inviterId: userId,
        inviterName: userName,
        playerIds,
        playerNames,
        votes: { [userId]: "yes" },
        status: "pending",
        createdAt: serverTimestamp(),
      });

      // Write system event to chat via server (admin SDK bypasses Firestore rules)
      await fetch(`/api/tournaments/${id}/matches/invite-event`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchInviteId: inviteRef.id,
          matchNumber,
          inviterName: userName,
          playerIds,
        }),
      });

      toast.success("Match invite sent to chat!");
    } catch (error) {
      console.error("Failed to send match invite:", error);
      toast.error("Failed to send invite");
    } finally {
      setInvitingMatch(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Matches</h1>
        <p className="text-gray-500 mt-1 text-sm">
          View and manage tournament matches
          {tournamentStatus !== "ONGOING" && canManage && (
            <span className="ml-2 text-amber-600">(Tournament is {tournamentStatus.toLowerCase()} — result submission disabled)</span>
          )}
        </p>
      </div>

      {/* Quick Navigation */}
      <div className="mb-8 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          <Link href={`/tournaments/${id}`}>
            <Button variant="outline" size="sm">
              <Trophy className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Overview</span>
            </Button>
          </Link>
          <Link href={`/tournaments/${id}/players`}>
            <Button variant="outline" size="sm">
              <Users className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Players</span>
            </Button>
          </Link>
          <Link href={`/tournaments/${id}/matches`}>
            <Button size="sm" variant="outline" className={filter !== "standings" ? "text-white" : ""} style={filter !== "standings" ? { backgroundColor: '#da6c6c' } : {}} onClick={() => { if (filter === "standings") setFilter("all"); }}>
              <Gamepad2 className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Matches</span>
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            className={filter === "standings" ? "text-white" : ""}
            style={filter === "standings" ? { backgroundColor: '#da6c6c' } : {}}
            onClick={() => setFilter(filter === "standings" ? "all" : "standings")}
          >
            <BarChart3 className="h-4 w-4 sm:mr-1.5" />
            <span className="hidden sm:inline">Standings</span>
          </Button>
          <Link href={`/tournaments/${id}/chat`} className="hidden md:block">
            <Button variant="outline" size="sm">
              <MessageCircle className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Chat</span>
            </Button>
          </Link>
          {tournamentStatus !== "FINISHED" && (
            <Link href={`/tournaments/${id}/invite`}>
              <Button variant="outline" size="sm">
                <UserPlus className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Invite</span>
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Player Filter */}
      <div className="mb-4">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="text-xs gap-1.5">
              <Filter className="h-3.5 w-3.5" />
              Filter by Player
              {selectedPlayerIds.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-[10px] h-5 px-1.5">
                  {selectedPlayerIds.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3" align="start">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-gray-700">Select players</p>
              {availablePlayerIds.size > 0 && (
                <button
                  onClick={() => setShowAvailableOnly(!showAvailableOnly)}
                  className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                    showAvailableOnly
                      ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                      : "border-gray-200 text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  Available only
                </button>
              )}
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {displayPlayers.map((player) => (
                <button
                  key={player.id}
                  onClick={() => togglePlayer(player.id)}
                  className={`w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                    selectedPlayerIds.includes(player.id)
                      ? "bg-gray-900 text-white"
                      : "hover:bg-gray-100 text-gray-700"
                  }`}
                >
                  <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                    selectedPlayerIds.includes(player.id) ? "bg-white text-gray-900" : avatarColor(player.id) + " text-white"
                  }`}>
                    {getInitials(player.name)}
                  </div>
                  <span className="truncate text-xs">{player.name}</span>
                  {availablePlayerIds.has(player.id) && (
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 ml-auto shrink-0" />
                  )}
                </button>
              ))}
            </div>
            {selectedPlayerIds.length > 0 && (
              <button
                onClick={() => setSelectedPlayerIds([])}
                className="w-full mt-2 text-xs text-gray-500 hover:text-gray-700 text-center py-1"
              >
                Clear filter
              </button>
            )}
          </PopoverContent>
        </Popover>
        {selectedPlayerIds.length > 0 && (
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge variant="secondary" className={`text-[10px] ${filterMode === "full" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
              {filterMode === "full" ? "Full-match" : "Semi-match"} · {filteredMatches.length} match{filteredMatches.length !== 1 ? "es" : ""}
            </Badge>
            {selectedPlayerIds.map((pid) => {
              const player = activePlayers.find((p) => p.id === pid);
              return (
                <Badge key={pid} variant="outline" className="text-[10px] gap-1 pr-1">
                  {player?.name || pid.slice(0, 6)}
                  <button onClick={() => togglePlayer(pid)} className="ml-0.5 rounded-full hover:bg-gray-200 p-0.5">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </Badge>
              );
            })}
          </div>
        )}
      </div>

      {/* Match Filters — flex-wrap so they don't break on small screens */}
      {filter !== "standings" && (() => {
        const staleCount = matches.filter((m) => m.status === "STALE").length;
        const hasStale = staleCount > 0;
        const myCount = matches.filter((m) =>
          m.player1Id === userId || m.player2Id === userId || m.player3Id === userId || m.player4Id === userId
        ).length;
        const filters = [
          { value: "all", label: `All (${matches.length})` },
          { value: "pending", label: `Pending (${matches.filter((m) => m.status === "PENDING").length})` },
          { value: "finished", label: `Done (${matches.filter((m) => m.status === "FINISHED").length})` },
          ...(hasStale ? [{ value: "stale", label: `Stale (${staleCount})` }] : []),
          { value: "my", label: `Mine (${myCount})` },
        ];
        return (
          <div className="flex flex-wrap gap-1.5 mb-6">
            {filters.map((f) => (
              <Button
                key={f.value}
                variant={filter === f.value ? "default" : "outline"}
                size="sm"
                className={`text-xs h-8 rounded-full ${filter === f.value ? "bg-gray-900 text-white hover:bg-gray-800" : ""}`}
                onClick={() => setFilter(f.value)}
              >
                {f.value === "my" && <Swords className="h-3.5 w-3.5 mr-1" />}
                {f.label}
              </Button>
            ))}
          </div>
        );
      })()}

      {/* Content */}
      {filter === "standings" ? (
        /* ─── Points Table ─── */
        <Card className="overflow-hidden border-0 shadow-sm">
          <div className="px-5 py-4 border-b bg-gradient-to-r from-gray-50 to-white">
            <h2 className="text-lg font-semibold text-gray-900">Points Table</h2>
            <p className="text-xs text-gray-500 mt-0.5">3 pts for a win &middot; 1 pt for a draw &middot; 0 pts for a loss</p>
          </div>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : standings.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">
                No completed matches yet. Results will appear here once matches are played.
              </div>
            ) : (
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/80 hover:bg-gray-50/80">
                    <TableHead className="w-12 text-center">#</TableHead>
                    <TableHead>Player</TableHead>
                    <TableHead className="text-center w-12">P</TableHead>
                    <TableHead className="text-center w-12">W</TableHead>
                    <TableHead className="text-center w-12">D</TableHead>
                    <TableHead className="text-center w-12">L</TableHead>
                    <TableHead className="text-center w-16 font-bold">Pts</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {standings.map((s, i) => (
                    <TableRow
                      key={s.id}
                      className={
                        i === 0
                          ? "bg-amber-50/60 hover:bg-amber-50"
                          : i === 1
                          ? "bg-gray-50/40 hover:bg-gray-100/60"
                          : i === 2
                          ? "bg-orange-50/40 hover:bg-orange-50/60"
                          : ""
                      }
                    >
                      <TableCell className="text-center">{getRankBadge(i + 1)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${avatarColor(s.id)}`}>
                            {getInitials(s.name)}
                          </div>
                          <span className="font-medium text-gray-900 text-sm truncate max-w-[120px]">{s.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-gray-600">{s.played}</TableCell>
                      <TableCell className="text-center text-emerald-700 font-medium">{s.won}</TableCell>
                      <TableCell className="text-center text-amber-600">{s.drawn}</TableCell>
                      <TableCell className="text-center text-red-600">{s.lost}</TableCell>
                      <TableCell className="text-center">
                        <span
                          className="inline-flex items-center justify-center h-7 min-w-[28px] rounded-md bg-gray-900 text-white text-sm font-bold px-1.5 cursor-default"
                          title={s.bonus > 0 ? `${s.won * 3} (wins) + ${s.drawn} (draws) + ${s.bonus} (streak bonus) = ${s.points}` : `${s.won * 3} (wins) + ${s.drawn} (draws) = ${s.points}`}
                        >
                          {s.points}
                          {s.bonus > 0 && (
                            <span className="ml-1 text-[10px] text-orange-300 font-normal">+{s.bonus}</span>
                          )}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        /* ─── Match List ─── */
        <>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-28 w-full rounded-xl" />
              ))}
            </div>
          ) : filteredMatches.length === 0 ? (
            <Alert className="border-dashed">
              <Info className="h-4 w-4" />
              <AlertTitle>No matches yet</AlertTitle>
              <AlertDescription>
                {filter === "all"
                  ? "Start the tournament to generate matches"
                  : `No ${filter} matches found`}
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              {/* KotC Status Banner */}
              {isKotc && tournamentData?.metadata && tournamentStatus === "ONGOING" && (
                <Card className="border-amber-200 bg-amber-50/50 mb-4">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-amber-900">Court Status</p>
                        <p className="text-xs text-amber-700 mt-0.5">
                          Streak: {(tournamentData.metadata as any).streak || 0} consecutive wins
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-amber-700">
                          Matches: {(tournamentData.metadata as any).matchesPlayed || 0} / {tournamentData.totalMatches || "?"}
                        </p>
                        <p className="text-xs text-amber-600 mt-0.5">
                          Bench: {((tournamentData.metadata as any).bench || []).length} waiting
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Round-based rendering */}
              {isRoundBased ? (() => {
                const roundGroups = new Map<number, Match[]>();
                for (const m of filteredMatches) {
                  const r = m.round || 1;
                  if (!roundGroups.has(r)) roundGroups.set(r, []);
                  roundGroups.get(r)!.push(m);
                }
                const sortedRounds = Array.from(roundGroups.entries()).sort((a, b) => isKotc ? b[0] - a[0] : a[0] - b[0]);
                const totalRoundsLabel = matchmakingMethod === "SWISS" ? tournamentData?.totalRounds : matchmakingMethod === "ROTATING_PARTNER" ? tournamentData?.totalRounds : tournamentData?.totalMatches;

                return sortedRounds.map(([roundNum, roundMatches]) => (
                  <div key={roundNum} className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-7 px-3 rounded-full bg-gray-900 text-white text-xs font-semibold flex items-center">
                        {isKotc ? `Match ${roundNum}` : `Round ${roundNum}`}
                        {totalRoundsLabel && (
                          <span className="text-gray-400 ml-1">/ {totalRoundsLabel}</span>
                        )}
                      </div>
                      {roundMatches.every((m) => m.status === "FINISHED") && (
                        <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 text-[10px]">Complete</Badge>
                      )}
                      {roundMatches.some((m) => m.status === "PENDING") && (
                        <Badge variant="secondary" className="bg-amber-50 text-amber-700 text-[10px]">In Progress</Badge>
                      )}
                    </div>
                    <div className="space-y-3">
                      {roundMatches.map((match) => renderMatchCard(match))}
                    </div>
                  </div>
                ));
              })() : (
                <div className="space-y-3">
                  {filteredMatches.map((match) => renderMatchCard(match))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ─── Submit Result Dialog ─── */}
      <AlertDialog open={resultDialogOpen} onOpenChange={setResultDialogOpen}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Match Result</AlertDialogTitle>
            <AlertDialogDescription>
              Select the winner for this match. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {selectedMatch && (
            <div className="space-y-2 py-2">
              {/* Option: Team 1 / Player 1 wins */}
              <button
                disabled={submitting}
                onClick={() => handleSubmitResult("team1")}
                className="w-full flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-left hover:bg-blue-100 hover:border-blue-300 transition-colors disabled:opacity-50"
              >
                <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {selectedMatch.player3 && selectedMatch.player4 ? "T1" : "P1"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {selectedMatch.player3 && selectedMatch.player4
                      ? `${selectedMatch.player1?.name || "?"} & ${selectedMatch.player2?.name || "?"}`
                      : selectedMatch.player1?.name || "Player 1"}
                  </p>
                  <p className="text-xs text-gray-500">{team1Label} wins</p>
                </div>
                <Trophy className="h-4 w-4 text-blue-500 shrink-0" />
              </button>

              {/* Option: Team 2 / Player 2 wins */}
              <button
                disabled={submitting}
                onClick={() => handleSubmitResult("team2")}
                className="w-full flex items-center gap-3 rounded-lg border border-purple-200 bg-purple-50 p-3 text-left hover:bg-purple-100 hover:border-purple-300 transition-colors disabled:opacity-50"
              >
                <div className="h-8 w-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {selectedMatch.player3 && selectedMatch.player4 ? "T2" : "P2"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {selectedMatch.player3 && selectedMatch.player4
                      ? `${selectedMatch.player3?.name || "?"} & ${selectedMatch.player4?.name || "?"}`
                      : selectedMatch.player2?.name || "Player 2"}
                  </p>
                  <p className="text-xs text-gray-500">{team2Label} wins</p>
                </div>
                <Trophy className="h-4 w-4 text-purple-500 shrink-0" />
              </button>

              {/* Option: Draw — not available for King of the Court */}
              {!isKotc && (
              <button
                disabled={submitting}
                onClick={() => handleSubmitResult("draw")}
                className="w-full flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 text-left hover:bg-gray-100 hover:border-gray-300 transition-colors disabled:opacity-50"
              >
                <div className="h-8 w-8 rounded-full bg-gray-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  <Minus className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">Draw</p>
                  <p className="text-xs text-gray-500">Match ended in a draw</p>
                </div>
              </button>
              )}
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
          </AlertDialogFooter>

          {submitting && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/60 rounded-lg">
              <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
            </div>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
