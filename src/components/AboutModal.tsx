"use client";

import { useEffect, useRef } from "react";
import { useLocale } from "@/i18n/useLocale";

interface AboutModalProps {
  open: boolean;
  onClose: () => void;
  aboutText: string;
  instanceName: string;
}

export default function AboutModal({
  open,
  onClose,
  aboutText,
  instanceName,
}: AboutModalProps) {
  const { t } = useLocale();
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => {
        if (e.target === backdropRef.current) onClose();
      }}
    >
      <div
        className="w-full max-w-md rounded-xl border p-6 shadow-2xl"
        style={{
          backgroundColor: "var(--theme-bg-secondary)",
          borderColor: "var(--theme-border)",
        }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2
            className="text-lg font-semibold"
            style={{ color: "var(--theme-heading)" }}
          >
            {t("viewer.navbar.about")}
          </h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-[var(--theme-bg)]"
            style={{ color: "var(--theme-text-secondary)" }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <p
          className="mb-2 text-sm font-medium"
          style={{ color: "var(--theme-heading)" }}
        >
          {instanceName}
        </p>

        {aboutText ? (
          <p
            className="whitespace-pre-wrap text-sm leading-relaxed"
            style={{ color: "var(--theme-text)" }}
          >
            {aboutText}
          </p>
        ) : (
          <p
            className="text-sm italic"
            style={{ color: "var(--theme-text-secondary)" }}
          >
            —
          </p>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium transition-colors hover:bg-[var(--theme-bg)]"
            style={{ color: "var(--theme-text-secondary)" }}
          >
            {t("common.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
