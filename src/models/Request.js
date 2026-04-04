
import mongoose from 'mongoose';

// This sub-schema represents a single quote from a pharmacy.
const QuoteSchema = new mongoose.Schema({
  pharmacy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // The pharmacy's version of the items, with their pricing and availability
  items: [{
    _id: false,
    name: { type: String, required: true },
    form: { type: String },
    strength: { type: String },
    // These fields are specific to the pharmacy's quote
    price: { type: Number, default: 0 },
    isAvailable: { type: Boolean, default: true },
    pharmacyQuantity: { type: Number }
  }],
  notes: { type: String }, // Notes from the pharmacy
  status: {
      type: String,
      enum: ['offered', 'accepted', 'rejected'],
      default: 'offered'
  },
  coordinates: {
    type: [Number], // [longitude, latitude]
  },
  quotedAt: {
    type: Date,
    default: Date.now,
  },
});


const RequestSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  phoneNumber: {
    type: String,
  },
  state: {
    type: String,
  },
  // The user's original requested items.
  items: [{
    _id: false,
    name: { type: String, required: true },
    form: { type: String },
    strength: { type: String },
    quantity: { type: Number, required: true },
    notes: { type: String },
    image: { type: String },
  }],
  // An array to hold all quotes from different pharmacies.
  quotes: [QuoteSchema],

  requestType: {
    type: String,
    enum: ['drug-list', 'prescription', 'product-image'],
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'quoted', 'awaiting-confirmation', 'confirmed', 'dispatched', 'rejected', 'cancelled'], 
    default: 'pending',
  },
  coordinates: {
    type: [Number], // [longitude, latitude]
    index: '2dsphere',
  },
  notes: {
    type: String, // General request notes
  },
  prescriptionImage: {
    type: String, // Base64 or URL of the prescription
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// When a quote is added, update the main request status to 'quoted'
RequestSchema.pre('save', function(next) {
  if (this.isModified('quotes') && this.quotes.length > 0 && this.status === 'pending') {
    this.status = 'quoted';
  }
  next();
});


const Request = mongoose.models.Request || mongoose.model('Request', RequestSchema);

export default Request;
