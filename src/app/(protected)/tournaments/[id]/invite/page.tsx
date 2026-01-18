"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
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
import { ArrowLeft, Copy, RefreshCw, Info, Share2, CheckCircle2, ExternalLink, Trash2, Trophy, Users, Gamepad2, UserPlus } from "lucide-react";

interface Invite {
  id: string;
  token: string;
  link: string;
  expiresAt: string | null;
  maxUses: number | null;
  usedCount: number;
  createdAt: string;
}

export default function InvitePage() {
  const params = useParams();
  const id = params.id as string;
  
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchInvites();
  }, [id]);

  const fetchInvites = async () => {
    try {
      const res = await fetch(`/api/tournaments/${id}`);
      const data = await res.json();

      if (res.ok) {
        const invitesWithLinks = (data.tournament.invites || []).map((invite: Invite) => ({
          ...invite,
          link: invite.link || `${window.location.origin}/join/${invite.token}`,
        }));
        setInvites(invitesWithLinks);
      }
    } catch (err) {
      console.error("Failed to fetch invites:", err);
    } finally {
      setLoading(false);
    }
  };

  const generateNewInvite = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`/api/tournaments/${id}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expiresInDays: 30,
          maxUses: null,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Invite link generated!", {
          description: "New invitation link is ready to share",
        });
        setInvites([data.invitation, ...invites]);
      } else {
        toast.error("Failed to generate invite", {
          description: data.error,
        });
      }
    } catch (err) {
      toast.error("Failed to generate invite");
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link copied to clipboard!", {
        description: "Share this link with your participants",
        icon: <CheckCircle2 className="h-4 w-4" />,
      });
    } catch (err) {
      toast.error("Failed to copy");
    }
  };

  const handleShare = async (link: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join Tournament",
          text: "You're invited to join this tournament!",
          url: link,
        });
      } catch (err) {
        console.log("Share cancelled");
      }
    } else {
      handleCopy(link);
    }
  };

  const handleDelete = async (inviteId: string) => {
    // Check if this is the last invite
    if (invites.length <= 1) {
      toast.error("Cannot delete last invite", {
        description: "You must keep at least one active invitation link",
      });
      return;
    }

    setDeleting(inviteId);
    try {
      const res = await fetch(`/api/tournaments/${id}/invite/${inviteId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Invite deleted", {
          description: "The invitation link has been removed",
        });
        setInvites(invites.filter(inv => inv.id !== inviteId));
      } else {
        const data = await res.json();
        toast.error("Failed to delete invite", {
          description: data.error,
        });
      }
    } catch (err) {
      toast.error("Failed to delete invite");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Invite Players</h1>
        <p className="text-gray-600 mt-2">
          Share this link to invite players to your tournament
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
            <Button variant="outline">
              <Gamepad2 className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Matches</span>
            </Button>
          </Link>
          <Link href={`/tournaments/${id}/invite`}>
            <Button variant="outline" className="text-white" style={{ backgroundColor: '#da6c6c' }}>
              <UserPlus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Invite</span>
            </Button>
          </Link>
        </div>
      </div>

      <div className="space-y-6">
        {/* Generate New Invite */}
        <Card>
          <CardHeader>
            <CardTitle>Generate Invitation Link</CardTitle>
            <CardDescription>
              Create a new link to invite players to your tournament
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={generateNewInvite} disabled={generating || loading} className="w-full sm:w-auto">
              {generating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Generate New Link
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Active Invitations */}
        <Card>
          <CardHeader>
            <CardTitle>Active Invitations</CardTitle>
            <CardDescription>
              {loading ? "Loading..." : `${invites.length} invitation${invites.length !== 1 ? 's' : ''} available`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : invites.length === 0 ? (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>No invitations yet</AlertTitle>
                <AlertDescription>
                  Generate your first invitation link to start inviting players
                </AlertDescription>
              </Alert>
            ) : (
              invites.map((invite) => (
                <div key={invite.id} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium text-gray-900">Invitation Link</p>
                        {invite.maxUses && (
                          <span className="text-xs text-gray-500">
                            {invite.usedCount} / {invite.maxUses} uses
                          </span>
                        )}
                      </div>
                      <Input
                        readOnly
                        value={invite.link}
                        className="font-mono text-xs"
                      />
                      {invite.expiresAt && (
                        <p className="text-xs text-gray-500 mt-1">
                          Expires: {new Date(invite.expiresAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleCopy(invite.link)}>
                      <Copy className="h-3 w-3 mr-1" />
                      Copy
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleShare(invite.link)}>
                      <Share2 className="h-3 w-3 mr-1" />
                      Share
                    </Button>
                    <a href={invite.link} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline">
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Preview
                      </Button>
                    </a>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          disabled={deleting === invite.id || invites.length <= 1}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Invitation Link?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete this invitation link. Any shared links will no longer work.
                            {invites.length <= 1 && " You must keep at least one active invitation."}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(invite.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Tips */}
        <Card>
          <CardHeader>
            <CardTitle>Sharing Tips</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-600">
            <p>• Share the link via social media, email, or messaging apps</p>
            <p>• Players can join directly by clicking the link</p>
            <p>• Track how many people have used each invitation link</p>
            <p>• Generate multiple links for different groups if needed</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

       