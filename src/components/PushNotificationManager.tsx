"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { getToken, onMessage } from "firebase/messaging";
import { getFirebaseMessaging } from "@/lib/firebase";
import { useFirebase } from "@/components/FirebaseProvider";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const DISMISSED_KEY = "push-prompt-dismissed";

export default function PushNotificationManager() {
  const { data: session } = useSession();
  const { isFirebaseReady } = useFirebase();
  const [showPrompt, setShowPrompt] = useState(false);
  const [registering, setRegistering] = useState(false);

  const registerToken = useCallback(async () => {
    try {
      const messaging = await getFirebaseMessaging();
      if (!messaging) return;

      // Use the already-registered main service worker
      const swRegistration = await navigator.serviceWorker.ready;

      const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
      if (!vapidKey) {
        console.error("NEXT_PUBLIC_FIREBASE_VAPID_KEY not set");
        return;
      }

      const token = await getToken(messaging, {
        vapidKey,
        serviceWorkerRegistration: swRegistration,
      });

      if (token) {
        await fetch("/api/push/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
      }
    } catch (error) {
      console.error("Failed to register push token:", error);
    }
  }, []);

  useEffect(() => {
    if (!session?.user || !isFirebaseReady) return;
    if (typeof window === "undefined" || !("Notification" in window)) return;

    const permission = Notification.permission;

    if (permission === "granted") {
      // Already granted — register/refresh token silently
      registerToken();
      return;
    }

    if (permission === "default") {
      // Not yet decided — show prompt (unless recently dismissed)
      const dismissed = localStorage.getItem(DISMISSED_KEY);
      if (dismissed && Date.now() - parseInt(dismissed, 10) < 7 * 24 * 60 * 60 * 1000) {
        return;
      }
      setShowPrompt(true);
    }
    // If 'denied', do nothing
  }, [session, isFirebaseReady, registerToken]);

  // Listen for foreground messages and show toast
  useEffect(() => {
    if (!isFirebaseReady) return;
    let unsub: (() => void) | undefined;

    (async () => {
      const messaging = await getFirebaseMessaging();
      if (!messaging) return;
      unsub = onMessage(messaging, (payload) => {
        const { title, body } = payload.notification || {};
        if (title) {
          toast(title, { description: body });
        }
      });
    })();

    return () => unsub?.();
  }, [isFirebaseReady]);

  const handleEnable = async () => {
    setRegistering(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        await registerToken();
        toast.success("Notifications enabled!");
      }
      setShowPrompt(false);
    } catch {
      toast.error("Failed to enable notifications");
    } finally {
      setRegistering(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, Date.now().toString());
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-[80] flex justify-center pointer-events-none">
      <div className="bg-white border border-gray-200 shadow-xl rounded-2xl p-4 max-w-sm w-full flex items-center gap-3 pointer-events-auto">
        <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
          <Bell className="h-5 w-5 text-indigo-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">Enable notifications</p>
          <p className="text-xs text-gray-500">Get updates on matches, invites & chat</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            size="sm"
            onClick={handleEnable}
            disabled={registering}
            className="bg-indigo-600 hover:bg-indigo-700 text-xs h-8 px-3"
          >
            {registering ? "..." : "Enable"}
          </Button>
          <button onClick={handleDismiss} className="text-gray-400 hover:text-gray-600 p-1">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
