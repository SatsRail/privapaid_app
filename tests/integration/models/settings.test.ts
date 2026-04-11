import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { setupTestDB, teardownTestDB, clearCollections } from "../../helpers/mongodb";
import { createSettings } from "../../helpers/factories";
import Settings from "@/models/Settings";

describe("Settings model", () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  afterEach(async () => {
    await clearCollections();
  });

  it("creates settings with required fields", async () => {
    const settings = await createSettings({ instance_name: "My Instance" });
    expect(settings.instance_name).toBe("My Instance");
    expect(settings.setup_completed).toBe(true);
  });

  it("sets theme defaults", async () => {
    const settings = await createSettings();
    expect(settings.theme_primary).toBe("#3b82f6");
    expect(settings.theme_bg).toBe("#0a0a0a");
    expect(settings.theme_bg_secondary).toBe("#18181b");
    expect(settings.theme_text).toBe("#ededed");
    expect(settings.theme_text_secondary).toBe("#a1a1aa");
    expect(settings.theme_heading).toBe("#fafafa");
    expect(settings.theme_border).toBe("#27272a");
    expect(settings.theme_font).toBe("Geist");
  });

  it("sets SatsRail defaults", async () => {
    const settings = await createSettings();
    expect(settings.satsrail_api_url).toBe("https://satsrail.com/api/v1");
    expect(settings.satsrail_api_key_encrypted).toBeNull();
    expect(settings.merchant_id).toBeNull();
    expect(settings.merchant_currency).toBe("USD");
    expect(settings.merchant_locale).toBe("en");
  });

  it("sets other defaults", async () => {
    const settings = await createSettings();
    expect(settings.nsfw_enabled).toBe(false);
    expect(settings.instance_domain).toBe("localhost:3000");
    expect(settings.logo_url).toBe("");
    expect(settings.about_text).toBe("");
    expect(settings.google_analytics_id).toBe("");
  });

  it("updates settings", async () => {
    const settings = await createSettings();
    settings.instance_name = "Updated Name";
    settings.theme_primary = "#ff5500";
    await settings.save();

    const found = await Settings.findById(settings._id);
    expect(found!.instance_name).toBe("Updated Name");
    expect(found!.theme_primary).toBe("#ff5500");
  });

  it("creates timestamps", async () => {
    const settings = await createSettings();
    expect(settings.created_at).toBeInstanceOf(Date);
    expect(settings.updated_at).toBeInstanceOf(Date);
  });
});
