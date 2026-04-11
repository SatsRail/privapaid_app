"use client";

import { useState, useCallback } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/i18n/useLocale";
import type { ThemeConfig } from "@/config/instance";
import { buildAuthTheme } from "@/components/auth/theme";
import PPInput from "@/components/auth/PPInput";
import PPButton from "@/components/auth/PPButton";
import AuthModal from "@/components/auth/AuthModal";
import ErrorPill from "@/components/auth/ErrorPill";
import Logo from "@/components/auth/Logo";

export default function SignupForm({
  instanceName,
  logoUrl,
  themeConfig,
}: {
  instanceName: string;
  logoUrl: string;
  themeConfig: ThemeConfig;
}) {
  const router = useRouter();
  const { t } = useLocale();

  const theme = buildAuthTheme(themeConfig);
  const cc = theme.color;
  const cf = theme.font;

  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nicknameStatus, setNicknameStatus] = useState<
    "idle" | "checking" | "available" | "taken"
  >("idle");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(
    null
  );

  const checkNickname = useCallback(async (value: string) => {
    if (value.length < 2) {
      setNicknameStatus("idle");
      return;
    }
    setNicknameStatus("checking");
    try {
      const res = await fetch(
        `/api/customer/check-nickname?nickname=${encodeURIComponent(value)}`
      );
      const json = await res.json();
      setNicknameStatus(json.available ? "available" : "taken");
    } catch {
      setNicknameStatus("idle");
    }
  }, []);

  function handleNicknameChange(value: string) {
    setNickname(value);
    if (debounceTimer) clearTimeout(debounceTimer);
    const timer = setTimeout(() => checkNickname(value), 400);
    setDebounceTimer(timer);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError(t("viewer.signup.passwords_mismatch"));
      return;
    }

    if (password.length < 6) {
      setError(t("viewer.signup.password_short"));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/customer/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname, password }),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error || t("viewer.signup.failed"));
        return;
      }

      const result = await signIn("customer", {
        nickname,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(t("viewer.signup.login_failed"));
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError(t("viewer.signup.error"));
    } finally {
      setLoading(false);
    }
  }

  const nicknameHelper =
    nicknameStatus === "checking"
      ? t("viewer.signup.nickname_checking")
      : nicknameStatus === "available"
        ? `✓ ${t("viewer.signup.nickname_available")}`
        : t("viewer.signup.nickname_hint");

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
          {t("viewer.signup.submit")}
        </h2>
        <p
          style={{
            fontSize: 13,
            color: cc.gray500,
            marginTop: 4,
          }}
        >
          {t("viewer.signup.nickname_hint")}
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <PPInput
          label={t("viewer.signup.nickname")}
          value={nickname}
          onChange={(e) => handleNicknameChange(e.target.value)}
          required
          minLength={2}
          maxLength={30}
          pattern="^[a-zA-Z0-9_]+$"
          autoComplete="username"
          helperText={nicknameHelper}
          error={
            nicknameStatus === "taken"
              ? t("viewer.signup.nickname_taken_error")
              : undefined
          }
          theme={theme}
        />
        <PPInput
          label={t("viewer.signup.password")}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          autoComplete="new-password"
          theme={theme}
        />
        <PPInput
          label={t("viewer.signup.confirm_password")}
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={6}
          autoComplete="new-password"
          theme={theme}
        />

        {error && <ErrorPill message={error} theme={theme} />}

        <PPButton
          type="submit"
          loading={loading}
          disabled={nicknameStatus === "taken"}
          theme={theme}
        >
          {t("viewer.signup.submit")}
        </PPButton>
      </form>

      {/* Login link */}
      <p
        style={{
          textAlign: "center",
          fontSize: 13,
          color: cc.gray500,
          marginTop: 20,
          fontFamily: cf.body,
        }}
      >
        {t("viewer.signup.has_account")}{" "}
        <a
          href="/login"
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
          {t("viewer.signup.login_link")}
        </a>
      </p>
    </AuthModal>
  );
}
