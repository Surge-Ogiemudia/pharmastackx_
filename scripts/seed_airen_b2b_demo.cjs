const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env.local") });

const MONGODB_URI = process.env.MONGO_URI;
if (!MONGODB_URI) {
  console.error("No MONGO_URI found in environment");
  process.exit(1);
}

const AIREN_PRODUCTS = [
  {
    itemName: "Augmentin 625mg (Box of 14)",
    activeIngredient: "Amoxicillin 500mg + Clavulanic Acid 125mg",
    category: "Antibiotic",
    amount: 18500,
    minSalesUnit: "Box of 14",
    quantity: 250,
    POM: true,
    manufacturer: "GSK (GlaxoSmithKline)",
    imageUrl: "https://images.apollo247.in/pub/media/catalog/product/a/u/aug0013.jpg",
    info: "B2B Wholesale Pack. Broad-spectrum antibacterial for respiratory tract, UTI, and soft tissue infections. Box of 14 film-coated tablets."
  },
  {
    itemName: "Lonart DS (Pack of 10)",
    activeIngredient: "Artemether 80mg + Lumefantrine 480mg",
    category: "Antimalarial",
    amount: 24500,
    minSalesUnit: "Pack of 10",
    quantity: 400,
    POM: false,
    manufacturer: "Bliss GVS Healthcare",
    imageUrl: "https://images.apollo247.in/pub/media/catalog/product/l/u/lum0034.jpg",
    info: "Wholesale Bundle. Double-strength ACT for acute uncomplicated Plasmodium falciparum malaria. Pack of 10 cards (6 tabs per card)."
  },
  {
    itemName: "Coartem 80/480mg (Pack of 6)",
    activeIngredient: "Artemether 80mg + Lumefantrine 480mg",
    category: "Antimalarial",
    amount: 22800,
    minSalesUnit: "Pack of 6",
    quantity: 350,
    POM: false,
    manufacturer: "Novartis",
    imageUrl: "https://images.apollo247.in/pub/media/catalog/product/c/o/coa0009.jpg",
    info: "Wholesale Pack of 6 boxes. Standard first-line Artemisinin combination therapy for acute uncomplicated malaria. 6 tablets per pack."
  },
  {
    itemName: "Amoxicillin 500mg (Pack of 100)",
    activeIngredient: "Amoxicillin Trihydrate 500mg",
    category: "Antibiotic",
    amount: 8500,
    minSalesUnit: "Pack of 100",
    quantity: 600,
    POM: true,
    manufacturer: "Juhel / Teva",
    imageUrl: "https://images.apollo247.in/pub/media/catalog/product/m/o/mox0022_1.jpg",
    info: "Wholesale Box of 100 capsules (10 blister packs x 10). Broad-spectrum bactericidal penicillin antibiotic for systemic infections."
  },
  {
    itemName: "Ampiclox Neonatal Drops 15ml (Pack of 10)",
    activeIngredient: "Ampicillin 90mg + Cloxacillin 30mg per 0.6ml",
    category: "Antibiotic",
    amount: 26000,
    minSalesUnit: "Pack of 10",
    quantity: 180,
    POM: true,
    manufacturer: "Beecham / GSK",
    imageUrl: "https://images.apollo247.in/pub/media/catalog/product/a/m/amp0014.jpg",
    info: "Neonatal antibiotic oral drops formulated for prophylaxis and treatment in newborns and infants. Wholesale bundle of 10 dropper bottles."
  },
  {
    itemName: "Ampiclox 500mg Capsules (Pack of 100)",
    activeIngredient: "Ampicillin 250mg + Cloxacillin 250mg",
    category: "Antibiotic",
    amount: 34500,
    minSalesUnit: "Pack of 100",
    quantity: 220,
    POM: true,
    manufacturer: "Beecham / GSK",
    imageUrl: "https://images.apollo247.in/pub/media/catalog/product/a/m/amp0014.jpg",
    info: "Broad-spectrum penicillin synergy covering gram-positive and gram-negative penicillinase-producing organisms. Box of 100 capsules."
  },
  {
    itemName: "Ciprotab 500mg (Box of 10)",
    activeIngredient: "Ciprofloxacin Hydrochloride 500mg",
    category: "Antibiotic",
    amount: 16500,
    minSalesUnit: "Box of 10",
    quantity: 300,
    POM: true,
    manufacturer: "Fidson Healthcare Plc",
    imageUrl: "https://images.apollo247.in/pub/media/catalog/product/c/i/cip0006.jpg",
    info: "Wholesale Pack of 10 blister packs (14 caplets each, 140 total). Fluoroquinolone antibacterial for complicated enteric and urinary tract infections."
  },
  {
    itemName: "Emzor Paracetamol 500mg (Pack of 100)",
    activeIngredient: "Paracetamol (Acetaminophen) 500mg",
    category: "Analgesics & Antipyretics",
    amount: 6500,
    minSalesUnit: "Pack of 100",
    quantity: 1200,
    POM: false,
    manufacturer: "Emzor Pharmaceuticals",
    imageUrl: "https://images.apollo247.in/pub/media/catalog/product/d/o/dol0026.jpg",
    info: "Standard retail dispenser pack of 100 blister cards (1000 tablets total). Fast-acting relief of headaches, musculoskeletal pain and fever."
  },
  {
    itemName: "Ventolin Inhaler 100mcg (Pack of 5)",
    activeIngredient: "Salbutamol Sulfate 100mcg / actuation",
    category: "Respiratory Care",
    amount: 38000,
    minSalesUnit: "Pack of 5",
    quantity: 150,
    POM: true,
    manufacturer: "GSK (GlaxoSmithKline)",
    imageUrl: "https://images.apollo247.in/pub/media/catalog/product/a/s/ast0019.jpg",
    info: "Wholesale bundle of 5 CFC-free metered-dose inhalers (200 doses each). Fast-acting bronchodilator for asthma and reversible airway obstruction."
  },
  {
    itemName: "Ventolin Expectorant Syrup 100ml (Pack of 10)",
    activeIngredient: "Salbutamol 2mg + Guaifenesin 50mg per 5ml",
    category: "Respiratory Care",
    amount: 29500,
    minSalesUnit: "Pack of 10",
    quantity: 140,
    POM: true,
    manufacturer: "GSK",
    imageUrl: "https://images.apollo247.in/pub/media/catalog/product/a/s/asc0036.jpg",
    info: "Wholesale pack of 10 amber glass bottles (100ml). Relieves bronchospasm and facilitates expectoration of viscous secretions."
  },
  {
    itemName: "Fulcin 500mg (Box of 100)",
    activeIngredient: "Griseofulvin Microsize 500mg",
    category: "Antifungal",
    amount: 14200,
    minSalesUnit: "Box of 100",
    quantity: 200,
    POM: true,
    manufacturer: "AstraZeneca / Teva",
    imageUrl: "https://images.apollo247.in/pub/media/catalog/product/g/r/gri0007.jpg",
    info: "Systemic antifungal for dermatophyte infections of scalp, nails, and skin resistant to topical treatment. Box of 100 tablets (10 x 10)."
  },
  {
    itemName: "P-Alaxin Tablets (Pack of 10)",
    activeIngredient: "Dihydroartemisinin 40mg + Piperaquine Phosphate 320mg",
    category: "Antimalarial",
    amount: 21000,
    minSalesUnit: "Pack of 10",
    quantity: 300,
    POM: false,
    manufacturer: "Bliss GVS Healthcare",
    imageUrl: "https://images.apollo247.in/pub/media/catalog/product/s/y/nyn0001.jpg",
    info: "Wholesale bundle of 10 blister cards (9 tablets per card). Rapidly-acting ACT with extended post-treatment prophylactic clearance."
  },
  {
    itemName: "Tramadol 50mg / Paracetamol 325mg (Box of 100)",
    activeIngredient: "Tramadol Hydrochloride 37.5mg + Paracetamol 325mg",
    category: "Analgesics & Antipyretics",
    amount: 12500,
    minSalesUnit: "Box of 100",
    quantity: 160,
    POM: true,
    manufacturer: "Sanofi / Ranbaxy",
    imageUrl: "https://images.apollo247.in/pub/media/catalog/product/u/l/ult0010.jpg",
    info: "Synergistic opioid/non-opioid multimodal analgesia for moderate to acute severe pain. Dispenser box of 100 tablets (10 blisters x 10)."
  },
  {
    itemName: "Ibuprofen 400mg + Paracetamol 325mg (Box of 100)",
    activeIngredient: "Ibuprofen 400mg + Paracetamol 325mg",
    category: "Analgesics & Antipyretics",
    amount: 7800,
    minSalesUnit: "Box of 100",
    quantity: 500,
    POM: false,
    manufacturer: "Emzor / Fidson",
    imageUrl: "https://images.apollo247.in/pub/media/catalog/product/c/o/com0018.jpg",
    info: "Combined non-steroidal anti-inflammatory and antipyretic for dental, dysmenorrhea, and inflammatory pains. Box of 100 film-coated caplets."
  },
  {
    itemName: "Syringes & Needles 5ml (Pack of 100)",
    activeIngredient: "Medical-grade Polypropylene 5ml Luer Lock with 21G Needle",
    category: "Medical Devices & Consumables",
    amount: 11500,
    minSalesUnit: "Pack of 100",
    quantity: 450,
    POM: false,
    manufacturer: "Nipro / Dana",
    imageUrl: "https://images.apollo247.in/pub/media/catalog/product/d/i/dis0023.jpg",
    info: "Wholesale box of 100 sterile, non-toxic, non-pyrogenic 3-part disposable syringes with mounted 21G hypodermic needles in individual peel packs."
  },
  {
    itemName: "Paracetamol Infusion 1000mg/100ml (Pack of 10)",
    activeIngredient: "Paracetamol 10mg/ml (1000mg/100ml IV Solution)",
    category: "Infusions & Critical Care",
    amount: 13500,
    minSalesUnit: "Pack of 10",
    quantity: 250,
    POM: true,
    manufacturer: "Juhel / Dana",
    imageUrl: "https://images.apollo247.in/pub/media/catalog/product/p/a/par0337.jpg",
    info: "Carton of 10 IV infusion bottles (100ml each). Indicated for short-term treatment of moderate post-surgical pain and emergency fever control."
  },
  {
    itemName: "Artesunate Injection 60mg (Box of 6)",
    activeIngredient: "Artesunate Powder 60mg + 5% Sodium Bicarbonate & Saline Diluents",
    category: "Antimalarial",
    amount: 19800,
    minSalesUnit: "Box of 6",
    quantity: 280,
    POM: true,
    manufacturer: "Guilin Pharma / Fosun",
    imageUrl: "https://images.apollo247.in/pub/media/catalog/product/f/a/fal0005.jpg",
    info: "WHO prequalified parenteral artesunate for treatment of severe and complicated falciparum malaria. Box of 6 vials with corresponding sterile ampoules."
  },
  {
    itemName: "Metronidazole 400mg (Pack of 100)",
    activeIngredient: "Metronidazole 400mg",
    category: "Antibiotic",
    amount: 5200,
    minSalesUnit: "Pack of 100",
    quantity: 700,
    POM: true,
    manufacturer: "Shalina / Emzor",
    imageUrl: "https://images.apollo247.in/pub/media/catalog/product/m/e/met0018.jpg",
    info: "Synthetic nitroimidazole antibacterial and antiprotozoal for anaerobic infections, amoebiasis, and giardiasis. Box of 100 tablets (10 x 10)."
  },
  {
    itemName: "Erythromycin 250mg (Box of 100)",
    activeIngredient: "Erythromycin Stearate 250mg",
    category: "Antibiotic",
    amount: 9800,
    minSalesUnit: "Box of 100",
    quantity: 250,
    POM: true,
    manufacturer: "Juhel / Swiss Pharma",
    imageUrl: "https://images.apollo247.in/pub/media/catalog/product/e/r/ery0004.jpg",
    info: "Macrolide antibiotic active against respiratory tract, skin and soft-tissue infections in patients with penicillin allergy. Box of 100 tablets."
  },
  {
    itemName: "Omeprazole 20mg (Box of 28)",
    activeIngredient: "Omeprazole 20mg (Enteric-coated micro-pellets)",
    category: "Gastrointestinal",
    amount: 4500,
    minSalesUnit: "Box of 28",
    quantity: 500,
    POM: false,
    manufacturer: "Dr. Reddy's / Dawa",
    imageUrl: "https://images.apollo247.in/pub/media/catalog/product/o/m/ome0005.jpg",
    info: "Proton pump inhibitor (PPI) reducing gastric acid secretion for treatment of gastric and duodenal ulcers and GERD. Box of 28 delayed-release capsules."
  },
  {
    itemName: "Oral Rehydration Salts (ORS) (Pack of 50)",
    activeIngredient: "WHO Low-Osmolarity Formula (Sodium, Potassium, Citrate, Dextrose)",
    category: "Gastrointestinal & Rehydration",
    amount: 8000,
    minSalesUnit: "Pack of 50",
    quantity: 600,
    POM: false,
    manufacturer: "Emzor / Chi Pharmaceuticals",
    imageUrl: "https://images.apollo247.in/pub/media/catalog/product/e/l/ele0001.jpg",
    info: "WHO/UNICEF formulated low-osmolarity oral rehydration salts for prevention and correction of dehydration. Wholesale dispenser carton of 50 sachets."
  }
];

async function seed() {
  console.log("=== AIREN PHARMACY B2B DEMO DATA SEEDER ===");
  console.log("Connecting to MongoDB Atlas...");
  await mongoose.connect(MONGODB_URI);
  console.log("Connected successfully to DB:", mongoose.connection.name);

  const Users = mongoose.connection.collection("users");
  const Partners = mongoose.connection.collection("partners");
  const Products = mongoose.connection.collection("products");

  const demoPasswordHash = bcrypt.hashSync("Password123!", 10);

  // 1. Seed/Upsert Airen Wholesaler User
  console.log("\n1. Seeding Airen Wholesaler User Record...");
  const airenUserResult = await Users.findOneAndUpdate(
    { slug: "demo.airen" },
    {
      $set: {
        username: "demo.airen",
        businessName: "Airen Pharmacy & Wholesale Depot",
        email: "wholesale@airenpharmacy.com",
        role: "pharmacy",
        isStorePublished: true,
        professionalVerificationStatus: "approved",
        city: "Benin City",
        state: "Edo",
        businessAddress: "No 18, Mission Road, Benin City, Edo State",
        phoneNumber: "08031234567",
        mobile: "08031234567",
        emailVerified: true,
        subscriptionStatus: "subscribed",
        orderCount: 42,
        reputationScore: 98,
        businessCoordinates: {
          latitude: 6.3350,
          longitude: 5.6275
        },
        password: demoPasswordHash,
        brandKit: {
          primaryColor: "#0F766E",
          secondaryColor: "#F59E0B",
          tagline: "Direct Wholesale Pharmaceuticals & Medical Supplies"
        },
        updatedAt: new Date()
      },
      $setOnInsert: {
        createdAt: new Date()
      }
    },
    { upsert: true, returnDocument: "after" }
  );

  const airenUserId = airenUserResult._id || (await Users.findOne({ slug: "demo.airen" }))._id;
  console.log("Airen Wholesaler User seeded with ID:", airenUserId.toString());

  // 2. Seed 21 B2B Wholesale Products
  console.log(`\n2. Seeding ${AIREN_PRODUCTS.length} B2B Wholesale Products...`);
  // Remove existing products under demo.airen slug to prevent duplicates
  const deleteResult = await Products.deleteMany({
    $or: [
      { slug: "demo.airen" },
      { pharmacyId: airenUserId },
      { pharmacyId: airenUserId.toString() }
    ]
  });
  console.log(`Cleaned up ${deleteResult.deletedCount} old product record(s).`);

  const productDocsToInsert = AIREN_PRODUCTS.map(p => ({
    ...p,
    slug: "demo.airen",
    businessName: "Airen Pharmacy & Wholesale Depot",
    coordinates: "Lat: 6.3350, Lon: 5.6275",
    isPublished: true,
    source: "manual",
    enrichmentStatus: "enriched",
    classificationMethod: "manual_override",
    pharmacyId: airenUserId,
    createdAt: new Date(),
    updatedAt: new Date()
  }));

  const insertResult = await Products.insertMany(productDocsToInsert);
  const seededProductIds = Object.values(insertResult.insertedIds);
  console.log(`Successfully seeded ${seededProductIds.length} authentic B2B products!`);

  // 3. Seed/Upsert Airen Partner Record
  console.log("\n3. Seeding Airen Partner Storefront Record...");
  const curatedCatalog = seededProductIds.map((pId, idx) => ({
    productId: pId,
    imageUrl: AIREN_PRODUCTS[idx].imageUrl,
    markup: 0
  }));

  const airenPartnerResult = await Partners.findOneAndUpdate(
    { slug: "demo.airen" },
    {
      $set: {
        name: "Airen Pharmacy & Wholesale Depot",
        slug: "demo.airen",
        markupPercentage: 0,
        contactEmail: "wholesale@airenpharmacy.com",
        contactPhone: "08031234567",
        isActive: true,
        tagline: "Direct Wholesale Pharmaceuticals & Medical Supplies in Benin City",
        primaryColor: "#0F766E",
        curatedProductIds: seededProductIds,
        curatedCatalog: curatedCatalog,
        passwordHash: demoPasswordHash,
        hideStockCount: false,
        updatedAt: new Date()
      },
      $setOnInsert: {
        createdAt: new Date()
      }
    },
    { upsert: true, returnDocument: "after" }
  );
  const airenPartnerId = airenPartnerResult._id || (await Partners.findOne({ slug: "demo.airen" }))._id;
  console.log("Airen Partner seeded with ID:", airenPartnerId.toString());

  // 4. Update 4 Benchmark Retail Buying Pharmacies in Benin City
  console.log("\n4. Updating 4 Benchmark Retail Buying Pharmacies in Benin City...");

  const benchmarks = [
    {
      slug: "apcare",
      businessName: "Apcare Pharmacy",
      address: "Airport Road, Benin City, Edo State",
      phone: "07061045458",
      email: "courageomoregbee@gmail.com",
      coords: { latitude: 6.3142, longitude: 5.6189 }
    },
    {
      slug: "kop",
      businessName: "KOP Pharmacy",
      address: "Sapele Road, Benin City, Edo State",
      phone: "08076828112",
      email: "kingsleyogbosomi1@gmail.com",
      coords: { latitude: 6.3025, longitude: 5.6321 }
    },
    {
      slug: "medlife",
      businessName: "Medlife Pharmacy",
      address: "Uselu Lagos Road, Benin City, Edo State",
      phone: "08106292804",
      email: "medlife@pharmastackx.com",
      coords: { latitude: 6.3685, longitude: 5.6142 }
    },
    {
      slug: "ernosa",
      businessName: "Ernosa Pharmacy",
      address: "Ekenwan Road, Benin City, Edo State",
      phone: "09050006638",
      email: "ernosa@gmail.com",
      coords: { latitude: 6.3218, longitude: 5.5976 }
    }
  ];

  const updatedBuyers = [];
  for (const b of benchmarks) {
    const updated = await Users.findOneAndUpdate(
      { slug: b.slug },
      {
        $set: {
          businessName: b.businessName,
          businessAddress: b.address,
          city: "Benin City",
          state: "Edo",
          phoneNumber: b.phone,
          mobile: b.phone,
          email: b.email,
          role: "pharmacy",
          isStorePublished: true,
          professionalVerificationStatus: "approved",
          emailVerified: true,
          businessCoordinates: b.coords,
          password: demoPasswordHash,
          updatedAt: new Date()
        }
      },
      { returnDocument: "after" }
    );
    if (updated) {
      updatedBuyers.push({
        _id: updated._id.toString(),
        slug: updated.slug,
        businessName: updated.businessName,
        email: updated.email,
        phone: updated.phoneNumber,
        address: updated.businessAddress,
        status: updated.professionalVerificationStatus,
        emailVerified: updated.emailVerified
      });
      console.log(`Updated buyer: ${b.businessName} (ID: ${updated._id}) - Status: approved`);
    }
  }

  // 5. Verification Queries
  console.log("\n=== VERIFICATION QUERIES ===");
  const airenUserVerify = await Users.findOne({ slug: "demo.airen" });
  console.log("Verified Airen User:", {
    _id: airenUserVerify._id.toString(),
    slug: airenUserVerify.slug,
    businessName: airenUserVerify.businessName,
    email: airenUserVerify.email,
    role: airenUserVerify.role,
    isStorePublished: airenUserVerify.isStorePublished,
    verification: airenUserVerify.professionalVerificationStatus,
    city: airenUserVerify.city,
    state: airenUserVerify.state
  });

  const airenPartnerVerify = await Partners.findOne({ slug: "demo.airen" });
  console.log("Verified Airen Partner:", {
    _id: airenPartnerVerify._id.toString(),
    slug: airenPartnerVerify.slug,
    name: airenPartnerVerify.name,
    isActive: airenPartnerVerify.isActive,
    curatedProductCount: airenPartnerVerify.curatedProductIds.length
  });

  const airenProdsVerify = await Products.find({ slug: "demo.airen" }).toArray();
  console.log(`Verified Airen Products in DB: ${airenProdsVerify.length} items.`);
  console.log("Sample 3 Products:");
  airenProdsVerify.slice(0, 3).forEach(p => {
    console.log(` - ${p.itemName} | ?${p.amount.toLocaleString()} | ${p.minSalesUnit} | ${p.category}`);
  });

  console.log(`\nVerified Buyers: ${updatedBuyers.length} accounts verified.`);

  await mongoose.disconnect();
  console.log("\n=== SEED COMPLETED CLEANLY ===");
}

seed().catch(err => {
  console.error("FATAL Seed Error:", err);
  process.exit(1);
});
