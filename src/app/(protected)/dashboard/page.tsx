"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PlusCircle, Trophy, CheckCircle2, Clock, Users, Target } from "lucide-react";

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "OPEN":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-700">Open</Badge>;
      case "ONGOING":
        return <Badge variant="secondary" className="bg-green-100 text-green-700">Ongoing</Badge>;
      case "FINISHED":
        return <Badge variant="secondary" className="bg-gray-100 text-gray-700">Finished</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen md:bg-white">
      {/* Mobile Header Section with Bento Grid */}
      <div className="md:hidden min-h-screen" style={{ backgroundColor: '#ffb689' }}>
        <div className="px-4 pt-6 pb-4">
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-blue-50 mt-1">
            Manage your tournaments
          </p>
        </div>

        {/* Bento Grid for Mobile */}
        <div className="px-4 mb-6">
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
            <Card className="bg-white backdrop-blur border-0 shadow-lg">
              <CardHeader className="pb-2">
                <Trophy className="h-6 w-6 text-indigo-600 mb-1" />
                <CardTitle className="text-xs text-gray-600">Active</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-indigo-600">
                  {loading ? <Skeleton className="h-8 w-12" /> : stats.active}
                </div>
              </CardContent>
            </Card>

            {/* Completed Tournaments */}
            <Card className="bg-white backdrop-blur border-0 shadow-lg">
              <CardHeader className="pb-2">
                <CheckCircle2 className="h-6 w-6 text-green-600 mb-1" />
                <CardTitle className="text-xs text-gray-600">Done</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-green-600">
                  {loading ? <Skeleton className="h-8 w-12" /> : stats.completed}
                </div>
              </CardContent>
            </Card>

            {/* Total Tournaments */}
            <Card className="bg-white backdrop-blur border-0 shadow-lg">
              <CardHeader className="pb-2">
                <Target className="h-6 w-6 text-purple-600 mb-1" />
                <CardTitle className="text-xs text-gray-600">Total</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-purple-600">
                  {loading ? <Skeleton className="h-8 w-12" /> : stats.total}
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="bg-white backdrop-blur border-0 shadow-lg">
              <CardHeader className="pb-2">
                <Users className="h-6 w-6 text-orange-600 mb-1" />
                <CardTitle className="text-xs text-gray-600">Players</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-orange-600">
                  {loading ? <Skeleton className="h-8 w-12" /> : tournaments.reduce((acc, t) => acc + t._count.participants, 0)}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Tournaments List - Mobile */}
        <div className="bg-white rounded-t-3xl pt-6 px-4 pb-24 min-h-[50vh]">
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
                <div className="space-y-4">
                  {tournaments.map((tournament) => (
                    <Link
                      key={tournament.id}
                      href={`/tournaments/${tournament.id}`}
                      className="block p-4 border rounded-lg hover:shadow-md transition-shadow bg-white"
                      style={{ borderColor: '#da6c6c20' }}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {tournament.name}
                            </h3>
                            {getStatusBadge(tournament.status)}
                          </div>
                          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <Target className="h-4 w-4" />
                              {tournament.type}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              {tournament._count.participants} players
                            </span>
                            <span className="flex items-center gap-1">
                              <Trophy className="h-4 w-4" />
                              {tournament._count.matches} matches
                            </span>
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </div>
                    </Link>
                  ))}
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
            <div className="space-y-4">
              {tournaments.map((tournament) => (
                <Link
                  key={tournament.id}
                  href={`/tournaments/${tournament.id}`}
                  className="block p-4 border rounded-lg hover:shadow-md transition-shadow"
                  style={{ borderColor: '#da6c6c20' }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {tournament.name}
                        </h3>
                        {getStatusBadge(tournament.status)}
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Target className="h-4 w-4" />
                          {tournament.type}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {tournament._count.participants} players
                        </span>
                        <span className="flex items-center gap-1">
                          <Trophy className="h-4 w-4" />
                          {tournament._count.matches} matches
                        </span>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                  </div>
                </Link>
              ))}
            </div>
          )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}