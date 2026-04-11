import { connectDB } from "@/lib/mongodb";
import Settings from "@/models/Settings";
export interface ThemeConfig {
  primary: string;
  bg: string;
  bgSecondary: string;
  text: string;
  textSecondary: string;
  heading: string;
  border: string;
  font: string;
  logo: string;
}

export interface InstanceConfig {
  name: string;
  domain: string;
  nsfw: boolean;
  adultDisclaimer: string;
  aboutText: string;
  locale: string;
  currency: string;
  theme: ThemeConfig;
  satsrail: {
    apiUrl: string;
  };
  googleAnalyticsId: string;
  googleSiteVerification: string;
  sentryDsn: string;
}

const DEFAULT_THEME: ThemeConfig = {
  primary: "#3b82f6",
  bg: "#0a0a0a",
  bgSecondary: "#18181b",
  text: "#ededed",
  textSecondary: "#a1a1aa",
  heading: "#fafafa",
  border: "#27272a",
  font: "Geist",
  logo: "",
};

// Synchronous fallback using env vars (used at build time and as defaults)
const config: InstanceConfig = {
  name: process.env.INSTANCE_NAME || "Media Platform",
  domain: process.env.INSTANCE_DOMAIN || "localhost:3000",
  nsfw: process.env.NSFW_ENABLED === "true",
  adultDisclaimer: "",
  aboutText: "",
  locale: "en",
  currency: "USD",
  theme: {
    ...DEFAULT_THEME,
    primary: process.env.THEME_PRIMARY || DEFAULT_THEME.primary,
    logo: process.env.LOGO_URL || DEFAULT_THEME.logo,
  },
  satsrail: {
    apiUrl: process.env.SATSRAIL_API_URL || "https://satsrail.com/api/v1",
  },
  googleAnalyticsId: process.env.GOOGLE_ANALYTICS_ID || "",
  googleSiteVerification: process.env.GOOGLE_SITE_VERIFICATION || "",
  sentryDsn: process.env.SENTRY_DSN || "",
};

export default config;

export { DEFAULT_THEME };

// Async version that reads from MongoDB on every request (no caching).
// All pages use force-dynamic, so fresh reads are expected.
export async function getInstanceConfig(): Promise<InstanceConfig> {
  try {
    await connectDB();
    const settings = await Settings.findOne({ setup_completed: true }).lean();
    if (settings) {
      return {
        name: settings.instance_name || config.name,
        domain: settings.instance_domain || config.domain,
        nsfw: settings.nsfw_enabled ?? config.nsfw,
        adultDisclaimer: settings.adult_disclaimer || "",
        aboutText: settings.about_text || "",
        locale: settings.merchant_locale || "en",
        currency: settings.merchant_currency || "USD",
        theme: {
          primary: settings.theme_primary || DEFAULT_THEME.primary,
          bg: settings.theme_bg || DEFAULT_THEME.bg,
          bgSecondary: settings.theme_bg_secondary || DEFAULT_THEME.bgSecondary,
          text: settings.theme_text || DEFAULT_THEME.text,
          textSecondary: settings.theme_text_secondary || DEFAULT_THEME.textSecondary,
          heading: settings.theme_heading || DEFAULT_THEME.heading,
          border: settings.theme_border || DEFAULT_THEME.border,
          font: settings.theme_font || DEFAULT_THEME.font,
          logo: settings.logo_image_id
            ? `/api/images/${settings.logo_image_id}`
            : settings.logo_url || DEFAULT_THEME.logo,
        },
        satsrail: {
          apiUrl: settings.satsrail_api_url || config.satsrail.apiUrl,
        },
        googleAnalyticsId: settings.google_analytics_id || config.googleAnalyticsId,
        googleSiteVerification: settings.google_site_verification || config.googleSiteVerification,
        sentryDsn: settings.sentry_dsn || config.sentryDsn,
      };
    }
  } catch {
    // Fall back to env vars if DB is unavailable
  }

  return config;
}

// No-op: caching was removed but callers still reference this.
 
export function clearConfigCache(): void { /* intentional no-op */ }
