
import { GoogleGenerativeAI } from '@google/generative-ai';
import { dbConnect } from '../src/lib/mongoConnect';
import Product from '../src/models/Product';
import mongoose from 'mongoose';

// --- CONFIGURATION ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const BATCH_SIZE = 50; // Process 50 products at a time

if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY environment variable is not set.");
}

// --- Initialize AI Model ---
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });

const runBulkUpdate = async () => {
    console.log("Connecting to the database...");
    await dbConnect();
    console.log("Database connected.");

    try {
        console.log("Fetching all products from the database...");
        const allProducts = await Product.find({}).lean(); // .lean() for performance
        console.log(`Found ${allProducts.length} products to update.`);

        for (let i = 0; i < allProducts.length; i += BATCH_SIZE) {
            const batch = allProducts.slice(i, i + BATCH_SIZE);
            console.log(`--- Processing batch ${i / BATCH_SIZE + 1} of ${Math.ceil(allProducts.length / BATCH_SIZE)} ---`);

            const updatePromises = batch.map(async (product) => {
                try {
                    // 1. Generate new vector
                    const result = await embeddingModel.embedContent(product.itemName);
                    const newVector = result.embedding.values;

                    if (!newVector || newVector.length === 0) {
                        console.warn(`Could not generate vector for "${product.itemName}". Skipping.`);
                        return;
                    }

                    // 2. Update the product in the database
                    await Product.updateOne(
                        { _id: product._id },
                        { $set: { itemNameVector: newVector } }
                    );
                     console.log(`Updated vector for: ${product.itemName}`);
                } catch (e) {
                    console.error(`Failed to process product ${product._id} (\"${product.itemName}\"):`, e);
                }
            });

            await Promise.all(updatePromises);
            console.log(`Batch ${i / BATCH_SIZE + 1} complete.`);
        }

        console.log("\n✅✅✅ Success! All product vectors have been updated.");

    } catch (error) {
        console.error("An error occurred during the bulk update process:", error);
    } finally {
        console.log("Closing database connection.");
        await mongoose.connection.close();
    }
};

runBulkUpdate().catch(console.error);
