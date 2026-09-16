import mongoose, { Schema, Document, models, Model } from 'mongoose';

export interface IConciergeSession extends Document {
  orderId: mongoose.Types.ObjectId;
  status: 'finding' | 'assigned' | 'failed';
  topPharmacies: {
    pharmacyId: mongoose.Types.ObjectId;
    name: string;
    phone: string;
    address: string;
    distanceKm: number;
    lat: number;
    lng: number;
  }[];
  selectedPharmacyId?: mongoose.Types.ObjectId;
  assignedPhone?: string; // If overridden by admin
  createdAt: Date;
  updatedAt: Date;
}

const ConciergeSessionSchema = new Schema<IConciergeSession>({
  orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
  status: { type: String, enum: ['finding', 'assigned', 'failed'], default: 'finding' },
  topPharmacies: [{
    pharmacyId: { type: Schema.Types.ObjectId, ref: 'ConciergePharmacy' },
    name: String,
    phone: String,
    address: String,
    distanceKm: Number,
    lat: Number,
    lng: Number
  }],
  selectedPharmacyId: { type: Schema.Types.ObjectId, ref: 'ConciergePharmacy' },
  assignedPhone: String
}, { timestamps: true });

const ConciergeSession: Model<IConciergeSession> = 
  models.ConciergeSession || mongoose.model<IConciergeSession>('ConciergeSession', ConciergeSessionSchema);

export default ConciergeSession;
