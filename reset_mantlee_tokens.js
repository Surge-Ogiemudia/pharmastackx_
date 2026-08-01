const mongoose = require('mongoose');

const uri = "mongodb+srv://pharmastakx_db_user:Osafuwame007%24@cluster0.tpkohgb.mongodb.net/test?appName=Cluster0";

async function resetTokens() {
  try {
    await mongoose.connect(uri);
    console.log("Connected to MongoDB!");

    const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'users');

    // Search for user by slug 'mantlee' or username 'mantlee'
    const result = await User.updateMany(
      { $or: [{ slug: 'mantlee' }, { username: 'mantlee' }] },
      {
        $set: {
          socialTokens: {
            weeklyTokens: 4,
            extraTokens: 10,
            lastTokenReset: new Date()
          }
        }
      }
    );

    console.log(`Successfully updated user 'mantlee' tokens! Modified count: ${result.modifiedCount}`);

    // Fetch and display updated user token balance
    const updatedUser = await User.findOne({ $or: [{ slug: 'mantlee' }, { username: 'mantlee' }] }).lean();
    if (updatedUser) {
      console.log("Updated Social Tokens:", updatedUser.socialTokens);
    } else {
      console.log("User 'mantlee' not found. Searching all users...");
      const allUsers = await User.find({}, 'username slug socialTokens').lean();
      console.log("All pharmacy users:", allUsers);
    }

  } catch (err) {
    console.error("Reset error:", err);
  } finally {
    await mongoose.disconnect();
  }
}

resetTokens();
