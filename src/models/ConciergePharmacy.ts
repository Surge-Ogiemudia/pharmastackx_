import mongoose, { Schema, Document, models, Model } from 'mongoose';

export interface IConciergePharmacy extends Document {
  name: string;
  category: string;
  phone: string;
  preferredPickupPhone?: string;
  address: string;
  city: string;
  location: {
    type: 'Point';
    coordinates: number[]; // [longitude, latitude]
  };
  url?: string;
  isActive: boolean;
  createdAt: Date;
}

const ConciergePharmacySchema = new Schema<IConciergePharmacy>({
  name: { type: String, required: true },
  category: { type: String },
  phone: { type: String, required: true },
  preferredPickupPhone: { type: String },
  address: { type: String, required: true },
  city: { type: String, required: true, default: 'Lagos' },
  location: {
    type: { type: String, enum: ['Point'], required: true, default: 'Point' },
    coordinates: { type: [Number], required: true }, // [longitude, latitude]
  },
  url: { type: String },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

// 2dsphere index for geospatial queries
ConciergePharmacySchema.index({ location: '2dsphere' });

const ConciergePharmacy: Model<IConciergePharmacy> = 
  models.ConciergePharmacy || mongoose.model<IConciergePharmacy>('ConciergePharmacy', ConciergePharmacySchema);

export default ConciergePharmacy;
