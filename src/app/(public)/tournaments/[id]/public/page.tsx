"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Trophy,
  Clock,
  CheckCircle2,
  Play,
  Users,
  Gamepad2,
  Minus,
  BarChart3,
  Crown,
} from "lucide-react";

interface Match {
  id: string;
  team1: string;
  team2: string;
  team1Players: string[];
  team2Players: string[];
  result: { winner?: string } | null;
  status: string;
  createdAt: string;
}

interface Participant {
  id: string;
  teamName: string | null;
  displayName: string;
}

interface TournamentInfo {
  id: string;
  name: string;
  type: string;
  status: string;
  createdAt: string;
  participantCount: number;
  matchCount: number;
}

interface Standing {
  name: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  points: number;
}

function computeStandings(matches: Match[], participants: Participant[]): Standing[] {
  const map = new Map<string, Standing>();

  for (const p of participants) {
    map.set(p.displayName, { name: p.displayName, played: 0, won: 0, drawn: 0, lost: 0, points: 0 });
  }

  const ensure = (name: string) => {
    if (!map.has(name)) map.set(name, { name, played: 0, won: 0, drawn: 0, lost: 0, points: 0 });
  };

  for (const m of matches) {
    if (m.status !== "FINISHED" || !m.result?.winner) continue;

    for (const p of [...m.team1Players, ...m.team2Players]) ensure(p);

    if (m.result.winner === "draw") {
      for (const p of [...m.team1Players, ...m.team2Players]) {
        const s = map.get(p)!;
        s.played++; s.drawn++; s.points += 1;
      }
    } else if (m.result.winner === "team1") {
      for (const p of m.team1Players) { const s = map.get(p)!; s.played++; s.won++; s.points += 3; }
      for (const p of m.team2Players) { const s = map.get(p)!; s.played++; s.lost++; }
    } else {
      for (const p of m.team2Players) { const s = map.get(p)!; s.played++; s.won++; s.points += 3; }
      for (const p of m.team1Players) { const s = map.get(p)!; s.played++; s.lost++; }
    }
  }

  return Array.from(map.values())
    .filter((s) => s.played > 0)
    .sort((a, b) => b.points - a.points || b.won - a.won);
}

export default function PublicTournamentPage() {
  const params = useParams();
  const id = params?.id as string;

  const [tournament, setTournament] = useState<TournamentInfo | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState("matches");

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/tournaments/${id}/public`);
        if (!res.ok) {
          setError("Tournament not found");
          return;
        }
        const data = await res.json();
        setTournament(data.tournament);
        setMatches(data.matches);
        setParticipants(data.participants);
      } catch {
        setError("Failed to load tournament");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const standings = useMemo(() => computeStandings(matches, participants), [matches, participants]);
  const winner = standings.length > 0 && tournament?.status === "FINISHED" ? standings[0] : null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "OPEN":
        return <Badge className="bg-blue-100 text-blue-700"><Clock className="h-3 w-3 mr-1" />Open</Badge>;
      case "ONGOING":
        return <Badge className="bg-green-100 text-green-700"><Play className="h-3 w-3 mr-1" />Ongoing</Badge>;
      case "FINISHED":
        return <Badge className="bg-gray-100 text-gray-700"><CheckCircle2 className="h-3 w-3 mr-1" />Finished</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Skeleton className="h-10 w-64 mb-4" />
        <Skeleton className="h-6 w-48 mb-8" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <Trophy className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Tournament not found</h1>
        <p className="text-gray-500">This tournament may not exist or has been removed.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Trophy className="h-8 w-8" style={{ color: "#da6c6c" }} />
          <h1 className="text-3xl font-bold text-gray-900">{tournament.name}</h1>
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-600">
          {getStatusBadge(tournament.status)}
          <span className="flex items-center gap-1"><Users className="h-4 w-4" />{tournament.participantCount} players</span>
          <span className="flex items-center gap-1"><Gamepad2 className="h-4 w-4" />{tournament.matchCount} matches</span>
        </div>
      </div>

      {/* Winner banner */}
      {winner && (
        <div className="mb-6 rounded-xl bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 p-5 text-center">
          <Crown className="h-10 w-10 text-amber-500 mx-auto mb-2" />
          <h2 className="text-xl font-bold text-gray-900">🏆 {winner.name} wins!</h2>
          <p className="text-amber-700 text-sm">{winner.points} points • {winner.won}W {winner.drawn}D {winner.lost}L</p>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab} className="mb-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="matches">Matches</TabsTrigger>
          <TabsTrigger value="standings" className="gap-1">
            <BarChart3 className="h-3.5 w-3.5" />Standings
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === "standings" ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Points Table</CardTitle>
            <p className="text-xs text-gray-500">3 pts win · 1 pt draw · 0 pts loss</p>
          </CardHeader>
          <CardContent className="p-0">
            {standings.length === 0 ? (
              <p className="p-8 text-center text-gray-500 text-sm">No completed matches yet</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/80">
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
                    <TableRow key={s.name} className={i === 0 ? "bg-amber-50/60" : i === 1 ? "bg-gray-50/40" : i === 2 ? "bg-orange-50/40" : ""}>
                      <TableCell className="text-center font-bold text-sm">{i + 1}</TableCell>
                      <TableCell className="font-medium text-gray-900">{s.name}</TableCell>
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
        <div className="space-y-3">
          {matches.length === 0 ? (
            <p className="py-12 text-center text-gray-500">No matches yet</p>
          ) : (
            matches.map((m, i) => {
              const isDone = m.status === "FINISHED";
              const isDraw = m.result?.winner === "draw";
              const t1Won = m.result?.winner === "team1";
              const t2Won = m.result?.winner === "team2";

              return (
                <div
                  key={m.id}
                  className={`rounded-xl border bg-white overflow-hidden ${isDone ? "border-l-[3px] border-l-emerald-500" : "border-l-[3px] border-l-amber-400"}`}
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] font-semibold text-gray-500 uppercase">Match {i + 1}</span>
                      {isDone ? (
                        <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px]">
                          <CheckCircle2 className="h-3 w-3 mr-1" />Completed
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-50 text-amber-700 border border-amber-200 text-[11px]">
                          <Clock className="h-3 w-3 mr-1" />Pending
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`flex-1 text-center p-3 rounded-lg border ${t1Won ? "bg-emerald-50 border-emerald-200" : "bg-gray-50 border-gray-100"}`}>
                        <span className={`text-sm font-semibold ${t1Won ? "text-emerald-700" : "text-gray-900"}`}>{m.team1}</span>
                        {t1Won && <Trophy className="h-3.5 w-3.5 text-emerald-600 inline ml-1.5" />}
                      </div>
                      <span className="text-xs font-bold text-gray-400">VS</span>
                      <div className={`flex-1 text-center p-3 rounded-lg border ${t2Won ? "bg-emerald-50 border-emerald-200" : "bg-gray-50 border-gray-100"}`}>
                        <span className={`text-sm font-semibold ${t2Won ? "text-emerald-700" : "text-gray-900"}`}>{m.team2}</span>
                        {t2Won && <Trophy className="h-3.5 w-3.5 text-emerald-600 inline ml-1.5" />}
                      </div>
                    </div>
                    {isDraw && (
                      <div className="mt-2 text-center text-xs text-amber-700 flex items-center justify-center gap-1">
                        <Minus className="h-3 w-3" />Draw
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 text-center text-xs text-gray-400">
        Powered by <span style={{ color: "#da6c6c" }} className="font-semibold">Tourny</span>
      </div>
    </div>
  );
}
