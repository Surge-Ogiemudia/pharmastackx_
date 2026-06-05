import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import MasterPrompt from '@/models/MasterPrompt';

// Returns the list of distinct active categories created by admin
export async function GET() {
  try {
    await dbConnect();
    const categories: string[] = await MasterPrompt.distinct('category', { isActive: true });
    return NextResponse.json({ categories });
  } catch (err) {
    console.error('GET categories error:', err);
    return NextResponse.json({ categories: [] });
  }
}
