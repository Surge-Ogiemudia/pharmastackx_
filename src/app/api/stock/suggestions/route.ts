import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import Product from '@/models/Product';
import levenshtein from 'fast-levenshtein';

export async function POST(req: NextRequest) {
  await dbConnect();
  const { itemName, currentItemId } = await req.json();

  if (!itemName) {
    return NextResponse.json({ message: 'Item name is required' }, { status: 400 });
  }

  try {
    const allItems = await Product.find({ _id: { $ne: currentItemId } });

    if (allItems.length === 0) {
      return NextResponse.json({ message: 'No other items to compare against' }, { status: 404 });
    }

    let bestMatch = null;
    let minDistance = Infinity;

    for (const item of allItems) {
      if (item.itemName) {
        // Using the new, reliable library
        const distance = levenshtein.get(itemName.toLowerCase(), item.itemName.toLowerCase());
        if (distance < minDistance) {
          minDistance = distance;
          bestMatch = item;
        }
      }
    }

    const threshold = bestMatch ? bestMatch.itemName.length * 0.6 : 0;
    if (bestMatch && minDistance < threshold) {
      return NextResponse.json(bestMatch, { status: 200 });
    } else {
      return NextResponse.json({ message: 'No close match found' }, { status: 404 });
    }
  } catch (error) {
    console.error('Error finding suggestion:', error);
    if (error instanceof Error) {
      return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
    }
    return NextResponse.json({ message: 'An unknown internal server error occurred' }, { status: 500 });
  }
}
