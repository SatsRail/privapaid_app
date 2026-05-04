"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import Button from "@/components/ui/Button";
import { useLocale } from "@/i18n/useLocale";

interface Comment {
  _id: string;
  body: string;
  created_at: string;
  customer: { nickname: string };
}

interface CommentSectionProps {
  mediaId: string;
  productIds: string[];
  storedProductIds?: string[];
}

const NICKNAME_KEY = "privapaid_nickname";

export default function CommentSection({
  mediaId,
  productIds,
  storedProductIds,
}: CommentSectionProps) {
  const { data: session } = useSession();
  const { t, locale } = useLocale();
  const { data: comments = [], mutate } = useSWR<Comment[]>(
    `/api/media/${mediaId}/comments`,
    fetcher
  );
  const [body, setBody] = useState("");
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasAccess, setHasAccess] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);

  const isCustomer = session?.user?.role === "customer";

  // Load saved nickname from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(NICKNAME_KEY);
      if (saved) setNickname(saved);
    } catch {
      // localStorage not available
    }
  }, []);

  // Verify macaroon access for any product — used on mount and after unlock
  async function verifyMacaroonAccess() {
    for (const productId of productIds) {
      try {
        const res = await fetch("/api/macaroons", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ product_id: productId }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.remaining_seconds > 0) {
            setHasAccess(true);
            setCheckingAccess(false);
            return;
          }
        }
      } catch {
        // Continue
      }
    }
    setCheckingAccess(false);
  }

  // Check access: server already knows which products have stored macaroons.
  // If any match, the user has paid — no verification round-trip needed.
  // Fall back to macaroon verification only for anonymous payers mid-checkout.
  useEffect(() => {
    if (productIds.length === 0) {
      setCheckingAccess(false);
      return;
    }

    // Short-circuit: server confirmed stored macaroons for these products
    if (storedProductIds && storedProductIds.length > 0) {
      setHasAccess(true);
      setCheckingAccess(false);
      return;
    }

    verifyMacaroonAccess();
  }, [productIds, storedProductIds]);

  // Listen for unlock events from PaymentWall so comments unlock without refresh.
  // Grant access directly — the event only fires after confirmed payment +
  // successful decryption, so no additional verification is needed.
  useEffect(() => {
    if (productIds.length === 0 || hasAccess) return;

    function handleUnlocked() {
      setHasAccess(true);
      setCheckingAccess(false);
    }

    window.addEventListener("privapaid:unlocked", handleUnlocked);
    return () => window.removeEventListener("privapaid:unlocked", handleUnlocked);
  }, [productIds, hasAccess]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;

    // Anonymous payers need a nickname
    if (!isCustomer && !nickname.trim()) {
      setError(t("viewer.comments.nickname_required"));
      return;
    }

    setLoading(true);
    setError("");

    try {
      const payload: { body: string; nickname?: string } = { body: body.trim() };
      if (nickname.trim()) {
        payload.nickname = nickname.trim();
      }

      const res = await fetch(`/api/media/${mediaId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        // Server says access is missing/expired even though we optimistically
        // showed the form based on the cookie. Revoke optimistic access so the
        // gating message replaces the form, and surface a clearer error.
        if (res.status === 401 || res.status === 402) {
          setHasAccess(false);
          setError(t("viewer.comments.access_unverified"));
          return;
        }
        setError(json.error || "Failed to post comment");
        return;
      }

      // Save nickname for future use
      if (nickname.trim()) {
        try {
          localStorage.setItem(NICKNAME_KEY, nickname.trim());
        } catch {
          // localStorage not available
        }
      }

      mutate([json, ...comments], false);
      setBody("");
    } catch {
      setError(t("viewer.comments.error"));
    } finally {
      setLoading(false);
    }
  }

  const canComment = isCustomer || hasAccess;

  return (
    <div className="mt-8 border-t border-zinc-800 pt-6">
      <h3 className="mb-4 text-lg font-semibold">
        {t("viewer.comments.title", { count: comments.length })}
      </h3>

      {checkingAccess ? null : canComment && productIds.length > 0 ? (
        <form onSubmit={handleSubmit} className="mb-6">
          {!isCustomer && (
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder={t("viewer.comments.nickname_placeholder")}
              maxLength={30}
              className="mb-2 block w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
            />
          )}
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t("viewer.comments.body_placeholder")}
            rows={3}
            maxLength={2000}
            className="block w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
          />
          {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
          <div className="mt-2 flex justify-end">
            <Button type="submit" size="sm" loading={loading}>
              {t("viewer.comments.post")}
            </Button>
          </div>
        </form>
      ) : productIds.length > 0 ? (
        <p className="mb-6 text-sm text-zinc-500">
          {t("viewer.comments.paywall_message")}
        </p>
      ) : null}

      {comments.length > 0 ? (
        <div className="space-y-4">
          {comments.map((c) => (
            <div
              key={c._id}
              className="rounded-lg border border-zinc-800 bg-zinc-900 p-4"
            >
              <div className="mb-1 flex items-center gap-2 text-sm">
                <span className="font-medium">{c.customer.nickname}</span>
                <span className="text-zinc-500">
                  {new Date(c.created_at).toLocaleDateString(locale, { timeZone: "UTC" })}
                </span>
              </div>
              <p className="text-sm text-zinc-300">{c.body}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-zinc-500">{t("viewer.comments.empty")}</p>
      )}
    </div>
  );
}
