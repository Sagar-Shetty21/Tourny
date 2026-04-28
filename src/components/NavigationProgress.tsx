"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    cleanup();
    setProgress(0);
    setLoading(true);
    let p = 0;
    timerRef.current = setInterval(() => {
      p += (90 - p) * 0.08;
      setProgress(p);
    }, 100);
  }, [cleanup]);

  const done = useCallback(() => {
    cleanup();
    setProgress(100);
    timeoutRef.current = setTimeout(() => {
      setLoading(false);
      setProgress(0);
    }, 200);
  }, [cleanup]);

  // Navigation complete
  useEffect(() => {
    done();
  }, [pathname, searchParams, done]);

  // Intercept clicks on internal links
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href) return;
      if (
        href.startsWith("http") ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download")
      ) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const url = new URL(href, window.location.origin);
      const current = window.location.pathname + window.location.search;
      const next = url.pathname + url.search;
      if (next !== current) start();
    };

    document.addEventListener("click", handleClick, { capture: true });
    return () => {
      document.removeEventListener("click", handleClick, { capture: true });
      cleanup();
    };
  }, [start, cleanup]);

  if (!loading && progress === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-[3px] pointer-events-none">
      <div
        className="h-full transition-all duration-200 ease-out"
        style={{
          width: `${progress}%`,
          backgroundColor: "#da6c6c",
          boxShadow: "0 0 8px rgba(218, 108, 108, 0.6)",
          opacity: loading ? 1 : 0,
        }}
      />
    </div>
  );
}
