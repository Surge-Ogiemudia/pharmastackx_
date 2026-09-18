import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import Partner from '@/models/Partner';
import Product from '@/models/Product';

const AIREN_PRODUCTS = [
  {
    itemName: "Emzor Paracetamol 500mg (Carton of 100)",
    activeIngredient: "Paracetamol 500mg",
    category: "Pain Relief",
    amount: 14500,
    minSalesUnit: "Carton",
    quantity: 500,
    POM: false,
    manufacturer: "Emzor Pharmaceuticals",
    imageUrl: "https://images.pexels.com/photos/3683053/pexels-photo-3683053.jpeg?auto=compress&cs=tinysrgb&w=640",
    info: "Wholesale carton containing 100 packs. Fast and effective relief from aches and pains."
  },
  {
    itemName: "Amatem Softgel (Pack of 10)",
    activeIngredient: "Artemether + Lumefantrine",
    category: "Antimalarial",
    amount: 12000,
    minSalesUnit: "Pack of 10",
    quantity: 150,
    POM: false,
    manufacturer: "Elbe Pharma",
    imageUrl: "https://images.pexels.com/photos/3683041/pexels-photo-3683041.jpeg?auto=compress&cs=tinysrgb&w=640",
    info: "Wholesale bundle. First-line ACT antimalarial softgel for faster absorption."
  },
  {
    itemName: "Augmentin 1g (Pack of 6)",
    activeIngredient: "Amoxicillin + Clavulanic Acid 1g",
    category: "Antibiotics",
    amount: 35000,
    minSalesUnit: "Pack of 6",
    quantity: 80,
    POM: true,
    manufacturer: "GSK",
    imageUrl: "https://images.pexels.com/photos/3652097/pexels-photo-3652097.jpeg?auto=compress&cs=tinysrgb&w=640",
    info: "Wholesale Pack of 6 boxes. Broad-spectrum penicillin antibiotic."
  },
  {
    itemName: "Benylin with Codeine 100ml (Carton of 24)",
    activeIngredient: "Diphenhydramine + Codeine",
    category: "Cough & Cold",
    amount: 42000,
    minSalesUnit: "Carton",
    quantity: 100,
    POM: true,
    manufacturer: "Johnson & Johnson",
    imageUrl: "https://images.pexels.com/photos/3683107/pexels-photo-3683107.jpeg?auto=compress&cs=tinysrgb&w=640",
    info: "Wholesale carton of 24 bottles. Effective relief for dry, irritating coughs."
  },
  {
    itemName: "Vitabiotics Wellwoman Original (Pack of 5)",
    activeIngredient: "Multivitamins & Minerals",
    category: "Vitamins & Supplements",
    amount: 28500,
    minSalesUnit: "Pack of 5",
    quantity: 200,
    POM: false,
    manufacturer: "Vitabiotics",
    imageUrl: "https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=640",
    info: "Wholesale bundle of 5. Comprehensive multivitamin for women's health."
  },
  {
    itemName: "Amlodipine 5mg (Carton of 50)",
    activeIngredient: "Amlodipine 5mg",
    category: "Cardiovascular",
    amount: 9000,
    minSalesUnit: "Carton",
    quantity: 300,
    POM: true,
    manufacturer: "Fidson Healthcare",
    imageUrl: "https://images.pexels.com/photos/159211/headache-pain-pills-medication-159211.jpeg?auto=compress&cs=tinysrgb&w=640",
    info: "Wholesale carton of 50 packs. Calcium channel blocker for hypertension."
  },
  {
    itemName: "Lonart DS (Pack of 12)",
    activeIngredient: "Artemether 80mg + Lumefantrine 480mg",
    category: "Antimalarial",
    amount: 18000,
    minSalesUnit: "Pack of 12",
    quantity: 200,
    POM: true,
    manufacturer: "Greenlife Pharmaceuticals",
    imageUrl: "https://images.pexels.com/photos/3683081/pexels-photo-3683081.jpeg?auto=compress&cs=tinysrgb&w=640",
    info: "Wholesale Pack of 12 boxes. Double strength ACT for acute uncomplicated malaria."
  },
  {
    itemName: "Panadol Extra (Carton of 100)",
    activeIngredient: "Paracetamol 500mg + Caffeine 65mg",
    category: "Pain Relief",
    amount: 16500,
    minSalesUnit: "Carton",
    quantity: 400,
    POM: false,
    manufacturer: "GSK",
    imageUrl: "https://images.pexels.com/photos/139398/thermometer-headache-pain-pills-139398.jpeg?auto=compress&cs=tinysrgb&w=640",
    info: "Wholesale carton containing 100 packs. Extra strength pain relief with caffeine."
  }
];

export async function GET() {
  try {
    await dbConnect();
    
    // Check if partner exists
    let partner = await Partner.findOne({ slug: 'airen' });
    if (!partner) {
      partner = await Partner.create({
        name: 'Airen Pharmacy & Wholesale Depot',
        slug: 'airen',
        contactPhone: '07067593825',
        contactEmail: 'Business@airen.health',
        businessType: 'Wholesale Depot',
      });
    }

    // Delete existing products to avoid duplicates
    await Product.deleteMany({ slug: 'airen' });

    // Insert new products
    const docs = AIREN_PRODUCTS.map(p => ({
      ...p,
      name: p.itemName,
      price: p.amount,
      slug: 'airen',
      businessName: 'Airen Pharmacy & Wholesale Depot',
      partnerId: partner._id,
      inStock: true,
      isPublished: true
    }));

    const insertedProducts = await Product.insertMany(docs);
    const productIds = insertedProducts.map((p: any) => p._id);

    // Add them to the partner's curated shelf and set isActive: true
    await Partner.updateOne(
      { slug: 'airen' },
      { 
        $set: { 
          curatedProductIds: productIds,
          isActive: true
        }
      }
    );

    return NextResponse.json({ success: true, count: docs.length, message: 'Airen products seeded' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
