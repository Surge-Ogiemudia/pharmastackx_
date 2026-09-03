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

    const normalizedItems = rows.map((r: any) => {
      if (Array.isArray(r)) {
        let sn = String(r[0] || '');
        let name = String(r[1] || '');
        let qty = parseNum(r[2]);
        let price = parseNum(r[3]);

        // If name looks empty or is a dash, pick the first meaningful string column
        if (!name || name === '-' || name === 'Unknown Item') {
          const textCandidate = r.find((cell: any) => typeof cell === 'string' && cell.trim().length > 1 && isNaN(Number(cell)));
          if (textCandidate) name = textCandidate;
        }

        return {
          sn: sn !== '-' ? sn : '',
          name: name || 'Item',
          qty: qty || 0,
          price: price || 0,
          extra: {}
        };
      }

      let extra = r.extra && typeof r.extra === 'object' ? { ...r.extra } : {};
      const standardKeys = new Set(['sn', 'id', 'sku', 'name', 'item', 'product', 'qty', 'quantity', 'stock', 'price', 'amount', 'cost', 'extra', '_id']);
      for (const [k, v] of Object.entries(r)) {
        if (!standardKeys.has(k.toLowerCase()) && v !== undefined && v !== null && v !== '') {
          extra[k] = v;
        }
      }

      return {
        sn: String(r.sn || r.id || r.sku || ''),
        name: String(r.name || r.item || r.product || 'Item'),
        qty: parseNum(r.qty || r.quantity || r.stock),
        price: parseNum(r.price || r.amount || r.cost),
        extra: extra
      };
    });

    // Drop legacy unique index if it exists so multiple snapshots can be stored
    try {
      await ExtensionInventory.collection.dropIndex('pharmacyId_1');
    } catch (e) {
      // index already dropped or does not exist
    }

    let record;
    try {
      record = new ExtensionInventory({
        pharmacyId,
        lastSynced: new Date(),
        items: normalizedItems
      });
      await record.save();
    } catch (err: any) {
      if (err.code === 11000) {
        // Fallback to updating latest document if MongoDB unique index hasn't dropped yet
        record = await ExtensionInventory.findOneAndUpdate(
          { pharmacyId },
          { 
            pharmacyId,
            lastSynced: new Date(),
            items: normalizedItems
          },
          { upsert: true, returnDocument: 'after' }
        );
      } else {
        throw err;
      }
    }

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
