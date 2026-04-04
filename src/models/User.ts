
import mongoose, { Document, Model, Schema } from 'mongoose';

// The interface defines the shape of the data
export interface IUser extends Document {
  username: string;
  email: string;
  password?: string;
  role: 'admin' | 'customer' | 'pharmacy' | 'clinic' | 'vendor' | 'agent' | 'stockManager' | 'pharmacist';
  businessName?: string;
  slug?: string;
  businessAddress?: string;
  state?: string;
  city?: string;
  phoneNumber?: string;
  createdAt: Date;
  businessCoordinates?: {
    latitude?: number;
    longitude?: number;
  };
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  fcmTokens?: string[];
  mobile?: string;
  stateOfPractice?: string;
  licenseNumber?: string;
  pharmacy?: string;
  emailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationTokenExpires?: Date;
  professionalVerificationStatus: 'not_started' | 'pending_review' | 'approved' | 'rejected';
  verificationDocuments: string[];
  subscriptionStatus: 'subscribed' | 'unsubscribed';
  subscriptionExpiry?: Date;
  orderCount: number;
  canManageStore?: boolean;
  isStorePublished?: boolean;
  isPWA?: boolean;
  profilePicture?: string;
  reputationScore?: number;
  earnings?: number;
  xp?: number;
  learningStreak?: number;
  lastLearningDate?: Date;
}

// The schema defines the blueprint for the database
const userSchema: Schema<IUser> = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ['admin', 'customer', 'pharmacy', 'clinic', 'vendor', 'agent', 'stockManager', 'pharmacist'],
    required: true,
  },
  businessName: { type: String },
  slug: { type: String, unique: true, sparse: true },
  businessAddress: { type: String },
  state: { type: String },
  city: { type: String },
  phoneNumber: { type: String },
  profilePicture: { type: String },
  createdAt: { type: Date, default: Date.now },
  businessCoordinates: {
    type: {
      latitude: { type: Number },
      longitude: { type: Number },
    },
    required: false,
    _id: false 
  },
  passwordResetToken: { type: String },
  passwordResetExpires: { type: Date },
  fcmTokens: { type: [String], default: [] },
  mobile: { type: String },
  stateOfPractice: { type: String },
  licenseNumber: { type: String },
  pharmacy: { type: String },
  emailVerified: { type: Boolean, default: false },
  emailVerificationToken: { type: String },
  emailVerificationTokenExpires: { type: Date },
  professionalVerificationStatus: {
    type: String,
    enum: ['not_started', 'pending_review', 'approved', 'rejected'],
    default: 'not_started',
  },
  verificationDocuments: { type: [String], default: [] },
  subscriptionStatus: { type: String, enum: ['subscribed', 'unsubscribed'], default: 'unsubscribed' },
  subscriptionExpiry: { type: Date },
  orderCount: { type: Number, default: 0 },
  canManageStore: { type: Boolean, default: false },
  isStorePublished: { type: Boolean, default: false },
  isPWA: { type: Boolean, default: false },
  reputationScore: { type: Number, default: 0 },
  earnings: { type: Number, default: 0 },
  xp: { type: Number, default: 0 },
  learningStreak: { type: Number, default: 0 },
  lastLearningDate: { type: Date },
});

// This line creates the model
const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', userSchema, 'users');

export default User;
