import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * Admin model — used for team display and role assignment only.
 * Authentication is handled entirely by SatsRail (merchant team login).
 * The password_hash field is kept for backward compatibility with seed scripts
 * but is NOT used for login.
 */
export interface IAdmin extends Document {
  email: string;
  password_hash: string;
  name: string;
  role: "owner" | "admin" | "moderator";
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

const AdminSchema = new Schema<IAdmin>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password_hash: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      required: true,
      enum: ["owner", "admin", "moderator"],
      default: "admin",
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

const Admin: Model<IAdmin> =
  mongoose.models.Admin || mongoose.model<IAdmin>("Admin", AdminSchema);

export default Admin;
