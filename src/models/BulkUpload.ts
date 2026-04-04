import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBulkUpload extends Document {
  businessName: string;
  fileName: string;
  fileContent: string; // Store the raw CSV content
  status: 'processing' | 'completed' | 'failed';
  createdAt: Date;
}

const BulkUploadSchema: Schema = new Schema({
  businessName: { type: String, required: true },
  fileName: { type: String, required: true },
  fileContent: { type: String, required: true },
  status: { type: String, required: true, default: 'processing' },
  createdAt: { type: Date, default: Date.now }
});

const BulkUpload: Model<IBulkUpload> = mongoose.models.BulkUpload || mongoose.model<IBulkUpload>('BulkUpload', BulkUploadSchema);

export default BulkUpload;
