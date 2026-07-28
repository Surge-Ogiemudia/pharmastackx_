import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ISynkkLog extends Document {
  pharmacySlug: string;
  pharmacyName?: string;
  syncId: string;
  timestamp: Date;
  duration?: number;
  trigger?: 'scheduled' | 'manual' | 'cloud_admin' | string;
  posMethod?: 'web' | 'local_db' | 'csv' | string;
  posIdentifier?: string;
  
  steps?: Array<{
    time?: Date;
    action?: string;
    detail?: string;
    success?: boolean;
  }>;
  
  networkLog?: Array<{
    url?: string;
    method?: string;
    status?: number;
    responseSize?: number;
    timestamp?: Date;
  }>;
  
  result?: 'success' | 'partial' | 'failed' | string;
  itemsExtracted?: number;
  itemsPushed?: number;
  errorCode?: string;
  errorMessage?: string;
  
  syncTier?: number;
  tierAttempts?: Array<{
    tier?: number;
    success?: boolean;
    error?: string;
  }>;
}

const synkkLogSchema: Schema<ISynkkLog> = new mongoose.Schema({
  pharmacySlug: { type: String, required: true, index: true },
  pharmacyName: { type: String },
  syncId: { type: String, required: true, unique: true },
  timestamp: { type: Date, default: Date.now },
  duration: { type: Number },
  trigger: { type: String },
  posMethod: { type: String },
  posIdentifier: { type: String },
  
  steps: [{
    time: { type: Date },
    action: { type: String },
    detail: { type: String },
    success: { type: Boolean }
  }],
  
  networkLog: [{
    url: { type: String },
    method: { type: String },
    status: { type: Number },
    responseSize: { type: Number },
    timestamp: { type: Date }
  }],
  
  result: { type: String },
  itemsExtracted: { type: Number },
  itemsPushed: { type: Number },
  errorCode: { type: String },
  errorMessage: { type: String },
  
  syncTier: { type: Number },
  tierAttempts: [{
    tier: { type: Number },
    success: { type: Boolean },
    error: { type: String }
  }]
});

synkkLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 60 * 24 * 60 * 60 });
synkkLogSchema.index({ pharmacySlug: 1, timestamp: -1 });

const SynkkLog: Model<ISynkkLog> = mongoose.models.SynkkLog || mongoose.model<ISynkkLog>('SynkkLog', synkkLogSchema, 'synkk_logs');

export default SynkkLog;
