
const mongoose = require('mongoose');

const MONGO_URI = 'mongodb+srv://pharmastakx_db_user:pharmastackx007@cluster0.tpkohgb.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

async function extract() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to DB');

  const User = mongoose.model('User', new mongoose.Schema({
    role: String,
    businessName: String,
    businessAddress: String,
    city: String,
    businessCoordinates: {
      latitude: Number,
      longitude: Number
    },
    orderCount: Number,
    reputationScore: Number
  }), 'users');

  const pharmacies = await User.find({ 
    role: { $in: ['pharmacy', 'pharmacist'] },
    businessName: { $exists: true, $ne: '' }
  }).limit(20);

  const data = pharmacies.map(p => ({
    id: p._id.toString(),
    name: p.businessName,
    address: p.businessAddress || p.city || 'Benin City',
    distance: +(Math.random() * 5 + 0.5).toFixed(1), // Mock distance for demo
    responseRate: Math.min(98, 70 + (p.orderCount || 0) + (p.reputationScore || 0)),
    stockLikelihood: Math.min(95, 60 + Math.random() * 30),
    price: 2500 + Math.floor(Math.random() * 1500)
  }));

  console.log('JSON_START');
  console.log(JSON.stringify(data, null, 2));
  console.log('JSON_END');

  await mongoose.connection.close();
}

extract().catch(console.error);
