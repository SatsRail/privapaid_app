import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import mongoose from "mongoose";
import { NextRequest } from "next/server";
import { setupTestDB, teardownTestDB, clearCollections } from "../../helpers/mongodb";
import { mockSatsrailClient } from "../../helpers/mocks/satsrail";

// Mocks — MUST be before route imports
vi.mock("@/lib/rate-limit", () => ({ rateLimit: vi.fn().mockResolvedValue(null) }));
vi.mock("next/headers", () => ({ headers: vi.fn().mockResolvedValue(new Headers({ "x-forwarded-for": "1.2.3.4" })) }));
vi.mock("@/lib/mongodb", () => ({ connectDB: vi.fn().mockImplementation(async () => mongoose) }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn() }));
vi.mock("@/lib/auth-helpers", () => ({
  requireAdminApi: vi.fn().mockResolvedValue({ id: "admin-1", email: "admin@test.com", role: "owner" }),
  requireOwnerApi: vi.fn().mockResolvedValue({ id: "admin-1", email: "admin@test.com", role: "owner" }),
  requireCustomerApi: vi.fn().mockResolvedValue({ id: "customer-1", name: "testuser" }),
}));
vi.mock("@/lib/satsrail", () => ({ satsrail: mockSatsrailClient }));
vi.mock("@/lib/merchant-key", () => ({ getMerchantKey: vi.fn().mockResolvedValue("sk_test_key") }));

import { GET as listProducts, POST as createProduct } from "@/app/api/admin/products/route";
import { PATCH as updateProduct, DELETE as deleteProduct } from "@/app/api/admin/products/[id]/route";

function jsonRequest(url: string, method: string, body?: Record<string, unknown>): NextRequest {
  const init: { method: string; headers: Record<string, string>; body?: string } = { method, headers: { "Content-Type": "application/json" } };
  if (body) init.body = JSON.stringify(body);
  return new NextRequest(new URL(url, "http://localhost:3000"), init);
}

describe("Admin Products API", () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  afterEach(async () => {
    await clearCollections();
    vi.clearAllMocks();
  });

  describe("GET /api/admin/products", () => {
    it("lists products (filters out archived)", async () => {
      mockSatsrailClient.listProducts.mockResolvedValue({
        data: [
          { id: "prod_1", name: "Video Access", status: "active", price_cents: 500 },
          { id: "prod_2", name: "Old Product", status: "archived", price_cents: 300 },
          { id: "prod_3", name: "Channel Sub", status: "active", price_cents: 1000 },
        ],
        meta: { total: 3, page: 1, per_page: 25 },
      });

      jsonRequest("http://localhost:3000/api/admin/products", "GET");
      const res = await listProducts();
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data).toHaveLength(2);
      expect(body.data.map((p: { id: string }) => p.id)).toEqual(["prod_1", "prod_3"]);
    });

    it("returns 502 when SatsRail API fails", async () => {
      mockSatsrailClient.listProducts.mockRejectedValue(new Error("Connection refused"));

      const res = await listProducts();
      const body = await res.json();

      expect(res.status).toBe(502);
      expect(body.error).toBe("Connection refused");
    });
  });

  describe("POST /api/admin/products", () => {
    it("creates a product", async () => {
      mockSatsrailClient.createProduct.mockResolvedValue({
        id: "prod_new",
        name: "New Product",
        price_cents: 750,
        status: "active",
      });

      const req = jsonRequest("http://localhost:3000/api/admin/products", "POST", {
        name: "New Product",
        price_cents: 750,
        product_type_id: "pt_1",
      });
      const res = await createProduct(req);
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body.data.name).toBe("New Product");
      expect(body.data.price_cents).toBe(750);
    });

    it("returns 400 for invalid data (missing name)", async () => {
      const req = jsonRequest("http://localhost:3000/api/admin/products", "POST", {
        price_cents: 750,
        product_type_id: "pt_1",
      });
      const res = await createProduct(req);
      expect(res.status).toBe(400);
    });

    it("returns 400 for invalid data (negative price)", async () => {
      const req = jsonRequest("http://localhost:3000/api/admin/products", "POST", {
        name: "Bad Price",
        price_cents: -100,
        product_type_id: "pt_1",
      });
      const res = await createProduct(req);
      expect(res.status).toBe(400);
    });
  });

  describe("PATCH /api/admin/products/[id]", () => {
    it("updates a product", async () => {
      mockSatsrailClient.updateProduct.mockResolvedValue({
        id: "prod_1",
        name: "Updated Name",
        price_cents: 900,
        status: "active",
      });

      const req = jsonRequest("http://localhost:3000/api/admin/products/prod_1", "PATCH", {
        name: "Updated Name",
        price_cents: 900,
      });
      const res = await updateProduct(req, { params: Promise.resolve({ id: "prod_1" }) });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data.name).toBe("Updated Name");
      expect(mockSatsrailClient.updateProduct).toHaveBeenCalledWith(
        "sk_test_key",
        "prod_1",
        expect.objectContaining({ name: "Updated Name" })
      );
    });

    it("returns 502 when SatsRail API fails", async () => {
      mockSatsrailClient.updateProduct.mockRejectedValue(new Error("Not found"));

      const req = jsonRequest("http://localhost:3000/api/admin/products/prod_1", "PATCH", {
        name: "Nope",
      });
      const res = await updateProduct(req, { params: Promise.resolve({ id: "prod_1" }) });
      const body = await res.json();

      expect(res.status).toBe(502);
      expect(body.error).toBe("Not found");
    });
  });

  describe("DELETE /api/admin/products/[id]", () => {
    it("archives a product", async () => {
      mockSatsrailClient.deleteProduct.mockResolvedValue({ id: "prod_1", status: "archived" });

      const req = jsonRequest("http://localhost:3000/api/admin/products/prod_1", "DELETE");
      const res = await deleteProduct(req, { params: Promise.resolve({ id: "prod_1" }) });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(mockSatsrailClient.deleteProduct).toHaveBeenCalledWith("sk_test_key", "prod_1");
    });

    it("returns 502 when SatsRail API fails", async () => {
      mockSatsrailClient.deleteProduct.mockRejectedValue(new Error("Server error"));

      const req = jsonRequest("http://localhost:3000/api/admin/products/prod_1", "DELETE");
      const res = await deleteProduct(req, { params: Promise.resolve({ id: "prod_1" }) });
      const body = await res.json();

      expect(res.status).toBe(502);
      expect(body.error).toBe("Server error");
    });
  });
});
