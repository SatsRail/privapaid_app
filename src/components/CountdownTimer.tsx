"use client";

import { useState, useEffect, useRef } from "react";

interface CountdownTimerProps {
  serverSeconds: number;
  onExpired?: () => void;
}

function formatTime(totalSeconds: number): string {
  const d = Math.floor(totalSeconds / 86400);
  const h = Math.floor((totalSeconds % 86400) / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");

  if (d > 0) return `${d}d ${h}:${mm}:${ss}`;
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export default function CountdownTimer({
  serverSeconds,
  onExpired,
}: CountdownTimerProps) {
  const [displaySeconds, setDisplaySeconds] = useState(Math.max(0, Math.floor(serverSeconds)));
  const syncRef = useRef<{ serverSeconds: number; syncTime: number } | null>(null);
  const expiredRef = useRef(false);

  // Sync from server heartbeat + run 1s countdown
  useEffect(() => {
    const floored = Math.max(0, Math.floor(serverSeconds));
    syncRef.current = { serverSeconds: floored, syncTime: Date.now() };
    expiredRef.current = false;

    function tick() {
      if (!syncRef.current) return;
      const { serverSeconds: ss, syncTime } = syncRef.current;
      const elapsed = Math.floor((Date.now() - syncTime) / 1000);
      const remaining = Math.max(0, ss - elapsed);
      setDisplaySeconds(remaining);

      if (remaining === 0 && !expiredRef.current) {
        expiredRef.current = true;
        onExpired?.();
      }
    }

    // Snap display immediately
    tick();

    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [serverSeconds, onExpired]);

  const warning = displaySeconds <= 300 && displaySeconds > 60;
  const critical = displaySeconds <= 60;

  return (
    <div
      className={`
        inline-flex items-center gap-1.5 rounded-full px-3 py-1.5
        backdrop-blur-sm transition-colors duration-500
        ${critical
          ? "bg-red-500/20 border border-red-500/40 text-red-300"
          : warning
            ? "bg-yellow-500/20 border border-yellow-500/40 text-yellow-300"
            : "bg-zinc-800/80 border border-zinc-600/40 text-zinc-100"
        }
      `}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={critical ? "animate-pulse" : ""}
      >
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
      <span className="font-mono text-sm tabular-nums leading-none">
        {formatTime(displaySeconds)}
      </span>
    </div>
  );
}
