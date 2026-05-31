import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IDesktopRequestResponse extends Document {
  pharmacySlug: string;
  platformRequestId: string;
  items: Array<{ name: string; quantity: number }>;
  status: 'accepted';
  createdAt: Date;
}

const desktopRequestResponseSchema: Schema<IDesktopRequestResponse> = new mongoose.Schema({
  pharmacySlug: { type: String, required: true },
  platformRequestId: { type: String, required: true },
  items: [{
    name: { type: String, required: true },
    quantity: { type: Number, required: true }
  }],
  status: { type: String, enum: ['accepted'], default: 'accepted' },
  createdAt: { type: Date, default: Date.now },
});

const DesktopRequestResponse: Model<IDesktopRequestResponse> = 
  mongoose.models.DesktopRequestResponse || 
  mongoose.model<IDesktopRequestResponse>('DesktopRequestResponse', desktopRequestResponseSchema, 'desktopRequestResponses');

export default DesktopRequestResponse;
