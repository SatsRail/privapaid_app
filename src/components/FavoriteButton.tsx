"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";

interface FavoriteButtonProps {
  channelId: string;
  initialFavorited: boolean;
}

export default function FavoriteButton({
  channelId,
  initialFavorited,
}: FavoriteButtonProps) {
  const { data: session } = useSession();
  const [favorited, setFavorited] = useState(initialFavorited);
  const [loading, setLoading] = useState(false);

  if (!session || session.user.role !== "customer") return null;

  async function toggle() {
    setLoading(true);
    try {
      const method = favorited ? "DELETE" : "POST";
      const res = await fetch("/api/customer/favorites", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel_id: channelId }),
      });
      if (res.ok) {
        setFavorited(!favorited);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm transition hover:bg-zinc-800 disabled:opacity-50"
      aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
    >
      {favorited ? "♥ Favorited" : "♡ Favorite"}
    </button>
  );
}
