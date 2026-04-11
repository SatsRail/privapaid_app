import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoisted mocks ──────────────────────────────────────────────────
const { mockConnectDB, mockSettingsFindOne, mockGetLogoBuffer, mockSharpResize, mockSharpPng, mockSharpToBuffer, mockSharpInstance } = vi.hoisted(() => {
  const _mockSharpResize = vi.fn();
  const _mockSharpPng = vi.fn();
  const _mockSharpToBuffer = vi.fn();
  const _mockSharpInstance = {
    resize: _mockSharpResize,
    png: _mockSharpPng,
    toBuffer: _mockSharpToBuffer,
  };
  _mockSharpResize.mockReturnValue(_mockSharpInstance);
  _mockSharpPng.mockReturnValue(_mockSharpInstance);
  return {
    mockConnectDB: vi.fn().mockResolvedValue(undefined),
    mockSettingsFindOne: vi.fn(),
    mockGetLogoBuffer: vi.fn(),
    mockSharpResize: _mockSharpResize,
    mockSharpPng: _mockSharpPng,
    mockSharpToBuffer: _mockSharpToBuffer,
    mockSharpInstance: _mockSharpInstance,
  };
});

vi.mock("@/lib/mongodb", () => ({
  connectDB: mockConnectDB,
}));

vi.mock("@/models/Settings", () => ({
  default: {
    findOne: mockSettingsFindOne,
  },
}));

vi.mock("@/lib/logo", () => ({
  getLogoBuffer: mockGetLogoBuffer,
}));

vi.mock("sharp", () => ({
  default: vi.fn().mockReturnValue(mockSharpInstance),
}));

import { GET } from "@/app/api/favicon/route";

function buildRequest(): Request {
  return new Request("http://localhost:3000/api/favicon", { method: "GET" });
}

describe("GET /api/favicon", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSharpResize.mockReturnValue(mockSharpInstance);
    mockSharpPng.mockReturnValue(mockSharpInstance);
  });

  it("returns PNG favicon when settings have logo_image_id", async () => {
    const faviconBuffer = Buffer.from("fake-png-data");
    mockSettingsFindOne.mockReturnValue({
      lean: vi.fn().mockResolvedValue({ setup_completed: true, logo_image_id: "abc123" }),
    });
    mockGetLogoBuffer.mockResolvedValue(Buffer.from("raw-logo"));
    mockSharpToBuffer.mockResolvedValue(faviconBuffer);

    const res = await GET(buildRequest());

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
    expect(res.headers.get("Cache-Control")).toContain("public");
  });

  it("returns PNG favicon when settings have logo_url", async () => {
    const faviconBuffer = Buffer.from("fake-png-data");
    mockSettingsFindOne.mockReturnValue({
      lean: vi.fn().mockResolvedValue({ setup_completed: true, logo_url: "https://example.com/logo.png" }),
    });
    mockGetLogoBuffer.mockResolvedValue(Buffer.from("raw-logo"));
    mockSharpToBuffer.mockResolvedValue(faviconBuffer);

    const res = await GET(buildRequest());

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
  });

  it("redirects to /favicon.ico when no logo settings exist", async () => {
    mockSettingsFindOne.mockReturnValue({
      lean: vi.fn().mockResolvedValue({ setup_completed: true }),
    });

    const res = await GET(buildRequest());

    expect(res.status).toBe(307);
    expect(res.headers.get("Location")).toContain("/favicon.ico");
  });

  it("redirects to /favicon.ico when settings is null", async () => {
    mockSettingsFindOne.mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    });

    const res = await GET(buildRequest());

    expect(res.status).toBe(307);
    expect(res.headers.get("Location")).toContain("/favicon.ico");
  });

  it("redirects to /favicon.ico when getLogoBuffer returns null", async () => {
    mockSettingsFindOne.mockReturnValue({
      lean: vi.fn().mockResolvedValue({ setup_completed: true, logo_image_id: "abc123" }),
    });
    mockGetLogoBuffer.mockResolvedValue(null);

    const res = await GET(buildRequest());

    expect(res.status).toBe(307);
    expect(res.headers.get("Location")).toContain("/favicon.ico");
  });

  it("redirects to /favicon.ico when sharp throws", async () => {
    mockSettingsFindOne.mockReturnValue({
      lean: vi.fn().mockResolvedValue({ setup_completed: true, logo_image_id: "abc123" }),
    });
    mockGetLogoBuffer.mockResolvedValue(Buffer.from("raw-logo"));
    mockSharpToBuffer.mockRejectedValue(new Error("Sharp processing failed"));

    const res = await GET(buildRequest());

    expect(res.status).toBe(307);
    expect(res.headers.get("Location")).toContain("/favicon.ico");
  });
});
