import { GoogleGenerativeAI } from '@google/generative-ai';
import { medicineDictionary } from './medicineDictionary';

export interface ClassifiedProduct {
  item: any;
  status: 'approved' | 'rejected';
  classificationMethod?: 'database_match' | 'ai_classified';
  reason?: string;
}

export async function classifyProducts(updates: any[]): Promise<{ approved: any[], rejected: any[] }> {
  const approved: any[] = [];
  const rejected: any[] = [];
  const aiQueue: any[] = [];

  // Step 1: Fast Database Matching
  for (const item of updates) {
    const itemNameStr = String(item.itemName || item.name || '').toLowerCase().trim();
    
    // Check if any keyword in the dictionary is included in the item name
    const isMatch = medicineDictionary.some(keyword => {
      // Use word boundaries or simple exact matches for very short keywords, but includes is generally fine 
      // if the keywords are carefully selected.
      if (keyword.length <= 3) {
        return new RegExp(`\\b${keyword}\\b`, 'i').test(itemNameStr);
      }
      return itemNameStr.includes(keyword);
    });

    if (isMatch) {
      item.classificationMethod = 'database_match';
      approved.push(item);
    } else {
      aiQueue.push(item);
    }
  }

  // Step 2: AI Batch Fallback
  if (aiQueue.length > 0) {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("No Gemini API key found. Falling back to approving all ambiguous items.");
      aiQueue.forEach(item => {
        item.classificationMethod = 'ai_classified';
        approved.push(item);
      });
      return { approved, rejected };
    }

    const geminiClient = new GoogleGenerativeAI(apiKey);
    const model = geminiClient.getGenerativeModel({ model: "gemini-3.1-flash-lite" }); // fallback could be gemini-1.5-flash

    // Process in batches of 50 to avoid timeout or token limits
    const BATCH_SIZE = 50;
    for (let i = 0; i < aiQueue.length; i += BATCH_SIZE) {
      const batch = aiQueue.slice(i, i + BATCH_SIZE);
      const batchNames = batch.map(b => String(b.itemName || b.name || '')).filter(n => n.length > 0);

      const prompt = `System Instruction: You are an expert pharmacy classifier.
You will be given a JSON array of product names found in a pharmacy's inventory.
Classify each item as either a medicine/health product or not.

Categories to approve (isMedicine = true):
- Medicines (Prescription or OTC)
- Vitamins and Health Supplements
- Medical Devices (glucometers, BP monitors, etc.)
- Family Planning products
- Wound care products
- Paediatric formulas

Categories to exclude (isMedicine = false):
- Cosmetics, Makeup, Skincare (non-medicated)
- General Food and Beverages, Biscuits, Sweets
- Stationery, Books
- General household items (soaps, detergents, unless medicated)
- Clothing accessories

Return ONLY a JSON array of objects with "name" and "isMedicine" (boolean).
Input items:
${JSON.stringify(batchNames)}`;

      try {
        const response = await model.generateContent(prompt);
        let aiResponseText = response.response.text().trim();
        if (aiResponseText.startsWith('```json')) aiResponseText = aiResponseText.replace(/```json/g, '').replace(/```/g, '').trim();
        if (aiResponseText.startsWith('```')) aiResponseText = aiResponseText.replace(/```/g, '').trim();

        const aiResults = JSON.parse(aiResponseText);
        
        // Map results back
        for (const item of batch) {
          const itemNameStr = String(item.itemName || item.name || '');
          const result = aiResults.find((r: any) => r.name === itemNameStr);
          
          if (result && result.isMedicine) {
            item.classificationMethod = 'ai_classified';
            approved.push(item);
          } else {
            rejected.push({
              ...item,
              reason: 'AI Classified as non-medicine',
              rejectionMethod: 'ai_classified'
            });
          }
        }
      } catch (err) {
        console.error("AI classification failed for batch", err);
        // On error, we gracefully fail open so we don't break the sync
        batch.forEach(item => {
          item.classificationMethod = 'ai_classified';
          approved.push(item);
        });
      }
    }
  }

  return { approved, rejected };
}
