const mongoose = require('mongoose');

const MONGODB_URI = "mongodb+srv://pharmastakx_db_user:Osafuwame007%24@cluster0.tpkohgb.mongodb.net/test?appName=Cluster0";

async function main() {
  try {
    await mongoose.connect(MONGODB_URI);
    const db = mongoose.connection.db;
    
    const pharmacyUsers = await db.collection('users').find({ role: 'pharmacy' }).toArray();
    
    const posUsers = pharmacyUsers.filter(user => {
      let isPos = false;
      if (user.synkkMeta && (user.synkkMeta.posName || user.synkkMeta.posMethod)) {
        isPos = true;
      }
      if (user.encryptedWebPosData) {
        isPos = true;
      }
      return isPos;
    });

    console.log(`Found ${posUsers.length} POS users:\n`);
    posUsers.forEach((user, idx) => {
      console.log(`${idx + 1}. Business: ${user.businessName || 'N/A'}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Username: ${user.username}`);
      console.log(`   Indicators: ${user.encryptedWebPosData ? 'encryptedWebPosData' : ''} ${user.synkkMeta ? 'synkkMeta' : ''}`);
      console.log('');
    });
    
    process.exit(0);
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1);
  }
}

main();
