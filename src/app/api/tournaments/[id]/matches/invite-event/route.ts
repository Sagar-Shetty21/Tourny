import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { writeTournamentEvent } from "@/lib/firebase-events";
import { sendPushToUsers } from "@/lib/push-notifications";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: tournamentId } = await params;
  const { matchInviteId, matchNumber, inviterName, playerIds } = await req.json();

  if (!matchInviteId || matchNumber == null || !inviterName) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  await writeTournamentEvent(tournamentId, "match_invite", {
    matchInviteId,
    tournamentId,
    matchNumber,
    inviterName,
  });

  // Push to invited players (exclude the inviter)
  if (Array.isArray(playerIds) && playerIds.length > 0) {
    const recipients = playerIds.filter((pid: string) => pid !== session.user!.id);
    sendPushToUsers(
      recipients,
      "Match Invite",
      `${inviterName} invited you to play Match #${matchNumber}`,
      `/tournaments/${tournamentId}/chat`
    ).catch(() => {});
  }

  return NextResponse.json({ success: true });
}
