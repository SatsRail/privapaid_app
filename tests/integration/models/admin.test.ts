import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { setupTestDB, teardownTestDB, clearCollections } from "../../helpers/mongodb";
import Admin from "@/models/Admin";

describe("Admin model", () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  afterEach(async () => {
    await clearCollections();
  });

  it("creates an admin with required fields", async () => {
    const admin = await Admin.create({
      email: "admin@test.com",
      password_hash: "hashed_pw",
      name: "Test Admin",
    });
    expect(admin._id).toBeDefined();
    expect(admin.email).toBe("admin@test.com");
    expect(admin.name).toBe("Test Admin");
    expect(admin.password_hash).toBe("hashed_pw");
  });

  it("sets default values", async () => {
    const admin = await Admin.create({
      email: "defaults@test.com",
      password_hash: "hashed_pw",
      name: "Defaults Test",
    });
    expect(admin.role).toBe("admin");
    expect(admin.active).toBe(true);
  });

  it("creates timestamps", async () => {
    const admin = await Admin.create({
      email: "timestamps@test.com",
      password_hash: "hashed_pw",
      name: "Timestamp Test",
    });
    expect(admin.created_at).toBeInstanceOf(Date);
    expect(admin.updated_at).toBeInstanceOf(Date);
  });

  it("lowercases email", async () => {
    const admin = await Admin.create({
      email: "UPPER@TEST.COM",
      password_hash: "hashed_pw",
      name: "Upper Test",
    });
    expect(admin.email).toBe("upper@test.com");
  });

  it("trims email and name", async () => {
    const admin = await Admin.create({
      email: "  trimmed@test.com  ",
      password_hash: "hashed_pw",
      name: "  Trimmed Name  ",
    });
    expect(admin.email).toBe("trimmed@test.com");
    expect(admin.name).toBe("Trimmed Name");
  });

  it("enforces email uniqueness", async () => {
    await Admin.syncIndexes();
    await Admin.create({
      email: "unique@test.com",
      password_hash: "hashed_pw",
      name: "First",
    });
    await expect(
      Admin.create({
        email: "unique@test.com",
        password_hash: "hashed_pw",
        name: "Second",
      })
    ).rejects.toThrow();
  });

  it("validates role enum", async () => {
    await expect(
      Admin.create({
        email: "role@test.com",
        password_hash: "hashed_pw",
        name: "Role Test",
        role: "superuser",
      })
    ).rejects.toThrow();
  });

  it("accepts valid roles", async () => {
    const owner = await Admin.create({
      email: "owner@test.com",
      password_hash: "hashed_pw",
      name: "Owner",
      role: "owner",
    });
    const moderator = await Admin.create({
      email: "mod@test.com",
      password_hash: "hashed_pw",
      name: "Moderator",
      role: "moderator",
    });
    expect(owner.role).toBe("owner");
    expect(moderator.role).toBe("moderator");
  });

  it("queries active admins", async () => {
    await Admin.create({
      email: "active@test.com",
      password_hash: "hashed_pw",
      name: "Active",
      active: true,
    });
    await Admin.create({
      email: "inactive@test.com",
      password_hash: "hashed_pw",
      name: "Inactive",
      active: false,
    });
    const active = await Admin.find({ active: true });
    expect(active).toHaveLength(1);
    expect(active[0].email).toBe("active@test.com");
  });
});
