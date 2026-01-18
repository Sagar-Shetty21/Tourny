"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Settings, Users, Gamepad2, UserPlus, Play, Info, Trophy, Target, Calendar, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";

interface Tournament {
  id: string;
  name: string;
  description?: string;
  type: string;
  status: string;
  maxParticipants?: number;
  joinExpiry?: string;
  createdAt: string;
  owners: Array<{ userId: string }>;
  participants: Array<{ id: string; userId: string }>;
  matches: Array<{ id: string; status: string }>;
}

export default function TournamentPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchTournament = async () => {
      try {
        const res = await fetch(`/api/tournaments/${id}`);
        const data = await res.json();

        if (res.ok) {
          setTournament(data.tournament);
          setIsOwner(data.isOwner);
        } else {
          toast.error("Failed to load tournament", {
            description: data.error,
          });
          router.push("/dashboard");
        }
      } catch (err) {
        console.error("Failed to fetch tournament:", err);
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
      const res = await fetch(`/api/tournaments/${id}/start`, {
        method: "POST",
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Tournament started!", {
          description: `${data.matches.length} matches have been generated.`,
        });
        
        // Refresh tournament data
        setTimeout(() => window.location.reload(), 1000);
      } else {
        toast.error("Failed to start tournament", {
          description: data.error,
        });
      }
    } catch (err) {
      toast.error("Failed to start tournament");
    } finally {
      setStarting(false);
    }
  };

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

  if (!tournament) {
    return null;
  }

  const pendingMatches = tournament.matches.filter(m => m.status === "PENDING").length;
  const finishedMatches = tournament.matches.filter(m => m.status === "FINISHED").length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {tournament.name}
            </h1>
            <p className="text-gray-600 mt-1 flex items-center gap-2">
              <Target className="h-4 w-4" />
              {tournament.type} • Round Robin
            </p>
          </div>
          <div className="flex gap-2">
            {isOwner && tournament.status === "OPEN" && tournament.participants.length >= 2 && (
              <Button onClick={handleStartTournament} disabled={starting}>
                {starting ? (
                  <>Starting...</>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Start Tournament
                  </>
                )}
              </Button>
            )}
            {isOwner && (
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
      {isOwner && tournament.status === "OPEN" && tournament.participants.length < 2 && (
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
            <Button variant="outline" className="text-white" style={{ backgroundColor: '#da6c6c' }}>
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
          <Link href={`/tournaments/${id}/invite`}>
            <Button variant="outline">
              <UserPlus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Invite</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Tournament Info Grid */}
      <div className="grid md:grid-cols-3 gap-4 md:gap-6 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <Users className="h-6 w-6 text-muted-foreground mb-2" />
            <CardTitle className="text-lg">Participants</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-indigo-600">
              {tournament.participants.length}
              {tournament.maxParticipants && ` / ${tournament.maxParticipants}`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <Gamepad2 className="h-6 w-6 text-muted-foreground mb-2" />
            <CardTitle className="text-lg">Matches</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{tournament.matches.length}</p>
            {tournament.matches.length > 0 && (
              <p className="text-sm text-gray-600 mt-1">
                {finishedMatches} completed • {pendingMatches} pending
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Status</CardTitle>
          </CardHeader>
          <CardContent>
            {getStatusBadge(tournament.status)}
          </CardContent>
        </Card>
      </div>

      {/* Tournament Description */}
      {tournament.description && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>About</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700">{tournament.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Actions Card */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Manage your tournament</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Link href={`/tournaments/${id}/players`} className="block">
              <Button variant="outline" className="w-full h-20 flex-col gap-2">
                <Users className="h-6 w-6" />
                <span className="text-sm">Players</span>
              </Button>
            </Link>
            <Link href={`/tournaments/${id}/matches`} className="block">
              <Button variant="outline" className="w-full h-20 flex-col gap-2">
                <Gamepad2 className="h-6 w-6" />
                <span className="text-sm">Matches</span>
              </Button>
            </Link>
            <Link href={`/tournaments/${id}/invite`} className="block">
              <Button variant="outline" className="w-full h-20 flex-col gap-2">
                <UserPlus className="h-6 w-6" />
                <span className="text-sm">Invite</span>
              </Button>
            </Link>
            {isOwner && (
              <Link href={`/tournaments/${id}/settings`} className="block">
                <Button variant="outline" className="w-full h-20 flex-col gap-2">
                  <Settings className="h-6 w-6" />
                  <span className="text-sm">Settings</span>
                </Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
