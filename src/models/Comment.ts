import mongoose, { Document, Schema, models } from 'mongoose';

export interface IComment extends Document {
  postId: mongoose.Types.ObjectId;
  postSlug: string;
  name: string;
  email?: string;
  content: string;
  approved: boolean;
  createdAt: Date;
}

const CommentSchema = new Schema<IComment>({
  postId: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
  postSlug: { type: String, required: true },
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, trim: true, lowercase: true },
  content: { type: String, required: true, trim: true, maxlength: 1000 },
  approved: { type: Boolean, default: false },
}, { timestamps: true });

CommentSchema.index({ postSlug: 1, approved: 1 });

export default models.Comment || mongoose.model<IComment>('Comment', CommentSchema);
