"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useLocale } from "@/i18n/useLocale";
import type { ThemeConfig } from "@/config/instance";
import { buildAuthTheme } from "@/components/auth/theme";
import PPInput from "@/components/auth/PPInput";
import PPButton from "@/components/auth/PPButton";
import AuthModal from "@/components/auth/AuthModal";
import ErrorPill from "@/components/auth/ErrorPill";
import Logo from "@/components/auth/Logo";

function LoginFormInner({
  instanceName,
  logoUrl,
  themeConfig,
}: {
  instanceName: string;
  logoUrl: string;
  themeConfig: ThemeConfig;
}) {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const { t } = useLocale();

  const theme = buildAuthTheme(themeConfig);
  const cc = theme.color;
  const cf = theme.font;

  const [identity, setIdentity] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function isEmail(value: string): boolean {
    return value.includes("@");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const loginAsAdmin = isEmail(identity);

    try {
      await signIn(loginAsAdmin ? "admin" : "customer", {
        redirect: false,
        ...(loginAsAdmin
          ? { email: identity, password }
          : { nickname: identity, password }),
      });

      // Check if session was created
      const sessionRes = await fetch("/api/auth/session");
      const session = await sessionRes.json();

      if (session?.user) {
        const dest =
          (session.user as { type?: string }).type === "admin"
            ? "/admin/channels"
            : callbackUrl;
        window.location.href = dest;
        return;
      }

      setError(t("viewer.login.invalid"));
    } catch {
      // Fallback: check session in case signIn threw but succeeded
      try {
        const sessionRes = await fetch("/api/auth/session");
        const session = await sessionRes.json();
        if (session?.user) {
          const dest =
            (session.user as { type?: string }).type === "admin"
              ? "/admin/channels"
              : callbackUrl;
          window.location.href = dest;
          return;
        }
      } catch { /* ignore */ }

      setError(t("viewer.login.invalid"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthModal theme={theme}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <Logo logoUrl={logoUrl} instanceName={instanceName} theme={theme} />
        <h2
          style={{
            fontFamily: cf.display,
            fontSize: 20,
            fontWeight: 700,
            color: cc.white,
            margin: 0,
            letterSpacing: "-0.01em",
          }}
        >
          {t("viewer.login.submit")}
        </h2>
        <p
          style={{
            fontSize: 13,
            color: cc.gray500,
            marginTop: 4,
          }}
        >
          {instanceName}
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <PPInput
          label={t("viewer.login.identity")}
          type="text"
          value={identity}
          onChange={(e) => setIdentity(e.target.value)}
          required
          autoComplete="username"
          theme={theme}
        />
        <PPInput
          label={t("viewer.login.password")}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          theme={theme}
        />
        {error && <ErrorPill message={error} theme={theme} />}
        <PPButton type="submit" loading={loading} theme={theme}>
          {t("viewer.login.submit")}
        </PPButton>
      </form>

      {/* Links */}
      <div
        style={{
          marginTop: 20,
          textAlign: "center",
          fontSize: 13,
          color: cc.gray500,
          fontFamily: cf.body,
        }}
      >
        <p>
          {t("viewer.login.no_account")}{" "}
          <a
            href="/signup"
            style={{
              color: cc.accent,
              textDecoration: "none",
              fontWeight: 500,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.textDecoration = "underline";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.textDecoration = "none";
            }}
          >
            {t("viewer.login.signup_link")}
          </a>
        </p>
      </div>
    </AuthModal>
  );
}

export default function LoginForm({
  instanceName,
  logoUrl,
  themeConfig,
}: {
  instanceName: string;
  logoUrl: string;
  themeConfig: ThemeConfig;
}) {
  return (
    <Suspense>
      <LoginFormInner instanceName={instanceName} logoUrl={logoUrl} themeConfig={themeConfig} />
    </Suspense>
  );
}
