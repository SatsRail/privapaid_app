import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAuditLog extends Document {
  actor_id: string;
  actor_email: string;
  actor_type: "admin" | "customer" | "system";
  action: string;
  target_type: string;
  target_id: string;
  details: Record<string, unknown>;
  ip: string;
  user_agent: string;
  created_at: Date;
}

const AuditLogSchema = new Schema<IAuditLog>({
  actor_id: { type: String, required: true },
  actor_email: { type: String, default: "" },
  actor_type: { type: String, required: true, enum: ["admin", "customer", "system"] },
  action: { type: String, required: true },
  target_type: { type: String, default: "" },
  target_id: { type: String, default: "" },
  details: { type: Schema.Types.Mixed, default: {} },
  ip: { type: String, default: "" },
  user_agent: { type: String, default: "" },
  created_at: { type: Date, default: Date.now },
});

// Auto-expire after 90 days
AuditLogSchema.index({ created_at: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });
AuditLogSchema.index({ actor_id: 1, created_at: -1 });
AuditLogSchema.index({ action: 1, created_at: -1 });
AuditLogSchema.index({ target_type: 1, target_id: 1 });

const AuditLog: Model<IAuditLog> =
  mongoose.models.AuditLog ||
  mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);

export default AuditLog;
