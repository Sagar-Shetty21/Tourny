import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminDb } from "@/lib/firebase-admin";
import { sendPushToUsers } from "@/lib/push-notifications";

// POST /api/tournaments/[id]/chat-notify — Send push to participants not on chat page
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: tournamentId } = await params;
  const { text } = await req.json();

  if (!text || typeof text !== "string") {
    return NextResponse.json({ error: "Missing text" }, { status: 400 });
  }

  try {
    // Get all active participants
    const participants = await prisma.participant.findMany({
      where: { tournamentId, removedAt: null },
      select: { userId: true },
    });

    const participantIds = participants.map((p) => p.userId);

    // Get users currently on the chat page from Firestore
    const presenceSnap = await getAdminDb()
      .collection("tournaments")
      .doc(tournamentId)
      .collection("chatPresence")
      .where("online", "==", true)
      .get();

    const presentUserIds = new Set(presenceSnap.docs.map((d) => d.id));

    // Exclude sender and users currently on the chat page
    const recipientIds = participantIds.filter(
      (pid) => pid !== userId && !presentUserIds.has(pid)
    );

    if (recipientIds.length === 0) {
      return NextResponse.json({ success: true, sent: 0 });
    }

    const senderName =
      (session.user as any)?.username || session.user?.name || "Someone";
    const truncatedText = text.length > 100 ? text.slice(0, 97) + "..." : text;

    await sendPushToUsers(
      recipientIds,
      `${senderName} in chat`,
      truncatedText,
      `/tournaments/${tournamentId}/chat`
    );

    return NextResponse.json({ success: true, sent: recipientIds.length });
  } catch (error) {
    console.error("Chat notify error:", error);
    return NextResponse.json({ success: true, sent: 0 });
  }
}
