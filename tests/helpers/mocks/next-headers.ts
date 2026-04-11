import { vi } from "vitest";

export function createMockHeaders(values: Record<string, string> = {}) {
  const headerMap = new Headers(values);
  return vi.fn().mockResolvedValue(headerMap);
}
