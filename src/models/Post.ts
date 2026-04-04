import mongoose, { Document, Schema, models } from 'mongoose';

export interface IPost extends Document {
  title: string;
  content: string;
  category: string;
  slug: string;
  imageUrl?: string;
  youtubeUrl?: string;
  author: {
    name: string;
    id: string;
  };
  linkedPharmacy?: mongoose.Types.ObjectId;
  linkedProduct?: mongoose.Types.ObjectId;
  seoKeywords?: string[];
  status?: 'draft' | 'published';
  createdAt: Date;
  updatedAt: Date;
}

const PostSchema = new Schema<IPost>({
  title: {
    type: String,
    required: [true, 'Post title is required.'],
    trim: true,
  },
  content: {
    type: String,
    required: [true, 'Post content is required.'],
  },
  category: {
    type: String,
    required: [true, 'Post category is required.'],
    trim: true,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
  },
  imageUrl: {
    type: String,
    trim: true,
  },
  youtubeUrl: {
    type: String,
    trim: true,
  },
  author: {
    name: { type: String, required: true },
    id: { type: String, required: true },
  },
  linkedPharmacy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  linkedProduct: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
  },
  seoKeywords: [String],
  status: {
    type: String,
    enum: ['draft', 'published'],
    default: 'draft',
  },
}, { timestamps: true });

// Check if the model already exists before defining it
const Post = models.Post || mongoose.model<IPost>('Post', PostSchema);

export default Post;
