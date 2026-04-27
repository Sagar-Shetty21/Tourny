"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
} from "lucide-react";
import { toast } from "sonner";

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
  result: { winner?: string } | null;
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
    if (!map.has(p.id)) map.set(p.id, { id: p.id, name: p.name, played: 0, won: 0, drawn: 0, lost: 0, points: 0 });
  };

  for (const m of matches) {
    if (m.status !== "FINISHED" || !m.result?.winner) continue;
    const isDoubles = !!(m.player3 && m.player4);
    const team1: Player[] = [m.player1, m.player2].filter(Boolean) as Player[];
    const team2: Player[] = isDoubles
      ? ([m.player3, m.player4].filter(Boolean) as Player[])
      : ([m.player2].filter(Boolean) as Player[]);
    // For singles, team1=[player1], team2=[player2]
    const singlesTeam1 = isDoubles ? team1 : [m.player1].filter(Boolean) as Player[];
    const singlesTeam2 = isDoubles ? team2 : [m.player2].filter(Boolean) as Player[];

    for (const p of [...singlesTeam1, ...singlesTeam2]) ensure(p);

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
        s.points += 3;
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
        s.points += 3;
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

  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [role, setRole] = useState<string | null>(null);
  const [tournamentType, setTournamentType] = useState<string>("SINGLES");
  const [tournamentStatus, setTournamentStatus] = useState<string>("OPEN");
  const [resetting, setResetting] = useState<string | null>(null);

  // Result dialog state
  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      try {
        const [matchesRes, tournamentRes] = await Promise.all([
          fetch(`/api/tournaments/${id}/matches`),
          fetch(`/api/tournaments/${id}`),
        ]);
        const matchesData = await matchesRes.json();
        const tournamentData = await tournamentRes.json();

        if (matchesRes.ok) setMatches(matchesData.matches);
        if (tournamentRes.ok) {
          setRole(tournamentData.role || null);
          setTournamentType(tournamentData.tournament.type);
          setTournamentStatus(tournamentData.tournament.status);
        }
      } catch (err) {
        console.error("Failed to fetch data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const filteredMatches = useMemo(() => {
    if (filter === "pending") return matches.filter((m) => m.status === "PENDING");
    if (filter === "finished") return matches.filter((m) => m.status === "FINISHED");
    return matches;
  }, [filter, matches]);

  const standings = useMemo(() => computeStandings(matches), [matches]);

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
        setMatches((prev) =>
          prev.map((m) => (m.id === selectedMatch.id ? { ...m, status: "FINISHED", result: { winner } } : m))
        );
        toast.success("Result submitted successfully");
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
        setMatches((prev) =>
          prev.map((m) => (m.id === matchId ? { ...m, status: "PENDING", result: null } : m))
        );
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
            <Button size="sm" className="bg-gray-900 text-white hover:bg-gray-800">
              <Gamepad2 className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Matches</span>
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

      {/* Tabs: Matches filters + Points Table */}
      <Tabs value={filter} onValueChange={setFilter} className="mb-6">
        <TabsList className="grid w-full grid-cols-4 h-10">
          <TabsTrigger value="all" className="text-xs sm:text-sm">
            All ({matches.length})
          </TabsTrigger>
          <TabsTrigger value="pending" className="text-xs sm:text-sm">
            Pending ({matches.filter((m) => m.status === "PENDING").length})
          </TabsTrigger>
          <TabsTrigger value="finished" className="text-xs sm:text-sm">
            Done ({matches.filter((m) => m.status === "FINISHED").length})
          </TabsTrigger>
          <TabsTrigger value="standings" className="text-xs sm:text-sm gap-1">
            <BarChart3 className="h-3.5 w-3.5 hidden sm:block" />
            Standings
          </TabsTrigger>
        </TabsList>
      </Tabs>

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
                          <span className="font-medium text-gray-900 text-sm">{s.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-gray-600">{s.played}</TableCell>
                      <TableCell className="text-center text-emerald-700 font-medium">{s.won}</TableCell>
                      <TableCell className="text-center text-amber-600">{s.drawn}</TableCell>
                      <TableCell className="text-center text-red-600">{s.lost}</TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center justify-center h-7 min-w-[28px] rounded-md bg-gray-900 text-white text-sm font-bold px-1.5">
                          {s.points}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
              {filteredMatches.map((match, index) => {
                const matchNumber = matches.indexOf(match) + 1;
                const result = getResultLabel(match);
                const isDoublesMatch = !!(match.player3 && match.player4);

                return (
                  <div
                    key={match.id}
                    className={`group relative rounded-xl border bg-white overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${
                      match.status === "FINISHED"
                        ? "border-l-[3px] border-l-emerald-500"
                        : "border-l-[3px] border-l-amber-400"
                    }`}
                  >
                    <div className="p-4 sm:p-5">
                      {/* Top bar: match number + status */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center justify-center h-6 px-2.5 rounded-full bg-gray-100 text-[11px] font-semibold text-gray-600 uppercase tracking-wide">
                            Match {matchNumber}
                          </span>
                          {match.status === "PENDING" ? (
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
                        </div>
                        <div className="flex gap-2">
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
              })}
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

              {/* Option: Draw */}
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
