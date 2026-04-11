"use client";

import React from "react";
import { font as defaultFont, color as defaultColor, type AuthTheme } from "./theme";

export default function Logo({
  logoUrl,
  instanceName,
  theme,
}: {
  logoUrl: string;
  instanceName: string;
  theme?: AuthTheme;
}) {
  const c = theme?.color ?? defaultColor;
  const f = theme?.font ?? defaultFont;
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt={instanceName}
        style={{
          width: 48,
          height: 48,
          objectFit: "contain",
          margin: "0 auto 14px",
          borderRadius: 12,
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: 48,
        height: 48,
        margin: "0 auto 14px",
        borderRadius: 12,
        background: `linear-gradient(135deg, ${c.accent}, ${c.accentLight})`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 22,
        fontWeight: 700,
        color: c.white,
        fontFamily: f.display,
      }}
    >
      {instanceName.charAt(0)}
    </div>
  );
}
