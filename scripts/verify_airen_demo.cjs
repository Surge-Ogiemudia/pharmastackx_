const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env.local") });

async function verify() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("=== FULL DB AUDIT FOR AIREN B2B DEMO ===");

  const Users = mongoose.connection.collection("users");
  const Partners = mongoose.connection.collection("partners");
  const Products = mongoose.connection.collection("products");

  // 1. Airen Wholesaler
  const airenUser = await Users.findOne({ slug: "demo.airen" });
  console.log("\n[1] AIREN WHOLESALER USER RECORD:");
  console.log({
    id: airenUser._id.toString(),
    businessName: airenUser.businessName,
    slug: airenUser.slug,
    email: airenUser.email,
    role: airenUser.role,
    phone: airenUser.phoneNumber,
    address: airenUser.businessAddress,
    city: airenUser.city,
    state: airenUser.state,
    professionalVerificationStatus: airenUser.professionalVerificationStatus,
    isStorePublished: airenUser.isStorePublished,
    emailVerified: airenUser.emailVerified
  });

  // 2. Airen Partner Storefront
  const airenPartner = await Partners.findOne({ slug: "demo.airen" });
  console.log("\n[2] AIREN PARTNER STOREFRONT RECORD:");
  console.log({
    id: airenPartner._id.toString(),
    name: airenPartner.name,
    slug: airenPartner.slug,
    isActive: airenPartner.isActive,
    markupPercentage: airenPartner.markupPercentage,
    contactEmail: airenPartner.contactEmail,
    contactPhone: airenPartner.contactPhone,
    curatedProductCount: (airenPartner.curatedProductIds || []).length
  });

  // 3. Seeded Products
  const products = await Products.find({ slug: "demo.airen" }).sort({ amount: -1 }).toArray();
  console.log(`\n[3] SEEDED WHOLESALE PRODUCTS (${products.length} items):`);
  products.forEach((p, idx) => {
    console.log(`${(idx + 1).toString().padStart(2, "0")}. ${p.itemName.padEnd(45)} | ?${p.amount.toLocaleString().padStart(6)} | ${p.minSalesUnit.padEnd(14)} | ${p.category.padEnd(26)} | img: ${p.imageUrl.substring(0, 40)}...`);
  });

  // 4. Benchmark Buyers
  const buyers = await Users.find({ slug: { $in: ["apcare", "kop", "medlife", "ernosa"] } }).toArray();
  console.log(`\n[4] BENCHMARK RETAIL BUYING PHARMACIES (${buyers.length} accounts):`);
  buyers.forEach(b => {
    console.log({
      id: b._id.toString(),
      slug: b.slug,
      businessName: b.businessName,
      email: b.email,
      phone: b.phoneNumber,
      address: b.businessAddress,
      city: b.city,
      state: b.state,
      verificationStatus: b.professionalVerificationStatus,
      emailVerified: b.emailVerified
    });
  });

  await mongoose.disconnect();
}

verify().catch(console.error);
