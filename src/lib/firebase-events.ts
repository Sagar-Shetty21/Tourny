import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export type SystemEventType =
  | "player_joined"
  | "player_removed"
  | "manager_granted"
  | "manager_removed"
  | "match_completed"
  | "tournament_started"
  | "tournament_finished"
  | "match_invite"
  | "match_reset"
  | "round_completed"
  | "kotc_match_created"
  | "tournament_reset";

export async function writeTournamentEvent(
  tournamentId: string,
  eventType: SystemEventType,
  eventData: Record<string, unknown>
) {
  try {
    await getAdminDb()
      .collection("tournaments")
      .doc(tournamentId)
      .collection("messages")
      .add({
        type: "system",
        eventType,
        eventData,
        timestamp: FieldValue.serverTimestamp(),
      });
  } catch (error) {
    // Log but don't throw — system events are non-critical
    console.error(`Failed to write tournament event [${eventType}]:`, error);
  }
}
