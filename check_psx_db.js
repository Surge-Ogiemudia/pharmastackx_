const mongoose = require('mongoose');

const uri = "mongodb+srv://pharmastakx_db_user:Osafuwame007%24@cluster0.tpkohgb.mongodb.net/test?appName=Cluster0";

async function run() {
  try {
    await mongoose.connect(uri);
    const Product = mongoose.models.Product || mongoose.model('Product', new mongoose.Schema({}, { strict: false }));
    const recentMonakProducts = await Product.find({ slug: 'monak' })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();
    console.log("Recent Monak Products:", JSON.stringify(recentMonakProducts, null, 2));
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.disconnect();
  }
}

run();
