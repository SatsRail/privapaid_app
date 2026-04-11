import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISettings extends Document {
  setup_completed: boolean;
  setup_completed_at: Date | null;
  instance_name: string;
  instance_domain: string;
  nsfw_enabled: boolean;
  adult_disclaimer: string;
  theme_primary: string;
  theme_bg: string;
  theme_bg_secondary: string;
  theme_text: string;
  theme_text_secondary: string;
  theme_heading: string;
  theme_border: string;
  theme_font: string;
  logo_url: string;
  logo_image_id: string;
  about_text: string;
  satsrail_api_url: string;
  satsrail_api_key_encrypted: string | null;
  merchant_id: string | null;
  merchant_name: string | null;
  merchant_currency: string;
  merchant_locale: string;
  google_analytics_id: string;
  google_site_verification: string;
  sentry_dsn: string;
  created_at: Date;
  updated_at: Date;
}

const SettingsSchema = new Schema<ISettings>(
  {
    setup_completed: {
      type: Boolean,
      default: false,
    },
    setup_completed_at: {
      type: Date,
      default: null,
    },
    instance_name: {
      type: String,
      required: true,
      trim: true,
    },
    instance_domain: {
      type: String,
      default: "localhost:3000",
      trim: true,
    },
    nsfw_enabled: {
      type: Boolean,
      default: false,
    },
    adult_disclaimer: {
      type: String,
      default: "",
      trim: true,
    },
    theme_primary: {
      type: String,
      default: "#3b82f6",
    },
    theme_bg: {
      type: String,
      default: "#0a0a0a",
    },
    theme_bg_secondary: {
      type: String,
      default: "#18181b",
    },
    theme_text: {
      type: String,
      default: "#ededed",
    },
    theme_text_secondary: {
      type: String,
      default: "#a1a1aa",
    },
    theme_heading: {
      type: String,
      default: "#fafafa",
    },
    theme_border: {
      type: String,
      default: "#27272a",
    },
    theme_font: {
      type: String,
      default: "Geist",
    },
    logo_url: {
      type: String,
      default: "",
    },
    logo_image_id: {
      type: String,
      default: "",
    },
    about_text: {
      type: String,
      default: "",
      trim: true,
    },
    satsrail_api_url: {
      type: String,
      default: "https://satsrail.com/api/v1",
    },
    satsrail_api_key_encrypted: {
      type: String,
      default: null,
    },
    merchant_id: {
      type: String,
      default: null,
    },
    merchant_name: {
      type: String,
      default: null,
    },
    merchant_currency: {
      type: String,
      default: "USD",
    },
    merchant_locale: {
      type: String,
      default: "en",
    },
    google_analytics_id: {
      type: String,
      default: "",
      trim: true,
    },
    google_site_verification: {
      type: String,
      default: "",
      trim: true,
    },
    sentry_dsn: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

const Settings: Model<ISettings> =
  mongoose.models.Settings ||
  mongoose.model<ISettings>("Settings", SettingsSchema);

export default Settings;
