import { dbConnect } from '@/lib/mongoConnect';
import User from '@/models/User';
import ExtensionInventory from '@/models/ExtensionInventory';
import ExtensionSale from '@/models/ExtensionSale';
import PMSCredential from '@/models/PMSCredential';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    await dbConnect();

    // Find all pharmacy IDs that have synced inventory, sales, or PMS credentials
    const activeInvIds = await ExtensionInventory.distinct('pharmacyId');
    const activeSaleIds = await ExtensionSale.distinct('pharmacyId');
    const activeCredIds = await PMSCredential.distinct('pharmacyId');

    const allActiveIds = Array.from(new Set([...activeInvIds, ...activeSaleIds, ...activeCredIds]));

    const users = await User.find({ _id: { $in: allActiveIds } }).select('businessName username slug email');
    
    const formatted = users.map(u => ({
      id: String(u._id),
      name: u.businessName || u.username || u.slug || 'Pharmacy Branch'
    }));

    return NextResponse.json({
      success: true,
      pharmacies: formatted
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
