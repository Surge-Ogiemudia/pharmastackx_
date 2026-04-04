import mongoose, { Schema, Document, models, Model } from 'mongoose';

// This interface describes the structure of a single log document
export interface ILog extends Document {
  timestamp: Date;
  actor: { // The user who performed the action
    id: string; 
    name: string; // User's businessName or email
  };
  action: string; // A short code for the action, e.g., 'CREATE_ITEM', 'PUBLISH_ITEM'
  target?: { // The optional entity that was affected
    type: string; // e.g., 'Product', 'User', 'Order'
    id?: string;
    name?: string; // e.g., Item Name or the User's Business Name being acted upon
  };
  status: 'SUCCESS' | 'FAILURE' | 'INFO' | 'PARTIAL'; // The outcome of the action
  details?: string; // A human-readable sentence with more context
}

// This is the Mongoose schema that enforces the structure in the database
const LogSchema: Schema<ILog> = new Schema({
  timestamp: { type: Date, default: Date.now, index: true },
  actor: {
    id: { type: String, required: true },
    name: { type: String, required: true },
  },
  action: { type: String, required: true, index: true },
  target: {
    type: { type: String },
    id: { type: String },
    name: { type: String },
  },
  status: { type: String, required: true, enum: ['SUCCESS', 'FAILURE', 'INFO', 'PARTIAL'] },
  details: { type: String },
});

// This prevents Mongoose from redefining the model every time in development
const Log: Model<ILog> = models.Log || mongoose.model<ILog>('Log', LogSchema);

export default Log;
