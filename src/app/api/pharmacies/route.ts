
import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import User from '@/models/User';

const PHARMACIES_PER_PAGE = 5;

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '0', 10);
    const searchQuery = searchParams.get('search') || '';
    const businessNameQuery = searchParams.get('businessName') || '';
    const fetchAll = searchParams.get('all') === 'true';

    const query: any = { role: 'pharmacy' };

    // Specific query from the signup form to find claimable pharmacies
    if (businessNameQuery) {
      query.businessName = { $regex: businessNameQuery, $options: 'i' };
    } 
    // General search query for listing pharmacies elsewhere in the app
    else if (searchQuery) {
      query.$or = [
        { businessName: { $regex: searchQuery, $options: 'i' } },
        { businessAddress: { $regex: searchQuery, $options: 'i' } }
      ];
    }

    let fieldsToSelect = '_id businessName slug businessAddress city state';
    // If this is a request to check for a claimable pharmacy, we must include the email
    if (businessNameQuery) {
      fieldsToSelect += ' email';
    }

    let pharmaciesQuery = User.find(query)
      .select(fieldsToSelect);

    // Do not paginate the results when checking for a business name
    if (!fetchAll && !businessNameQuery) {
      pharmaciesQuery = pharmaciesQuery
        .skip(page * PHARMACIES_PER_PAGE)
        .limit(PHARMACIES_PER_PAGE);
    }

    const pharmacies = await pharmaciesQuery.lean();

    return NextResponse.json({ pharmacies }, { 
        status: 200,
        headers: {
            'Cache-Control': 's-maxage=300, stale-while-revalidate=600',
        }
    });

  } catch (error) {
    console.error('Error fetching pharmacies:', error);
    return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
  }
}
