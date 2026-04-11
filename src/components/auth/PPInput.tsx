"use client";

import React from "react";
import { font as defaultFont, color as defaultColor, type AuthTheme } from "./theme";

interface PPInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  helperText?: string;
  error?: string;
  theme?: AuthTheme;
}

export default function PPInput({
  label,
  helperText,
  error: inputError,
  theme,
  ...props
}: PPInputProps) {
  const c = theme?.color ?? defaultColor;
  const f = theme?.font ?? defaultFont;
  return (
    <div style={{ marginBottom: 20 }}>
      <label
        style={{
          display: "block",
          fontSize: 13,
          fontWeight: 500,
          color: c.gray300,
          marginBottom: 8,
          fontFamily: f.body,
          letterSpacing: "0.01em",
        }}
      >
        {label}
      </label>
      <input
        {...props}
        style={{
          width: "100%",
          padding: "14px 16px",
          fontSize: 14,
          fontFamily: f.body,
          fontWeight: 400,
          color: c.white,
          backgroundColor: c.bg,
          border: `1px solid ${inputError ? "rgba(248, 113, 113, 0.4)" : c.border}`,
          borderRadius: 12,
          outline: "none",
          transition: "border-color 0.25s, box-shadow 0.25s",
          boxSizing: "border-box" as const,
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = inputError
            ? "rgba(248, 113, 113, 0.6)"
            : c.accent;
          e.currentTarget.style.boxShadow = inputError
            ? "0 0 0 3px rgba(248, 113, 113, 0.08)"
            : `0 0 0 3px ${c.accentGlow}`;
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = inputError
            ? "rgba(248, 113, 113, 0.4)"
            : c.border;
          e.currentTarget.style.boxShadow = "none";
          props.onBlur?.(e);
        }}
      />
      {inputError && (
        <p
          style={{
            fontSize: 12,
            color: c.red,
            marginTop: 6,
            fontFamily: f.body,
            fontWeight: 500,
          }}
        >
          {inputError}
        </p>
      )}
      {helperText && !inputError && (
        <p
          style={{
            fontSize: 12,
            color: c.gray500,
            marginTop: 6,
            fontFamily: f.body,
          }}
        >
          {helperText}
        </p>
      )}
    </div>
  );
}
