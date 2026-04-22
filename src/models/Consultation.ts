import mongoose from 'mongoose';

const consultationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
    index: true,
  },
  guestId: {
    type: String,
    required: false,
    index: true,
  },
  messages: [{
    sender: { type: String, enum: ['user', 'ai', 'pharmacist'], required: true },
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
  }],
  status: {
    type: String,
    enum: ['ai', 'pending_escalation', 'escalated', 'resolved'],
    default: 'ai',
    index: true,
  },
  aiMoveCount: {
    type: Number,
    default: 0,
  },
  lastEmailSentAt: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  }
}, { timestamps: true });

export default mongoose.models.Consultation || mongoose.model('Consultation', consultationSchema);
