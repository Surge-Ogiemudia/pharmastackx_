
import mongoose, { Document, Model, Schema } from 'mongoose';

// The name of the lock document. There will only ever be one.
export const LOCK_NAME = 'enrichment-process-lock';

export interface IEnrichmentLock extends Document {
  lockName: string;
  createdAt: Date;
}

const EnrichmentLockSchema: Schema = new Schema({
  lockName: {
    type: String,
    required: true,
    unique: true, // This is the core of the locking mechanism
    default: LOCK_NAME,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    // Failsafe: Automatically expire the lock after 15 minutes to prevent
    // the system from getting stuck if the server crashes mid-process.
    expires: '15m',
  },
});

// Ensure the model is not redefined
const EnrichmentLock: Model<IEnrichmentLock> = mongoose.models.EnrichmentLock || mongoose.model<IEnrichmentLock>('EnrichmentLock', EnrichmentLockSchema);

export default EnrichmentLock;
