import mongoose, { Schema, Document } from 'mongoose';

export interface INetworkLog extends Document {
  pharmacyId: string;
  timestamp: Date;
  method?: string;
  url?: string;
  requestPayload?: any;
  responseStatus?: number;
  responseSnippet?: string;
}

const NetworkLogSchema: Schema = new Schema({
  pharmacyId: { type: String, required: true, index: true },
  timestamp: { type: Date, default: Date.now },
  method: { type: String },
  url: { type: String },
  requestPayload: { type: Schema.Types.Mixed },
  responseStatus: { type: Number },
  responseSnippet: { type: String }
});

export default mongoose.models.NetworkLog || mongoose.model<INetworkLog>('NetworkLog', NetworkLogSchema);
