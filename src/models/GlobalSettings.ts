import mongoose, { Schema, Document } from 'mongoose';

export interface IGlobalSettings extends Document {
  isActivityCentreEnabled: boolean;
  updatedBy: mongoose.Types.ObjectId;
  updatedAt: Date;
}

const GlobalSettingsSchema: Schema = new Schema({
  isActivityCentreEnabled: { type: Boolean, default: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Ensure only one settings document exists
const GlobalSettings = mongoose.models.GlobalSettings || mongoose.model<IGlobalSettings>('GlobalSettings', GlobalSettingsSchema);

export default GlobalSettings;
