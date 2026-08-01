const mongoose = require('mongoose');

const MONGODB_URI = "mongodb+srv://pharmastakx_db_user:Osafuwame007%24@cluster0.tpkohgb.mongodb.net/test?appName=Cluster0";

async function main() {
  try {
    await mongoose.connect(MONGODB_URI);
    const db = mongoose.connection.db;
    
    // Case insensitive search for 'monak' in businessName, username, or email
    const users = await db.collection('users').find({
      $or: [
        { businessName: { $regex: 'monak', $options: 'i' } },
        { username: { $regex: 'monak', $options: 'i' } },
        { email: { $regex: 'monak', $options: 'i' } }
      ]
    }).toArray();
    
    console.log(`Found ${users.length} user(s) matching 'monak':\n`);
    users.forEach((user, idx) => {
      console.log(`${idx + 1}. Business: ${user.businessName || 'N/A'}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Username: ${user.username}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   encryptedWebPosData: ${!!user.encryptedWebPosData}`);
      console.log(`   synkkMeta:`, user.synkkMeta || 'None');
      console.log(`   terminalModules:`, user.terminalModules || 'None');
      console.log('');
    });
    
    process.exit(0);
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1);
  }
}

main();
