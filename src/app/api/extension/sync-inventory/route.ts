import { dbConnect } from '@/lib/mongoConnect';
import ExtensionInventory from '@/models/ExtensionInventory';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    await dbConnect();
    const { pharmacyId, rows } = await req.json();

    if (!pharmacyId || !Array.isArray(rows)) {
      return NextResponse.json({ success: false, error: 'Pharmacy ID and rows array required' }, { status: 400 });
    }

    const parseNum = (val: any) => {
      if (typeof val === 'number') return val;
      if (!val) return 0;
      const cleaned = String(val).replace(/[^0-9.-]+/g, "");
      return parseFloat(cleaned) || 0;
    };

    const normalizedItems = rows.map((r: any) => ({
      sn: String(r.sn || r.id || r.sku || ''),
      name: String(r.name || r.item || r.product || 'Unknown Item'),
      qty: parseNum(r.qty || r.quantity || r.stock),
      price: parseNum(r.price || r.amount || r.cost)
    }));

    const record = await ExtensionInventory.findOneAndUpdate(
      { pharmacyId },
      { 
        pharmacyId,
        lastSynced: new Date(),
        items: normalizedItems
      },
      { upsert: true, returnDocument: 'after' }
    );

    return NextResponse.json({
      success: true,
      message: 'Inventory synced successfully',
      itemCount: normalizedItems.length,
      inventory: record
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
