import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPOSIntelligence extends Document {
  headerSignature: string; // A hash or comma-separated list of the CSV headers
  posName: string; // E.g. "Vend", "Square", or "Unknown"
  fileExtension: string; // e.g. "csv" or "xlsx"
  typicalFilePathPattern: string; // The common path this file is found in, capturing the sync nature
  mappingSchema: any; // The JSON object representing how columns map to Pharmastackx fields
  confidenceScore: number; 
  pharmacyIdsUsingThis: string[]; // Array of User IDs to track popularity
  successCount: number;
  failureCount: number;
  lastUsedAt: Date;
  createdAt: Date;
}

const POSIntelligenceSchema: Schema<IPOSIntelligence> = new Schema({
  headerSignature: { type: String, required: true, unique: true },
  posName: { type: String, default: 'Unknown POS' },
  fileExtension: { type: String, default: 'csv' },
  typicalFilePathPattern: { type: String, default: '' },
  mappingSchema: { type: Schema.Types.Mixed, required: true },
  confidenceScore: { type: Number, default: 1.0 },
  pharmacyIdsUsingThis: [{ type: String }],
  successCount: { type: Number, default: 1 },
  failureCount: { type: Number, default: 0 },
  lastUsedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

const POSIntelligence: Model<IPOSIntelligence> = mongoose.models.POSIntelligence || mongoose.model<IPOSIntelligence>('POSIntelligence', POSIntelligenceSchema);

export default POSIntelligence;
