const mongoose = require('mongoose');
const { dbConnect } = require('./src/lib/mongoConnect');
const MedicineRequest = require('./src/models/MedicineRequest');
const Product = require('./src/models/Product');

async function test() {
    try {
        await dbConnect();
        const reqCount = await MedicineRequest.countDocuments();
        const prodCount = await Product.countDocuments({ isPublished: true });
        const allProdsCount = await Product.countDocuments();
        const recentReqs = await MedicineRequest.find().limit(5).lean();
        
        console.log(JSON.stringify({
            reqCount, 
            prodCount, 
            allProdsCount,
            recentReqs: recentReqs.map(r => ({ name: r.aiStandardizedName || r.rawMedicineName, createdAt: r.createdAt }))
        }, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
test();
