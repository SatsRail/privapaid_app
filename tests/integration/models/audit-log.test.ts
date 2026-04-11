import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { setupTestDB, teardownTestDB, clearCollections } from "../../helpers/mongodb";
import AuditLog from "@/models/AuditLog";

describe("AuditLog model", () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  afterEach(async () => {
    await clearCollections();
  });

  it("creates an audit log with required fields", async () => {
    const log = await AuditLog.create({
      actor_id: "admin_123",
      actor_type: "admin",
      action: "media.create",
    });
    expect(log._id).toBeDefined();
    expect(log.actor_id).toBe("admin_123");
    expect(log.actor_type).toBe("admin");
    expect(log.action).toBe("media.create");
  });

  it("sets default values", async () => {
    const log = await AuditLog.create({
      actor_id: "system",
      actor_type: "system",
      action: "cleanup.run",
    });
    expect(log.actor_email).toBe("");
    expect(log.target_type).toBe("");
    expect(log.target_id).toBe("");
    expect(log.details).toEqual({});
    expect(log.ip).toBe("");
    expect(log.user_agent).toBe("");
    expect(log.created_at).toBeInstanceOf(Date);
  });

  it("validates actor_type enum", async () => {
    await expect(
      AuditLog.create({
        actor_id: "unknown",
        actor_type: "robot",
        action: "test",
      })
    ).rejects.toThrow();
  });

  it("accepts all valid actor types", async () => {
    const admin = await AuditLog.create({
      actor_id: "a1",
      actor_type: "admin",
      action: "test",
    });
    const customer = await AuditLog.create({
      actor_id: "c1",
      actor_type: "customer",
      action: "test",
    });
    const system = await AuditLog.create({
      actor_id: "s1",
      actor_type: "system",
      action: "test",
    });
    expect(admin.actor_type).toBe("admin");
    expect(customer.actor_type).toBe("customer");
    expect(system.actor_type).toBe("system");
  });

  it("stores details as mixed object", async () => {
    const log = await AuditLog.create({
      actor_id: "admin_1",
      actor_type: "admin",
      action: "settings.update",
      details: { field: "instance_name", old_value: "Old", new_value: "New" },
    });
    expect(log.details).toEqual({
      field: "instance_name",
      old_value: "Old",
      new_value: "New",
    });
  });

  it("stores IP and user agent", async () => {
    const log = await AuditLog.create({
      actor_id: "admin_1",
      actor_type: "admin",
      action: "login",
      ip: "192.168.1.1",
      user_agent: "Mozilla/5.0",
    });
    expect(log.ip).toBe("192.168.1.1");
    expect(log.user_agent).toBe("Mozilla/5.0");
  });

  it("queries by actor and action", async () => {
    await AuditLog.create({
      actor_id: "admin_1",
      actor_type: "admin",
      action: "media.create",
    });
    await AuditLog.create({
      actor_id: "admin_1",
      actor_type: "admin",
      action: "media.delete",
    });
    await AuditLog.create({
      actor_id: "admin_2",
      actor_type: "admin",
      action: "media.create",
    });

    const byActor = await AuditLog.find({ actor_id: "admin_1" });
    expect(byActor).toHaveLength(2);

    const byAction = await AuditLog.find({ action: "media.create" });
    expect(byAction).toHaveLength(2);
  });

  it("queries by target", async () => {
    await AuditLog.create({
      actor_id: "admin_1",
      actor_type: "admin",
      action: "media.update",
      target_type: "Media",
      target_id: "media_abc",
    });
    const results = await AuditLog.find({
      target_type: "Media",
      target_id: "media_abc",
    });
    expect(results).toHaveLength(1);
  });
});
