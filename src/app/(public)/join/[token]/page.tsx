"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Users, AlertCircle, Loader2 } from "lucide-react";

interface JoinTournamentPageProps {
  params: Promise<{
    token: string;
  }>;
}

interface TournamentData {
  id: string;
  name: string;
  type: string;
  status: string;
  maxParticipants: number | null;
  participantCount: number;
  joinExpiry: string | null;
}

export default function JoinTournamentPage({ params }: JoinTournamentPageProps) {
  const [token, setToken] = useState<string>("");
  const [tournament, setTournament] = useState<TournamentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();

  useEffect(() => {
    params.then((p) => setToken(p.token));
  }, [params]);

  useEffect(() => {
    if (!token) return;

    // Fetch tournament details using the token
    const fetchTournament = async () => {
      try {
        const res = await fetch(`/api/invites/${token}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Failed to load tournament");
          return;
        }

        setTournament(data.tournament);
      } catch (err) {
        setError("Failed to load tournament details");
      } finally {
        setLoading(false);
      }
    };

    fetchTournament();
  }, [token]);

  const handleJoin = async () => {
    if (!isSignedIn) {
      router.push(`/sign-in?redirect=/join/${token}`);
      return;
    }

    if (!tournament) return;

    setJoining(true);
    setError(null);

    try {
      const res = await fetch(`/api/tournaments/${tournament.id}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to join tournament");
        return;
      }

      // Redirect to tournament page
      router.push(`/tournaments/${tournament.id}`);
    } catch (err) {
      setError("Failed to join tournament");
    } finally {
      setJoining(false);
    }
  };

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Skeleton className="h-16 w-16 rounded-full mx-auto" />
              <Skeleton className="h-8 w-3/4 mx-auto" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3 mx-auto" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !tournament) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription className="space-y-2">
              <p>{error}</p>
              <p className="text-sm">This link may be expired or has been disabled by the tournament organizer.</p>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/" className="block">
              <Button variant="outline" className="w-full">
                Back to Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Trophy className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Join Tournament</CardTitle>
          <CardDescription>
            You've been invited to participate
          </CardDescription>
        </CardHeader>

        {tournament && (
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Tournament</p>
                <p className="text-xl font-bold">{tournament.name}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Type</p>
                  <Badge variant="secondary">{tournament.type}</Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={tournament.status === "OPEN" ? "default" : "secondary"}>
                    {tournament.status}
                  </Badge>
                </div>
              </div>

              {tournament.maxParticipants && (
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm">
                    <span className="font-medium">{tournament.participantCount}</span>
                    {" / "}
                    <span className="text-muted-foreground">{tournament.maxParticipants}</span>
                    {" participants"}
                  </p>
                </div>
              )}
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-3">
              <Button
                onClick={handleJoin}
                disabled={joining || tournament.status !== "OPEN"}
                className="w-full"
                size="lg"
              >
                {joining && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {joining ? "Joining..." : isSignedIn ? "Join Tournament" : "Sign In to Join"}
              </Button>

              <Link href="/" className="block">
                <Button variant="ghost" className="w-full">
                  Back to Home
                </Button>
              </Link>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
