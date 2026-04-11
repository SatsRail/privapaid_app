import { vi } from "vitest";

export const mockSatsrailClient = {
  createProduct: vi.fn(),
  getProduct: vi.fn(),
  listProducts: vi.fn(),
  updateProduct: vi.fn(),
  deleteProduct: vi.fn(),
  createOrder: vi.fn(),
  createCheckoutSession: vi.fn(),
  createSession: vi.fn(),
  getExchanges: vi.fn(),
  verifyAccess: vi.fn(),
  listProductTypes: vi.fn(),
  createProductType: vi.fn(),
  getMerchant: vi.fn(),
  listPayments: vi.fn(),
  getProductKey: vi.fn(),
  rotateProductKey: vi.fn(),
  clearOldKey: vi.fn(),
  getOrder: vi.fn(),
  getTokenUsage: vi.fn(),
};
