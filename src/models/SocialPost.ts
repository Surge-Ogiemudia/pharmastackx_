import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISocialPost extends Document {
  pharmacySlug: string;
  pillar: 'wellness' | 'education' | 'pairs' | 'spotlight' | 'custom';
  title?: string;
  caption: string;
  imageUrls: string[];
  hashtags: string[];
  productLink?: string;
  featuredProducts?: Array<{
    name: string;
    price: number;
    image?: string;
  }>;
  tokenCost: number;
  createdAt: Date;
}

const SocialPostSchema: Schema = new Schema<ISocialPost>(
  {
    pharmacySlug: { type: String, required: true, index: true },
    pillar: { 
      type: String, 
      enum: ['wellness', 'education', 'pairs', 'spotlight', 'custom'],
      required: true 
    },
    title: { type: String },
    caption: { type: String, required: true },
    imageUrls: { type: [String], default: [] },
    hashtags: { type: [String], default: [] },
    productLink: { type: String },
    featuredProducts: [
      {
        name: { type: String },
        price: { type: Number },
        image: { type: String }
      }
    ],
    tokenCost: { type: Number, default: 1 }
  },
  { timestamps: true }
);

const SocialPost: Model<ISocialPost> =
  mongoose.models.SocialPost || mongoose.model<ISocialPost>('SocialPost', SocialPostSchema);

export default SocialPost;
