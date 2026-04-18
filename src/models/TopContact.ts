import mongoose, { Schema } from 'mongoose';

const ContactSchema = new Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true }, // international format e.g. 2348012345678
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null }, // optional — if they're an app user
    isActive: { type: Boolean, default: true }
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
