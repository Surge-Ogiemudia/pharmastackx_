import mongoose, { Schema, Document } from 'mongoose';

export interface IGlowingRule {
  input: string;
  output: string;
  label: string;
}

export interface IAISettings extends Document {
  systemPrompt: string;
  goldenRules: IGlowingRule[];
  alertEmail: string;
  isAlertingEnabled: boolean;
  updatedBy: mongoose.Types.ObjectId;
}

const AISettingsSchema: Schema = new Schema({
  systemPrompt: { 
    type: String, 
    default: "You are Ask Rx, a friendly medicine expert. Respond like a knowledgeable friend — short, clear, warm, and human. Only discuss health and medicine topics." 
  },
  goldenRules: [{
    input: { type: String, default: '' },
    output: { type: String, default: '' },
    label: { type: String, default: '' }
  }],
  alertEmail: { type: String, default: 'pogiemudia@gmail.com' },
  isAlertingEnabled: { type: Boolean, default: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Ensure only one settings document exists
const AISettings = mongoose.models.AISettings || mongoose.model<IAISettings>('AISettings', AISettingsSchema);

export default AISettings;
