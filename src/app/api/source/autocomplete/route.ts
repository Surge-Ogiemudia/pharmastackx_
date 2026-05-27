import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import Product from '@/models/Product';

export async function GET(request: Request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');

    if (!query || query.length < 2) {
      return NextResponse.json({ success: true, suggestions: [] });
    }

    const regex = new RegExp(query, 'i');

    // Find distinct itemNames that match the query and are in stock and published
    const matchingProducts = await Product.find({
      itemName: regex,
      isPublished: true,
      quantity: { $gt: 0 }
    })
      .select('itemName')
      .limit(20)
      .lean();

    // Extract unique names
    const uniqueNames = [...new Set(matchingProducts.map(p => p.itemName))];

    // Take top 5 unique suggestions
    const suggestions = uniqueNames.slice(0, 5);

    return NextResponse.json({ success: true, suggestions });
  } catch (error: any) {
    console.error('Autocomplete Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
