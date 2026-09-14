const mongoose = require('mongoose');
const URI = 'mongodb+srv://pharmastakx_db_user:Osafuwame007%24@cluster0.tpkohgb.mongodb.net/test?appName=Cluster0';

async function main() {
  await mongoose.connect(URI);
  const User = mongoose.connection.collection('users');
  const pharmacies = await User.find({ role: { $in: ['pharmacy', 'pharmacist'] } }).toArray();
  console.log('Registered real pharmacies in DB:');
  pharmacies.forEach(p => console.log(`  - "${p.businessName}" | slug: "${p.slug}" | email: "${p.email}"`));
  await mongoose.disconnect();
}

main().catch(console.error);
