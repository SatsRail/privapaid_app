import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoisted mocks ──────────────────────────────────────────────────
const { mockSatsrail, mockCaptureException } = vi.hoisted(() => ({
  mockSatsrail: {
    getCheckoutStatus: vi.fn(),
  },
  mockCaptureException: vi.fn(),
}));

vi.mock("@/lib/satsrail", () => ({
  satsrail: mockSatsrail,
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: mockCaptureException,
}));

import { GET } from "@/app/api/checkout/[token]/status/route";

function buildRequest(token: string): [Request, { params: Promise<{ token: string }> }] {
  const req = new Request(`http://localhost:3000/api/checkout/${token}/status`, {
    method: "GET",
  });
  return [req, { params: Promise.resolve({ token }) }];
}

describe("GET /api/checkout/[token]/status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns checkout status as JSON", async () => {
    const statusData = { status: "paid", amount_sats: 1000, token: "sess_abc" };
    mockSatsrail.getCheckoutStatus.mockResolvedValue(statusData);

    const [req, context] = buildRequest("sess_abc");
    const res = await GET(req, context);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual(statusData);
    expect(mockSatsrail.getCheckoutStatus).toHaveBeenCalledWith("sess_abc");
  });

  it("passes token from URL params to satsrail", async () => {
    mockSatsrail.getCheckoutStatus.mockResolvedValue({ status: "pending" });

    const [req, context] = buildRequest("sess_xyz");
    await GET(req, context);

    expect(mockSatsrail.getCheckoutStatus).toHaveBeenCalledWith("sess_xyz");
  });

  it("returns 502 when satsrail throws", async () => {
    const error = new Error("Failed to fetch checkout status: 500");
    mockSatsrail.getCheckoutStatus.mockRejectedValue(error);

    const [req, context] = buildRequest("sess_bad");
    const res = await GET(req, context);
    const body = await res.json();

    expect(res.status).toBe(502);
    expect(body.error).toBe("Failed to fetch checkout status");
  });

  it("captures exception in Sentry on failure", async () => {
    const error = new Error("Network failure");
    mockSatsrail.getCheckoutStatus.mockRejectedValue(error);

    const [req, context] = buildRequest("sess_fail");
    await GET(req, context);

    expect(mockCaptureException).toHaveBeenCalledWith(error, {
      tags: { context: "checkout_status_proxy" },
    });
  });
});
