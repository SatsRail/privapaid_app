import { redirect } from "next/navigation";
import { isSetupComplete } from "@/lib/setup";
import SetupWizard from "./SetupWizard";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Setup — PrivaPaid",
  robots: { index: false, follow: false },
};

export default async function SetupPage() {
  const complete = await isSetupComplete();
  if (complete) redirect("/");

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@300;400;500;600&display=swap"
        rel="stylesheet"
      />
      <style>{`
        .pp-setup-page {
          --pp-bg: #08080d;
          --pp-card: #111119;
          --pp-card-hover: #161622;
          --pp-accent: #c9506b;
          --pp-accent-light: #d4738a;
          --pp-accent-glow: rgba(201, 80, 107, 0.10);
          --pp-white: #ffffff;
          --pp-gray-100: #f0f0f5;
          --pp-gray-300: #b8b8c8;
          --pp-gray-500: #80809a;
          --pp-gray-700: #222233;
          --pp-green: #34d399;
          --pp-red: #f87171;
          --pp-font-display: 'Space Grotesk', sans-serif;
          --pp-font-body: 'Inter', sans-serif;
        }
      `}</style>
      <div className="pp-setup-page fixed inset-0 flex items-center justify-center overflow-y-auto"
        style={{
          background: `radial-gradient(ellipse 60% 50% at 50% 0%, rgba(201,80,107,0.06) 0%, transparent 70%), #08080d`,
          fontFamily: "'Inter', sans-serif",
        }}
      >
        {/* Subtle grid texture */}
        <div
          className="pointer-events-none fixed inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '64px 64px',
          }}
        />

        <div className="relative z-10 w-full max-w-lg px-6 py-16">
          <SetupWizard />
        </div>
      </div>
    </>
  );
}
