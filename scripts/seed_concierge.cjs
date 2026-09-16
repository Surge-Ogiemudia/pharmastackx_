const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

// Setup simple schema since we are in CJS
const conciergeSchema = new mongoose.Schema({
  name: String,
  category: String,
  phone: String,
  preferredPickupPhone: String,
  address: String,
  city: String,
  location: {
    type: { type: String, default: 'Point' },
    coordinates: [Number]
  },
  url: String,
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});
conciergeSchema.index({ location: '2dsphere' });
const ConciergePharmacy = mongoose.models.ConciergePharmacy || mongoose.model('ConciergePharmacy', conciergeSchema);

async function seed() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('No MONGODB_URI found in .env.local');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const jsonPath = 'C:\\Users\\HP\\Desktop\\clean_lagos_pharmacies.json';
  if (!fs.existsSync(jsonPath)) {
    console.error('JSON file not found at:', jsonPath);
    process.exit(1);
  }

  const rawData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  console.log(`Loaded ${rawData.length} records from JSON`);

  // Clear existing to avoid duplicates if re-run
  await ConciergePharmacy.deleteMany({});
  console.log('Cleared existing Concierge Pharmacies');

  const formattedData = rawData.map(item => ({
    name: item.name,
    category: item.category,
    phone: String(item.phone),
    address: item.address,
    city: item.city,
    location: {
      type: 'Point',
      coordinates: [parseFloat(item.lng), parseFloat(item.lat)] // GeoJSON is [longitude, latitude]
    },
    url: item.url,
    isActive: true
  }));

  const result = await ConciergePharmacy.insertMany(formattedData);
  console.log(`Successfully seeded ${result.length} Concierge Pharmacies!`);
  
  // Ensure indexes are built
  await ConciergePharmacy.syncIndexes();
  console.log('2dsphere index built');

  await mongoose.disconnect();
  console.log('Disconnected');
}

seed().catch(console.error);
