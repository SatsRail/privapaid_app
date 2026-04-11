"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { decryptBlob, verifyKeyFingerprint } from "@/lib/client-crypto";
import * as Sentry from "@sentry/nextjs";
import CheckoutOverlay from "@/components/CheckoutOverlay";
import ContentRenderer from "@/components/ContentRenderer";
import HeartbeatManager from "@/components/HeartbeatManager";
import CountdownTimer from "@/components/CountdownTimer";
import ExchangeModal from "@/components/ExchangeModal";
import { useLocale } from "@/i18n/useLocale";
import type { TranslatorFn } from "@/i18n";

interface Product {
  productId: string;
  encryptedBlob: string;
  keyFingerprint?: string;
  name?: string;
  priceCents?: number;
  currency?: string;
  accessDurationSeconds?: number;
  status?: string;
}

function formatPrice(cents: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

function formatDuration(seconds: number, t: TranslatorFn): string {
  if (seconds <= 0) return t("viewer.payment.lifetime");
  if (seconds < 3600) return t("viewer.payment.min", { n: Math.round(seconds / 60) });
  if (seconds < 86400) return t("viewer.payment.hr", { n: Math.round(seconds / 3600) });
  const days = Math.round(seconds / 86400);
  return t("viewer.payment.day", { n: days, count: days });
}

interface PaymentWallProps {
  mediaId: string;
  products: Product[];
  storedProductIds?: string[];
  thumbnailUrl?: string;
  mediaType: string;
  merchantLogo?: string;
  merchantName?: string;
}

/** Media types that should show artwork/thumbnail alongside the player */
const ARTWORK_TYPES = new Set(["audio", "podcast"]);

export default function PaymentWall({
  mediaId,
  products,
  storedProductIds,
  thumbnailUrl,
  mediaType,
  merchantLogo,
  merchantName,
}: PaymentWallProps) {
  const { data: session } = useSession();
  const { t, locale } = useLocale();
  const [decryptedBytes, setDecryptedBytes] = useState<Uint8Array | null>(null);
  const [checkoutToken, setCheckoutToken] = useState<string | null>(null);
  const [activeProductId, setActiveProductId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [exchangeModalOpen, setExchangeModalOpen] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const lastKeyRef = useRef<string | null>(null);

  // On mount: only verify products that the server confirmed have stored macaroons
  useEffect(() => {
    async function checkAccess() {
      // 1. Try stored macaroons — only for products the server found in the cookie
      const stored = storedProductIds ?? [];
      const candidateProducts = stored.length > 0
        ? products.filter((p) => stored.includes(p.productId))
        : [];

      for (const product of candidateProducts) {
        try {
          const res = await fetch("/api/macaroons", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ product_id: product.productId }),
          });

          if (!res.ok) continue;

          const data = await res.json();

          // Verify key authenticity before decryption
          const fingerprint = data.key_fingerprint || product.keyFingerprint;
          if (!(await verifyKeyFingerprint(data.key, fingerprint))) continue;

          // Valid macaroon — decrypt content
          const bytes = await decryptBlob(product.encryptedBlob, data.key, product.productId);
          lastKeyRef.current = data.key;
          setDecryptedBytes(bytes);
          setActiveProductId(product.productId);
          if (data.remaining_seconds != null) {
            setRemainingSeconds(data.remaining_seconds);
          }
          return;
        } catch {
          // Skip this product
        }
      }

      // 2. Fall back to direct unlock (also macaroon-gated server-side)
      try {
        const unlockRes = await fetch(`/api/media/${mediaId}/unlock`);
        if (unlockRes.ok) {
          const data = await unlockRes.json();
          const product = products.find((p) => p.encryptedBlob === data.encrypted_blob) || products[0];
          if (product) {
            const fingerprint = data.key_fingerprint || product.keyFingerprint;
            if (await verifyKeyFingerprint(data.key, fingerprint)) {
              const bytes = await decryptBlob(data.encrypted_blob, data.key, data.product_id);
              lastKeyRef.current = data.key;
              setDecryptedBytes(bytes);
              setActiveProductId(product.productId);
              if (data.remaining_seconds != null) {
                setRemainingSeconds(data.remaining_seconds);
              }
              return;
            }
          }
        }
      } catch (err) {
        // Direct unlock not available — show payment wall
        Sentry.captureException(err, { tags: { context: "PaymentWall.directUnlock" }, extra: { mediaId } });
      }
    }

    checkAccess();
  }, [mediaId, products, storedProductIds]);

  async function handleUnlock(productId: string) {
    setLoading(true);
    setError("");

    try {
      // Create checkout session via our API (server-side uses sk_live)
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          media_id: mediaId,
          product_id: productId,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error || t("viewer.payment.checkout_failed"));
        return;
      }

      setActiveProductId(productId);
      setCheckoutToken(json.token);
    } catch (err) {
      Sentry.captureException(err, { tags: { context: "PaymentWall.checkout" }, extra: { mediaId, productId } });
      setError(t("viewer.payment.error"));
    } finally {
      setLoading(false);
    }
  }

  const handleCheckoutComplete = useCallback(
    async (data: { key: string; macaroon: string }) => {
      if (!activeProductId) {
        setCheckoutToken(null);
        return;
      }

      // Store macaroon in httpOnly cookie via server — must complete before
      // HeartbeatManager's first tick, otherwise verify finds no cookie and
      // locks content immediately. Skip if the portal returned an empty token.
      if (data.macaroon) {
        try {
          await fetch("/api/macaroons", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              product_id: activeProductId,
              macaroon: data.macaroon,
            }),
          });
          // Notify sibling components (e.g. CommentSection) that access is now available
          window.dispatchEvent(new CustomEvent("privapaid:unlocked"));
        } catch (err) {
          console.error("Failed to store macaroon:", err);
        }
      } else {
        Sentry.captureMessage("Checkout completed with empty macaroon", {
          level: "warning",
          tags: { context: "PaymentWall.checkout" },
          extra: { mediaId, activeProductId, hasKey: !!data.key },
        });
      }

      // Record purchase if customer is logged in
      if (session?.user?.role === "customer") {
        fetch("/api/customer/purchases", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            order_id: "from_checkout",
            product_id: activeProductId,
          }),
        }).catch((err) => console.error("Failed to record purchase:", err));
      }

      // Verify key authenticity and decrypt content
      const product = products.find((p) => p.productId === activeProductId);
      if (!product) {
        setCheckoutToken(null);
        return;
      }

      // If the portal returned a key, try direct decryption
      if (data.key) {
        try {
          if (!(await verifyKeyFingerprint(data.key, product.keyFingerprint))) {
            setError("Key authenticity verification failed");
            setCheckoutToken(null);
            return;
          }
          const bytes = await decryptBlob(product.encryptedBlob, data.key, product.productId);
          lastKeyRef.current = data.key;
          setDecryptedBytes(bytes);
          setCheckoutToken(null);
          // Notify siblings (e.g. CommentSection) even without a stored macaroon
          window.dispatchEvent(new CustomEvent("privapaid:unlocked"));
          return;
        } catch (err) {
          Sentry.captureException(err, { tags: { context: "PaymentWall.decrypt" }, extra: { mediaId, activeProductId } });
        }
      }

      // Fallback: if direct decryption failed or key was empty, try
      // the server-side unlock endpoint (uses stored macaroon from cookie)
      try {
        const unlockRes = await fetch(`/api/media/${mediaId}/unlock`);
        if (unlockRes.ok) {
          const unlockData = await unlockRes.json();
          const fingerprint = unlockData.key_fingerprint || product.keyFingerprint;
          if (await verifyKeyFingerprint(unlockData.key, fingerprint)) {
            const bytes = await decryptBlob(unlockData.encrypted_blob, unlockData.key, unlockData.product_id);
            lastKeyRef.current = unlockData.key;
            setDecryptedBytes(bytes);
            setCheckoutToken(null);
            window.dispatchEvent(new CustomEvent("privapaid:unlocked"));
            return;
          }
        }
      } catch (err) {
        Sentry.captureException(err, { tags: { context: "PaymentWall.unlockFallback" }, extra: { mediaId, activeProductId } });
      }

      setError(t("viewer.payment.unlock_failed_retry"));
      setCheckoutToken(null);
    },
    [activeProductId, products, session, mediaId]
  );

  const handleExpired = useCallback(() => {
    lastKeyRef.current = null;
    setDecryptedBytes(null);
    setActiveProductId(null);
    setRemainingSeconds(null);
  }, []);

  const handleKeyRefreshed = useCallback(
    async (key: string) => {
      // Skip re-decryption if key hasn't changed — prevents iframe/video restart
      if (key === lastKeyRef.current) return;

      if (!activeProductId) return;
      const product = products.find((p) => p.productId === activeProductId);
      if (!product) return;

      try {
        if (!(await verifyKeyFingerprint(key, product.keyFingerprint))) return;
        const bytes = await decryptBlob(product.encryptedBlob, key, product.productId);
        lastKeyRef.current = key;
        setDecryptedBytes(bytes);
      } catch {
        // Key might have changed — content will re-render next heartbeat
      }
    },
    [activeProductId, products]
  );

  const handleRemainingSeconds = useCallback((seconds: number) => {
    setRemainingSeconds(seconds);
  }, []);

  // Determine if the active product is time-gated
  const activeProduct = activeProductId
    ? products.find((p) => p.productId === activeProductId)
    : null;
  const isTimeGated = activeProduct?.accessDurationSeconds != null;

  // Content is unlocked
  if (decryptedBytes) {
    return (
      <div className="mb-6">
        {isTimeGated && remainingSeconds != null && (
          <div className="mb-3">
            <CountdownTimer
              serverSeconds={remainingSeconds}
              onExpired={handleExpired}
            />
          </div>
        )}
        {ARTWORK_TYPES.has(mediaType) && thumbnailUrl && (
          <div className="mb-4 flex justify-center">
            <img
              src={thumbnailUrl}
              alt="Artwork"
              className="max-h-80 w-full max-w-sm rounded-lg object-cover"
            />
          </div>
        )}
        <ContentRenderer
          decryptedBytes={decryptedBytes}
          mediaType={mediaType}
        />
        {activeProductId && (
          <HeartbeatManager
            productId={activeProductId}
            onExpired={handleExpired}
            onKeyRefreshed={handleKeyRefreshed}
            onRemainingSeconds={handleRemainingSeconds}
          />
        )}
      </div>
    );
  }

  const productButtons = (
    <div className="flex flex-col items-center gap-3 w-full max-w-sm">
      <div className="flex items-center gap-2 mb-1">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-[#f7931a]">
          <path d="M23.638 14.904c-1.602 6.43-8.113 10.34-14.542 8.736C2.67 22.05-1.244 15.525.362 9.105 1.962 2.67 8.475-1.243 14.9.358c6.43 1.605 10.342 8.115 8.738 14.546z" />
          <path d="M17.204 10.676c.242-1.626-1.006-2.502-2.716-3.083l.555-2.22-1.356-.338-.54 2.16c-.356-.09-.722-.174-1.088-.258l.544-2.174-1.354-.338-.555 2.218c-.295-.067-.584-.133-.864-.203l.002-.007-1.87-.467-.36 1.448s1.006.23.985.245c.55.137.649.5.633.788l-.634 2.536c.038.01.087.024.141.045l-.143-.036-.888 3.556c-.067.167-.237.417-.622.322.014.02-.986-.246-.986-.246l-.674 1.553 1.764.44c.328.082.65.168.966.249l-.56 2.248 1.354.338.556-2.222c.37.1.728.192 1.08.279l-.554 2.213 1.356.338.56-2.244c2.3.433 4.03.258 4.757-1.812.585-1.667-.03-2.628-1.244-3.257.885-.204 1.55-.785 1.728-1.985zm-3.094 4.325c-.416 1.667-3.23.766-4.142.54l.74-2.958c.912.228 3.836.678 3.402 2.418zm.416-4.35c-.38 1.516-2.724.746-3.484.557l.67-2.683c.76.19 3.21.543 2.814 2.126z" fill="white" />
        </svg>
        <span className="text-lg font-semibold">{t("viewer.payment.unlock_with_bitcoin")}</span>
      </div>
      {products.map((product) => (
        <button
          key={product.productId}
          onClick={() => handleUnlock(product.productId)}
          disabled={loading}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800/80 px-4 py-3 text-left transition-colors hover:border-[var(--theme-primary)] hover:bg-zinc-800 disabled:opacity-50"
        >
          <div className="flex items-center justify-between">
            <span className="font-medium text-sm text-white">
              {product.name || t("viewer.payment.unlock_content")}
            </span>
            {product.priceCents != null && (
              <span className="font-semibold text-[var(--theme-primary)]">
                {formatPrice(product.priceCents, product.currency || "USD", locale)}
              </span>
            )}
          </div>
          {product.accessDurationSeconds != null && (
            <span className="text-xs text-zinc-400">
              {t("viewer.payment.duration_access", { duration: formatDuration(product.accessDurationSeconds, t) })}
            </span>
          )}
        </button>
      ))}
      <button
        onClick={() => setExchangeModalOpen(true)}
        className="mt-1 text-sm font-medium text-zinc-300 underline underline-offset-2 hover:text-[var(--theme-primary)]"
      >
        {t("viewer.exchange_guide.need_bitcoin")}
      </button>
    </div>
  );

  // Payment wall
  return (
    <div className="mb-6">
      <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
        {mediaType === "photo_set" ? (
          // Photo set: black canvas with centered buttons
          <div className="flex flex-col items-center justify-center bg-black px-4 py-12 min-h-[320px]">
            {productButtons}
          </div>
        ) : (
          <>
            {thumbnailUrl && (
              <div className="relative">
                <img
                  src={thumbnailUrl}
                  alt="Preview"
                  className="w-full opacity-40 blur-sm"
                />
                {/* Desktop only: overlay buttons on thumbnail */}
                <div className="absolute inset-0 hidden flex-col items-center justify-center bg-black/40 px-4 md:flex">
                  {productButtons}
                </div>
              </div>
            )}
            {/* Mobile: below thumbnail. No thumbnail: always visible. */}
            <div className={`flex flex-col items-center px-4 py-6 ${thumbnailUrl ? "md:hidden" : ""}`}>
              {productButtons}
            </div>
          </>
        )}
      </div>

      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}

      {checkoutToken && (() => {
        const activeProduct = products.find((p) => p.productId === activeProductId);
        return (
          <CheckoutOverlay
            checkoutToken={checkoutToken}
            merchantLogo={merchantLogo}
            merchantName={merchantName}
            priceCents={activeProduct?.priceCents}
            priceCurrency={activeProduct?.currency}
            onComplete={handleCheckoutComplete}
            onClose={() => setCheckoutToken(null)}
          />
        );
      })()}

      <ExchangeModal
        open={exchangeModalOpen}
        onClose={() => setExchangeModalOpen(false)}
      />
    </div>
  );
}
