import mongoose, { Schema } from 'mongoose';

const ContactSchema = new Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    isActive: { type: Boolean, default: true },
    address: { type: String, default: '' },
    coordinates: {
        type: [Number], // [longitude, latitude] — GeoJSON order
        default: undefined,
        validate: {
            validator: (v: number[]) => !v || v.length === 2,
            message: 'Coordinates must be [longitude, latitude]'
        }
    }
}, { _id: true });

const TopContactSchema = new Schema({
    state: { type: String, required: true, unique: true },
    contacts: {
        type: [ContactSchema],
        validate: {
            validator: (arr: any[]) => arr.length <= 10,
            message: 'Maximum 10 contacts per state'
        }
    }
}, { timestamps: true });

export default mongoose.models.TopContact || mongoose.model('TopContact', TopContactSchema);
