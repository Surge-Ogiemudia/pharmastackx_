import mongoose, { Schema, Document, Model, models } from 'mongoose';

export interface IAnalyticsEvent extends Document {
  event: string;
  path: string;
  sessionId: string;
  ip?: string;
  country?: string;
  city?: string;
  device?: string;
  browser?: string;
  os?: string;
  referrer?: string;
  userId?: string;
  internal: boolean;
  createdAt: Date;
}

const AnalyticsEventSchema: Schema<IAnalyticsEvent> = new Schema({
  event:      { type: String, required: true, index: true },
  path:       { type: String, required: true, index: true },
  sessionId:  { type: String, required: true },
  ip:         { type: String },
  country:    { type: String },
  city:       { type: String },
  device:     { type: String },
  browser:    { type: String },
  os:         { type: String },
  referrer:   { type: String },
  userId:     { type: String },
  internal:   { type: Boolean, default: false, index: true },
}, { timestamps: { createdAt: true, updatedAt: false } });

// TTL index: auto-delete raw events after 90 days to keep collection lean
AnalyticsEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

const AnalyticsEvent: Model<IAnalyticsEvent> =
  models.AnalyticsEvent ||
  mongoose.model<IAnalyticsEvent>('AnalyticsEvent', AnalyticsEventSchema);

export default AnalyticsEvent;
