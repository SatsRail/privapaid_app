import type { MetadataRoute } from "next";
import { getInstanceConfig } from "@/config/instance";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const { domain } = await getInstanceConfig();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/api/", "/setup/", "/login/", "/signup/"],
      },
    ],
    sitemap: `https://${domain}/sitemap.xml`,
  };
}
