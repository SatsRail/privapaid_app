import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IComment extends Document {
  media_id: Types.ObjectId;
  customer_id?: Types.ObjectId;
  nickname: string;
  body: string;
  created_at: Date;
  updated_at: Date;
}

const CommentSchema = new Schema<IComment>(
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
      index: true,
    },
    nickname: {
      type: String,
      required: true,
      trim: true,
      maxlength: 30,
    },
    body: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

CommentSchema.index({ media_id: 1, created_at: -1 });

const Comment: Model<IComment> =
  mongoose.models.Comment ||
  mongoose.model<IComment>("Comment", CommentSchema);

export default Comment;
