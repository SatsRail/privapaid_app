"use client";

import React from "react";
import { font as defaultFont, color as defaultColor, type AuthTheme } from "./theme";

interface PPButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  theme?: AuthTheme;
}

export default function PPButton({
  children,
  loading,
  disabled,
  theme,
  ...props
}: PPButtonProps) {
  const c = theme?.color ?? defaultColor;
  const f = theme?.font ?? defaultFont;
  const isDisabled = disabled || loading;

  return (
    <button
      {...props}
      disabled={isDisabled}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: "14px 32px",
        fontSize: 14,
        fontWeight: 600,
        fontFamily: f.body,
        letterSpacing: "0.01em",
        color: c.white,
        background: c.accent,
        border: "none",
        borderRadius: 980,
        cursor: isDisabled ? "not-allowed" : "pointer",
        opacity: isDisabled ? 0.5 : 1,
        transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
      onMouseEnter={(e) => {
        if (!isDisabled) {
          e.currentTarget.style.background = c.accentLight;
          e.currentTarget.style.transform = "scale(1.02)";
          e.currentTarget.style.boxShadow = `0 4px 24px ${c.accentGlow}`;
        }
        props.onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = c.accent;
        e.currentTarget.style.transform = "scale(1)";
        e.currentTarget.style.boxShadow = "none";
        props.onMouseLeave?.(e);
      }}
      onMouseDown={(e) => {
        if (!isDisabled) e.currentTarget.style.transform = "scale(0.98)";
        props.onMouseDown?.(e);
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = "scale(1)";
        props.onMouseUp?.(e);
      }}
    >
      {loading && (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          style={{ animation: "spin 1s linear infinite" }}
        >
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="3"
            opacity="0.25"
          />
          <path
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            fill="currentColor"
            opacity="0.75"
          />
        </svg>
      )}
      {children}
    </button>
  );
}
