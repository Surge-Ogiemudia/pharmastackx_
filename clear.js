const mongoose = require('mongoose');

// Need to load dotenv to get the URI if we don't pass it, but better to pass it in command line or env
require('dotenv').config({ path: '.env.local' });

mongoose.connect(process.env.MONGO_URI).then(async () => {
  try {
    const db = mongoose.connection.db;
    await db.collection('contentplans').deleteMany({});
    await db.collection('dailyposts').deleteMany({});
    console.log('Successfully cleared all content plans and daily posts from database.');
  } catch(e) {
    console.error(e);
  }
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
