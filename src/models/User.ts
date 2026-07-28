
import mongoose, { Document, Model, Schema } from 'mongoose';

// The interface defines the shape of the data
export interface IUser extends Document {
  username: string;
  email: string;
  password?: string;
  role: 'admin' | 'customer' | 'pharmacy' | 'clinic' | 'vendor' | 'agent' | 'stockManager' | 'pharmacist' | 'store_manager' | 'store_keeper' | 'staff';
  businessName?: string;
  slug?: string;
  oldGuestSlug?: string;
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
  license?: string;
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
  brandKit?: {
    primaryColor?: string;
    secondaryColor?: string;
    tagline?: string;
    logoUrl?: string;
  };
  socialPhotos?: Array<{
    url: string;
    tag?: string;
    uploadedAt?: Date;
    description?: string;
  }>;
  hasSetupBrandKit?: boolean;
  webPushSubscription?: {
    endpoint: string;
    expirationTime?: number | null;
    keys: { p256dh: string; auth: string };
  };
  lastSyncTier?: number;
  lastSyncTime?: Date;
  encryptedWebPosData?: string;
  appVersion?: string;
  // Which terminal tabs (web + desktop) this pharmacy has chosen to show. Keyed by
  // module id (pos, emr, dispensary, orders, source, staff); a missing key means
  // "on" (default), so old accounts with no saved preferences still see everything.
  terminalModules?: {
    psxWeb?: boolean;
    pos?: boolean;
    emr?: boolean;
    dispensary?: boolean;
    orders?: boolean;
    source?: boolean;
    staff?: boolean;
  };
  synkkMeta?: {
    posMethod?: string;
    posName?: string;
    posDomain?: string;
    authStatus?: string;
    authLastChecked?: Date;
    extractionPath?: Array<{
      action?: string;
      url?: string;
      method?: string;
      selector?: string;
      label?: string;
      timestamp?: Date;
    }>;
    cloudSyncSchedule?: string;
    lastSyncResult?: string;
  };
}

// The schema defines the blueprint for the database
const userSchema: Schema<IUser> = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ['admin', 'customer', 'pharmacy', 'clinic', 'vendor', 'agent', 'stockManager', 'pharmacist', 'store_manager', 'store_keeper', 'staff'],
    required: true,
  },
  businessName: { type: String },
  slug: { type: String, unique: true, sparse: true },
  oldGuestSlug: { type: String },
  businessAddress: { type: String },
  state: { type: String },
  city: { type: String },
  phoneNumber: { type: String },
  profilePicture: { type: String },
  createdAt: { type: Date, default: Date.now },
  businessCoordinates: {
    latitude: { type: Number },
    longitude: { type: Number },
  },
  passwordResetToken: { type: String },
  passwordResetExpires: { type: Date },
  fcmTokens: { type: [String], default: [] },
  mobile: { type: String },
  stateOfPractice: { type: String },
  licenseNumber: { type: String },
  license: { type: String },
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
  brandKit: {
    primaryColor: { type: String, default: '#0F6E56' },
    secondaryColor: { type: String, default: '#C84B8F' },
    tagline: { type: String },
    logoUrl: { type: String },
  },
  socialPhotos: [{
    url: { type: String, required: true },
    tag: { type: String, enum: ['staff', 'store', 'product', 'event', 'other'], default: 'other' },
    uploadedAt: { type: Date, default: Date.now },
    description: { type: String }
  }],
  hasSetupBrandKit: { type: Boolean, default: false },
  webPushSubscription: {
    endpoint:       { type: String },
    expirationTime: { type: Number },
    keys: {
      p256dh: { type: String },
      auth:   { type: String },
    },
  },
  lastSyncTier: { type: Number },
  lastSyncTime: { type: Date },
  encryptedWebPosData: { type: String },
  appVersion: { type: String },
  terminalModules: {
    psxWeb: { type: Boolean },
    pos: { type: Boolean },
    emr: { type: Boolean },
    dispensary: { type: Boolean },
    orders: { type: Boolean },
    source: { type: Boolean },
    staff: { type: Boolean },
  },
  synkkMeta: {
    posMethod: { type: String },
    posName: { type: String },
    posDomain: { type: String },
    authStatus: { type: String, default: 'unchecked' },
    authLastChecked: { type: Date },
    extractionPath: [{
      action: { type: String },
      url: { type: String },
      method: { type: String },
      selector: { type: String },
      label: { type: String },
      timestamp: { type: Date }
    }],
    cloudSyncSchedule: { type: String, default: 'off' },
    lastSyncResult: { type: String },
  },
});

// This line creates the model
const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', userSchema, 'users');

export default User;
