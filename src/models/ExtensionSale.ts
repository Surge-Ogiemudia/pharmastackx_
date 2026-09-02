import mongoose, { Schema, Document } from 'mongoose';

export interface IExtensionSaleItem {
  name: string;
  qty: number;
  price: number;
}

export interface IExtensionSale extends Document {
  pharmacyId: string;
  terminalId: string;
  timestamp: Date;
  items: IExtensionSaleItem[];
  totalAmount: number;
  source?: string;
}

const ExtensionSaleSchema: Schema = new Schema({
  pharmacyId: { type: String, required: true, index: true },
  terminalId: { type: String, default: 'Terminal-1', index: true },
  timestamp: { type: Date, default: Date.now },
  items: [{ name: String, qty: Number, price: Number }],
  totalAmount: { type: Number },
  source: { type: String }
});

export default mongoose.models.ExtensionSale || mongoose.model<IExtensionSale>('ExtensionSale', ExtensionSaleSchema);
