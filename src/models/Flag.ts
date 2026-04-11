import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IFlag extends Document {
  media_id: Types.ObjectId;
  customer_id: Types.ObjectId;
  flag_type: string;
  created_at: Date;
  updated_at: Date;
}

const FlagSchema = new Schema<IFlag>(
  {
    media_id: {
      type: Schema.Types.ObjectId,
      ref: "Media",
      required: true,
      index: true,
    },
    customer_id: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    flag_type: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

FlagSchema.index({ media_id: 1, customer_id: 1 }, { unique: true });
FlagSchema.index({ customer_id: 1 });

const Flag: Model<IFlag> =
  mongoose.models.Flag || mongoose.model<IFlag>("Flag", FlagSchema);

export default Flag;
