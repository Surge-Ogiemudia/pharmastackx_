import mongoose, { Schema, Document, Model, models } from 'mongoose';

export interface IExcludedDevice extends Document {
  type: 'ip' | 'cookie';
  value: string;
  label: string;
  createdAt: Date;
}

const ExcludedDeviceSchema: Schema<IExcludedDevice> = new Schema({
  type:  { type: String, required: true, enum: ['ip', 'cookie'] },
  value: { type: String, required: true, unique: true },
  label: { type: String, required: true },
}, { timestamps: { createdAt: true, updatedAt: false } });

const ExcludedDevice: Model<IExcludedDevice> =
  models.ExcludedDevice ||
  mongoose.model<IExcludedDevice>('ExcludedDevice', ExcludedDeviceSchema);

export default ExcludedDevice;
