const mongoose = require('mongoose');
const uri = 'mongodb+srv://pharmastakx_db_user:Osafuwame007%24@cluster0.tpkohgb.mongodb.net/test?appName=Cluster0';
async function check() {
  await mongoose.connect(uri);
  const countWithImage = await mongoose.connection.db.collection('products').countDocuments({ imageUrl: { $exists: true, $ne: '' } });
  console.log('Products in entire DB with imageUrl:', countWithImage);
  if (countWithImage > 0) {
    const prods = await mongoose.connection.db.collection('products').find({ imageUrl: { $exists: true, $ne: '' } }).limit(10).toArray();
    prods.forEach(p => console.log(p.itemName, '-->', p.imageUrl));
  }
  await mongoose.disconnect();
}
check().catch(console.error);
