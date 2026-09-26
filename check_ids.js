const mongoose = require('mongoose');
const uri = process.env.MONGO_URI;

require('dotenv').config({ path: '.env.local' });
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const ExtensionSale = mongoose.models.ExtensionSale || mongoose.model('ExtensionSale', new mongoose.Schema({}, { strict: false }));
  const ids = await ExtensionSale.distinct('pharmacyId');
  console.log('Distinct pharmacyIds in DB:', ids);
  process.exit(0);
});
