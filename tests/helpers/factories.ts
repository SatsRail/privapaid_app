import Channel from "@/models/Channel";
import Customer from "@/models/Customer";
import Media from "@/models/Media";
import Category from "@/models/Category";
import Settings from "@/models/Settings";
import WebhookEvent from "@/models/WebhookEvent";
import bcrypt from "bcryptjs";

let refCounter = 1000;

export async function createCategory(overrides: Record<string, unknown> = {}) {
  return Category.create({
    name: "Test Category",
    slug: `test-category-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    position: 0,
    active: true,
    ...overrides,
  });
}

export async function createChannel(overrides: Record<string, unknown> = {}) {
  refCounter++;
  return Channel.create({
    ref: refCounter,
    name: "Test Channel",
    slug: `test-channel-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    bio: "A test channel",
    active: true,
    ...overrides,
  });
}

export async function createCustomer(
  overrides: Record<string, unknown> & { password?: string } = {}
) {
  const password = overrides.password || "TestPass123!@";
  const rest = { ...overrides };
  delete rest.password;
  return Customer.create({
    nickname: `user_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    password_hash: await bcrypt.hash(password, 4),
    ...rest,
  });
}

export async function createMedia(
  channelId: string,
  overrides: Record<string, unknown> = {}
) {
  refCounter++;
  return Media.create({
    ref: refCounter,
    channel_id: channelId,
    name: "Test Media",
    source_url: "https://example.com/video.mp4",
    media_type: "video",
    ...overrides,
  });
}

export async function createSettings(
  overrides: Record<string, unknown> = {}
) {
  return Settings.create({
    instance_name: "Test Instance",
    setup_completed: true,
    ...overrides,
  });
}

export async function createWebhookEvent(
  overrides: Record<string, unknown> = {}
) {
  return WebhookEvent.create({
    event_id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    event_type: "test.event",
    ...overrides,
  });
}
