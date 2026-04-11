import { redirect } from "next/navigation";
import { isSetupComplete } from "@/lib/setup";
import { getInstanceConfig } from "@/config/instance";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const { name } = await getInstanceConfig();
  return {
    title: `Log in — ${name}`,
    robots: { index: false, follow: false },
  };
}

export default async function LoginPage() {
  const setupComplete = await isSetupComplete();
  if (!setupComplete) redirect("/setup");

  const instanceConfig = await getInstanceConfig();

  return (
    <LoginForm
      instanceName={instanceConfig.name}
      logoUrl={instanceConfig.theme.logo}
      themeConfig={instanceConfig.theme}
    />
  );
}
