import mongoose, { Schema, Document } from 'mongoose';

interface IAgent {
  name: string;
  phone: string;         // WhatsApp-capable, format: 234XXXXXXXXXX
  address?: string;      // Home/base address
  coordinates?: [number, number]; // [longitude, latitude]
  isActive: boolean;
}

interface IDeliveryAgentDoc extends Document {
  state: string;
  agents: IAgent[];
}

const AgentSchema = new Schema<IAgent>({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  address: { type: String, default: '' },
  coordinates: { type: [Number], default: undefined },
  isActive: { type: Boolean, default: true },
});

const DeliveryAgentSchema = new Schema<IDeliveryAgentDoc>({
  state: { type: String, required: true, unique: true },
  agents: {
    type: [AgentSchema],
    validate: [(v: IAgent[]) => v.length <= 20, 'Max 20 agents per state'],
    default: [],
  },
}, { timestamps: true });

export default mongoose.models.DeliveryAgent || mongoose.model<IDeliveryAgentDoc>('DeliveryAgent', DeliveryAgentSchema);
