import mongoose, { Schema, Document, models } from 'mongoose';

export interface IMedia extends Document {
    data: string;
    contentType: string;
    filename: string;
    createdAt: Date;
}

const MediaSchema = new Schema<IMedia>({
    data: { type: String, required: true },
    contentType: { type: String, required: true },
    filename: { type: String, default: 'image' },
}, { timestamps: true });

const Media = models.Media || mongoose.model<IMedia>('Media', MediaSchema);
export default Media;
