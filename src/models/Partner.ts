import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPartner extends Document {
  name: string;
  slug: string;
  markupPercentage: number;
  logoUrl?: string;
  primaryColor?: string;
  tagline?: string;
  contactEmail?: string;
  contactPhone?: string;
  hideStockCount?: boolean;
  bankDetails?: {
    bankName: string;
    accountNumber: string;
    accountName: string;
  };
  curatedProductIds?: mongoose.Types.ObjectId[];
  curatedCatalog?: Array<{
    productId: mongoose.Types.ObjectId;
    imageUrl?: string;
    markup?: number;
  }>;
  productMarkups?: Map<string, number>;
  customProductImages?: Map<string, string>;
  allowedCategories?: string[];
  payoutBalance: number;
  isActive: boolean;
  apiKey?: string;
  passwordHash?: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PartnerSchema: Schema<IPartner> = new Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  markupPercentage: { type: Number, required: true, default: 18, min: 0, max: 100 },
  logoUrl: { type: String, default: '' },
  primaryColor: { type: String, default: '#E11D48' }, // Default vibrant rose/brand color
  tagline: { type: String, default: 'Your Healthcare & Wellness Partner' },
  contactEmail: { type: String, trim: true },
  contactPhone: { type: String, trim: true },
  hideStockCount: { type: Boolean, default: false },
  bankDetails: {
    bankName: { type: String, default: '' },
    accountNumber: { type: String, default: '' },
    accountName: { type: String, default: '' },
  },
  curatedProductIds: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
  curatedCatalog: [{
    productId: { type: Schema.Types.ObjectId, ref: 'Product' },
    imageUrl: { type: String, default: '' },
    markup: { type: Number },
  }],
  productMarkups: { type: Map, of: Number, default: {} },
  customProductImages: { type: Map, of: String, default: {} },
  allowedCategories: { type: [String], default: [] },
  payoutBalance: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  apiKey: { type: String, sparse: true },
  passwordHash: { type: String },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
}, { timestamps: true });

if (process.env.NODE_ENV === 'development') {
  delete (mongoose.models as any).Partner;
}

const Partner: Model<IPartner> = mongoose.models.Partner || mongoose.model<IPartner>('Partner', PartnerSchema);

export default Partner;
