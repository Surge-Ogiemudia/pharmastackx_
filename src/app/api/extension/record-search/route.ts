import { dbConnect } from '@/lib/mongoConnect';
import ExtensionSearch from '@/models/ExtensionSearch';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();

    const { pharmacyId, searches, query, resultCount, terminalId, url } = body;

    if (!pharmacyId) {
      return NextResponse.json({ success: false, error: 'Pharmacy ID is required' }, { status: 400 });
    }

    // Support both batch of searches and single search entry
    if (Array.isArray(searches) && searches.length > 0) {
      const docs = searches
        .filter((s: any) => s && s.query && typeof s.query === 'string' && s.query.trim().length >= 2)
        .map((s: any) => ({
          pharmacyId,
          terminalId: s.terminalId || terminalId || 'Terminal-1',
          query: s.query.trim(),
          resultCount: typeof s.resultCount === 'number' ? s.resultCount : 0,
          url: s.url || '',
          timestamp: s.timestamp ? new Date(s.timestamp) : new Date()
        }));

      if (docs.length > 0) {
        await ExtensionSearch.insertMany(docs);
      }

      return NextResponse.json({
        success: true,
        message: `Saved ${docs.length} search logs`,
        count: docs.length
      });
    }

    if (query && typeof query === 'string' && query.trim().length >= 2) {
      const record = new ExtensionSearch({
        pharmacyId,
        terminalId: terminalId || 'Terminal-1',
        query: query.trim(),
        resultCount: typeof resultCount === 'number' ? resultCount : 0,
        url: url || '',
        timestamp: new Date()
      });
      await record.save();

      return NextResponse.json({
        success: true,
        message: 'Search recorded successfully',
        search: record
      });
    }

    return NextResponse.json({ success: false, error: 'Valid query or searches array required' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const pharmacyId = searchParams.get('pharmacyId');
    const all = searchParams.get('all');

    if (all === 'true') {
      await ExtensionSearch.deleteMany({});
      return NextResponse.json({ success: true, message: 'All search records cleared' });
    }

    if (pharmacyId) {
      await ExtensionSearch.deleteMany({ pharmacyId });
      return NextResponse.json({ success: true, message: `Searches cleared for ${pharmacyId}` });
    }

    // Default: delete test placeholders
    await ExtensionSearch.deleteMany({ query: { $in: ['Lonart DS', 'Augmentin 1g Tablets'] } });
    return NextResponse.json({ success: true, message: 'Test placeholders cleared' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
