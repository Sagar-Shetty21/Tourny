"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  collection,
  query,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  UserPlus2,
  UserMinus,
  Shield,
  Swords,
  Crown,
  Clock,
  Zap,
  Gamepad2,
  RotateCcw,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export interface ChatMessage {
  id: string;
  type: "chat" | "system";
  userId?: string;
  userName?: string;
  text?: string;
  replyTo?: {
    id: string;
    userName: string;
    text: string;
  };
  eventType?: string;
  eventData?: Record<string, unknown>;
  timestamp: Timestamp | null;
}

export interface AvailabilityDoc {
  odcId: string;
  available: boolean;
  userName: string;
  expiresAt: Timestamp | null;
  updatedAt: Timestamp;
}

const AVATAR_COLORS = [
  "bg-blue-600",
  "bg-purple-600",
  "bg-emerald-600",
  "bg-rose-600",
  "bg-amber-600",
  "bg-cyan-600",
  "bg-indigo-600",
  "bg-pink-600",
];

export function avatarColor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function formatMessageTime(timestamp: Timestamp | null) {
  if (!timestamp) return "";
  try {
    return formatDistanceToNow(timestamp.toDate(), { addSuffix: true });
  } catch {
    return "";
  }
}

export function SystemEventBadge({ message }: { message: ChatMessage }) {
  const { eventType, eventData } = message;

  const configs: Record<string, { icon: React.ReactNode; bg: string; text: string; label: string }> = {
    player_joined: {
      icon: <UserPlus2 className="h-3 w-3" />,
      bg: "bg-emerald-50 border-emerald-200",
      text: "text-emerald-700",
      label: `${eventData?.playerName || "A player"} joined the tournament`,
    },
    player_removed: {
      icon: <UserMinus className="h-3 w-3" />,
      bg: "bg-red-50 border-red-200",
      text: "text-red-700",
      label: `${eventData?.removedPlayerName || "A player"} was removed`,
    },
    manager_granted: {
      icon: <Shield className="h-3 w-3" />,
      bg: "bg-blue-50 border-blue-200",
      text: "text-blue-700",
      label: `${eventData?.targetName || "A player"} was given manager access`,
    },
    manager_removed: {
      icon: <Shield className="h-3 w-3" />,
      bg: "bg-orange-50 border-orange-200",
      text: "text-orange-700",
      label: `${eventData?.targetName || "A player"} manager access was removed`,
    },
    match_completed: {
      icon: <Swords className="h-3 w-3" />,
      bg: "bg-amber-50 border-amber-200",
      text: "text-amber-700",
      label: (() => {
        const mn = eventData?.matchNumber || "?";
        const result = eventData?.resultText || "completed";
        return `Match #${mn} — ${result}`;
      })(),
    },
    match_reset: {
      icon: <RotateCcw className="h-3 w-3" />,
      bg: "bg-red-50 border-red-200",
      text: "text-red-700",
      label: `Match #${eventData?.matchNumber || "?"} (${eventData?.players || ""}) was reset by ${eventData?.resetBy || "organizer"}`,
    },
    tournament_started: {
      icon: <Zap className="h-3 w-3" />,
      bg: "bg-green-50 border-green-200",
      text: "text-green-700",
      label: `Tournament started! ${eventData?.matchCount || ""} matches generated`,
    },
    tournament_finished: {
      icon: <Crown className="h-3 w-3" />,
      bg: "bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-300",
      text: "text-amber-800",
      label: "Tournament Complete!",
    },
    match_invite: {
      icon: <Gamepad2 className="h-3 w-3" />,
      bg: "bg-indigo-50 border-indigo-200",
      text: "text-indigo-700",
      label: `${eventData?.inviterName || "A player"} wants to play Match #${eventData?.matchNumber || "?"}`,
    },
    availability_change: {
      icon: <Clock className="h-3 w-3" />,
      bg: "bg-teal-50 border-teal-200",
      text: "text-teal-700",
      label: `${eventData?.userName || "A player"} is ready to play${eventData?.duration ? ` for ${eventData.duration}` : ""}`,
    },
  };

  const config = configs[eventType || ""] || {
    icon: null,
    bg: "bg-gray-50 border-gray-200",
    text: "text-gray-600",
    label: eventData?.message || "System event",
  };

  if (eventType === "tournament_finished") {
    const top3 = (eventData?.top3 as Array<{ name: string; points: number }>) || [];
    return (
      <div className="flex justify-center my-4">
        <div className={`rounded-xl border-2 ${config.bg} p-4 max-w-sm w-full text-center`}>
          <Crown className="h-8 w-8 text-amber-500 mx-auto mb-2" />
          <p className={`font-bold text-base ${config.text}`}>{config.label}</p>
          {top3.length > 0 && (
            <div className="mt-3 space-y-1">
              {top3.map((player, i) => (
                <div key={i} className="flex items-center justify-center gap-2 text-sm">
                  <span className={`inline-flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-bold ${
                    i === 0 ? "bg-amber-200 text-amber-800" : i === 1 ? "bg-gray-200 text-gray-700" : "bg-orange-100 text-orange-700"
                  }`}>{i + 1}</span>
                  <span className="font-medium text-gray-900">{player.name}</span>
                  <span className="text-gray-500">{player.points} pts</span>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-gray-500 mt-3">Messaging is now disabled</p>
        </div>
      </div>
    );
  }

  if (eventType === "match_invite" && eventData?.matchInviteId) {
    return (
      <div className="flex justify-center my-2">
        <div className={`rounded-lg border ${config.bg} px-4 py-3 max-w-sm w-full`}>
          <div className="flex items-center gap-2 mb-2">
            {config.icon}
            <span className={`text-sm font-medium ${config.text}`}>{config.label}</span>
          </div>
          <MatchInviteVoteCard matchInviteId={eventData.matchInviteId as string} tournamentId={eventData.tournamentId as string} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center my-2">
      <div className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${config.bg} ${config.text}`}>
        <span className="shrink-0 [&>svg]:h-3.5 [&>svg]:w-3.5 sm:[&>svg]:h-3 sm:[&>svg]:w-3">{config.icon}</span>
        <span className="flex flex-col sm:flex-row sm:items-baseline sm:gap-1.5">
          <span>{config.label}</span>
          <span className="text-[10px] opacity-60">{formatMessageTime(message.timestamp)}</span>
        </span>
      </div>
    </div>
  );
}

export function MatchInviteVoteCard({ matchInviteId, tournamentId }: { matchInviteId: string; tournamentId: string }) {
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id;
  const [invite, setInvite] = useState<any>(null);

  useEffect(() => {
    const ref = collection(getDb(), "tournaments", tournamentId, "matchInvites");
    const unsub = onSnapshot(
      query(ref),
      (snap) => {
        const doc = snap.docs.find((d) => d.id === matchInviteId);
        if (doc) setInvite({ id: doc.id, ...doc.data() });
      }
    );
    return () => unsub();
  }, [matchInviteId, tournamentId]);

  if (!invite) return null;

  const votes = invite.votes || {};
  const playerIds: string[] = invite.playerIds || [];
  const isInvolved = playerIds.includes(userId);
  const myVote = votes[userId];

  const handleVote = async (vote: "yes" | "no") => {
    const { doc: firestoreDoc, updateDoc } = await import("firebase/firestore");
    const docRef = firestoreDoc(getDb(), "tournaments", tournamentId, "matchInvites", matchInviteId);
    const newVotes = { ...votes, [userId]: vote };

    const allVoted = playerIds.every((pid: string) => newVotes[pid] === "yes" || newVotes[pid] === "no");
    const allAccepted = playerIds.every((pid: string) => newVotes[pid] === "yes");

    await updateDoc(docRef, {
      votes: newVotes,
      ...(allVoted && { status: allAccepted ? "accepted" : "declined" }),
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {playerIds.map((pid: string) => {
          const v = votes[pid];
          return (
            <Badge
              key={pid}
              variant="secondary"
              className={`text-[10px] ${
                v === "yes" ? "bg-emerald-100 text-emerald-700" :
                v === "no" ? "bg-red-100 text-red-700" :
                "bg-gray-100 text-gray-500"
              }`}
            >
              {v === "yes" ? "✅" : v === "no" ? "❌" : "⏳"} {invite.playerNames?.[pid] || pid.slice(0, 6)}
            </Badge>
          );
        })}
      </div>
      {invite.status === "accepted" && (
        <Badge className="bg-emerald-600 text-white text-[10px]">All accepted — Ready to play!</Badge>
      )}
      {invite.status === "declined" && (
        <Badge variant="secondary" className="bg-red-100 text-red-700 text-[10px]">Invite declined</Badge>
      )}
      {isInvolved && !myVote && invite.status === "pending" && (
        <div className="flex gap-2">
          <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={() => handleVote("yes")}>
            Accept
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs text-red-600 border-red-200" onClick={() => handleVote("no")}>
            Decline
          </Button>
        </div>
      )}
    </div>
  );
}
