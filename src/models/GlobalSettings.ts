import mongoose, { Schema, Document } from 'mongoose';

export interface IGlobalSettings extends Document {
  isActivityCentreEnabled: boolean;
  isPulseModuleEnabled: boolean;
  disabledWhatsAppStates: string[];
  chromeWebStoreUrl?: string | null;
  updatedBy: mongoose.Types.ObjectId;
  updatedAt: Date;
}

const GlobalSettingsSchema: Schema = new Schema({
  isActivityCentreEnabled: { type: Boolean, default: true },
  isPulseModuleEnabled: { type: Boolean, default: true },
  disabledWhatsAppStates: { type: [String], default: [] },
  chromeWebStoreUrl: { type: String, default: null },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Ensure only one settings document exists
const GlobalSettings = mongoose.models.GlobalSettings || mongoose.model<IGlobalSettings>('GlobalSettings', GlobalSettingsSchema);

export default GlobalSettings;
