
import mongoose, { Schema, Document } from 'mongoose';

export interface IUploadLog extends Document {
  fileName: string;
  fileType: string;
  downloadURL: string;
  uploadedAt: Date;
  businessName: string;
}

const UploadLogSchema: Schema = new Schema({
  fileName: { type: String, required: true },
  fileType: { type: String, required: true },
  downloadURL: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now },
  businessName: { type: String, required: true },
});

// Avoid model re-compilation
const UploadLog = mongoose.models.UploadLog || mongoose.model<IUploadLog>('UploadLog', UploadLogSchema);

export default UploadLog;
