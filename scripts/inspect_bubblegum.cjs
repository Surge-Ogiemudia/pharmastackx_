const mongoose = require('mongoose');

const uri = 'mongodb+srv://pharmastakx_db_user:Osafuwame007%24@cluster0.tpkohgb.mongodb.net/test?appName=Cluster0';

async function run() {
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');
  const partner = await mongoose.connection.db.collection('partners').findOne({ slug: 'bubblegum' });
  console.log('Partner keys:', Object.keys(partner || {}));
  console.log('Partner name:', partner ? partner.name : null);
  console.log('curatedProductIds count:', partner ? partner.curatedProductIds.length : 0);
  console.log('curatedCatalog:', partner ? partner.curatedCatalog : null);
  console.log('customProductImages:', partner ? partner.customProductImages : null);

  const products = await mongoose.connection.db.collection('products').find({ _id: { $in: partner.curatedProductIds } }).toArray();
  const withImg = products.filter(p => p.imageUrl && p.imageUrl.trim() !== '');
  console.log('Products with imageUrl:', withImg.length, 'out of', products.length);

  // Group by category and print unique products
  const categories = {};
  products.forEach(p => {
    const cat = p.category || 'Uncategorized';
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push({ id: p._id.toString(), name: p.itemName, amount: p.amount, imageUrl: p.imageUrl });
  });

  for (const [cat, items] of Object.entries(categories)) {
    console.log(`\n=== Category: ${cat} (${items.length} items) ===`);
    items.forEach(it => {
      console.log(`  - [${it.id}] "${it.name}" (Price: ${it.amount}) Image: ${it.imageUrl || 'NONE'}`);
    });
  }

  await mongoose.disconnect();
}

run().catch(console.error);
