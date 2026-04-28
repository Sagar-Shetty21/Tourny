"use client";

import { useState, useEffect, useRef } from "react";
import { X, Share, PlusSquare, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

const DISMISS_KEY = "pwa-install-dismissed";
const DISMISS_DAYS = 7;

function isDismissed(): boolean {
  if (typeof window === "undefined") return true;
  const raw = localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const ts = parseInt(raw, 10);
  if (isNaN(ts)) return false;
  return Date.now() - ts < DISMISS_DAYS * 24 * 60 * 60 * 1000;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

function isIos(): boolean {
  if (typeof window === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream;
}

export default function PwaInstallPrompt() {
  const [show, setShow] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const deferredPrompt = useRef<any>(null);

  useEffect(() => {
    if (isStandalone() || isDismissed()) return;

    // iOS — no beforeinstallprompt, show guide
    if (isIos()) {
      setShow(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e;
      setShow(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (isIos()) {
      setShowIosGuide(true);
      return;
    }
    if (!deferredPrompt.current) return;
    deferredPrompt.current.prompt();
    const result = await deferredPrompt.current.userChoice;
    if (result.outcome === "accepted") {
      setShow(false);
    }
    deferredPrompt.current = null;
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    setShow(false);
    setShowIosGuide(false);
  };

  if (!show) return null;

  // iOS guide modal
  if (showIosGuide) {
    return (
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 p-4">
        <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl animate-in slide-in-from-bottom-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Install Tourny</h3>
            <button onClick={handleDismiss} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-50 text-blue-600 text-sm font-bold shrink-0">1</div>
              <div>
                <p className="text-sm font-medium text-gray-900">Tap the Share button</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Look for the <Share className="inline h-3.5 w-3.5 -mt-0.5" /> icon in your browser toolbar
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-50 text-blue-600 text-sm font-bold shrink-0">2</div>
              <div>
                <p className="text-sm font-medium text-gray-900">Tap "Add to Home Screen"</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Scroll down and tap <PlusSquare className="inline h-3.5 w-3.5 -mt-0.5" /> Add to Home Screen
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-50 text-blue-600 text-sm font-bold shrink-0">3</div>
              <div>
                <p className="text-sm font-medium text-gray-900">Tap "Add"</p>
                <p className="text-xs text-gray-500 mt-0.5">Tourny will appear on your home screen like an app</p>
              </div>
            </div>
          </div>
          <Button onClick={handleDismiss} className="w-full mt-5 bg-gray-900 hover:bg-gray-800">
            Got it
          </Button>
        </div>
      </div>
    );
  }

  // Install banner
  return (
    <div className="fixed bottom-20 md:bottom-6 left-4 right-4 z-[70] flex justify-center pointer-events-none">
      <div className="bg-white border border-gray-200 shadow-xl rounded-2xl p-4 max-w-sm w-full flex items-center gap-3 pointer-events-auto">
        <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "#ffb689" }}>
          <Download className="h-5 w-5 text-gray-900" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">Install Tourny</p>
          <p className="text-xs text-gray-500">Add to home screen for the best experience</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button size="sm" onClick={handleInstall} className="bg-gray-900 hover:bg-gray-800 text-xs h-8 px-3">
            Install
          </Button>
          <button onClick={handleDismiss} className="text-gray-400 hover:text-gray-600 p-1">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
