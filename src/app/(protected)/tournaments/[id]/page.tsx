"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Settings,
  Users,
  Gamepad2,
  UserPlus,
  Play,
  Info,
  Trophy,
  Target,
  CheckCircle2,
  Clock,
  Share2,
  Copy,
  Flag,
  Sparkles,
  Crown,
} from "lucide-react";
import { toast } from "sonner";

interface Match {
  id: string;
  status: string;
  result: { winner?: string } | null;
  player1?: { id: string; name: string } | null;
  player2?: { id: string; name: string } | null;
  player3?: { id: string; name: string } | null;
  player4?: { id: string; name: string } | null;
  createdAt: string;
}

interface Tournament {
  id: string;
  name: string;
  description?: string;
  type: string;
  status: string;
  maxParticipants?: number;
  joinExpiry?: string;
  createdAt: string;
  owners: Array<{ userId: string; role: string }>;
  participants: Array<{ id: string; userId: string }>;
  matches: Match[];
  finishVotes?: Array<{ userId: string }>;
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

function computeStandings(matches: Match[]): PlayerStanding[] {
  const map = new Map<string, PlayerStanding>();
  const ensure = (p: { id: string; name: string } | null | undefined) => {
    if (!p) return;
    if (!map.has(p.id))
      map.set(p.id, { id: p.id, name: p.name, played: 0, won: 0, drawn: 0, lost: 0, points: 0 });
  };

  for (const m of matches) {
    if (m.status !== "FINISHED" || !m.result?.winner) continue;
    const isDoubles = !!(m.player3 && m.player4);
    const t1 = isDoubles ? [m.player1, m.player2].filter(Boolean) : [m.player1].filter(Boolean);
    const t2 = isDoubles ? [m.player3, m.player4].filter(Boolean) : [m.player2].filter(Boolean);
    for (const p of [...t1, ...t2]) ensure(p as { id: string; name: string });

    if (m.result.winner === "draw") {
      for (const p of [...t1, ...t2]) {
        const s = map.get(p!.id)!;
        s.played++; s.drawn++; s.points += 1;
      }
    } else if (m.result.winner === "team1") {
      for (const p of t1) { const s = map.get(p!.id)!; s.played++; s.won++; s.points += 3; }
      for (const p of t2) { const s = map.get(p!.id)!; s.played++; s.lost++; }
    } else {
      for (const p of t2) { const s = map.get(p!.id)!; s.played++; s.won++; s.points += 3; }
      for (const p of t1) { const s = map.get(p!.id)!; s.played++; s.lost++; }
    }
  }
  return Array.from(map.values()).sort((a, b) => b.points - a.points || b.won - a.won);
}

export default function TournamentPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [finishDialogOpen, setFinishDialogOpen] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetchTournament = async () => {
      try {
        const res = await fetch(`/api/tournaments/${id}`);
        const data = await res.json();
        if (res.ok) {
          setTournament(data.tournament);
          setRole(data.role || null);
        } else {
          toast.error("Failed to load tournament", { description: data.error });
          router.push("/dashboard");
        }
      } catch {
        toast.error("Failed to load tournament");
        router.push("/dashboard");
      } finally {
        setLoading(false);
      }
    };
    fetchTournament();
  }, [id, router]);

  const handleStartTournament = async () => {
    if (!tournament) return;
    setStarting(true);
    try {
      const res = await fetch(`/api/tournaments/${id}/start`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        toast.success("Tournament started!", {
          description: `${data.matches.length} matches have been generated.`,
        });
        setTimeout(() => window.location.reload(), 1000);
      } else {
        toast.error("Failed to start tournament", { description: data.error });
      }
    } catch {
      toast.error("Failed to start tournament");
    } finally {
      setStarting(false);
    }
  };

  const handleFinishTournament = async () => {
    setFinishing(true);
    try {
      const res = await fetch(`/api/tournaments/${id}/finish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (res.ok) {
        if (data.finished) {
          toast.success("Tournament finished!");
          setTimeout(() => window.location.reload(), 1000);
        } else {
          toast.success(data.message);
        }
      } else {
        toast.error(data.error || "Failed to finish tournament");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setFinishing(false);
      setFinishDialogOpen(false);
    }
  };

  const handleCopyShareLink = async () => {
    const url = `${window.location.origin}/tournaments/${id}/public`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Share link copied!");
    } catch {
      toast.error("Failed to copy");
    }
  };

  const standings = useMemo(
    () => (tournament ? computeStandings(tournament.matches) : []),
    [tournament]
  );

  // Trigger confetti on first mount when tournament is finished
  useEffect(() => {
    if (tournament?.status === "FINISHED" && standings.length > 0) {
      const key = `confetti_shown_${id}`;
      if (!sessionStorage.getItem(key)) {
        setShowConfetti(true);
        sessionStorage.setItem(key, "1");
        const timer = setTimeout(() => setShowConfetti(false), 4000);
        return () => clearTimeout(timer);
      }
    }
  }, [tournament?.status, standings.length, id]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "OPEN":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-base px-3 py-1"><Clock className="h-4 w-4 mr-1" />Open</Badge>;
      case "ONGOING":
        return <Badge variant="secondary" className="bg-green-100 text-green-700 text-base px-3 py-1"><Play className="h-4 w-4 mr-1" />Ongoing</Badge>;
      case "FINISHED":
        return <Badge variant="secondary" className="bg-gray-100 text-gray-700 text-base px-3 py-1"><CheckCircle2 className="h-4 w-4 mr-1" />Finished</Badge>;
      default:
        return <Badge variant="secondary" className="text-base px-3 py-1">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Skeleton className="h-10 w-64 mb-4" />
        <Skeleton className="h-20 w-full mb-4" />
        <div className="grid md:grid-cols-3 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  if (!tournament) return null;

  const pendingMatches = tournament.matches.filter((m) => m.status === "PENDING").length;
  const finishedMatches = tournament.matches.filter((m) => m.status === "FINISHED").length;
  const totalMatches = tournament.matches.length;
  const progress = totalMatches > 0 ? Math.round((finishedMatches / totalMatches) * 100) : 0;
  const isOrganizer = role === "organizer";
  const isManager = role === "manager";
  const canManage = isOrganizer || isManager;
  const allMatchesDone = totalMatches > 0 && pendingMatches === 0;
  const recentMatches = [...tournament.matches]
    .filter((m) => m.status === "FINISHED")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);
  const winner = standings.length > 0 && tournament.status === "FINISHED" ? standings[0] : null;
  const top3 = standings.slice(0, 3);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Winner Celebration with Confetti */}
      {tournament.status === "FINISHED" && top3.length > 0 && (
        <div className="relative mb-8 rounded-2xl overflow-hidden bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 border border-amber-200 p-6 sm:p-8">
          {/* Confetti particles */}
          {showConfetti && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
              {[...Array(60)].map((_, i) => {
                const colors = ["#f59e0b", "#ef4444", "#3b82f6", "#10b981", "#8b5cf6", "#ec4899", "#f97316"];
                const color = colors[i % colors.length];
                const isLeft = i < 30;
                const startX = isLeft ? -5 : 105;
                const endX = isLeft ? 10 + Math.random() * 80 : 10 + Math.random() * 80;
                const delay = Math.random() * 0.8;
                const duration = 1.5 + Math.random() * 1.5;
                const size = 4 + Math.random() * 6;
                const rotation = Math.random() * 360;
                return (
                  <div
                    key={i}
                    className="absolute"
                    style={{
                      left: `${startX}%`,
                      bottom: "0%",
                      width: `${size}px`,
                      height: `${size * (Math.random() > 0.5 ? 1 : 2.5)}px`,
                      backgroundColor: color,
                      borderRadius: Math.random() > 0.5 ? "50%" : "1px",
                      transform: `rotate(${rotation}deg)`,
                      animation: `confetti-burst ${duration}s ease-out ${delay}s forwards`,
                      opacity: 0,
                      // @ts-ignore
                      "--end-x": `${endX - startX}vw`,
                      "--end-y": `${-(60 + Math.random() * 40)}vh`,
                    } as React.CSSProperties}
                  />
                );
              })}
              <style>{`
                @keyframes confetti-burst {
                  0% { opacity: 1; transform: translate(0, 0) rotate(0deg); }
                  100% { opacity: 0; transform: translate(var(--end-x), var(--end-y)) rotate(720deg); }
                }
              `}</style>
            </div>
          )}
          <div className="relative text-center">
            <Crown className="h-10 w-10 text-amber-500 mx-auto mb-4" />
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">Tournament Complete!</h2>
            {/* Top 3 Podium */}
            <div className="flex items-end justify-center gap-3 sm:gap-6 max-w-md mx-auto">
              {/* 2nd place */}
              {top3[1] && (
                <div className="flex flex-col items-center flex-1 animate-in slide-in-from-bottom-4 duration-700" style={{ animationDelay: "0.2s", animationFillMode: "both" }}>
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gray-200 border-2 border-gray-300 flex items-center justify-center text-gray-700 font-bold text-lg mb-2">2</div>
                  <p className="text-sm font-semibold text-gray-700 truncate max-w-full">{top3[1].name}</p>
                  <p className="text-xs text-gray-500">{top3[1].points} pts</p>
                  <div className="w-full h-16 sm:h-20 bg-gray-200 rounded-t-lg mt-2" />
                </div>
              )}
              {/* 1st place */}
              {top3[0] && (
                <div className="flex flex-col items-center flex-1 animate-in slide-in-from-bottom-8 duration-700" style={{ animationDelay: "0s", animationFillMode: "both" }}>
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-amber-100 border-2 border-amber-400 flex items-center justify-center text-amber-700 font-bold text-xl mb-2">
                    <Trophy className="h-6 w-6" />
                  </div>
                  <p className="text-sm sm:text-base font-bold text-gray-900 truncate max-w-full">{top3[0].name}</p>
                  <p className="text-xs text-amber-700 font-semibold">{top3[0].points} pts</p>
                  <div className="w-full h-24 sm:h-28 bg-amber-200 rounded-t-lg mt-2" />
                </div>
              )}
              {/* 3rd place */}
              {top3[2] && (
                <div className="flex flex-col items-center flex-1 animate-in slide-in-from-bottom-2 duration-700" style={{ animationDelay: "0.4s", animationFillMode: "both" }}>
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-orange-100 border-2 border-orange-300 flex items-center justify-center text-orange-700 font-bold text-lg mb-2">3</div>
                  <p className="text-sm font-semibold text-gray-700 truncate max-w-full">{top3[2].name}</p>
                  <p className="text-xs text-gray-500">{top3[2].points} pts</p>
                  <div className="w-full h-12 sm:h-14 bg-orange-100 rounded-t-lg mt-2" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{tournament.name}</h1>
            <p className="text-gray-600 mt-1 flex items-center gap-2">
              <Target className="h-4 w-4" />
              {tournament.type} • Round Robin
              {role && (
                <Badge variant="outline" className="ml-2 text-xs capitalize">{role}</Badge>
              )}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={handleCopyShareLink}>
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
            {isOrganizer && tournament.status === "OPEN" && tournament.participants.length >= 2 && (
              <Button onClick={handleStartTournament} disabled={starting}>
                {starting ? "Starting..." : <><Play className="h-4 w-4 mr-2" />Start Tournament</>}
              </Button>
            )}
            {canManage && tournament.status === "ONGOING" && allMatchesDone && (
              <Button onClick={() => setFinishDialogOpen(true)} className="bg-amber-600 hover:bg-amber-700">
                <Flag className="h-4 w-4 mr-2" />
                Finish Tournament
              </Button>
            )}
            {isOrganizer && (
              <Link href={`/tournaments/${id}/settings`}>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Start Tournament Alert */}
      {isOrganizer && tournament.status === "OPEN" && tournament.participants.length < 2 && (
        <Alert className="mb-6">
          <Info className="h-4 w-4" />
          <AlertTitle>Not enough participants</AlertTitle>
          <AlertDescription>
            You need at least {tournament.type === "SINGLES" ? "2" : "4"} participants to start the tournament.
          </AlertDescription>
        </Alert>
      )}

      {/* Quick Navigation */}
      <div className="mb-6 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          <Link href={`/tournaments/${id}`}>
            <Button variant="outline" className="text-white" style={{ backgroundColor: "#da6c6c" }}>
              <Trophy className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Overview</span>
            </Button>
          </Link>
          <Link href={`/tournaments/${id}/players`}>
            <Button variant="outline">
              <Users className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Players</span>
            </Button>
          </Link>
          <Link href={`/tournaments/${id}/matches`}>
            <Button variant="outline">
              <Gamepad2 className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Matches</span>
            </Button>
          </Link>
          {tournament.status !== "FINISHED" && (
            <Link href={`/tournaments/${id}/invite`}>
              <Button variant="outline">
                <UserPlus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Invite</span>
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-5 pb-4 px-4">
            <Users className="h-5 w-5 text-muted-foreground mb-1" />
            <p className="text-2xl font-bold text-indigo-600">
              {tournament.participants.length}
              {tournament.maxParticipants ? <span className="text-sm text-gray-400">/{tournament.maxParticipants}</span> : ""}
            </p>
            <p className="text-xs text-gray-500">Players</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4 px-4">
            <Gamepad2 className="h-5 w-5 text-muted-foreground mb-1" />
            <p className="text-2xl font-bold text-green-600">{totalMatches}</p>
            <p className="text-xs text-gray-500">
              {finishedMatches} done • {pendingMatches} left
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4 px-4">
            <p className="text-xs text-gray-500 mb-1">Status</p>
            {getStatusBadge(tournament.status)}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4 px-4">
            <p className="text-xs text-gray-500 mb-1">Progress</p>
            <p className="text-2xl font-bold text-gray-900">{progress}%</p>
            <div className="mt-1 h-2 w-full rounded-full bg-gray-100">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progress}%`, backgroundColor: "#da6c6c" }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Description */}
      {tournament.description && (
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">About</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 text-sm">{tournament.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Two-column: Mini Standings + Recent Matches */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Mini Standings */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Standings</CardTitle>
              <Link href={`/tournaments/${id}/matches`}>
                <Button variant="ghost" size="sm" className="text-xs">View all</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {standings.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">No results yet</p>
            ) : (
              <div className="space-y-2">
                {standings.slice(0, 5).map((s, i) => (
                  <div key={s.id} className={`flex items-center justify-between p-2 rounded-lg text-sm ${i === 0 ? "bg-amber-50" : ""}`}>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center justify-center h-6 w-6 rounded-full text-xs font-bold ${
                        i === 0 ? "bg-amber-200 text-amber-800" : i === 1 ? "bg-gray-200 text-gray-700" : i === 2 ? "bg-orange-100 text-orange-700" : "text-gray-500"
                      }`}>{i + 1}</span>
                      <span className="font-medium text-gray-900 truncate">{s.name}</span>
                    </div>
                    <span className="font-bold text-gray-900">{s.points} pts</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Matches */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Recent Matches</CardTitle>
              <Link href={`/tournaments/${id}/matches`}>
                <Button variant="ghost" size="sm" className="text-xs">View all</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentMatches.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">No completed matches yet</p>
            ) : (
              <div className="space-y-2">
                {recentMatches.map((m) => {
                  const isDoubles = !!(m.player3 && m.player4);
                  const t1Name = isDoubles
                    ? `${m.player1?.name || "?"} & ${m.player2?.name || "?"}`
                    : m.player1?.name || "?";
                  const t2Name = isDoubles
                    ? `${m.player3?.name || "?"} & ${m.player4?.name || "?"}`
                    : m.player2?.name || "?";
                  const isDraw = m.result?.winner === "draw";
                  const t1Won = m.result?.winner === "team1";

                  return (
                    <div key={m.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 text-sm">
                      <span className={`truncate flex-1 ${t1Won ? "font-semibold text-emerald-700" : "text-gray-700"}`}>{t1Name}</span>
                      <span className="mx-2 text-xs text-gray-400">{isDraw ? "Draw" : "vs"}</span>
                      <span className={`truncate flex-1 text-right ${!isDraw && !t1Won ? "font-semibold text-emerald-700" : "text-gray-700"}`}>{t2Name}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Finish Tournament Dialog */}
      <AlertDialog open={finishDialogOpen} onOpenChange={setFinishDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finish Tournament?</AlertDialogTitle>
            <AlertDialogDescription>
              {isOrganizer
                ? "As the organizer, this will immediately end the tournament. This cannot be undone."
                : "As a manager, your vote will be recorded. The tournament finishes when 2 or more managers vote to finish."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={finishing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleFinishTournament}
              disabled={finishing}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {finishing ? "Processing..." : isOrganizer ? "Finish Now" : "Cast Vote"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
