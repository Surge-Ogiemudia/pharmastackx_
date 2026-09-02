import { dbConnect } from '@/lib/mongoConnect';
import ExtensionSale from '@/models/ExtensionSale';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    await dbConnect();
    const { pharmacyId, terminalId, items, source } = await req.json();

    if (!pharmacyId || !Array.isArray(items)) {
      return NextResponse.json({ success: false, error: 'Pharmacy ID and items array required' }, { status: 400 });
    }

    const parseNum = (val: any) => {
      if (typeof val === 'number') return val;
      if (!val) return 0;
      const cleaned = String(val).replace(/[^0-9.-]+/g, "");
      return parseFloat(cleaned) || 0;
    };

    const normalizedItems = items.map((r: any) => ({
      name: String(r.name || 'Item'),
      qty: parseNum(r.qty || r.quantity || 1),
      price: parseNum(r.price || r.amount || 0)
    }));

    const totalAmount = normalizedItems.reduce((sum: number, item: any) => sum + ((item.price || 0) * (item.qty || 1)), 0);

    const sale = new ExtensionSale({
      pharmacyId,
      terminalId: terminalId || 'Terminal-1',
      timestamp: new Date(),
      items: normalizedItems,
      totalAmount,
      source
    });

    await sale.save();

    return NextResponse.json({
      success: true,
      message: 'Sale recorded successfully',
      saleId: String(sale._id),
      totalAmount
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
