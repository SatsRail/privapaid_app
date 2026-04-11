import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IMediaProduct extends Document {
  media_id: Types.ObjectId;
  satsrail_product_id: string; // UUID from SatsRail
  encrypted_source_url: string; // AES-256-GCM blob
  key_fingerprint?: string; // SHA-256 of encryption key, hex-encoded
  // Cached product data (populated by Sync from SatsRail)
  product_name?: string;
  product_price_cents?: number;
  product_currency?: string;
  product_access_duration_seconds?: number;
  product_status?: string;
  product_slug?: string;
  synced_at?: Date;
  created_at: Date;
  updated_at: Date;
}

const MediaProductSchema = new Schema<IMediaProduct>(
  {
    media_id: {
      type: Schema.Types.ObjectId,
      ref: "Media",
      required: true,
      unique: true,
    },
    satsrail_product_id: {
      type: String,
      required: true,
      index: true,
    },
    encrypted_source_url: {
      type: String,
      required: true,
    },
    key_fingerprint: {
      type: String,
    },
    product_name: { type: String },
    product_price_cents: { type: Number },
    product_currency: { type: String },
    product_access_duration_seconds: { type: Number },
    product_status: { type: String, default: "active" },
    product_slug: { type: String },
    synced_at: { type: Date },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

MediaProductSchema.index({ satsrail_product_id: 1 });

const MediaProduct: Model<IMediaProduct> =
  mongoose.models.MediaProduct ||
  mongoose.model<IMediaProduct>("MediaProduct", MediaProductSchema);

export default MediaProduct;
