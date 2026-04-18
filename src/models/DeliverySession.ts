import mongoose, { Schema, Document } from 'mongoose';

interface IDeliverySession extends Document {
  phone: string;
  orderId: string;          // references the accepted quote / order
  requestId: string;        // original patient request
  agentName: string;
  status: 'waiting' | 'accepted' | 'declined' | 'expired';
  pickupAddress: string;
  pickupCoords: [number, number];
  dropoffAddress: string;
  dropoffCoords: [number, number];
  pharmacistPhone: string;
  patientPhone: string;
  expiresAt: Date;
  createdAt: Date;
}

const DeliverySessionSchema = new Schema<IDeliverySession>({
  phone: { type: String, required: true },
  orderId: { type: String, required: true },
  requestId: { type: String, required: true },
  agentName: { type: String, required: true },
  status: { type: String, enum: ['waiting', 'accepted', 'declined', 'expired'], default: 'waiting' },
  pickupAddress: { type: String, required: true },
  pickupCoords: { type: [Number], required: true },
  dropoffAddress: { type: String, required: true },
  dropoffCoords: { type: [Number], required: true },
  pharmacistPhone: { type: String, required: true },
  patientPhone: { type: String, required: true },
  expiresAt: { type: Date, required: true },
}, { timestamps: true });

DeliverySessionSchema.index({ phone: 1, status: 1 });
DeliverySessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL auto-delete

export default mongoose.models.DeliverySession || mongoose.model<IDeliverySession>('DeliverySession', DeliverySessionSchema);
