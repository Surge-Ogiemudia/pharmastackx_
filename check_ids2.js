const mongoose = require('mongoose');
const uri = '';
mongoose.connect(uri).then(async () => {
  const ExtensionSale = mongoose.models.ExtensionSale || mongoose.model('ExtensionSale', new mongoose.Schema({}, { strict: false }));
  const ids = await ExtensionSale.distinct('pharmacyId');
  console.log('Distinct pharmacyIds in DB:', ids);
  process.exit(0);
}).catch(console.error);
