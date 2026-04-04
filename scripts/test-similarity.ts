
import { dbConnect } from '../src/lib/mongoConnect';
import Product from '../src/models/Product';
import mongoose from 'mongoose';

// --- CONFIGURATION ---
const testProductName = "Pocco Atenolol";

const runTest = async () => {
    console.log("Connecting to the database...");
    await dbConnect();
    console.log("Database connected.");

    try {
        // 1. Find the product we want to test
        console.log(`Finding test product: "${testProductName}"`);
        const testProduct = await Product.findOne({ itemName: testProductName });

        if (!testProduct || !testProduct.itemNameVector) {
            console.error(`Error: Could not find product "${testProductName}" or it does not have a vector.`);
            return;
        }

        console.log("Found product. Using its vector to find similar items...");

        // 2. Use its vector to perform a similarity search
        const similarProducts = await Product.aggregate([
            {
                $vectorSearch: {
                    index: "vector_index",
                    path: "itemNameVector",
                    queryVector: testProduct.itemNameVector,
                    numCandidates: 100,
                    limit: 5,
                },
            },
            {
                $project: {
                    itemName: 1,
                    score: { $meta: "vectorSearchScore" },
                },
            },
        ]);

        // 3. Print the results
        console.log(`
--- Top 5 products similar to "${testProductName}" ---`);
        console.log(JSON.stringify(similarProducts, null, 2));
        console.log(`
- The 'score' indicates similarity (higher is better).
- The top result should be the product itself.
`);


    } catch (error) {
        console.error("An error occurred during the similarity test:", error);
    } finally {
        console.log("Closing database connection.");
        await mongoose.connection.close();
    }
};

runTest().catch(console.error);
