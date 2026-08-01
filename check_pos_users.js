const mongoose = require('mongoose');

const MONGODB_URI = "mongodb+srv://pharmastakx_db_user:Osafuwame007%24@cluster0.tpkohgb.mongodb.net/test?appName=Cluster0";

async function main() {
  try {
    await mongoose.connect(MONGODB_URI);
    const db = mongoose.connection.db;
    
    const pharmacyUsers = await db.collection('users').find({ role: 'pharmacy' }).toArray();
    
    let posCount = 0;
    let synkkMetaCount = 0;
    let encryptedWebPosDataCount = 0;

    pharmacyUsers.forEach(user => {
      let isPos = false;
      if (user.synkkMeta && (user.synkkMeta.posName || user.synkkMeta.posMethod)) {
        synkkMetaCount++;
        isPos = true;
      }
      if (user.encryptedWebPosData) {
        encryptedWebPosDataCount++;
        isPos = true;
      }
      if (user.terminalModules && user.terminalModules.pos === true) {
        // Just checking terminalModules
      }
      if (isPos) posCount++;
    });

    console.log(`Total pharmacy users: ${pharmacyUsers.length}`);
    console.log(`Pharmacy users with POS indicators: ${posCount}`);
    console.log(` - With synkkMeta: ${synkkMetaCount}`);
    console.log(` - With encryptedWebPosData: ${encryptedWebPosDataCount}`);
    
    // show a sample of a POS user
    const samplePos = pharmacyUsers.find(u => u.synkkMeta || u.encryptedWebPosData);
    if (samplePos) {
      console.log("\nSample POS User fields:");
      console.log("synkkMeta:", samplePos.synkkMeta);
      console.log("encryptedWebPosData exists:", !!samplePos.encryptedWebPosData);
      console.log("terminalModules:", samplePos.terminalModules);
    }
    
    process.exit(0);
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1);
  }
}

main();
