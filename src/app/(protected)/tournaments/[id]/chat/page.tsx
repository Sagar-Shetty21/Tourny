"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  collection,
  addDoc,
  doc,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  limit,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { useFirebase } from "@/components/FirebaseProvider";
import { useTournament } from "@/lib/swr";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Trophy,
  Users,
  Gamepad2,
  UserPlus,
  MessageCircle,
  Send,
  Zap,
  ArrowLeft,
  X,
  Reply,
} from "lucide-react";
import {
  ChatMessage,
  AvailabilityDoc,
  SystemEventBadge,
  avatarColor,
  getInitials,
  formatMessageTime,
} from "@/components/chat-helpers";

export default function ChatPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id;
  const userName = (session?.user as any)?.username || session?.user?.name || "Anonymous";
  const { isFirebaseReady } = useFirebase();
  const { tournament, role, isLoading } = useTournament(id);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [availablePlayers, setAvailablePlayers] = useState<AvailabilityDoc[]>([]);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const mobileChatContainerRef = useRef<HTMLDivElement>(null);
  const desktopChatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const container = mobileChatContainerRef.current?.offsetParent
      ? mobileChatContainerRef.current
      : desktopChatContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, []);

  const isRemoved = useMemo(() => {
    if (!tournament || !userId) return false;
    const participant = tournament.participants?.find((p: any) => p.userId === userId);
    return participant?.removedAt !== null && participant?.removedAt !== undefined;
  }, [tournament, userId]);

  const isTournamentFinished = tournament?.status === "FINISHED";
  const canSendMessage = !isRemoved && !isTournamentFinished && isFirebaseReady;

  // Listen to messages
  useEffect(() => {
    if (!id || !isFirebaseReady) return;

    const messagesRef = collection(getDb(), "tournaments", id, "messages");
    const q = query(messagesRef, orderBy("timestamp", "asc"), limit(200));

    const unsub = onSnapshot(q, (snapshot) => {
      const msgs: ChatMessage[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as ChatMessage[];
      setMessages(msgs);
    });

    return () => unsub();
  }, [id, isFirebaseReady]);

  // Listen to availability
  useEffect(() => {
    if (!id || !isFirebaseReady) return;

    const availRef = collection(getDb(), "tournaments", id, "availability");
    const unsub = onSnapshot(availRef, (snapshot) => {
      const now = new Date();
      const docs: AvailabilityDoc[] = snapshot.docs
        .map((doc) => ({ odcId: doc.id, ...doc.data() } as AvailabilityDoc))
        .filter((d) => {
          if (!d.available) return false;
          if (d.expiresAt && d.expiresAt.toDate() < now) return false;
          return true;
        });
      setAvailablePlayers(docs);
    });

    return () => unsub();
  }, [id, isFirebaseReady]);

  // Chat presence tracking
  useEffect(() => {
    if (!id || !isFirebaseReady || !userId) return;
    const presenceRef = doc(getDb(), "tournaments", id, "chatPresence", userId);
    setDoc(presenceRef, { online: true, lastSeen: serverTimestamp() });
    return () => {
      deleteDoc(presenceRef).catch(() => {});
    };
  }, [id, isFirebaseReady, userId]);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    if (autoScroll) {
      requestAnimationFrame(() => scrollToBottom());
    }
  }, [messages, autoScroll, scrollToBottom]);

  const handleScroll = useCallback((container: HTMLDivElement | null) => {
    if (!container) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    setAutoScroll(scrollHeight - scrollTop - clientHeight < 100);
  }, []);

  const handleReply = useCallback((msg: ChatMessage) => {
    setReplyingTo(msg);
    inputRef.current?.focus();
  }, []);

  const handleSend = async () => {
    if (!newMessage.trim() || !canSendMessage || !userId) return;
    setSending(true);
    try {
      const messagesRef = collection(getDb(), "tournaments", id, "messages");
      const msgData: Record<string, unknown> = {
        type: "chat",
        userId,
        userName,
        text: newMessage.trim(),
        timestamp: serverTimestamp(),
      };
      if (replyingTo) {
        msgData.replyTo = {
          id: replyingTo.id,
          userName: replyingTo.userName || "?",
          text: (replyingTo.text || "").slice(0, 200),
        };
      }
      await addDoc(messagesRef, msgData);
      setNewMessage("");
      setReplyingTo(null);
      setAutoScroll(true);
      // Imperatively scroll to bottom after send
      requestAnimationFrame(() => scrollToBottom());
      // Trigger push notifications for participants not on chat page
      fetch(`/api/tournaments/${id}/chat-notify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: msgData.text }),
      }).catch(() => {});
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Skeleton className="h-10 w-48 mb-4" />
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  if (!tournament) return null;

  // Shared messages rendering
  const messagesContent = (
    <>
      {!isFirebaseReady ? (
        <div className="flex items-center justify-center h-full">
          <p className="text-sm text-gray-400">Connecting...</p>
        </div>
      ) : messages.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <MessageCircle className="h-10 w-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No messages yet. Say hello!</p>
          </div>
        </div>
      ) : (
        messages.map((msg) => {
          if (msg.type === "system") {
            return <SystemEventBadge key={msg.id} message={msg} />;
          }

          const isOwn = msg.userId === userId;
          return (
            <div
              key={msg.id}
              className={`group flex items-start gap-2.5 py-1.5 ${isOwn ? "flex-row-reverse" : ""}`}
              onContextMenu={(e) => {
                e.preventDefault();
                handleReply(msg);
              }}
              onTouchStart={() => {
                longPressTimer.current = setTimeout(() => handleReply(msg), 500);
              }}
              onTouchEnd={() => {
                if (longPressTimer.current) clearTimeout(longPressTimer.current);
              }}
              onTouchMove={() => {
                if (longPressTimer.current) clearTimeout(longPressTimer.current);
              }}
            >
              <div
                className={`mt-5 h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${avatarColor(msg.userId || "")}`}
              >
                {getInitials(msg.userName || "?")}
              </div>
              <div className={`flex flex-col max-w-[70%] ${isOwn ? "items-end" : "items-start"}`}>
                <div className={`flex items-baseline gap-2 mb-0.5 ${isOwn ? "flex-row-reverse" : ""}`}>
                  <span className="text-xs font-semibold text-gray-900">{msg.userName}</span>
                  <span className="text-[10px] text-gray-400">{formatMessageTime(msg.timestamp)}</span>
                  <button
                    onClick={() => handleReply(msg)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-600"
                    title="Reply"
                  >
                    <Reply className="h-3 w-3" />
                  </button>
                </div>
                <div
                  className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                    isOwn
                      ? "bg-gray-900 text-white rounded-br-md"
                      : "bg-gray-100 text-gray-900 rounded-bl-md"
                  }`}
                >
                  {msg.replyTo && (
                    <div
                      className={`mb-1.5 rounded-lg px-2.5 py-1.5 border-l-2 ${
                        isOwn
                          ? "bg-gray-800 border-gray-500"
                          : "bg-gray-200/70 border-gray-400"
                      }`}
                    >
                      <p className={`text-[10px] font-semibold ${isOwn ? "text-gray-300" : "text-gray-600"}`}>
                        {msg.replyTo.userName}
                      </p>
                      <p className={`text-xs truncate ${isOwn ? "text-gray-400" : "text-gray-500"}`}>
                        {msg.replyTo.text}
                      </p>
                    </div>
                  )}
                  {msg.text}
                </div>
              </div>
            </div>
          );
        })
      )}
    </>
  );

  // Shared input area
  const inputArea = (
    <>
      {isTournamentFinished ? (
        <p className="text-sm text-gray-500 text-center py-1">Messaging disabled — tournament is complete</p>
      ) : isRemoved ? (
        <p className="text-sm text-gray-500 text-center py-1">You were removed from this tournament (read-only)</p>
      ) : (
        <div>
          {replyingTo && (
            <div className="flex items-center gap-2 mb-2 rounded-lg bg-gray-50 border border-gray-200 px-3 py-2">
              <div className="border-l-2 border-gray-900 pl-2 flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-700">{replyingTo.userName}</p>
                <p className="text-xs text-gray-500 truncate">{replyingTo.text}</p>
              </div>
              <button onClick={() => setReplyingTo(null)} className="shrink-0 text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={replyingTo ? "Write a reply..." : "Type a message..."}
              disabled={!canSendMessage || sending}
              className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 disabled:opacity-50"
            />
            <Button
              onClick={handleSend}
              disabled={!newMessage.trim() || !canSendMessage || sending}
              size="sm"
              className="h-10 w-10 rounded-xl bg-gray-900 hover:bg-gray-800 p-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );

  return (
    <>
      {/* ===== MOBILE: Full-screen chat ===== */}
      <div className="md:hidden fixed inset-0 z-[55] flex flex-col" style={{ backgroundColor: "#ffe6c1" }}>
        {/* Top bar */}
        <div className="flex items-center gap-3 px-4 py-3 shrink-0">
          <button
            onClick={() => router.back()}
            className="h-9 w-9 flex items-center justify-center rounded-xl hover:bg-black/5 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-800" />
          </button>
          <h1 className="text-lg font-bold text-gray-900">Chat</h1>
          <span className="text-sm text-gray-600 truncate">— {tournament.name}</span>
        </div>

        {/* Available Players Banner */}
        {availablePlayers.length > 0 && (
          <div className="mx-4 mb-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 flex items-center gap-2 shrink-0">
            <Zap className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span className="text-xs font-medium text-emerald-700">
              {availablePlayers.length} ready
            </span>
            <span className="text-xs text-emerald-600 truncate">
              — {availablePlayers.map((p) => p.userName).join(", ")}
            </span>
          </div>
        )}

        {/* Messages */}
        <div
          ref={mobileChatContainerRef}
          onScroll={() => handleScroll(mobileChatContainerRef.current)}
          className="flex-1 overflow-y-auto px-4 py-3 space-y-1"
        >
          {messagesContent}
        </div>

        {/* Input */}
        <div className="shrink-0 bg-white px-4 py-3 border-t border-gray-100" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
          {inputArea}
        </div>
      </div>

      {/* ===== DESKTOP: Standard chat page ===== */}
      <div className="hidden md:block max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Chat</h1>
          <p className="text-gray-500 mt-1 text-sm">Tournament group chat</p>
        </div>

        {/* Quick Navigation */}
        <div className="mb-6 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            <Link href={`/tournaments/${id}`}>
              <Button variant="outline" size="sm">
                <Trophy className="h-4 w-4 mr-1.5" />
                Overview
              </Button>
            </Link>
            <Link href={`/tournaments/${id}/players`}>
              <Button variant="outline" size="sm">
                <Users className="h-4 w-4 mr-1.5" />
                Players
              </Button>
            </Link>
            <Link href={`/tournaments/${id}/matches`}>
              <Button variant="outline" size="sm">
                <Gamepad2 className="h-4 w-4 mr-1.5" />
                Matches
              </Button>
            </Link>
            <Link href={`/tournaments/${id}/chat`}>
              <Button size="sm" className="bg-gray-900 text-white hover:bg-gray-800">
                <MessageCircle className="h-4 w-4 mr-1.5" />
                Chat
              </Button>
            </Link>
            {tournament.status !== "FINISHED" && (
              <Link href={`/tournaments/${id}/invite`}>
                <Button variant="outline" size="sm">
                  <UserPlus className="h-4 w-4 mr-1.5" />
                  Invite
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Available Players Banner */}
        {availablePlayers.length > 0 && (
          <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 flex items-center gap-2">
            <Zap className="h-4 w-4 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-700">
              {availablePlayers.length} player{availablePlayers.length !== 1 ? "s" : ""} ready to play
            </span>
            <span className="text-xs text-emerald-600 ml-1">
              — {availablePlayers.map((p) => p.userName).join(", ")}
            </span>
          </div>
        )}

        {/* Chat Container */}
        <div className="border rounded-xl bg-white overflow-hidden flex flex-col" style={{ height: "calc(100vh - 340px)", minHeight: "400px" }}>
          <div
            ref={desktopChatContainerRef}
            onScroll={() => handleScroll(desktopChatContainerRef.current)}
            className="flex-1 overflow-y-auto px-4 py-3 space-y-1"
          >
            {messagesContent}
          </div>
          <div className="border-t bg-gray-50 px-4 py-3">
            {inputArea}
          </div>
        </div>
      </div>
    </>
  );
}
