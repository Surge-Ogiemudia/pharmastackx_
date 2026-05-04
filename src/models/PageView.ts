import mongoose, { Document, Schema, models } from 'mongoose';

export interface IPageView extends Document {
  date: string; // 'YYYY-MM-DD'
  count: number;
}

const PageViewSchema = new Schema<IPageView>({
  date: { type: String, required: true, unique: true },
  count: { type: Number, default: 0 },
});

export default models.PageView || mongoose.model<IPageView>('PageView', PageViewSchema);
