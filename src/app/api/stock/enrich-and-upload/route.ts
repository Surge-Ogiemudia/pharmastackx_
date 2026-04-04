
import { NextResponse, NextRequest } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { dbConnect } from '@/lib/mongoConnect';
import Product, { IProduct } from '@/models/Product';
import EnrichmentLock, { LOCK_NAME } from '@/models/EnrichmentLock';
import { isValidObjectId } from 'mongoose';

const fullEnrichmentPrompt = `
You are a world-class pharmaceutical data enrichment specialist. Your primary goal is to return clean, accurate data and a highly relevant product image.

**CRITICAL RULES:**
1.  **INPUT:** You will receive a JSON object: <RAW_INVENTORY_DATA>.
2.  **NEVER CHANGE CORE DATA:** The user's input for the item's name, price, and stock level is the absolute source of truth. Do NOT change it.
3.  **ENRICHMENT (FILL BLANKS):** Your main task is to fill in the following fields if they are empty, using your internal knowledge and a targeted web search:
    *   \\\`active_ingredient\\\`: The primary active pharmaceutical ingredient(s).
    *   \\\`drug_class\\\`: The main therapeutic or pharmaceutical category.
    *   \\\`unit_form\\\`: The specific packaging, e.g., "Box of 30 tablets", "500ml bottle", "Blister pack of 10".
    *   \\\`is_pom\\\`: A boolean (\\\`true\\\`/\\\`false\\\`) for whether it is a Prescription-Only Medicine.
4.  **IMAGE SEARCH & VALIDATION (MOST IMPORTANT):**
    *   You MUST perform a web search to find a high-quality, professional, and visually accurate image of the product.
    *   **SCRUTINIZE THE IMAGE:** The image must EXACTLY match the product name and form. For example, if the product is "Vitamin C Injection", the image CANNOT be of "Vitamin C Tablets".
    *   **NO CONFIDENCE, NO IMAGE:** If you are less than 99% certain that the image is a perfect match, you MUST return an empty string ("") for the \\\`found_image_url\\\`. Do not guess. Returning a wrong image is worse than returning no image.
5.  **OUTPUT:** Your final output MUST be a single, valid JSON object and nothing else.

**Required JSON Output Format:**
{
  "active_ingredient": "string",
  "drug_class": "string",
  "unit_form": "string",
  "is_pom": "boolean",
  "found_image_url": "string"
}
`;



const validationPrompt = `
You are an expert pharmaceutical data analyst. Your task is to validate a user's product against a potential database match that has a medium confidence score.
1.  **ANALYZE DATA:** You will get <RAW_INVENTORY_DATA> from the user and a <DATABASE_MATCH> from our system.
2.  **PRIORITIZE DATABASE:** The <DATABASE_MATCH> is likely correct. Use its 'active_ingredient', 'drug_class', and 'unit_form' unless they are clearly wrong.
3.  **CLEAN USER'S NAME:** Clean up the user's item name from <RAW_INVENTORY_DATA> to create 'cleaned_name', but almost always never change the name.
4.  **EXTRACT USER'S DATA:** The user's file is the source of truth for 'amount' and 'amount_in_stock'.
5.  **CONFIDENCE & PUBLISH:** Based on your analysis, set 'is_published' to true if you are confident the match is correct, otherwise false.
6.  **DO NOT FIND IMAGE:** You do not need to find an image.
7.  **OUTPUT FORMAT:** Return ONLY a single, valid JSON object.

Required JSON Output:
{
  
  "active_ingredient": "string",
  "drug_class": "string",
  "unit_form": "string",
  "is_pom": "boolean",
  
  "is_published": "boolean"
}`;


// --- SHARED AI LOGIC (MODEL NAME CORRECTED) ---
async function enrichProduct(product: IProduct, genAI: GoogleGenerativeAI): Promise<any> {
    const itemName = product.itemName;
    const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
    const queryVector = (await embeddingModel.embedContent(itemName)).embedding.values;

    const similarProducts = await Product.aggregate([
        { $vectorSearch: { index: "vector_index", path: "itemNameVector", queryVector, numCandidates: 100, limit: 1 } },
        { $project: { _id: 0, itemName: 1, activeIngredient: 1, category: 1, imageUrl: 1, POM: 1, info: 1, score: { $meta: "vectorSearchScore" } } },
    ]);
    const topMatch = similarProducts.length > 0 ? similarProducts[0] : null;
    const matchScore = topMatch ? topMatch.score * 100 : 0;

    let updateData: any;

    try {
        if (matchScore >= 98) {
            updateData = {
                activeIngredient: topMatch.activeIngredient,
                category: topMatch.category,
                imageUrl: topMatch.imageUrl || product.imageUrl || '',
                info: topMatch.info,
                POM: topMatch.POM,
                isPublished: false, 
            };
        } else {
            const generationModel = genAI.getGenerativeModel({
                model: "gemini-2.5-flash",
                generationConfig: { responseMimeType: "application/json" },
            });

            if (matchScore >= 70) {
                const prompt = `<RAW_INVENTORY_DATA>\n${JSON.stringify(product)}\n</RAW_INVENTORY_DATA>\n\n<DATABASE_MATCH>\n${JSON.stringify(topMatch)}\n</DATABASE_MATCH>`;
                const result = await generationModel.generateContent([validationPrompt, prompt]);
                const aiData = JSON.parse(result.response.text());
                updateData = {
                    itemName: aiData.cleaned_name || itemName,
                    activeIngredient: aiData.active_ingredient,
                    category: aiData.drug_class,
                    info: aiData.unit_form,
                    POM: aiData.is_pom,
                    isPublished: false,
                };
            } else {
                const prompt = `<RAW_INVENTORY_DATA>\n${JSON.stringify(product)}\n</RAW_INVENTORY_DATA>`;
                const result = await generationModel.generateContent([fullEnrichmentPrompt, prompt]);
                const aiData = JSON.parse(result.response.text());
                updateData = {
                    itemName: aiData.cleaned_name || itemName,
                    activeIngredient: aiData.active_ingredient,
                    category: aiData.drug_class,
                    info: aiData.unit_form,
                    imageUrl: aiData.found_image_url || product.imageUrl || '',
                    POM: aiData.is_pom,
                    isPublished: false,
                };
            }
        }
    } catch (aiError: any) {
        console.warn(`[Enrich-Single] AI enrichment failed for "${itemName}". Error: ${aiError.message}`);
        return { enrichmentStatus: 'completed', category: 'Enrichment-Failed' };
    }
    return { ...updateData, enrichmentStatus: 'completed' };
}


export async function GET(req: NextRequest) {
    console.log("\n\n--- [ENRICHMENT WORKER] The GET endpoint has been triggered! Attempting to start the loop. ---\n");

    await dbConnect();

    try {
        await EnrichmentLock.create({ lockName: LOCK_NAME });
    } catch (error: any) {
        if (error.code === 11000) { 
            console.log('[Gatekeeper-GET] Enrichment process is already running. Another trigger will be ignored.');
            return NextResponse.json({ message: "Enrichment process already active." }, { status: 200 });
        }
        console.error('[Gatekeeper-GET] Could not create enrichment lock:', error);
        return NextResponse.json({ message: 'Failed to acquire enrichment lock.' }, { status: 500 });
    }

    console.log('[Gatekeeper-GET] Lock acquired. Starting enrichment process.');
    const BATCH_SIZE = 5; 
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    let processedCount = 0;

    try {
        while (true) {
            const productsToProcess = await Product.find({ enrichmentStatus: { $in: ['pending', 'failed'] } }).limit(BATCH_SIZE);

            if (productsToProcess.length === 0) {
                console.log('[Gatekeeper-GET] No more pending products to enrich. Process finished.');
                break; 
            }

            const productIds = productsToProcess.map(p => p._id);
            await Product.updateMany({ _id: { $in: productIds } }, { $set: { enrichmentStatus: 'processing' } });
            
            console.log(`[Gatekeeper-GET] Processing batch of ${productsToProcess.length} products sequentially.`);

            for (const product of productsToProcess) {
                try {
                    const updateData = await enrichProduct(product, genAI);
                    await Product.updateOne({ _id: product._id }, { $set: updateData });
                    console.log(`[Gatekeeper-Worker] Successfully enriched: "${product.itemName}"`);
                } catch (itemError: any) {
                    console.error(`[Gatekeeper-Worker] FAILED to process "${product.itemName}". Error: ${itemError.message}`);
                    await Product.updateOne({ _id: product._id }, { $set: { enrichmentStatus: 'failed' } });
                }
            }
            
            processedCount += productsToProcess.length;
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        return NextResponse.json({ message: `Enrichment process completed successfully. Total processed: ${processedCount}` });

    } catch (error: any) {
        console.error('[Gatekeeper-GET] Fatal error during batch processing:', error);
        return NextResponse.json({ message: 'An error occurred during batch processing.' }, { status: 500 });

    } finally {
        await EnrichmentLock.deleteOne({ lockName: LOCK_NAME });
        console.log('[Gatekeeper-GET] Lock released.');
    }
}


import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import User from '@/models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

export async function POST(req: NextRequest) {
    try {
        await dbConnect();

        // AUTH CHECK
        const cookieStore = await cookies();
        const sessionToken = cookieStore.get('session_token');
        if (!sessionToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        
        const payload = jwt.verify(sessionToken.value, JWT_SECRET) as { userId: string };
        const user = await User.findById(payload.userId).select('role businessName').lean();
        
        if (!user || !['admin', 'pharmacy', 'pharmacist', 'stockManager'].includes(user.role)) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { productId } = await req.json();

        if (!productId || !isValidObjectId(productId)) {
            return NextResponse.json({ message: 'Valid productId is required.' }, { status: 400 });
        }

        const product = await Product.findById(productId);
        if (!product) {
            return NextResponse.json({ message: 'Product not found.' }, { status: 404 });
        }

        // OWNERSHIP CHECK
        if (user.role !== 'admin' && user.role !== 'stockManager' && user.businessName !== product.businessName) {
            return NextResponse.json({ error: 'Forbidden: You can only enrich your own products' }, { status: 403 });
        }

        console.log(`[POST-Manual] Starting manual re-enrichment for "${product.itemName}" (ID: ${productId})`);
        await Product.updateOne({ _id: productId }, { $set: { enrichmentStatus: 'processing' } });

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
        const updateData = await enrichProduct(product, genAI);

        delete updateData.itemNameVector;

        const updatedProduct = await Product.findByIdAndUpdate(productId, { $set: updateData }, { new: true });

        console.log(`[POST-Manual] Successfully re-enriched and saved: "${updatedProduct?.itemName}"`);

        return NextResponse.json({
            message: 'Product re-enriched successfully.',
            product: updatedProduct,
        }, { status: 200 });

    } catch (error: any) {
        console.error('[POST-Manual] Fatal error in manual enrichment:', error);
        return new NextResponse(JSON.stringify({ message: 'An internal server error occurred.' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
