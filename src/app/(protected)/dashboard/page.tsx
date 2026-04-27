"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PlusCircle, Trophy, CheckCircle2, Clock, Users, Target, ChevronRight, Gamepad2, LayoutGrid } from "lucide-react";

interface Tournament {
  id: string;
  name: string;
  type: string;
  status: string;
  createdAt: string;
  _count: {
    participants: number;
    matches: number;
  };
}

export default function DashboardPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    active: 0,
    completed: 0,
    total: 0,
  });

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const res = await fetch("/api/tournaments");
        const data = await res.json();

        if (res.ok) {
          setTournaments(data.tournaments);
          
          // Calculate stats
          const active = data.tournaments.filter((t: Tournament) => 
            t.status === "OPEN" || t.status === "ONGOING"
          ).length;
          const completed = data.tournaments.filter((t: Tournament) => 
            t.status === "FINISHED"
          ).length;

          setStats({
            active,
            completed,
            total: data.tournaments.length,
          });
        }
      } catch (err) {
        console.error("Failed to fetch tournaments:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTournaments();
  }, []);

  const totalPlayers = tournaments.reduce((acc, t) => acc + t._count.participants, 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "OPEN":
        return <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs font-medium px-2 py-0.5 rounded-full">Open</Badge>;
      case "ONGOING":
        return <Badge className="bg-green-100 text-green-700 border-green-200 text-xs font-medium px-2 py-0.5 rounded-full">Ongoing</Badge>;
      case "FINISHED":
        return <Badge className="bg-gray-100 text-gray-600 border-gray-200 text-xs font-medium px-2 py-0.5 rounded-full">Finished</Badge>;
      default:
        return <Badge className="text-xs font-medium px-2 py-0.5 rounded-full">{status}</Badge>;
    }
  };

  const renderTournamentCard = (tournament: Tournament) => (
    <Link
      key={tournament.id}
      href={`/tournaments/${tournament.id}`}
      className="block"
    >
      <Card className="hover:shadow-md transition-all border border-gray-200 py-0">
        <CardContent className="flex items-center justify-between py-3 px-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-semibold text-gray-900 truncate">
                {tournament.name}
              </h3>
              {getStatusBadge(tournament.status)}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Users className="h-3 w-3" />
              <span>{tournament._count.participants} players</span>
              <span className="text-gray-300">|</span>
              <Gamepad2 className="h-3 w-3" />
              <span>{tournament._count.matches} matches</span>
              <span className="text-gray-300">|</span>
              <LayoutGrid className="h-3 w-3" />
              <span>{tournament.type}</span>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-gray-400 shrink-0 ml-2" />
        </CardContent>
      </Card>
    </Link>
  );

  return (
    <div className="min-h-screen bg-white md:bg-white">
      {/* Mobile Header Section with Bento Grid */}
      <div className="md:hidden">
        <div style={{ backgroundColor: '#ffb689' }}>
          <div className="px-4 pt-6 pb-4">
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            <p className="text-blue-50 mt-1">
              Manage your tournaments
            </p>
          </div>

        {/* Bento Grid for Mobile */}
        <div className="px-4 pb-6">
          <div className="grid grid-cols-2 gap-3">
            {/* Create Tournament - Large */}
            <Link href="/tournaments/create" className="col-span-2">
              <Card className="backdrop-blur border-0 shadow-lg hover:shadow-xl transition-all" style={{ backgroundColor: '#fee9ca' }}>
                <CardHeader className="gap-0">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                      <PlusCircle className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Create Tournament</CardTitle>
                      <CardDescription className="text-xs">Start a new event</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </Link>

            {/* Active Tournaments */}
            <Card className="border-0 shadow-lg rounded-2xl py-0" style={{ backgroundColor: '#fddcc0' }}>
              <CardContent className="flex items-center gap-3 py-4 px-4">
                <Trophy className="h-9 w-9 text-indigo-600 shrink-0" strokeWidth={1.5} />
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-gray-600">Active</span>
                  <span className="text-2xl font-bold text-indigo-600">
                    {loading ? <Skeleton className="h-7 w-8" /> : stats.active}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Completed Tournaments */}
            <Card className="border-0 shadow-lg rounded-2xl py-0" style={{ backgroundColor: '#fddcc0' }}>
              <CardContent className="flex items-center gap-3 py-4 px-4">
                <CheckCircle2 className="h-9 w-9 text-green-600 shrink-0" strokeWidth={1.5} />
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-gray-600">Finished</span>
                  <span className="text-2xl font-bold text-green-600">
                    {loading ? <Skeleton className="h-7 w-8" /> : stats.completed}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Total Tournaments */}
            <Card className="border-0 shadow-lg rounded-2xl py-0" style={{ backgroundColor: '#fddcc0' }}>
              <CardContent className="flex items-center gap-3 py-4 px-4">
                <Target className="h-9 w-9 text-purple-600 shrink-0" strokeWidth={1.5} />
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-gray-600">Total</span>
                  <span className="text-2xl font-bold text-purple-600">
                    {loading ? <Skeleton className="h-7 w-8" /> : stats.total}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Players */}
            <Card className="border-0 shadow-lg rounded-2xl py-0" style={{ backgroundColor: '#fddcc0' }}>
              <CardContent className="flex items-center gap-3 py-4 px-4">
                <Users className="h-9 w-9 text-orange-600 shrink-0" strokeWidth={1.5} />
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-gray-600">Players</span>
                  <span className="text-2xl font-bold text-orange-600">
                    {loading ? <Skeleton className="h-7 w-8" /> : totalPlayers}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        </div>

        {/* Tournaments List - Mobile */}
        <div className="bg-white rounded-t-3xl -mt-4 pt-6 px-4 pb-24 relative z-10">
          <Card className="border-0 shadow-none bg-transparent">
            <CardHeader className="px-0">
              <div>
                <CardTitle>Your Tournaments</CardTitle>
                <CardDescription className="mt-1">
                  {loading ? "Loading..." : `${tournaments.length} total tournaments`}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="px-0">
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-4 border rounded-lg bg-white">
                      <Skeleton className="h-6 w-48 mb-2" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  ))}
                </div>
              ) : tournaments.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg">
                  <Trophy className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No tournaments yet
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Create your first tournament to get started
                  </p>
                  <Link href="/tournaments/create">
                    <Button>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Create Tournament
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {tournaments.map((tournament) => renderTournamentCard(tournament))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Desktop Header and Stats */}
      <div className="hidden md:block max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Manage your tournaments and track ongoing matches
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-4 md:gap-6 mb-8">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2" style={{ backgroundColor: '#fee9ca', borderColor: '#da6c6c40' }}>
            <Link href="/tournaments/create">
              <CardHeader>
                <PlusCircle className="h-8 w-8 mb-2" style={{ color: '#da6c6c' }} />
                <CardTitle className="text-lg">Create Tournament</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Start a new tournament with custom settings
                </CardDescription>
              </CardContent>
            </Link>
          </Card>

          <Card>
            <CardHeader>
              <Trophy className="h-8 w-8 text-indigo-600 mb-2" />
              <CardTitle className="text-lg">Active Tournaments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-indigo-600 mb-1">
                {loading ? <Skeleton className="h-10 w-16" /> : stats.active}
              </div>
              <CardDescription>Currently running</CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CheckCircle2 className="h-8 w-8 text-green-600 mb-2" />
              <CardTitle className="text-lg">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600 mb-1">
                {loading ? <Skeleton className="h-10 w-16" /> : stats.completed}
              </div>
              <CardDescription>Finished tournaments</CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Tournaments List - Desktop */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Your Tournaments</CardTitle>
              <CardDescription className="mt-1">
                {loading ? "Loading..." : `${tournaments.length} total tournaments`}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 border rounded-lg">
                  <Skeleton className="h-6 w-48 mb-2" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            </div>
          ) : tournaments.length === 0 ? (
            <div className="text-center py-12">
              <Trophy className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No tournaments yet
              </h3>
              <p className="text-gray-600 mb-6">
                Create your first tournament to get started
              </p>
              <Link href="/tournaments/create">
                <Button>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Create Tournament
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {tournaments.map((tournament) => renderTournamentCard(tournament))}
            </div>
          )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}