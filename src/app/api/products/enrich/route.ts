import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { dbConnect } from '@/lib/mongoConnect';
import Product from '@/models/Product';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
  try {
    const { productId, productName } = await req.json();
    if (!productId || !productName) {
      return NextResponse.json({ error: 'productId and productName required' }, { status: 400 });
    }

    await dbConnect();
    const product = await Product.findById(productId);
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const hasCategory = product.category && product.category !== 'N/A' && product.category !== 'Uncategorized';
    const hasIngredient = product.activeIngredient && product.activeIngredient !== 'N/A';
    const hasInfo = product.info && product.info !== 'N/A' && product.info.length > 10;

    if (hasCategory && hasIngredient && hasInfo) {
      return NextResponse.json({
        enriched: false,
        data: { category: product.category, activeIngredient: product.activeIngredient, info: product.info }
      });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(
      `You are a pharmaceutical database. Given this product name from a Nigerian pharmacy, return ONLY a JSON object with these fields. Only include a field if you are CERTAIN — do not guess. If unsure, set the value to null.

Product name: "${productName}"

Return ONLY this JSON (no markdown, no explanation):
{
  "activeIngredient": "the active pharmaceutical ingredient(s)" or null,
  "category": "one of: Cardiovascular, Diabetes, Antibiotic, Pain Relief, Respiratory, Skincare, Supplements, Antimalaria, Gastrointestinal, Vitamins, Hormonal, Antifungal, Antihistamine, CNS, Ophthalmic" or null,
  "info": "1-2 sentence pharmaceutical description of what this drug does and what it's used for" or null
}`
    );

    const text = result.response.text().trim()
      .replace(/^```(?:json)?\n?/i, '')
      .replace(/\n?```$/i, '')
      .trim();

    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      return NextResponse.json({ enriched: false, error: 'AI returned invalid JSON' });
    }

    const updates: any = {};
    if (parsed.activeIngredient && !hasIngredient) {
      updates.activeIngredient = parsed.activeIngredient;
    }
    if (parsed.category && !hasCategory) {
      updates.category = parsed.category;
    }
    if (parsed.info && !hasInfo) {
      updates.info = parsed.info;
    }

    if (Object.keys(updates).length > 0) {
      updates.enrichmentStatus = 'ai_enriched';
      await Product.findByIdAndUpdate(productId, updates);
    }

    return NextResponse.json({
      enriched: Object.keys(updates).length > 0,
      data: {
        activeIngredient: updates.activeIngredient || product.activeIngredient,
        category: updates.category || product.category,
        info: updates.info || product.info,
      }
    });
  } catch (err: any) {
    console.error('[/api/products/enrich] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
