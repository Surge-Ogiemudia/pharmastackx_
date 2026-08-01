const mongoose = require('mongoose');

const MONGODB_URI = "mongodb+srv://pharmastakx_db_user:Osafuwame007%24@cluster0.tpkohgb.mongodb.net/test?appName=Cluster0";

async function main() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Successfully connected to MongoDB.");
    
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    
    console.log("Available collections:");
    collections.forEach(c => console.log(`- ${c.name}`));
    
    process.exit(0);
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1);
  }
}

main();
