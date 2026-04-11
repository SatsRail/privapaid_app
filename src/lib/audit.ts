import AuditLog from "@/models/AuditLog";
import { headers } from "next/headers";

interface AuditEntry {
  actorId: string;
  actorEmail?: string;
  actorType: "admin" | "customer" | "system";
  action: string;
  targetType?: string;
  targetId?: string;
  details?: Record<string, unknown>;
}

/**
 * Write a structured audit log entry. Fire-and-forget — never throws.
 */
export async function audit(entry: AuditEntry): Promise<void> {
  try {
    const hdrs = await headers();
    const ip =
      hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      hdrs.get("x-real-ip") ||
      "";
    const userAgent = hdrs.get("user-agent") || "";

    await AuditLog.create({
      actor_id: entry.actorId,
      actor_email: entry.actorEmail || "",
      actor_type: entry.actorType,
      action: entry.action,
      target_type: entry.targetType || "",
      target_id: entry.targetId || "",
      details: entry.details || {},
      ip,
      user_agent: userAgent,
    });
  } catch (err) {
    console.error("Audit log write failed:", err);
  }
}
