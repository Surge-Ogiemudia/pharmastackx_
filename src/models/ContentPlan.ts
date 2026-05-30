import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IContentPlan extends Document {
  pharmacyId: mongoose.Types.ObjectId;
  startDate: Date;
  endDate: Date;
  status: 'pending_approval' | 'active' | 'completed';
  schedule: Array<{
    date: Date;
    category: string;
    type: 'image' | 'video_idea';
    topic: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const contentPlanSchema: Schema<IContentPlan> = new mongoose.Schema({
  pharmacyId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  status: { type: String, enum: ['pending_approval', 'active', 'completed'], default: 'pending_approval' },
  schedule: [{
    date: { type: Date, required: true },
    category: { type: String, required: true },
    type: { type: String, enum: ['image', 'video_idea'], required: true },
    topic: { type: String, required: true },
  }],
}, { timestamps: true });

const ContentPlan: Model<IContentPlan> = mongoose.models.ContentPlan || mongoose.model<IContentPlan>('ContentPlan', contentPlanSchema, 'content_plans');

export default ContentPlan;
