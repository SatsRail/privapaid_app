"use client";

import React from "react";
import { font as defaultFont, color as defaultColor, type AuthTheme } from "./theme";

export default function ErrorPill({ message, theme }: { message: string; theme?: AuthTheme }) {
  const c = theme?.color ?? defaultColor;
  const f = theme?.font ?? defaultFont;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 20,
        padding: "12px 16px",
        borderRadius: 12,
        background: "rgba(248, 113, 113, 0.06)",
        border: "1px solid rgba(248, 113, 113, 0.15)",
      }}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="8" fill={c.red} opacity="0.15" />
        <path
          d="M8 5v3.5M8 10.5v.5"
          stroke={c.red}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
      <span
        style={{
          fontSize: 13,
          color: c.red,
          fontFamily: f.body,
          fontWeight: 500,
        }}
      >
        {message}
      </span>
    </div>
  );
}
