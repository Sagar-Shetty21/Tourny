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
import { ArrowLeft, Info, AlertTriangle, Save, ScrollText } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
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
  description: string | null;
  type: string;
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
  
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [updatingOwner, setUpdatingOwner] = useState<string | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLogEntry[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  
  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [maxParticipants, setMaxParticipants] = useState(8);

  useEffect(() => {
    const fetchTournament = async () => {
      try {
        const response = await fetch(`/api/tournaments/${id}`);
        if (!response.ok) throw new Error("Failed to fetch tournament");
        const data = await response.json();
        const tournamentData = data.tournament || data;
        setTournament(tournamentData);
        setRole(data.role || null);
        setName(tournamentData.name);
        setDescription(tournamentData.description || "");
        setMaxParticipants(tournamentData.maxParticipants);
      } catch (error) {
        console.error("Error fetching tournament:", error);
        toast.error("Failed to load tournament settings");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchTournament();
    }
  }, [id]);

  useEffect(() => {
    if (!id || role !== "organizer") return;
    const fetchLogs = async () => {
      setLoadingLogs(true);
      try {
        const res = await fetch(`/api/tournaments/${id}/activity?limit=20`);
        if (res.ok) {
          const data = await res.json();
          setActivityLogs(data.logs);
        }
      } catch {
        // silent fail
      } finally {
        setLoadingLogs(false);
      }
    };
    fetchLogs();
  }, [id, role]);

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
      router.push("/dashboard");
    } catch (error) {
      console.error("Error deleting tournament:", error);
      toast.error("Failed to delete tournament");
      setDeleting(false);
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
                    .filter((participant) => participant.userId !== session?.user?.id)
                    .map((participant) => {
                    const ownerEntry = tournament.owners.find(
                      (owner) => owner.userId === participant.userId
                    );
                    const isManager = ownerEntry?.role === "MANAGER";
                    const isCreator = tournament.createdBy === participant.userId;
                    
                    return (
                      <div
                        key={participant.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-semibold text-gray-700">
                            {participant.user?.name
                              ? participant.user.name.charAt(0).toUpperCase()
                              : participant.user?.email?.charAt(0).toUpperCase() || "?"}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900">
                                {participant.user?.name || participant.user?.email || "Unknown User"}
                              </p>
                              {isManager && (
                                <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                                  Manager
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-500">{participant.user?.email}</p>
                          </div>
                        </div>
                        <Button
                          variant={isManager ? "outline" : "default"}
                          size="sm"
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
                              setTournament(data.tournament);
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
