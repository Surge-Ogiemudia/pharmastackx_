
import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IProduct extends Document {
  itemName: string;
  activeIngredient: string;
  category: string;
  amount: number;
  imageUrl: string;
  businessName: string;
  coordinates: string;
  info: string;
  POM: boolean;
  quantity?: number;
  manufacturer?: string;
  expiryDate?: Date;
  slug: string;
  isPublished: boolean;
  bulkUploadId?: mongoose.Types.ObjectId;
  itemNameVector?: number[];
  syncBatchId?: string;
  source?: 'manual' | 'synkk' | 'pos';
  posProductId?: string;
  enrichmentStatus?: string; 
  classificationMethod?: 'database_match' | 'ai_classified' | 'manual_override';
}

const productSchema: Schema<IProduct> = new mongoose.Schema({
  itemName: { type: String, required: true },
  itemNameVector: { type: [Number], required: false },
  activeIngredient: { type: String, required: false, default: 'N/A' },
  category: { type: String, required: false, default: 'N/A' },
  amount: { type: Number, required: false, default: 0 },
  imageUrl: { type: String, default: '' },
  businessName: { type: String, required: true },
  coordinates: { type: String, default: '' },
  info: { type: String, default: '' },
  POM: { type: Boolean, default: false },
  quantity: { type: Number, default: 0 },
  manufacturer: { type: String, default: '' },
  expiryDate: { type: Date, default: null },
  slug: { type: String, required: false },
  syncBatchId: { type: String, required: false },
  source: { type: String, enum: ['manual', 'synkk', 'pos'], default: 'manual' },
  posProductId: { type: String, required: false, index: true },
  isPublished: { type: Boolean, default: false },
  bulkUploadId: { type: mongoose.Schema.Types.ObjectId, ref: 'BulkUpload', default: null },
  // ** THE FIX IS HERE **
  // We are removing the enum and default to prevent Mongoose from stripping the field.
  // The API code is now solely responsible for setting this value.
  enrichmentStatus: { 
    type: String,
    required: false, 
  },
  classificationMethod: {
    type: String,
    enum: ['database_match', 'ai_classified', 'manual_override'],
    required: false
  }
}, { timestamps: true }); 

productSchema.index({ businessName: 1 });
productSchema.index({ enrichmentStatus: 1 });

const Product: Model<IProduct> = mongoose.models.Product || mongoose.model<IProduct>('Product', productSchema);
export default Product;
