import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/push/register — Save FCM token for authenticated user
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { token } = await req.json();
  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  await prisma.fcmToken.upsert({
    where: { token },
    update: { userId: session.user.id, updatedAt: new Date() },
    create: { userId: session.user.id, token },
  });

  return NextResponse.json({ success: true });
}

// DELETE /api/push/register — Remove FCM token
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { token } = await req.json();
  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  await prisma.fcmToken.deleteMany({
    where: { token, userId: session.user.id },
  });

  return NextResponse.json({ success: true });
}
