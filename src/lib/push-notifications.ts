import { prisma } from "@/lib/prisma";
import { getMessaging } from "firebase-admin/messaging";

/**
 * Send push notifications to specific users.
 * Queries their FCM tokens from DB and sends via Firebase Admin SDK.
 * Automatically cleans up stale/invalid tokens.
 */
export async function sendPushToUsers(
  userIds: string[],
  title: string,
  body: string,
  url: string
) {
  if (userIds.length === 0) return;

  try {
    const tokens = await prisma.fcmToken.findMany({
      where: { userId: { in: userIds } },
      select: { token: true, id: true },
    });

    if (tokens.length === 0) return;

    const messaging = getMessaging();

    const results = await Promise.allSettled(
      tokens.map((t) =>
        messaging.send({
          token: t.token,
          notification: { title, body },
          webpush: {
            fcmOptions: { link: url },
            notification: {
              icon: "/icon-192x192.png",
              badge: "/icon-192x192.png",
            },
          },
        })
      )
    );

    // Clean up stale tokens
    const staleIds: string[] = [];
    results.forEach((r, i) => {
      if (
        r.status === "rejected" &&
        (r.reason?.code === "messaging/registration-token-not-registered" ||
          r.reason?.code === "messaging/invalid-registration-token")
      ) {
        staleIds.push(tokens[i].id);
      }
    });

    if (staleIds.length > 0) {
      await prisma.fcmToken.deleteMany({ where: { id: { in: staleIds } } });
    }
  } catch (error) {
    // Push is non-critical — log but don't throw
    console.error("Failed to send push notifications:", error);
  }
}
