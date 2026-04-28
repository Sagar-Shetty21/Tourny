import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase-admin";

// POST /api/auth/firebase-token - Get a Firebase Custom Token for the authenticated user
export async function POST() {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const customToken = await getAdminAuth().createCustomToken(userId);

    return NextResponse.json({ token: customToken });
  } catch (error) {
    console.error("Error creating Firebase token:", error);
    return NextResponse.json(
      { error: "Failed to create Firebase token" },
      { status: 500 }
    );
  }
}
