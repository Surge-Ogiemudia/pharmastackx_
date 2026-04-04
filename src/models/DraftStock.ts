import mongoose, { Schema, Document, model, models } from 'mongoose';

export interface IDraftStock extends Document {
  itemName: string;
  activeIngredient: string;
  category: string;
  amount: number;
  imageUrl: string;
  businessName: string;
  isPublished: boolean;
  POM: boolean;
  slug: string;
  info: string;
  coordinates: string;
  // You can add other fields that are specific to the draft process
  aiConfidenceScore?: number;
  originalRawData?: string; // Storing the original unprocessed data might be useful
}

const DraftStockSchema: Schema = new Schema({
  itemName: { type: String, required: true, trim: true },
  activeIngredient: { type: String, trim: true },
  category: { type: String, trim: true },
  amount: { type: Number, required: true },
  imageUrl: { type: String, default: '' },
  businessName: { type: String, required: true, trim: true },
  isPublished: { type: Boolean, default: false },
  POM: { type: Boolean, default: false },
  slug: { type: String, trim: true },
  info: { type: String, trim: true },
  coordinates: { type: String, trim: true },
  aiConfidenceScore: { type: Number },
  originalRawData: { type: String },
}, {
  timestamps: true, // Automatically add createdAt and updatedAt
});

// Create a unique compound index to prevent duplicate itemName within the same business
DraftStockSchema.index({ itemName: 1, businessName: 1 }, { unique: true });

export default models.DraftStock || model<IDraftStock>('DraftStock', DraftStockSchema);
