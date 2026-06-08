import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IRejectedProduct extends Document {
  pharmacyId: mongoose.Types.ObjectId;
  pharmacySlug: string;
  businessName: string;
  itemName: string;
  category: string;
  amount: number;
  qty: number;
  reason: string;
  rejectionMethod: 'ai_classified' | 'database_match';
  createdAt: Date;
  updatedAt: Date;
}

const rejectedProductSchema: Schema<IRejectedProduct> = new mongoose.Schema({
  pharmacyId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  pharmacySlug: { type: String, required: true },
  businessName: { type: String, required: true },
  itemName: { type: String, required: true },
  category: { type: String, default: 'N/A' },
  amount: { type: Number, default: 0 },
  qty: { type: Number, default: 0 },
  reason: { type: String, required: true },
  rejectionMethod: { type: String, enum: ['ai_classified', 'database_match'], required: true }
}, { timestamps: true });

rejectedProductSchema.index({ pharmacyId: 1 });
rejectedProductSchema.index({ businessName: 1 });

const RejectedProduct: Model<IRejectedProduct> = mongoose.models.RejectedProduct || mongoose.model<IRejectedProduct>('RejectedProduct', rejectedProductSchema);
export default RejectedProduct;
