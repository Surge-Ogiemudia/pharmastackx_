require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function update() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;
    
    // Update store-pharmacy
    await db.collection('users').updateOne(
      { slug: 'store-pharmacy' },
      { $set: { businessCoordinates: { latitude: 9.6281302, longitude: 6.5218088 } } }
    );
    console.log('Updated store-pharmacy');

    // Update realguestpharma with some nearby coordinates (e.g., 2km away)
    await db.collection('users').updateOne(
      { slug: 'realguestpharma' },
      { $set: { businessCoordinates: { latitude: 9.6381302, longitude: 6.5318088 } } }
    );
    console.log('Updated realguestpharma');

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

update();
