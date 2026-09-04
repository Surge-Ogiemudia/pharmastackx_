const mongoose = require('mongoose');
const uri = process.env.MONGODB_URI || 'mongodb+srv://user:pass@...'; // Need to load from .env

require('dotenv').config({ path: '.env.local' });
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const ExtensionSale = mongoose.models.ExtensionSale || mongoose.model('ExtensionSale', new mongoose.Schema({}, { strict: false }));
  const ids = await ExtensionSale.distinct('pharmacyId');
  console.log('Distinct pharmacyIds in DB:', ids);
  process.exit(0);
});
