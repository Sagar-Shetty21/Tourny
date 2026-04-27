import { prisma } from "@/lib/prisma";

export type UserRole = "organizer" | "manager" | "participant" | null;

/**
 * Get the user's role in a tournament.
 * Returns "organizer", "manager", "participant", or null (no access).
 */
export async function getUserRole(tournamentId: string, userId: string): Promise<UserRole> {
  const owner = await prisma.tournamentOwner.findUnique({
    where: { tournamentId_userId: { tournamentId, userId } },
  });

  if (owner) {
    return owner.role === "ORGANIZER" ? "organizer" : "manager";
  }

  const participant = await prisma.participant.findUnique({
    where: { tournamentId_userId: { tournamentId, userId } },
  });

  return participant ? "participant" : null;
}

/**
 * Log an activity event for a tournament.
 */
export async function logActivity(
  tournamentId: string,
  userId: string,
  action: string,
  details?: Record<string, unknown>
) {
  await prisma.activityLog.create({
    data: {
      tournamentId,
      userId,
      action,
      details: details ? (details as any) : undefined,
    },
  });
}
