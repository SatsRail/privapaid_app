"use client";

import React from "react";
import { color as defaultColor, type AuthTheme } from "./theme";

interface AuthModalProps {
  children: React.ReactNode;
  theme?: AuthTheme;
}

export default function AuthModal({ children, theme }: AuthModalProps) {
  const c = theme?.color ?? defaultColor;
  return (
    <>
      <style>{`
        @keyframes ppFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes ppSlideUp { from { opacity: 0; transform: translateY(24px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>

      {/* Backdrop */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.7)",
          backdropFilter: "blur(8px)",
          animation: "ppFadeIn 0.3s ease",
          zIndex: 50,
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 51,
          padding: "20px",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 420,
            background: c.card,
            borderRadius: 20,
            border: `1px solid ${c.border}`,
            padding: "36px 32px",
            animation: "ppSlideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
            maxHeight: "90vh",
            overflowY: "auto",
          }}
        >
          {children}
        </div>
      </div>
    </>
  );
}
