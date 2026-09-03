import mongoose, { Schema, Document } from 'mongoose';

export interface IExtensionInventoryItem {
  sn?: string;
  name: string;
  qty: number;
  price: number;
  extra?: Record<string, any>;
}

export interface IExtensionInventory extends Document {
  pharmacyId: string;
  lastSynced: Date;
  items: IExtensionInventoryItem[];
}

const ExtensionInventorySchema: Schema = new Schema({
  pharmacyId: { type: String, required: true, index: true },
  lastSynced: { type: Date, default: Date.now },
  items: [{
    sn: String,
    name: String,
    qty: Number,
    price: Number,
    extra: { type: Schema.Types.Mixed, default: {} }
  }]
}, { strict: false });

export default mongoose.models.ExtensionInventory || mongoose.model<IExtensionInventory>('ExtensionInventory', ExtensionInventorySchema);
