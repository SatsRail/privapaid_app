import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock connectDB
const mockConnection = { readyState: 1 };
vi.mock("@/lib/mongodb", () => ({
  connectDB: vi.fn().mockResolvedValue({ connection: mockConnection }),
}));

// Mock fetch for SatsRail health check
const originalFetch = global.fetch;

describe("GET /api/health", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 200 when all services are healthy", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true }) as unknown as typeof fetch;

    // Need to re-import to get fresh module with mocks
    const { GET } = await import("@/app/api/health/route");
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.mongo).toBe("connected");

    global.fetch = originalFetch;
  });
});
