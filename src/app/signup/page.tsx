import { getInstanceConfig } from "@/config/instance";
import SignupForm from "./SignupForm";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const { name } = await getInstanceConfig();
  return {
    title: `Sign up — ${name}`,
    robots: { index: false, follow: false },
  };
}

export default async function SignupPage() {
  const instanceConfig = await getInstanceConfig();

  return (
    <SignupForm
      instanceName={instanceConfig.name}
      logoUrl={instanceConfig.theme.logo}
      themeConfig={instanceConfig.theme}
    />
  );
}
