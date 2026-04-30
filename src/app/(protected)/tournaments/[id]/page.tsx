"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  collection,
  doc,
  setDoc,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { useFirebase } from "@/components/FirebaseProvider";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Settings,
  Users,
  Gamepad2,
  UserPlus,
  MessageCircle,
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
  RefreshCw,
  Zap,
  Timer,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import { useTournament, invalidateTournament, invalidateMatches } from "@/lib/swr";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

interface AvailabilityDoc {
  odcId: string;
  available: boolean;
  userName: string;
  expiresAt: Timestamp | null;
  updatedAt: Timestamp;
}

interface MatchInviteDoc {
  id: string;
  matchId: string;
  matchNumber: number;
  inviterName: string;
  playerIds: string[];
  playerNames: Record<string, string>;
  votes: Record<string, string>;
  status: string;
  createdAt: Timestamp | null;
}

interface Match {
  id: string;
  status: string;
  result: { winner?: string; bye?: boolean; defenderBonus?: number } | null;
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
  participants: Array<{ id: string; userId: string; removedAt?: string | null }>;
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
  bonus: number;
}

function computeStandings(matches: Match[]): PlayerStanding[] {
  const map = new Map<string, PlayerStanding>();
  const ensure = (p: { id: string; name: string } | null | undefined) => {
    if (!p) return;
    if (!map.has(p.id))
      map.set(p.id, { id: p.id, name: p.name, played: 0, won: 0, drawn: 0, lost: 0, points: 0, bonus: 0 });
  };

  for (const m of matches) {
    if (m.status !== "FINISHED" || !m.result?.winner) continue;
    if (m.result.bye) continue; // Skip bye matches
    const isDoubles = !!(m.player3 && m.player4);
    const t1 = isDoubles ? [m.player1, m.player2].filter(Boolean) : [m.player1].filter(Boolean);
    const t2 = isDoubles ? [m.player3, m.player4].filter(Boolean) : [m.player2].filter(Boolean);
    for (const p of [...t1, ...t2]) ensure(p as { id: string; name: string });

    const defenderBonus = m.result.defenderBonus || 0;

    if (m.result.winner === "draw") {
      for (const p of [...t1, ...t2]) {
        const s = map.get(p!.id)!;
        s.played++; s.drawn++; s.points += 1;
      }
    } else if (m.result.winner === "team1") {
      for (const p of t1) { const s = map.get(p!.id)!; s.played++; s.won++; s.points += 3 + defenderBonus; s.bonus += defenderBonus; }
      for (const p of t2) { const s = map.get(p!.id)!; s.played++; s.lost++; }
    } else {
      for (const p of t2) { const s = map.get(p!.id)!; s.played++; s.won++; s.points += 3 + defenderBonus; s.bonus += defenderBonus; }
      for (const p of t1) { const s = map.get(p!.id)!; s.played++; s.lost++; }
    }
  }
  return Array.from(map.values()).sort((a, b) => b.points - a.points || b.won - a.won);
}

export default function TournamentPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id;
  const userName = (session?.user as any)?.username || session?.user?.name || "Anonymous";
  const { isFirebaseReady } = useFirebase();

  const { tournament, role, isLoading: loading, error: fetchError, mutate } = useTournament(id);
  const [starting, setStarting] = useState(false);
  const [finishDialogOpen, setFinishDialogOpen] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [resyncing, setResyncing] = useState(false);

  // Availability state
  const [availablePlayers, setAvailablePlayers] = useState<AvailabilityDoc[]>([]);
  const [myAvailability, setMyAvailability] = useState<AvailabilityDoc | null>(null);
  const [availPopoverOpen, setAvailPopoverOpen] = useState(false);
  const [customMinutes, setCustomMinutes] = useState("");

  // Ready-to-play match invites
  const [readyMatches, setReadyMatches] = useState<MatchInviteDoc[]>([]);

  // Listen to availability
  useEffect(() => {
    if (!id || !isFirebaseReady) return;
    const availRef = collection(getDb(), "tournaments", id, "availability");
    const unsub = onSnapshot(availRef, (snapshot) => {
      const now = new Date();
      const docs: AvailabilityDoc[] = snapshot.docs
        .map((d) => ({ odcId: d.id, ...d.data() } as AvailabilityDoc))
        .filter((d) => {
          if (!d.available) return false;
          if (d.expiresAt && d.expiresAt.toDate() < now) return false;
          return true;
        });
      setAvailablePlayers(docs);
      if (userId) {
        const mine = snapshot.docs.find((d) => d.id === userId);
        setMyAvailability(mine ? { odcId: mine.id, ...mine.data() } as AvailabilityDoc : null);
      }
    });
    return () => unsub();
  }, [id, isFirebaseReady, userId]);

  // Listen to accepted match invites (exclude finished matches & expired after 30 min)
  const finishedMatchIds = useMemo(() => {
    if (!tournament?.matches) return new Set<string>();
    return new Set(tournament.matches.filter((m: Match) => m.status === "FINISHED").map((m: Match) => m.id));
  }, [tournament?.matches]);

  useEffect(() => {
    if (!id || !isFirebaseReady) return;
    const invitesRef = collection(getDb(), "tournaments", id, "matchInvites");
    const unsub = onSnapshot(invitesRef, (snapshot) => {
      const now = Date.now();
      const THIRTY_MINUTES = 30 * 60 * 1000;
      const accepted: MatchInviteDoc[] = snapshot.docs
        .filter((d) => {
          const data = d.data();
          if (data.status !== "accepted") return false;
          if (finishedMatchIds.has(data.matchId)) return false;
          if (data.createdAt && data.createdAt.toDate().getTime() + THIRTY_MINUTES < now) return false;
          return true;
        })
        .map((d) => ({ id: d.id, ...d.data() } as MatchInviteDoc));
      setReadyMatches(accepted);
    });
    return () => unsub();
  }, [id, isFirebaseReady, finishedMatchIds]);

  const isCurrentlyAvailable = useMemo(() => {
    if (!myAvailability || !myAvailability.available) return false;
    if (myAvailability.expiresAt && myAvailability.expiresAt.toDate() < new Date()) return false;
    return true;
  }, [myAvailability]);

  const handleSetAvailability = async (minutes: number | null) => {
    if (!userId || !id) return;
    const expiresAt = minutes
      ? Timestamp.fromDate(new Date(Date.now() + minutes * 60 * 1000))
      : null;
    await setDoc(doc(getDb(), "tournaments", id, "availability", userId), {
      available: true,
      userName,
      expiresAt,
      updatedAt: Timestamp.now(),
    });
    setAvailPopoverOpen(false);
    setCustomMinutes("");
    toast.success(minutes ? `You're available for ${minutes} minutes` : "You're available until you turn off");
  };

  const handleSetUnavailable = async () => {
    if (!userId || !id) return;
    await setDoc(doc(getDb(), "tournaments", id, "availability", userId), {
      available: false,
      userName,
      expiresAt: null,
      updatedAt: Timestamp.now(),
    });
    toast.success("You're now unavailable");
  };

  useEffect(() => {
    if (fetchError) {
      toast.error("Failed to load tournament", { description: (fetchError as any).info?.error });
      router.push("/dashboard");
    }
  }, [fetchError, router]);

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
        mutate();
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
          mutate();
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

  const handleResyncMatches = async () => {
    setResyncing(true);
    try {
      const res = await fetch(`/api/tournaments/${id}/resync`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        const parts = [];
        if (data.matchesCreated > 0) parts.push(`${data.matchesCreated} created`);
        if (data.matchesDeleted > 0) parts.push(`${data.matchesDeleted} removed`);
        if (data.matchesStaled > 0) parts.push(`${data.matchesStaled} marked stale`);
        toast.success("Matches resynced!", {
          description: parts.length > 0 ? parts.join(", ") : "No changes needed",
        });
        mutate();
        invalidateMatches(id);
      } else {
        toast.error("Failed to resync matches", { description: data.error });
      }
    } catch {
      toast.error("Failed to resync matches");
    } finally {
      setResyncing(false);
    }
  };

  const standings = useMemo(
    () => (tournament ? computeStandings(tournament.matches.filter((m: Match) => m.status !== "STALE")) : []),
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

  const activeMatches = tournament.matches.filter((m: Match) => m.status !== "STALE");
  const pendingMatchCount = activeMatches.filter((m: Match) => m.status === "PENDING").length;
  const finishedMatchCount = activeMatches.filter((m: Match) => m.status === "FINISHED").length;
  const totalMatchCount = activeMatches.length;
  const staleMatches = tournament.matches.filter((m: Match) => m.status === "STALE").length;
  const progress = totalMatchCount > 0 ? Math.round((finishedMatchCount / totalMatchCount) * 100) : 0;
  const isOrganizer = role === "organizer";
  const isManager = role === "manager";
  const canManage = isOrganizer || isManager;
  const allMatchesDone = totalMatchCount > 0 && pendingMatchCount === 0;
  const activePlayers = tournament.participants.filter((p) => !p.removedAt);
  const matchmakingMethod = tournament.matchmakingMethod || "ROUND_ROBIN";
  const supportsResync = matchmakingMethod === "ROUND_ROBIN" || matchmakingMethod === "ROTATING_PARTNER";
  const formatLabel: Record<string, string> = {
    ROUND_ROBIN: "Round Robin",
    SWISS: "Swiss System",
    ROTATING_PARTNER: "Rotating Partner",
    KING_OF_THE_COURT: "King of the Court",
  };
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
              {tournament.type} • {formatLabel[matchmakingMethod] || matchmakingMethod}
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
            {isOrganizer && tournament.status === "OPEN" && activePlayers.length >= (
              matchmakingMethod === "SWISS" ? (tournament.type === "SINGLES" ? 4 : 8) :
              matchmakingMethod === "ROTATING_PARTNER" ? 8 :
              matchmakingMethod === "KING_OF_THE_COURT" ? (tournament.type === "SINGLES" ? 4 : 6) :
              tournament.type === "SINGLES" ? 2 : 4
            ) && (
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
            {isOrganizer && tournament.status === "ONGOING" && supportsResync && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" disabled={resyncing}>
                    {resyncing ? (
                      <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Resyncing...</>
                    ) : (
                      <><RefreshCw className="h-4 w-4 mr-2" />Resync Matches</>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Resync Matches?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will add matches for new players and handle removed players&apos; matches.
                      Pending matches of removed players will be deleted, and their finished matches will be marked as stale.
                      Existing match results will not be affected.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleResyncMatches}>
                      Resync
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
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
      {isOrganizer && tournament.status === "OPEN" && activePlayers.length < (
        matchmakingMethod === "SWISS" ? (tournament.type === "SINGLES" ? 4 : 8) :
        matchmakingMethod === "ROTATING_PARTNER" ? 8 :
        matchmakingMethod === "KING_OF_THE_COURT" ? (tournament.type === "SINGLES" ? 4 : 6) :
        tournament.type === "SINGLES" ? 2 : 4
      ) && (
        <Alert className="mb-6">
          <Info className="h-4 w-4" />
          <AlertTitle>Not enough participants</AlertTitle>
          <AlertDescription>
            You need at least {
              matchmakingMethod === "SWISS" ? (tournament.type === "SINGLES" ? "4" : "8") :
              matchmakingMethod === "ROTATING_PARTNER" ? "8" :
              matchmakingMethod === "KING_OF_THE_COURT" ? (tournament.type === "SINGLES" ? "4" : "6") :
              tournament.type === "SINGLES" ? "2" : "4"
            } participants to start this {formatLabel[matchmakingMethod] || "tournament"}.
          </AlertDescription>
        </Alert>
      )}

      {/* Quick Navigation */}
      <div className="mb-6 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          <Link href={`/tournaments/${id}`}>
            <Button variant="outline" size="sm" className="text-white" style={{ backgroundColor: '#da6c6c' }}>
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
            <Button variant="outline" size="sm">
              <Gamepad2 className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Matches</span>
            </Button>
          </Link>
          <Link href={`/tournaments/${id}/matches?view=standings`}>
            <Button variant="outline" size="sm">
              <BarChart3 className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Standings</span>
            </Button>
          </Link>
          <Link href={`/tournaments/${id}/chat`} className="hidden md:block">
            <Button variant="outline" size="sm">
              <MessageCircle className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Chat</span>
            </Button>
          </Link>
          {tournament.status !== "FINISHED" && (
            <Link href={`/tournaments/${id}/invite`}>
              <Button variant="outline" size="sm">
                <UserPlus className="h-4 w-4 sm:mr-1.5" />
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
              {activePlayers.length}
              {tournament.maxParticipants ? <span className="text-sm text-gray-400">/{tournament.maxParticipants}</span> : ""}
            </p>
            <p className="text-xs text-gray-500">Players</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4 px-4">
            <Gamepad2 className="h-5 w-5 text-muted-foreground mb-1" />
            <p className="text-2xl font-bold text-green-600">{totalMatchCount}</p>
            <p className="text-xs text-gray-500">
              {finishedMatchCount} done • {pendingMatchCount} left
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

      {/* Format-specific info */}
      {matchmakingMethod !== "ROUND_ROBIN" && tournament.status !== "OPEN" && (
        <Card className="mb-6 border-indigo-100 bg-indigo-50/30">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs font-semibold">
                  {formatLabel[matchmakingMethod]}
                </Badge>
                {(matchmakingMethod === "SWISS" || matchmakingMethod === "ROTATING_PARTNER") && (
                  <span className="text-sm text-gray-700">
                    Round <span className="font-bold">{tournament.currentRound || 1}</span>
                    {tournament.totalRounds && (
                      <span className="text-gray-400"> / {tournament.totalRounds}</span>
                    )}
                  </span>
                )}
                {matchmakingMethod === "KING_OF_THE_COURT" && (
                  <span className="text-sm text-gray-700">
                    Match <span className="font-bold">{(tournament.metadata as any)?.matchesPlayed || 0}</span>
                    {tournament.totalMatches && (
                      <span className="text-gray-400"> / {tournament.totalMatches}</span>
                    )}
                  </span>
                )}
              </div>
              {matchmakingMethod === "KING_OF_THE_COURT" && tournament.metadata && (
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-amber-700 font-medium">
                    Streak: {(tournament.metadata as any).streak || 0}
                  </span>
                  <span className="text-gray-500">
                    Bench: {((tournament.metadata as any).bench || []).length}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

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
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`inline-flex items-center justify-center h-6 w-6 rounded-full text-xs font-bold shrink-0 ${
                        i === 0 ? "bg-amber-200 text-amber-800" : i === 1 ? "bg-gray-200 text-gray-700" : i === 2 ? "bg-orange-100 text-orange-700" : "text-gray-500"
                      }`}>{i + 1}</span>
                      <span className="font-medium text-gray-900 truncate">{s.name}</span>
                    </div>
                    <span
                      className="font-bold text-gray-900 cursor-default shrink-0 ml-2"
                      title={s.bonus > 0 ? `${s.won * 3} (wins) + ${s.drawn} (draws) + ${s.bonus} (streak bonus) = ${s.points}` : undefined}
                    >
                      {s.points} pts
                      {s.bonus > 0 && (
                        <span className="ml-1 text-[10px] text-orange-500 font-normal">+{s.bonus}</span>
                      )}
                    </span>
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

      {/* Availability Toggle — only for active participants (joined & not removed) */}
      {tournament.status !== "FINISHED" && (() => {
        const activeParticipant = tournament.participants?.some(
          (p: any) => (p.userId === userId || p.user?.id === userId) && !p.removedAt
        );
        return activeParticipant;
      })() && (
        <Card className="mt-6">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4 text-emerald-600" />
                Availability
              </CardTitle>
              {isCurrentlyAvailable ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs text-red-600 border-red-200 hover:bg-red-50"
                  onClick={handleSetUnavailable}
                >
                  Set Unavailable
                </Button>
              ) : (
                <Popover open={availPopoverOpen} onOpenChange={setAvailPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button size="sm" className="text-xs bg-emerald-600 hover:bg-emerald-700">
                      <Timer className="h-3.5 w-3.5 mr-1" />
                      I&apos;m Available
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-3" align="end">
                    <p className="text-xs font-medium text-gray-700 mb-2">Available for:</p>
                    <div className="grid grid-cols-2 gap-1.5 mb-2">
                      <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => handleSetAvailability(15)}>15 min</Button>
                      <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => handleSetAvailability(30)}>30 min</Button>
                      <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => handleSetAvailability(60)}>1 hour</Button>
                      <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => handleSetAvailability(120)}>2 hours</Button>
                    </div>
                    <div className="flex gap-1.5 mb-2">
                      <Input
                        type="number"
                        placeholder="Custom min"
                        value={customMinutes}
                        onChange={(e) => setCustomMinutes(e.target.value)}
                        className="h-8 text-xs"
                        min={1}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-8 shrink-0"
                        disabled={!customMinutes || parseInt(customMinutes) < 1}
                        onClick={() => handleSetAvailability(parseInt(customMinutes))}
                      >
                        Set
                      </Button>
                    </div>
                    <Button size="sm" variant="ghost" className="w-full text-xs h-8" onClick={() => handleSetAvailability(null)}>
                      Until I turn off
                    </Button>
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {availablePlayers.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-2">No players available right now</p>
            ) : (
              <div className="space-y-1.5">
                {availablePlayers.map((p) => {
                  const remaining = p.expiresAt
                    ? Math.max(0, Math.round((p.expiresAt.toDate().getTime() - Date.now()) / 60000))
                    : null;
                  return (
                    <div key={p.odcId} className="flex items-center justify-between p-2 rounded-lg bg-emerald-50 text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                        <span className="font-medium text-gray-900 truncate">{p.userName}</span>
                      </div>
                      <span className="text-xs text-gray-500 shrink-0 ml-2">
                        {remaining !== null ? `${remaining}m left` : "∞"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Ready to Play — Accepted Match Invites */}
      {readyMatches.length > 0 && (
        <Card className="mt-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Gamepad2 className="h-4 w-4 text-indigo-600" />
              Ready to Play
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {readyMatches.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg bg-indigo-50 border border-indigo-200">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      Match #{inv.matchNumber}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {Object.values(inv.playerNames || {}).join(", ")}
                    </p>
                  </div>
                  <Badge className="bg-emerald-600 text-white text-[10px] shrink-0 ml-2">All accepted</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
