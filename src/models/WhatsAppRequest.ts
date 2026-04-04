import mongoose, { Schema, Document } from 'mongoose';

export interface IWhatsAppRequest extends Document {
    source: string;
    groupId: string;
    groupName: string;
    rawText: string;
    medicines: Array<{
        name: string;
        strength?: string;
        form?: string;
        quantity?: number;
        unit?: string;
    }>;
    location?: string;
    urgency: 'normal' | 'urgent';
    status: 'open' | 'fulfilled' | 'expired';
    confidence: number;
    notifiedPharmacists: mongoose.Types.ObjectId[];
    createdAt: Date;
    expiresAt: Date;
}

const WhatsAppRequestSchema: Schema = new Schema({
    source: { type: String, default: 'whatsapp_group' },
    groupId: { type: String, required: true },
    groupName: { type: String, required: true },
    rawText: { type: String, required: true },
    medicines: [{
        name: { type: String, required: true },
        strength: String,
        form: String,
        quantity: Number,
        unit: String
    }],
    location: { type: String, default: 'National' },
    urgency: { type: String, enum: ['normal', 'urgent'], default: 'normal' },
    status: { type: String, enum: ['open', 'fulfilled', 'expired'], default: 'open' },
    confidence: { type: Number, default: 0 },
    notifiedPharmacists: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true }
}, {
    timestamps: true
});

// Index for expiring documents automatically
WhatsAppRequestSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
// Index for location-based searches
WhatsAppRequestSchema.index({ location: 1 });

export default mongoose.models.WhatsAppRequest || mongoose.model<IWhatsAppRequest>('WhatsAppRequest', WhatsAppRequestSchema);
