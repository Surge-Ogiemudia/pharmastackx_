import mongoose, { Schema, Document } from 'mongoose';

export interface IPMSCredential extends Document {
  pharmacyId: string;
  pmsName?: string;
  pmsUrl?: string;
  username?: string;
  password?: string;
  lastUpdated: Date;
}

const PMSCredentialSchema: Schema = new Schema({
  pharmacyId: { type: String, required: true, unique: true, index: true },
  pmsName: { type: String },
  pmsUrl: { type: String },
  username: { type: String },
  password: { type: String },
  lastUpdated: { type: Date, default: Date.now }
});

export default mongoose.models.PMSCredential || mongoose.model<IPMSCredential>('PMSCredential', PMSCredentialSchema);
