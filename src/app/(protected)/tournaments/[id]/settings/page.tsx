"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Info, AlertTriangle, Save, ScrollText, RotateCcw, Shuffle, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useTournament, useActivityLogs, invalidateTournament, invalidateTournaments } from "@/lib/swr";

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
  description: string | null;
  type: string;
  matchmakingMethod: string;
  status: string;
  totalRounds: number | null;
  totalMatches: number | null;
  maxParticipants: number;
  createdBy: string;
  owners: Array<{ userId: string; role: string }>;
  participants: Participant[];
}

interface ActivityLogEntry {
  id: string;
  action: string;
  details: Record<string, unknown> | null;
  user: { id: string; name: string };
  createdAt: string;
}

export default function SettingsPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const id = params.id as string;
  
  const { tournament, role, isLoading: loading, mutate } = useTournament(id);
  const { logs: activityLogs, isLoading: loadingLogs } = useActivityLogs(id, role === "organizer");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [updatingOwner, setUpdatingOwner] = useState<string | null>(null);
  const [savingFormat, setSavingFormat] = useState(false);
  const [expandedParticipant, setExpandedParticipant] = useState<string | null>(null);
  
  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [maxParticipants, setMaxParticipants] = useState(8);
  const [matchmakingMethod, setMatchmakingMethod] = useState("");
  const [totalRounds, setTotalRounds] = useState<number | null>(null);
  const [totalMatches, setTotalMatches] = useState<number | null>(null);

  // Initialize form when tournament data loads
  useEffect(() => {
    if (tournament) {
      setName(tournament.name);
      setDescription(tournament.description || "");
      setMaxParticipants(tournament.maxParticipants);
      setMatchmakingMethod(tournament.matchmakingMethod || "ROUND_ROBIN");
      setTotalRounds(tournament.totalRounds ?? null);
      setTotalMatches(tournament.totalMatches ?? null);
    }
  }, [tournament]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch(`/api/tournaments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          maxParticipants,
        }),
      });

      if (!response.ok) throw new Error("Failed to update tournament");

      toast.success("Tournament updated successfully");
      invalidateTournament(id);
      invalidateTournaments();
      router.push(`/tournaments/${id}`);
    } catch (error) {
      console.error("Error updating tournament:", error);
      toast.error("Failed to update tournament");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);

    try {
      const response = await fetch(`/api/tournaments/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete tournament");

      toast.success("Tournament deleted successfully");
      invalidateTournaments();
      router.push("/dashboard");
    } catch (error) {
      console.error("Error deleting tournament:", error);
      toast.error("Failed to delete tournament");
      setDeleting(false);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      const response = await fetch(`/api/tournaments/${id}/reset`, {
        method: "POST",
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to reset tournament");
      }
      toast.success("Tournament reset to open status");
      invalidateTournament(id);
      router.push(`/tournaments/${id}`);
    } catch (error: any) {
      console.error("Error resetting tournament:", error);
      toast.error(error.message || "Failed to reset tournament");
    } finally {
      setResetting(false);
    }
  };

  const handleFormatSave = async () => {
    setSavingFormat(true);
    try {
      const response = await fetch(`/api/tournaments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchmakingMethod,
          totalRounds: matchmakingMethod === "SWISS" ? totalRounds : null,
          totalMatches: matchmakingMethod === "KING_OF_THE_COURT" ? totalMatches : null,
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update format");
      }
      toast.success("Tournament format updated");
      invalidateTournament(id);
      mutate();
    } catch (error: any) {
      console.error("Error updating format:", error);
      toast.error(error.message || "Failed to update format");
    } finally {
      setSavingFormat(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link href={`/tournaments/${id}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Tournament
          </Button>
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Tournament Settings</h1>
        <p className="text-gray-600 mt-2">
          Manage your tournament configuration
        </p>
      </div>

      {loading ? (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-48" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </div>
      ) : !tournament ? (
        <Alert variant="destructive">
          <Info className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Failed to load tournament settings</AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-6">
          {/* General Settings */}
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Tournament Name</Label>
                  <Input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Tournament name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    placeholder="Tournament description"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxParticipants">Max Participants</Label>
                  <Input
                    type="number"
                    id="maxParticipants"
                    value={maxParticipants}
                    onChange={(e) => setMaxParticipants(parseInt(e.target.value))}
                    min={2}
                    max={128}
                    required
                  />
                </div>

                <Button type="submit" className="w-full" disabled={saving}>
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Tournament Format - Organizer only, OPEN status only */}
          {role === "organizer" && tournament.status === "OPEN" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shuffle className="h-5 w-5" />
                  Tournament Format
                </CardTitle>
                <CardDescription>
                  Change the matchmaking method before starting the tournament
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Matchmaking Method</Label>
                  <Select value={matchmakingMethod} onValueChange={(v) => {
                    setMatchmakingMethod(v);
                    if (v !== "SWISS") setTotalRounds(null);
                    if (v !== "KING_OF_THE_COURT") setTotalMatches(null);
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ROUND_ROBIN">Round Robin</SelectItem>
                      <SelectItem value="SWISS">Swiss System</SelectItem>
                      <SelectItem value="ROTATING_PARTNER">Rotating Partner</SelectItem>
                      <SelectItem value="KING_OF_THE_COURT">King of the Court</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {matchmakingMethod === "SWISS" && (
                  <div className="space-y-2">
                    <Label htmlFor="totalRounds">Number of Rounds</Label>
                    <Input
                      type="number"
                      id="totalRounds"
                      value={totalRounds ?? ""}
                      onChange={(e) => setTotalRounds(e.target.value ? parseInt(e.target.value) : null)}
                      min={1}
                      max={20}
                      placeholder="e.g. 5"
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave empty to auto-calculate based on player count
                    </p>
                  </div>
                )}

                {matchmakingMethod === "KING_OF_THE_COURT" && (
                  <div className="space-y-2">
                    <Label htmlFor="totalMatches">Total Matches</Label>
                    <Input
                      type="number"
                      id="totalMatches"
                      value={totalMatches ?? ""}
                      onChange={(e) => setTotalMatches(e.target.value ? parseInt(e.target.value) : null)}
                      min={3}
                      max={100}
                      placeholder="e.g. 10"
                    />
                    <p className="text-xs text-muted-foreground">
                      Total number of challenge matches to play
                    </p>
                  </div>
                )}

                {matchmakingMethod !== tournament.matchmakingMethod && (
                  <Button
                    onClick={handleFormatSave}
                    disabled={savingFormat}
                    className="w-full"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {savingFormat ? "Saving..." : "Update Format"}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Role Management - Only visible to organizer */}
          {role === "organizer" && tournament.participants && tournament.participants.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Role Management</CardTitle>
                <CardDescription>
                  Grant or revoke manager privileges to other participants
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {tournament.participants
                    .filter((participant: any) => participant.userId !== session?.user?.id)
                    .map((participant: any) => {
                    const ownerEntry = tournament.owners.find(
                      (owner: any) => owner.userId === participant.userId
                    );
                    const isManager = ownerEntry?.role === "MANAGER";
                    const isCreator = tournament.createdBy === participant.userId;
                    
                    const isExpanded = expandedParticipant === participant.id;
                    
                    return (
                      <div
                        key={participant.id}
                        className="border rounded-lg overflow-hidden"
                      >
                        <button
                          type="button"
                          className="flex items-center gap-3 w-full p-4 text-left hover:bg-gray-50 transition-colors"
                          onClick={() => setExpandedParticipant(isExpanded ? null : participant.id)}
                        >
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-semibold text-gray-700 shrink-0">
                            {participant.user?.name
                              ? participant.user.name.charAt(0).toUpperCase()
                              : participant.user?.email?.charAt(0).toUpperCase() || "?"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900 truncate">
                                {participant.user?.name || participant.user?.email || "Unknown User"}
                              </p>
                              {isManager && (
                                <Badge variant="secondary" className="bg-blue-100 text-blue-700 shrink-0">
                                  Manager
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 truncate">{participant.user?.email}</p>
                          </div>
                          <ChevronDown className={`h-4 w-4 text-gray-400 shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                        </button>
                        {isExpanded && (
                          <div className="px-4 pb-4 border-t bg-gray-50">
                            <div className="pt-3">
                              <Button
                                variant={isManager ? "outline" : "default"}
                                size="sm"
                                className="w-full"
                                disabled={updatingOwner === participant.userId || isCreator}
                                onClick={async () => {
                                  setUpdatingOwner(participant.userId);
                                  try {
                                    const response = await fetch(`/api/tournaments/${id}/owners`, {
                                      method: isManager ? "DELETE" : "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ userId: participant.userId }),
                                    });

                                    if (!response.ok) {
                                      const data = await response.json();
                                      throw new Error(data.error || "Failed to update role");
                                    }

                                    const data = await response.json();
                                    mutate();
                                    setExpandedParticipant(null);
                                    toast.success(
                                      isManager
                                        ? "Manager privilege revoked"
                                        : "Manager privilege granted"
                                    );
                                  } catch (error: any) {
                                    console.error("Error updating role:", error);
                                    toast.error(error.message || "Failed to update role");
                                  } finally {
                                    setUpdatingOwner(null);
                                  }
                                }}
                              >
                                {updatingOwner === participant.userId
                                  ? "Updating..."
                                  : isManager
                                  ? "Revoke Manager"
                                  : "Make Manager"}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Activity Log - Organizer only */}
          {role === "organizer" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ScrollText className="h-5 w-5" />
                  Activity Log
                </CardTitle>
                <CardDescription>Recent tournament activity</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingLogs ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : activityLogs.length === 0 ? (
                  <p className="text-sm text-gray-500 py-4 text-center">No activity recorded yet</p>
                ) : (
                  <div className="space-y-3">
                    {activityLogs.map((log) => (
                      <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 text-sm">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900">
                            {log.action.replace(/_/g, " ")}
                          </p>
                          <p className="text-xs text-gray-500">
                            by {log.user.name} • {format(new Date(log.createdAt), "MMM d, yyyy HH:mm")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Danger Zone */}
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
              <CardDescription>
                Irreversible actions that affect this tournament
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {role === "organizer" && tournament.status === "ONGOING" && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <div>
                    <h3 className="font-semibold text-foreground">
                      Reset Tournament
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Delete all matches and results, return to open status
                    </p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="border-amber-400 text-amber-700 hover:bg-amber-100" disabled={resetting}>
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Reset
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Reset Tournament?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will delete all matches, results, and scores. The tournament will return to open status so you can start it again. Participants will be kept.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-amber-600 hover:bg-amber-700"
                          onClick={handleReset}
                        >
                          Yes, reset tournament
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-destructive/10 rounded-lg">
                <div>
                  <h3 className="font-semibold text-foreground">
                    Delete Tournament
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Permanently delete this tournament and all data
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" disabled={deleting}>
                      <AlertTriangle className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Tournament Forever?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete the tournament and all associated data including matches, participants, and results. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        className="bg-destructive hover:bg-destructive/90"
                        onClick={handleDelete}
                      >
                        Yes, delete permanently
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
