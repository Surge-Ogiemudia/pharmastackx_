const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DATABASE_URL;

if (!MONGODB_URI) {
  console.error('No MONGODB_URI found in .env.local');
  process.exit(1);
}

async function check() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const User = mongoose.connection.collection('users');

  const users = await User.find({
    $or: [
      { businessName: { $regex: 'medlife', $options: 'i' } },
      { slug: { $regex: 'medlife', $options: 'i' } },
      { phoneNumber: { $regex: '8106292804' } },
      { mobile: { $regex: '8106292804' } }
    ]
  }).toArray();

  console.log(`Found ${users.length} matching pharmacy user(s):`);
  users.forEach((u, i) => {
    console.log(`\n--- User ${i + 1} ---`);
    console.log(`ID: ${u._id}`);
    console.log(`Business Name: ${u.businessName}`);
    console.log(`Slug: ${u.slug}`);
    console.log(`Role: ${u.role}`);
    console.log(`Phone: ${u.phoneNumber || u.mobile}`);
    console.log(`Email: ${u.email}`);
    console.log(`App Version: ${u.appVersion}`);
    console.log(`Last Sync: ${u.lastSyncTime}`);
    console.log(`Encrypted Web POS Data: ${u.encryptedWebPosData ? 'PRESENT' : 'NONE'}`);
    console.log(`Synkk Meta:`, JSON.stringify(u.synkkMeta, null, 2));
  });

  await mongoose.disconnect();
}

check().catch(err => {
  console.error(err);
  process.exit(1);
});
