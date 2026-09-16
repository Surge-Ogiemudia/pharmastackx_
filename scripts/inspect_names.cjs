const mongoose = require('mongoose');

const uri = 'mongodb+srv://pharmastakx_db_user:Osafuwame007%24@cluster0.tpkohgb.mongodb.net/test?appName=Cluster0';

async function run() {
  await mongoose.connect(uri);
  const partner = await mongoose.connection.db.collection('partners').findOne({ slug: 'bubblegum' });
  const products = await mongoose.connection.db.collection('products').find({ _id: { $in: partner.curatedProductIds } }).toArray();
  
  console.log(`Total curated products: ${products.length}`);
  
  const catCounts = {};
  products.forEach(p => {
    catCounts[p.category] = (catCounts[p.category] || 0) + 1;
  });
  console.log('Categories breakdown:', catCounts);

  // Check unique names / base names
  const names = products.map(p => p.itemName);
  console.log('Sample 30 unique names:');
  const uniqueNames = [...new Set(names)];
  console.log(`Unique product titles: ${uniqueNames.length}`);
  uniqueNames.slice(0, 35).forEach((n, i) => console.log(`${i+1}: ${n}`));

  await mongoose.disconnect();
}

run().catch(console.error);
