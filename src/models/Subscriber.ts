import mongoose, { Schema, Document } from 'mongoose';

export interface ISubscriber extends Document {
    email: string;
    confirmed: boolean;
    token: string;
    subscribedAt: Date;
}

const SubscriberSchema = new Schema<ISubscriber>({
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    confirmed: { type: Boolean, default: false },
    token: { type: String, required: true },
    subscribedAt: { type: Date, default: Date.now },
});

export default mongoose.models.Subscriber || mongoose.model<ISubscriber>('Subscriber', SubscriberSchema);
