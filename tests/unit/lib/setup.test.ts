 

const mockConnectDB = vi.hoisted(() => vi.fn());
const mockSettingsFindOne = vi.hoisted(() => vi.fn());

vi.mock("@/lib/mongodb", () => ({
  connectDB: mockConnectDB,
}));

vi.mock("@/models/Settings", () => ({
  default: {
    findOne: mockSettingsFindOne,
  },
}));

import { describe, it, expect, vi, beforeEach } from "vitest";
import { isSetupComplete, clearSetupCache } from "@/lib/setup";

describe("setup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConnectDB.mockResolvedValue(undefined);
  });

  describe("isSetupComplete", () => {
    it("returns true when a settings document with setup_completed exists", async () => {
      mockSettingsFindOne.mockReturnValue({
        lean: vi.fn().mockResolvedValue({ setup_completed: true }),
      });

      const result = await isSetupComplete();

      expect(mockConnectDB).toHaveBeenCalled();
      expect(mockSettingsFindOne).toHaveBeenCalledWith({
        setup_completed: true,
      });
      expect(result).toBe(true);
    });

    it("returns false when no settings document matches", async () => {
      mockSettingsFindOne.mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      });

      const result = await isSetupComplete();

      expect(result).toBe(false);
    });

    it("returns false when lean returns undefined", async () => {
      mockSettingsFindOne.mockReturnValue({
        lean: vi.fn().mockResolvedValue(undefined),
      });

      const result = await isSetupComplete();

      expect(result).toBe(false);
    });

    it("calls connectDB before querying settings", async () => {
      const callOrder: string[] = [];
      mockConnectDB.mockImplementation(async () => {
        callOrder.push("connectDB");
      });
      mockSettingsFindOne.mockImplementation(() => {
        callOrder.push("findOne");
        return { lean: vi.fn().mockResolvedValue(null) };
      });

      await isSetupComplete();

      expect(callOrder).toEqual(["connectDB", "findOne"]);
    });
  });

  describe("clearSetupCache", () => {
    it("is a no-op function that does not throw", () => {
      expect(() => clearSetupCache()).not.toThrow();
    });

    it("returns undefined", () => {
      const result = clearSetupCache();
      expect(result).toBeUndefined();
    });
  });
});
