import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IPurchase {
  satsrail_order_id: string;
  satsrail_product_id: string;
  purchased_at: Date;
}

export interface ICustomer extends Document {
  nickname: string;
  password_hash: string;
  profile_image_id: string;
  favorite_channel_ids: Types.ObjectId[];
  purchases: IPurchase[];
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

const PurchaseSchema = new Schema<IPurchase>(
  {
    satsrail_order_id: { type: String, required: true },
    satsrail_product_id: { type: String, required: true },
    purchased_at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const CustomerSchema = new Schema<ICustomer>(
  {
    nickname: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 2,
      maxlength: 30,
    },
    password_hash: {
      type: String,
      required: true,
    },
    profile_image_id: {
      type: String,
      default: "",
    },
    favorite_channel_ids: [
      {
        type: Schema.Types.ObjectId,
        ref: "Channel",
      },
    ],
    purchases: [PurchaseSchema],
    deleted_at: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

CustomerSchema.index(
  { nickname: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } }
);
CustomerSchema.index({ "purchases.satsrail_product_id": 1 });

const Customer: Model<ICustomer> =
  mongoose.models.Customer ||
  mongoose.model<ICustomer>("Customer", CustomerSchema);

export default Customer;
