"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, UserPlus, Info, Users, Calendar, Crown, Trophy, Gamepad2 } from "lucide-react";
import { format } from "date-fns";

interface Participant {
  id: string;
  userId: string;
  joinedAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
}

interface Tournament {
  id: string;
  name: string;
  owners: Array<{ userId: string }>;
  maxParticipants: number;
  participants: Participant[];
}

export default function PlayersPage() {
  const params = useParams();
  const id = params?.id as string;
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTournament = async () => {
      try {
        const response = await fetch(`/api/tournaments/${id}`);
        if (!response.ok) throw new Error("Failed to fetch tournament");
        const data = await response.json();
        
        // Handle both response formats
        const tournamentData = data.tournament || data;
        
        setTournament({
          ...tournamentData,
          participants: tournamentData.participants || [],
        });
      } catch (error) {
        console.error("Error fetching tournament:", error);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchTournament();
    }
  }, [id]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Players</h1>
        <p className="text-gray-600 mt-2">
          Manage participants for this tournament
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
            <Button variant="outline" className="text-white" style={{ backgroundColor: '#da6c6c' }}>
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

      {loading ? (
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : !tournament ? (
        <Alert variant="destructive">
          <Info className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Failed to load tournament data</AlertDescription>
        </Alert>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Participant List</CardTitle>
                <p className="text-sm text-gray-500 mt-1">
                  {tournament.participants?.length || 0} / {tournament.maxParticipants} players
                </p>
              </div>
              <Link href={`/tournaments/${id}/invite`}>
                <Button size="sm">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite Players
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {!tournament.participants || tournament.participants.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                  <Users className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No players yet
                </h3>
                <p className="text-gray-600 mb-6">
                  Invite players to join your tournament
                </p>
                <Link href={`/tournaments/${id}/invite`}>
                  <Button>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Send Invitations
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {tournament.participants.map((participant, index) => (
                  <div 
                    key={participant.id}
                    className="p-4 border rounded-lg hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-semibold text-gray-700">
                            {participant.user?.name 
                              ? participant.user.name.charAt(0).toUpperCase()
                              : participant.user?.email?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-gray-900">
                                {participant.user?.name || participant.user?.email || 'Unknown User'}
                              </h3>
                              {tournament.owners.some(owner => owner.userId === participant.userId) && (
                                <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
                                  <Crown className="h-3 w-3 mr-1" />
                                  Organizer
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                              <Calendar className="h-3 w-3" />
                              Joined {format(new Date(participant.joinedAt), "MMM d, yyyy")}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="text-sm font-medium text-gray-500">
                        #{index + 1}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
