"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowLeft, Info, Trophy, Clock, CheckCircle2, Users, Gamepad2, UserPlus } from "lucide-react";

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
  result: any;
  createdAt: string;
}

export default function MatchesPage() {
  const params = useParams();
  const id = params?.id as string;
  
  const [matches, setMatches] = useState<Match[]>([]);
  const [filteredMatches, setFilteredMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    if (!id) return;

    const fetchMatches = async () => {
      try {
        const res = await fetch(`/api/tournaments/${id}/matches`);
        const data = await res.json();

        if (res.ok) {
          setMatches(data.matches);
          setFilteredMatches(data.matches);
        }
      } catch (err) {
        console.error("Failed to fetch matches:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, [id]);

  useEffect(() => {
    if (filter === "all") {
      setFilteredMatches(matches);
    } else if (filter === "pending") {
      setFilteredMatches(matches.filter(m => m.status === "PENDING"));
    } else if (filter === "finished") {
      setFilteredMatches(matches.filter(m => m.status === "FINISHED"));
    }
  }, [filter, matches]);

  const getMatchBadge = (status: string) => {
    if (status === "PENDING") {
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-700"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    }
    return <Badge variant="secondary" className="bg-green-100 text-green-700"><CheckCircle2 className="h-3 w-3 mr-1" />Completed</Badge>;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Matches</h1>
        <p className="text-gray-600 mt-2">
          View and manage tournament matches
        </p>
      </div>

      {/* Quick Navigation */}
      <div className="mb-6 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          <Link href={`/tournaments/${id}`}>
            <Button variant="outline">
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
            <Button variant="outline" className="text-white" style={{ backgroundColor: '#da6c6c' }}>
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

      {/* Match Status Tabs */}
      <Tabs value={filter} onValueChange={setFilter} className="mb-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">
            All ({matches.length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pending ({matches.filter(m => m.status === "PENDING").length})
          </TabsTrigger>
          <TabsTrigger value="finished">
            Completed ({matches.filter(m => m.status === "FINISHED").length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Matches List */}
      <Card>
        <CardHeader>
          <CardTitle>Match Schedule</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : filteredMatches.length === 0 ? (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>No matches yet</AlertTitle>
              <AlertDescription>
                {filter === "all" 
                  ? "Start the tournament to generate matches"
                  : `No ${filter} matches found`
                }
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              {filteredMatches.map((match, index) => (
                <div 
                  key={match.id} 
                  className="p-3 sm:p-4 border rounded-lg hover:shadow-md transition-shadow bg-white"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs sm:text-sm font-medium text-gray-500">Match {index + 1}</span>
                        {getMatchBadge(match.status)}
                      </div>
                      
                      {/* Match Display */}
                      {match.player3 && match.player4 ? (
                        // Doubles match - show as Team vs Team
                        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
                          <div className="flex-1 bg-blue-50 rounded-lg p-2.5 sm:p-3 border border-blue-200">
                            <p className="text-xs text-blue-600 font-semibold mb-1">Team 1</p>
                            <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                              {match.player1?.name || "TBD"}
                            </p>
                            <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                              {match.player2?.name || "TBD"}
                            </p>
                          </div>
                          
                          <div className="flex items-center justify-center py-1 md:px-2">
                            <span className="text-base sm:text-lg font-bold text-gray-400">VS</span>
                          </div>
                          
                          <div className="flex-1 bg-purple-50 rounded-lg p-2.5 sm:p-3 border border-purple-200">
                            <p className="text-xs text-purple-600 font-semibold mb-1">Team 2</p>
                            <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                              {match.player3.name}
                            </p>
                            <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                              {match.player4.name}
                            </p>
                          </div>
                        </div>
                      ) : (
                        // Singles match - show as Player vs Player
                        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
                          <div className="flex-1 bg-blue-50 rounded-lg p-2.5 sm:p-3 border border-blue-200 text-center">
                            <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                              {match.player1?.name || "TBD"}
                            </p>
                          </div>
                          
                          <div className="flex items-center justify-center py-1 md:px-2">
                            <span className="text-base sm:text-lg font-bold text-gray-400">VS</span>
                          </div>
                          
                          <div className="flex-1 bg-purple-50 rounded-lg p-2.5 sm:p-3 border border-purple-200 text-center">
                            <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                              {match.player2?.name || "TBD"}
                            </p>
                          </div>
                        </div>
                      )}
                      
                      {match.result && (
                        <div className="mt-3 p-2 bg-green-50 rounded text-xs sm:text-sm">
                          <p className="font-medium text-green-800 truncate">
                            Result: {JSON.stringify(match.result)}
                          </p>
                        </div>
                      )}
                    </div>
                    {match.status === "PENDING" && (
                      <Button size="sm" variant="outline" className="w-full sm:w-auto shrink-0">
                        Submit Result
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
