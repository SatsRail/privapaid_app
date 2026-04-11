"use client";

import { useEffect, useRef } from "react";

interface HeartbeatManagerProps {
  productId: string;
  onExpired: () => void;
  onKeyRefreshed: (key: string) => void;
  onRemainingSeconds?: (seconds: number) => void;
  intervalMs?: number;
}

export default function HeartbeatManager({
  productId,
  onExpired,
  onKeyRefreshed,
  onRemainingSeconds,
  intervalMs = 30000,
}: HeartbeatManagerProps) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    async function heartbeat() {
      try {
        const res = await fetch("/api/macaroons", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ product_id: productId }),
        });

        if (!res.ok) {
          onExpired();
          return;
        }

        const data = await res.json();
        onKeyRefreshed(data.key);
        if (data.remaining_seconds != null) {
          onRemainingSeconds?.(data.remaining_seconds);
        }
      } catch {
        // Network error — don't expire, just skip this check
      }
    }

    // Fire initial heartbeat immediately, then on interval
    heartbeat();
    intervalRef.current = setInterval(heartbeat, intervalMs);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [productId, onExpired, onKeyRefreshed, onRemainingSeconds, intervalMs]);

  return null;
}
