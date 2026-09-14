import mongoose, { Schema, Document, models, Model } from 'mongoose';

export interface IOrder extends Document {
  user: mongoose.Types.ObjectId;
  items: {
    name: string;
    price: number;
    qty: number;
    image?: string;
    isQuoteItem?: boolean;
    pharmacy?: string;
  }[];
  patientName: string;
  patientAge: string;
  patientCondition: string;
  deliveryEmail: string;
  deliveryPhone: string;
  deliveryAddress: string;
  deliveryCity: string;
  deliveryState: string;
  coupon?: string;
  deliveryOption: 'standard' | 'express' | 'pickup' | 'courier' | string;
  courierName?: string;
  courierId?: string;
  courierLogo?: string;
  deliveryFee?: number;
  shipbubbleRequestToken?: string;
  shipbubbleOrderCode?: string;
  shipbubbleTrackingUrl?: string;
  shipbubbleStatus?: string;
  orderType: 'S' | 'MN' | 'MP';
  totalAmount: number;
  sfcAmount: number;
  businesses: string[]; // Names or IDs of pharmacies involved
  requestId?: mongoose.Types.ObjectId;
  quoteId?: string;
  partnerSlug?: string;
  partnerMarkupAmount?: number;
  partnerSettlementStatus?: 'pending' | 'settled';
  status: 'Pending' | 'Accepted' | 'Dispatched' | 'In Transit' | 'Completed' | 'Cancelled';
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema: Schema<IOrder> = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: false },
  items: [{
    name: { type: String, required: true },
    price: { type: Number, required: true },
    qty: { type: Number, required: true },
    image: { type: String },
    isQuoteItem: { type: Boolean, default: false },
    pharmacy: { type: String },
  }],
  patientName: { type: String, required: true },
  patientAge: { type: String },
  patientCondition: { type: String },
  deliveryEmail: { type: String, required: true },
  deliveryPhone: { type: String, required: true },
  deliveryAddress: { type: String },
  deliveryCity: { type: String },
  deliveryState: { type: String },
  coupon: { type: String },
  deliveryOption: { 
    type: String, 
    required: true,
  },
  courierName: { type: String },
  courierId: { type: String },
  courierLogo: { type: String },
  deliveryFee: { type: Number, default: 0 },
  shipbubbleRequestToken: { type: String },
  shipbubbleOrderCode: { type: String },
  shipbubbleTrackingUrl: { type: String },
  shipbubbleStatus: { type: String },
  orderType: { 
    type: String, 
    required: true, 
    enum: ['S', 'MN', 'MP'] 
  },
  totalAmount: { type: Number, required: true },
  sfcAmount: { type: Number, required: true, default: 0 },
  businesses: [{ type: String }],
  requestId: { type: Schema.Types.ObjectId, ref: 'Request' },
  quoteId: { type: String },
  partnerSlug: { type: String, index: true },
  partnerMarkupAmount: { type: Number, default: 0 },
  partnerSettlementStatus: { 
    type: String, 
    enum: ['pending', 'settled'], 
    default: 'pending' 
  },
  status: { 
    type: String, 
    required: true, 
    enum: ['Pending', 'Accepted', 'Dispatched', 'In Transit', 'Completed', 'Cancelled'],
    default: 'Pending'
  },
}, { timestamps: true });

if (process.env.NODE_ENV === 'development') {
  delete mongoose.models.Order;
}
const Order: Model<IOrder> = mongoose.models.Order || mongoose.model<IOrder>('Order', OrderSchema);

export default Order;
