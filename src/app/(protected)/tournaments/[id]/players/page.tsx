"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { ArrowLeft, UserPlus, Info, Users, Calendar, Crown, Trophy, Gamepad2, UserMinus, MessageCircle, BarChart3 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useTournament, invalidateTournament } from "@/lib/swr";

interface Participant {
  id: string;
  userId: string;
  joinedAt: string;
  removedAt: string | null;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
}

interface Tournament {
  id: string;
  name: string;
  status: string;
  owners: Array<{ userId: string; role: string }>;
  maxParticipants: number;
  participants: Participant[];
}

export default function PlayersPage() {
  const params = useParams();
  const id = params?.id as string;
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const { tournament: rawTournament, isLoading: loading, mutate } = useTournament(id);
  const [removing, setRemoving] = useState<string | null>(null);

  const tournament: Tournament | null = rawTournament ? {
    ...rawTournament,
    status: rawTournament.status || "OPEN",
    participants: rawTournament.participants || [],
  } : null;

  const isOrganizer = tournament?.owners.some(
    (o) => o.userId === currentUserId && o.role === "ORGANIZER"
  );

  const activePlayers = tournament?.participants.filter((p: Participant) => !p.removedAt) || [];
  const removedPlayers = tournament?.participants.filter((p: Participant) => !!p.removedAt) || [];

  const handleRemovePlayer = async (targetUserId: string, playerName: string) => {
    setRemoving(targetUserId);
    try {
      const res = await fetch(`/api/tournaments/${id}/players/${targetUserId}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (res.ok) {
        toast.success("Player removed", {
          description: `${playerName} has been removed from the tournament`,
        });
        mutate();
        invalidateTournament(id);
      } else {
        toast.error("Failed to remove player", {
          description: data.error,
        });
      }
    } catch {
      toast.error("Failed to remove player");
    } finally {
      setRemoving(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
            <Button variant="outline" size="sm">
              <Trophy className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Overview</span>
            </Button>
          </Link>
          <Link href={`/tournaments/${id}/players`}>
            <Button variant="outline" size="sm" className="text-white" style={{ backgroundColor: '#da6c6c' }}>
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
          {tournament?.status !== "FINISHED" && (
            <Link href={`/tournaments/${id}/invite`}>
              <Button variant="outline" size="sm">
                <UserPlus className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Invite</span>
              </Button>
            </Link>
          )}
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
                  {activePlayers.length} / {tournament.maxParticipants} players
                  {removedPlayers.length > 0 && (
                    <span className="text-gray-400"> ({removedPlayers.length} removed)</span>
                  )}
                </p>
              </div>
              {tournament.status !== "FINISHED" && (
                <Link href={`/tournaments/${id}/invite`}>
                  <Button size="sm">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Invite Players
                  </Button>
                </Link>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {activePlayers.length === 0 ? (
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
                {activePlayers.map((participant: Participant, index: number) => {
                  const isOwner = tournament.owners.some(
                    (o) => o.userId === participant.userId
                  );
                  const canRemove =
                    isOrganizer &&
                    participant.userId !== currentUserId &&
                    tournament.status !== "FINISHED";

                  return (
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
                                : participant.user?.email?.charAt(0).toUpperCase() || "?"}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-gray-900">
                                  {participant.user?.name || participant.user?.email || "Unknown User"}
                                </h3>
                                {tournament.owners.some(
                                  (owner) => owner.userId === participant.userId && owner.role === "ORGANIZER"
                                ) && (
                                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
                                    <Crown className="h-3 w-3 mr-1" />
                                    Organizer
                                  </Badge>
                                )}
                                {tournament.owners.some(
                                  (owner) => owner.userId === participant.userId && owner.role === "MANAGER"
                                ) && (
                                  <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                                    Manager
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
                        <div className="flex items-center gap-2">
                          {canRemove && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  disabled={removing === participant.userId}
                                >
                                  <UserMinus className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remove Player?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will remove{" "}
                                    <strong>
                                      {participant.user?.name || participant.user?.email || "this player"}
                                    </strong>{" "}
                                    from the tournament.
                                    {tournament.status === "ONGOING" &&
                                      " Their pending matches will be deleted and finished matches will be marked as stale after you resync."}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() =>
                                      handleRemovePlayer(
                                        participant.userId,
                                        participant.user?.name || participant.user?.email || "Player"
                                      )
                                    }
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Remove
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                          <div className="text-sm font-medium text-gray-500">
                            #{index + 1}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Removed Players Section */}
            {removedPlayers.length > 0 && (
              <div className="mt-6 pt-6 border-t">
                <h3 className="text-sm font-semibold text-gray-500 mb-3">Removed Players</h3>
                <div className="space-y-2">
                  {removedPlayers.map((participant: Participant) => (
                    <div
                      key={participant.id}
                      className="p-3 border rounded-lg bg-gray-50 opacity-60"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center font-semibold text-gray-500 text-sm">
                            {participant.user?.name
                              ? participant.user.name.charAt(0).toUpperCase()
                              : participant.user?.email?.charAt(0).toUpperCase() || "?"}
                          </div>
                          <div>
                            <span className="text-sm text-gray-600">
                              {participant.user?.name || participant.user?.email || "Unknown User"}
                            </span>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-red-500 border-red-200">
                          Removed
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
