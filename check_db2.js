const mongoose = require('mongoose');

async function check() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/psx_db');
    const user = await mongoose.connection.collection('users').findOne({ _id: new mongoose.Types.ObjectId('690c54b22263f44f8a4bac45') });
    console.log("User:", user);
    
    const sale = await mongoose.connection.collection('extensionsales').findOne({ pharmacyId: '690c54b22263f44f8a4bac45' });
    console.log("Sale:", sale);
    
    const userString = await mongoose.connection.collection('users').findOne({ _id: '690c54b22263f44f8a4bac45' });
    console.log("User (String ID):", userString);

    mongoose.disconnect();
  } catch (e) {
    console.error(e);
  }
}

check();
