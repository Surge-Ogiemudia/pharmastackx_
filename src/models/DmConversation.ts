import mongoose, { Schema } from 'mongoose';

const DmConversationSchema = new Schema({
  phone:     { type: String, required: true, index: true },
  step:      { type: String, enum: ['awaiting_state', 'awaiting_payment', 'complete'], default: 'awaiting_state' },
  requestId: { type: Schema.Types.ObjectId, ref: 'Request' },
  medicines: { type: Schema.Types.Mixed, default: [] },
  rawText:   { type: String },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 2 * 60 * 60 * 1000) }, // 2 hours
}, { timestamps: true });

DmConversationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.DmConversation ||
  mongoose.model('DmConversation', DmConversationSchema);
