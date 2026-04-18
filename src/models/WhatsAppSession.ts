import mongoose, { Schema } from 'mongoose';

const WhatsAppSessionSchema = new Schema({
    phone: { type: String, required: true },
    requestId: { type: Schema.Types.ObjectId, ref: 'Request', required: true },
    contactName: { type: String, required: true },
    requestState: { type: String },
    status: {
        type: String,
        enum: ['waiting', 'replied', 'expired'],
        default: 'waiting'
    },
    sentAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) } // 24h TTL
}, { timestamps: true });

// Index for fast lookup by phone when webhook fires
WhatsAppSessionSchema.index({ phone: 1, status: 1 });

export default mongoose.models.WhatsAppSession || mongoose.model('WhatsAppSession', WhatsAppSessionSchema);
