import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IEncryptedMediaEntry {
  media_id: Types.ObjectId;
  encrypted_source_url: string;
}

export interface IChannelProduct extends Document {
  channel_id: Types.ObjectId;
  satsrail_product_id: string; // UUID from SatsRail
  key_fingerprint?: string; // SHA-256 of encryption key, hex-encoded
  encrypted_media: IEncryptedMediaEntry[];
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

const EncryptedMediaEntrySchema = new Schema<IEncryptedMediaEntry>(
  {
    media_id: {
      type: Schema.Types.ObjectId,
      ref: "Media",
      required: true,
    },
    encrypted_source_url: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

const ChannelProductSchema = new Schema<IChannelProduct>(
  {
    channel_id: {
      type: Schema.Types.ObjectId,
      ref: "Channel",
      required: true,
      index: true,
    },
    satsrail_product_id: {
      type: String,
      required: true,
      unique: true,
    },
    key_fingerprint: {
      type: String,
    },
    encrypted_media: {
      type: [EncryptedMediaEntrySchema],
      default: [],
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

ChannelProductSchema.index({ satsrail_product_id: 1 });

const ChannelProduct: Model<IChannelProduct> =
  mongoose.models.ChannelProduct ||
  mongoose.model<IChannelProduct>("ChannelProduct", ChannelProductSchema);

export default ChannelProduct;
