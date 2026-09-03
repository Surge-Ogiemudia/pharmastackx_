import mongoose, { Schema, Document } from 'mongoose';

export interface IExtensionSearch extends Document {
  pharmacyId: string;
  terminalId?: string;
  query: string;
  resultCount: number;
  url?: string;
  timestamp: Date;
}

const ExtensionSearchSchema: Schema = new Schema({
  pharmacyId: { type: String, required: true, index: true },
  terminalId: { type: String },
  query: { type: String, required: true, index: true },
  resultCount: { type: Number, default: 0 },
  url: { type: String },
  timestamp: { type: Date, default: Date.now, index: true }
});

export default mongoose.models.ExtensionSearch || mongoose.model<IExtensionSearch>('ExtensionSearch', ExtensionSearchSchema);
