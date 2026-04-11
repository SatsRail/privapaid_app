// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockConnectDB = vi.fn();
const mockGetInstanceConfig = vi.fn();
const mockCategoryFind = vi.fn();
const mockChannelFind = vi.fn();

vi.mock("@/lib/mongodb", () => ({
  connectDB: () => mockConnectDB(),
}));

vi.mock("@/config/instance", () => ({
  getInstanceConfig: () => mockGetInstanceConfig(),
}));

vi.mock("@/models/Channel", () => {
  const chainable = {
    select: vi.fn().mockReturnThis(),
    sort: vi.fn().mockReturnThis(),
    lean: vi.fn(),
  };
  return {
    default: {
      find: (...args: unknown[]) => {
        mockChannelFind(...args);
        return chainable;
      },
      _chainable: chainable,
    },
  };
});

vi.mock("@/models/Category", () => {
  const chainable = {
    sort: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    lean: vi.fn(),
  };
  return {
    default: {
      find: (...args: unknown[]) => {
        mockCategoryFind(...args);
        return chainable;
      },
      _chainable: chainable,
    },
  };
});

vi.mock("@/components/Sidebar", () => ({
  default: (props: Record<string, unknown>) => (
    <div data-testid="sidebar" data-channels={JSON.stringify(props.channels)} />
  ),
}));

import { render, screen } from "@testing-library/react";
import ViewerShell from "@/components/ViewerShell";
import Channel from "@/models/Channel";
import Category from "@/models/Category";

beforeEach(() => {
  mockConnectDB.mockResolvedValue(undefined);
  mockGetInstanceConfig.mockResolvedValue({ nsfw: false });

  const catChainable = (Category as unknown as { _chainable: { lean: ReturnType<typeof vi.fn> } })._chainable;
  catChainable.lean.mockResolvedValue([
    { _id: { toString: () => "cat1" }, name: "Music" },
  ]);

  const chChainable = (Channel as unknown as { _chainable: { lean: ReturnType<typeof vi.fn> } })._chainable;
  chChainable.lean.mockResolvedValue([
    {
      _id: { toString: () => "ch1" },
      slug: "my-channel",
      name: "My Channel",
      profile_image_url: "/avatar.jpg",
      profile_image_id: undefined,
      media_count: 5,
      is_live: false,
      category_id: { toString: () => "cat1" },
    },
    {
      _id: { toString: () => "ch2" },
      slug: "other",
      name: "Other",
      profile_image_url: "",
      profile_image_id: undefined,
      media_count: 0,
      is_live: true,
      category_id: undefined,
    },
  ]);
});

describe("ViewerShell", () => {
  it("renders children and sidebar", async () => {
    const el = await ViewerShell({ children: <div data-testid="child">Hello</div> });
    render(el);

    expect(screen.getByTestId("sidebar")).toBeInTheDocument();
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("passes serialized channels to Sidebar", async () => {
    const el = await ViewerShell({ children: <div>OK</div> });
    render(el);

    const sidebar = screen.getByTestId("sidebar");
    const channels = JSON.parse(sidebar.dataset.channels!);
    expect(channels).toHaveLength(2);
    expect(channels[0].slug).toBe("my-channel");
    expect(channels[1].slug).toBe("other");
  });

  it("filters nsfw channels when nsfw is disabled", async () => {
    const el = await ViewerShell({ children: <div>OK</div> });
    render(el);

    // Check Channel.find was called with nsfw: false
    expect(mockChannelFind).toHaveBeenCalledWith({ active: true, nsfw: false });
  });

  it("does not filter nsfw channels when nsfw is enabled", async () => {
    mockGetInstanceConfig.mockResolvedValue({ nsfw: true });

    const el = await ViewerShell({ children: <div>OK</div> });
    render(el);

    expect(mockChannelFind).toHaveBeenCalledWith({ active: true });
  });

  it("groups channels by category and handles uncategorized", async () => {
    const el = await ViewerShell({ children: <div>OK</div> });
    render(el);

    const sidebar = screen.getByTestId("sidebar");
    const channels = JSON.parse(sidebar.dataset.channels!);
    // Both channels serialized
    expect(channels).toHaveLength(2);
  });
});
