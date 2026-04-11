import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoisted mocks ──────────────────────────────────────────────────
const { mockSatsrail, mockCaptureException } = vi.hoisted(() => ({
  mockSatsrail: {
    getCheckoutQr: vi.fn(),
  },
  mockCaptureException: vi.fn(),
}));

vi.mock("@/lib/satsrail", () => ({
  satsrail: mockSatsrail,
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: mockCaptureException,
}));

import { GET } from "@/app/api/checkout/[token]/qr/route";

function buildRequest(token: string): [Request, { params: Promise<{ token: string }> }] {
  const req = new Request(`http://localhost:3000/api/checkout/${token}/qr`, {
    method: "GET",
  });
  return [req, { params: Promise.resolve({ token }) }];
}

describe("GET /api/checkout/[token]/qr", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns SVG content with correct headers", async () => {
    const svgContent = '<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>';
    mockSatsrail.getCheckoutQr.mockResolvedValue(svgContent);

    const [req, context] = buildRequest("sess_abc123");
    const res = await GET(req, context);

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/svg+xml");
    expect(res.headers.get("Cache-Control")).toBe("no-store");

    const body = await res.text();
    expect(body).toBe(svgContent);
    expect(mockSatsrail.getCheckoutQr).toHaveBeenCalledWith("sess_abc123");
  });

  it("passes token from URL params to satsrail", async () => {
    mockSatsrail.getCheckoutQr.mockResolvedValue("<svg></svg>");

    const [req, context] = buildRequest("sess_different_token");
    await GET(req, context);

    expect(mockSatsrail.getCheckoutQr).toHaveBeenCalledWith("sess_different_token");
  });

  it("returns 502 when satsrail throws", async () => {
    const error = new Error("Failed to fetch checkout QR: 500");
    mockSatsrail.getCheckoutQr.mockRejectedValue(error);

    const [req, context] = buildRequest("sess_bad");
    const res = await GET(req, context);
    const body = await res.json();

    expect(res.status).toBe(502);
    expect(body.error).toBe("Failed to fetch checkout QR");
  });

  it("captures exception in Sentry on failure", async () => {
    const error = new Error("Network failure");
    mockSatsrail.getCheckoutQr.mockRejectedValue(error);

    const [req, context] = buildRequest("sess_fail");
    await GET(req, context);

    expect(mockCaptureException).toHaveBeenCalledWith(error, {
      tags: { context: "checkout_qr_proxy" },
    });
  });
});
