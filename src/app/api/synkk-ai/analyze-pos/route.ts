import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { dbConnect } from '@/lib/mongoConnect';
import POSIntelligence from '@/models/POSIntelligence';
import crypto from 'crypto';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { pathOrUrl, sampleData, globalContext } = await req.json();

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing Gemini API Key on Vercel Backend' }, { status: 500 });
    }

    await dbConnect();

    // 1. Generate Header Signature
    const firstLines = typeof sampleData === 'string' ? sampleData.split('\\n').slice(0, 5).join('\\n') : '';
    const headerSignature = crypto.createHash('sha256').update(firstLines).digest('hex');

    // 2. Check Intelligence Engine
    const existingIntelligence = await POSIntelligence.findOne({ headerSignature });
    
    if (existingIntelligence) {
      // CACHE HIT: Synkk instantly knows the schema!
      existingIntelligence.successCount += 1;
      existingIntelligence.lastUsedAt = new Date();
      await existingIntelligence.save();
      
      return NextResponse.json({ 
        status: 'analyzed', 
        schemaMapping: existingIntelligence.mappingSchema,
        source: 'intelligence_cache' 
      });
    }

    // 3. CACHE MISS: Let Gemini map it from scratch

    let contextStr = '';
    if (globalContext && Array.isArray(globalContext) && globalContext.length > 0) {
      contextStr = `\nFor context, here are examples of schemas you've successfully mapped across other installations:\n${JSON.stringify(globalContext, null, 2)}\nUse these patterns as hints if you see similar column names!\n`;
    }

    const prompt = `You are an expert database analyst and software engineer. I am providing you with a raw data extract or schema dump from a pharmacy POS system.
Your job is to identify the columns that correspond to the following information:
1. Medicine Name
2. Quantity in Stock
3. Unit Price
4. Expiry Date (if available)

Please return ONLY a valid JSON object with the following keys:
- "nameCol": (string)
- "qtyCol": (string)
- "priceCol": (string)
- "expiryCol": (string or null)
- "brandCol": (string or null)
- "imageCol": (string or null)
- "tableName": (string or "unknown")
${contextStr}
Here is the sample data/schema:
${sampleData}`;

    const geminiClient = new GoogleGenerativeAI(apiKey);
    const model = geminiClient.getGenerativeModel({
      model: "gemini-3.1-flash-lite",
      systemInstruction: "You are a technical data mapper that outputs strictly valid JSON without markdown wrapping or explanations."
    });

    const result = await model.generateContent(prompt);
    let schemaStr = result.response.text().trim();

    if (schemaStr.startsWith('```json')) {
      schemaStr = schemaStr.replace(/```json/g, '').replace(/```/g, '').trim();
    } else if (schemaStr.startsWith('```')) {
      schemaStr = schemaStr.replace(/```/g, '').trim();
    }

    let schemaMapping;
    try {
      schemaMapping = JSON.parse(schemaStr);
    } catch (e) {
      console.error("AI returned malformed JSON:", schemaStr);
      return NextResponse.json({ error: 'AI returned malformed JSON' }, { status: 500 });
    }

    // 4. Save new Intelligence for the global network
    await POSIntelligence.create({
      headerSignature,
      posName: pathOrUrl?.split(/[\\\\/]/).pop()?.split('.')[0] || 'Unknown System',
      fileExtension: pathOrUrl?.split('.').pop() || 'csv',
      typicalFilePathPattern: pathOrUrl || '',
      mappingSchema: schemaMapping,
      confidenceScore: 0.95
    });

    return NextResponse.json({ status: 'analyzed', schemaMapping, source: 'gemini' });

  } catch (error: any) {
    console.error('Error in analyze-pos route:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
