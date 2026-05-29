import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPayout extends Document {
  businessName: string;
  pharmacyName: string;
  pharmacistName: string;
  email: string;
  phone: string;
  amount: number;
  accountNumber: string;
  bankName: string;
  accountName: string;
  status: 'pending' | 'paid';
  createdAt: Date;
}

const PayoutSchema: Schema<IPayout> = new Schema({
  businessName:   { type: String, required: true },
  pharmacyName:   { type: String, required: true },
  pharmacistName: { type: String, default: '' },
  email:          { type: String, default: '' },
  phone:          { type: String, default: '' },
  amount:         { type: Number, required: true },
  accountNumber:  { type: String, required: true },
  bankName:       { type: String, required: true },
  accountName:    { type: String, required: true },
  status:         { type: String, enum: ['pending', 'paid'], default: 'pending' },
}, { timestamps: { createdAt: true, updatedAt: false } });

const Payout: Model<IPayout> = mongoose.models.Payout || mongoose.model<IPayout>('Payout', PayoutSchema);
export default Payout;
