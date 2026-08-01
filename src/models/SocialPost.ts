import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISocialPost extends Document {
  pharmacySlug: string;
  pillar: string;
  topic?: string;
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
  featuredProductIds?: mongoose.Types.ObjectId[];
  tokenCost: number;
  createdAt: Date;
}

const SocialPostSchema: Schema = new Schema<ISocialPost>(
  {
    pharmacySlug: { type: String, required: true, index: true },
    pillar: { type: String, required: true, default: 'auto' },
    topic: { type: String },
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
    featuredProductIds: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
    tokenCost: { type: Number, default: 1 }
  },
  { timestamps: true }
);

const SocialPost: Model<ISocialPost> =
  mongoose.models.SocialPost || mongoose.model<ISocialPost>('SocialPost', SocialPostSchema);

export default SocialPost;
