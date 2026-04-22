import mongoose, { Schema } from 'mongoose';

const DmConversationSchema = new Schema({
  phone:     { type: String, required: true, index: true },
  step:      { type: String, enum: ['awaiting_state', 'complete'], default: 'awaiting_state' },
  medicines: { type: Schema.Types.Mixed, default: [] },
  rawText:   { type: String },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 60 * 60 * 1000) }, // 1 hour
}, { timestamps: true });

DmConversationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.DmConversation ||
  mongoose.model('DmConversation', DmConversationSchema);
