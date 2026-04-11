import mongoose, { Schema, Document, Model } from "mongoose";

export interface IWebhookEvent extends Document {
  event_id: string;
  event_type: string;
  processed_at: Date;
}

const WebhookEventSchema = new Schema<IWebhookEvent>({
  event_id: { type: String, required: true, unique: true, index: true },
  event_type: { type: String, required: true },
  processed_at: { type: Date, default: Date.now },
});

// Auto-expire after 7 days to prevent unbounded growth
WebhookEventSchema.index({ processed_at: 1 }, { expireAfterSeconds: 604800 });

const WebhookEvent: Model<IWebhookEvent> =
  mongoose.models.WebhookEvent ||
  mongoose.model<IWebhookEvent>("WebhookEvent", WebhookEventSchema);

export default WebhookEvent;
