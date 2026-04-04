import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import BulkUpload from '@/models/BulkUpload';
import Product, { IProduct } from '@/models/Product';
import Fuse from 'fuse.js';
import Papa from 'papaparse';

// Helper to find a value by case-insensitive key search
const findValueByKey = (obj: any, possibleKeys: string[]): any => {
    if (!obj) return undefined;
    const lowerCaseKeys = possibleKeys.map(k => k.toLowerCase());
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const lowerCaseKey = key.trim().toLowerCase();
            if (lowerCaseKeys.includes(lowerCaseKey)) {
                return obj[key];
            }
        }
    }
    return undefined;
};

export async function GET(req: NextRequest) {
  await dbConnect();
  const businessName = req.nextUrl.searchParams.get("businessName");

  if (!businessName) {
    return NextResponse.json({ message: 'businessName query parameter is required' }, { status: 400 });
  }
  try {
    const uploads = await BulkUpload.find({ businessName })
      .sort({ uploadedAt: -1 })
      .limit(20);
    return NextResponse.json({ uploads });
  } catch (error) {
    console.error('Error fetching bulk upload history:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  await dbConnect();

  try {
    const { fileName, fileContent, businessName, coordinates } = await req.json();

    if (!fileName || !fileContent || !businessName) {
      return NextResponse.json({ message: 'Server validation failed: fileName, fileContent, and businessName are required.' }, { status: 400 });
    }

    const parseResult = Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
    });
    
    const rawProducts = parseResult.data as any[];

    if (!rawProducts || rawProducts.length === 0) {
        return NextResponse.json({ message: 'The provided file content is empty or could not be parsed on the server.' }, { status: 400 });
    }

    // --- THE PERMANENT FIX ---
    const bulkUpload = await BulkUpload.create({
      fileName: fileName,       // Corrected field name
      fileContent: fileContent,   // Added the missing required field
      itemCount: rawProducts.length,
      businessName: businessName,
    });
    // --- END OF FIX ---

    const allDbProducts = await Product.find({}, 'itemName activeIngredient category POM info imageUrl').lean();

    const fuse = new Fuse(allDbProducts, {
      keys: ['itemName'],
      includeScore: true,
      threshold: 0.3, 
    });

    const productsToCreate: any[] = [];
    const errors: any[] = [];
    let highConfidenceMatches = 0;
    let lowConfidenceDrafts = 0;

    for (const rawItem of rawProducts) {
      const itemName = findValueByKey(rawItem, ['item name', 'product', 'name', 'item', 'product name']);
      const itemAmount = Number(findValueByKey(rawItem, ['amount', 'price', 'sellingprice', '₦'])) || 0;

      if (!itemName || String(itemName).trim() === '') {
        errors.push({ message: `Missing 'Item Name' in one row.`, item: rawItem });
        continue;
      }

      const trimmedItemName = String(itemName).trim();
      const results = fuse.search(trimmedItemName);
      const topMatch = results.length > 0 ? results[0] : null;

      const isHighConfidence = topMatch && topMatch.score != null && topMatch.score <= 0.01;

      if (isHighConfidence) {
        highConfidenceMatches++;
        const dbProduct = topMatch.item;
        productsToCreate.push({
          itemName: trimmedItemName,
          activeIngredient: dbProduct.activeIngredient,
          category: dbProduct.category,
          amount: itemAmount,
          imageUrl: dbProduct.imageUrl || '',
          businessName: businessName,
          isPublished: true,
          POM: dbProduct.POM,
          slug: businessName.toLowerCase().replace(/\s+/g, '-'),
          info: dbProduct.info,
          coordinates: coordinates || '',
          bulkUploadId: bulkUpload._id,
          enrichmentStatus: 'completed', 
        });
      } 
      else {
        lowConfidenceDrafts++;
        productsToCreate.push({
          itemName: trimmedItemName,
          activeIngredient: 'N/A',
          category: 'N/A',
          amount: itemAmount,
          imageUrl: '',
          businessName: businessName,
          isPublished: false,
          POM: false,
          slug: businessName.toLowerCase().replace(/\s+/g, '-'),
          info: '',
          coordinates: coordinates || '',
          bulkUploadId: bulkUpload._id,
          enrichmentStatus: 'pending',
        });
      }
    }

    const savedDocsFromDb: IProduct[] = [];
    if (productsToCreate.length > 0) {
        for (const productData of productsToCreate) {
            try {
                const savedDoc = await Product.create(productData);
                savedDocsFromDb.push(savedDoc);
            } catch (singleSaveError) {
                console.error(`[BULK-UPLOAD] Failed to save item: ${productData.itemName}`, singleSaveError);
                errors.push({ message: `Failed to save item: ${productData.itemName}`, item: productData });
            }
        }
    }

    const savedProductsForResponse = savedDocsFromDb.map(doc => ({
        _id: (doc._id as any).toString(),
        itemName: doc.itemName,
        activeIngredient: doc.activeIngredient,
        category: doc.category,
        amount: doc.amount,
        imageUrl: doc.imageUrl,
        businessName: doc.businessName,
        coordinates: doc.coordinates,
        info: doc.info,
        POM: doc.POM,
        slug: doc.slug,
        isPublished: doc.isPublished,
        bulkUploadId: doc.bulkUploadId?.toString() ?? '',
        enrichmentStatus: doc.enrichmentStatus,
    }));

    const summary = `${highConfidenceMatches} items were instantly published. ${lowConfidenceDrafts} items were saved as drafts. A total of ${savedProductsForResponse.length} items were processed.`;

    return NextResponse.json({ 
        message: summary,
        totalProcessed: savedProductsForResponse.length,
        savedProducts: savedProductsForResponse.slice(0, 50), // Truncate to save bandwidth
        errors: errors,
    }, { status: 201 });

  } catch (error: any) {
    console.error('[Bulk-Upload] Fatal error:', error);
    return NextResponse.json({ message: 'An internal server error occurred during the upload process.', details: error.message }, { status: 500 });
  }
}
