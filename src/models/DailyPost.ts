import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IDailyPost extends Document {
  pharmacyId: mongoose.Types.ObjectId;
  scheduledDate: Date;
  type: 'image' | 'video_idea' | 'both';
  status: 'pending_generation' | 'pending_review' | 'flagged' | 'ready_to_post' | 'posted';
  caption?: string;
  hashtags?: string[];
  imageUrl?: string;
  videoIdeaText?: string;
  regenCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const dailyPostSchema: Schema<IDailyPost> = new mongoose.Schema({
  pharmacyId:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
  scheduledDate: { type: Date, required: true },
  type:          { type: String, enum: ['image', 'video_idea', 'both'], required: true },
  status: {
    type: String,
    enum: ['pending_generation', 'pending_review', 'flagged', 'ready_to_post', 'posted'],
    default: 'pending_generation',
  },
  caption:       { type: String },
  hashtags:      [{ type: String }],
  imageUrl:      { type: String },
  videoIdeaText: { type: String },
  regenCount:    { type: Number, default: 0 },
}, { timestamps: true });

const DailyPost: Model<IDailyPost> = mongoose.models.DailyPost || mongoose.model<IDailyPost>('DailyPost', dailyPostSchema, 'daily_posts');

export default DailyPost;
