import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IMasterPrompt extends Document {
  category: string;
  label: string;
  basePrompt: string;
  variations: string[];   // 10 auto-generated composition variants
  isActive:   boolean;
  isNewMonth?: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

const masterPromptSchema: Schema<IMasterPrompt> = new mongoose.Schema({
  category: { type: String, required: true },  // free-form theme name set by admin
  label:      { type: String, required: true },
  basePrompt: { type: String, required: true },
  variations: [{ type: String }],
  isActive:    { type: Boolean, default: true },
  isNewMonth:  { type: Boolean, default: false },  // use this prompt for new-month weeks
  createdBy:  { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

const MasterPrompt: Model<IMasterPrompt> =
  mongoose.models.MasterPrompt ||
  mongoose.model<IMasterPrompt>('MasterPrompt', masterPromptSchema, 'master_prompts');

export default MasterPrompt;
