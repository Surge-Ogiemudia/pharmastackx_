import mongoose, { Schema, Document } from 'mongoose';

export interface ISyncRequest extends Document {
  pharmacyId: string;
  requested: boolean;
  requestedAt?: Date;
  completedAt?: Date;
}

const SyncRequestSchema: Schema = new Schema({
  pharmacyId: { type: String, required: true, unique: true, index: true },
  requested: { type: Boolean, default: false },
  requestedAt: { type: Date },
  completedAt: { type: Date }
});

export default mongoose.models.SyncRequest || mongoose.model<ISyncRequest>('SyncRequest', SyncRequestSchema);
