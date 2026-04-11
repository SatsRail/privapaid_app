import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface ISocialLinks {
  youtube?: string;
  twitter?: string;
  discord?: string;
  instagram?: string;
  tiktok?: string;
  website?: string;
}

export interface IChannel extends Document {
  ref: number;
  slug: string;
  satsrail_product_type_id: string | null;
  name: string;
  bio: string;
  category_id: Types.ObjectId;
  nsfw: boolean;
  social_links: ISocialLinks;
  profile_image_url: string;
  profile_image_id: string;
  is_live: boolean;
  stream_url: string;
  active: boolean;
  media_count: number;
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

const ChannelSchema = new Schema<IChannel>(
  {
    ref: {
      type: Number,
      unique: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    satsrail_product_type_id: {
      type: String,
      default: null,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    bio: {
      type: String,
      default: "",
    },
    category_id: {
      type: Schema.Types.ObjectId,
      ref: "Category",
    },
    nsfw: {
      type: Boolean,
      default: false,
    },
    social_links: {
      youtube: String,
      twitter: String,
      discord: String,
      instagram: String,
      tiktok: String,
      website: String,
    },
    profile_image_url: {
      type: String,
      default: "",
    },
    profile_image_id: {
      type: String,
      default: "",
    },
    is_live: {
      type: Boolean,
      default: false,
    },
    stream_url: {
      type: String,
      default: "",
    },
    active: {
      type: Boolean,
      default: true,
    },
    media_count: {
      type: Number,
      default: 0,
    },
    deleted_at: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

ChannelSchema.index({ slug: 1 }, { unique: true });
ChannelSchema.index({ category_id: 1 });
ChannelSchema.index({ active: 1 });
ChannelSchema.index({ created_at: -1 });

const Channel: Model<IChannel> =
  mongoose.models.Channel ||
  mongoose.model<IChannel>("Channel", ChannelSchema);

export default Channel;
