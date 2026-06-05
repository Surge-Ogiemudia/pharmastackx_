import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IHealthCalendarEvent extends Document {
  name:       string;   // "World Health Day"
  month:      number;   // 4 (April)
  day:        number;   // 7
  category:   string;   // links to MasterPrompt.category
  isActive:   boolean;
  createdBy:  mongoose.Types.ObjectId;
  createdAt:  Date;
}

const schema: Schema<IHealthCalendarEvent> = new mongoose.Schema({
  name:      { type: String, required: true },
  month:     { type: Number, required: true, min: 1, max: 12 },
  day:       { type: Number, required: true, min: 1, max: 31 },
  category:  { type: String, required: true },
  isActive:  { type: Boolean, default: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

const HealthCalendarEvent: Model<IHealthCalendarEvent> =
  mongoose.models.HealthCalendarEvent ||
  mongoose.model<IHealthCalendarEvent>('HealthCalendarEvent', schema, 'health_calendar_events');

export default HealthCalendarEvent;
