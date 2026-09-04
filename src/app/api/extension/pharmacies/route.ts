import { dbConnect } from '@/lib/mongoConnect';
import User from '@/models/User';
import ExtensionInventory from '@/models/ExtensionInventory';
import ExtensionSale from '@/models/ExtensionSale';
import PMSCredential from '@/models/PMSCredential';
import Product from '@/models/Product';
import mongoose from 'mongoose';
import { NextResponse } from 'next/server';

// Check if a string is a valid MongoDB ObjectId
function isValidObjectId(id: string) {
  return mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === id;
}

export async function GET() {
  try {
    await dbConnect();

    // 1. Web POS Users
    const activeInvIds = await ExtensionInventory.distinct('pharmacyId');
    const activeSaleIds = await ExtensionSale.distinct('pharmacyId');
    const activeCredIds = await PMSCredential.distinct('pharmacyId');

    // 2. Desktop Sync Users (identified by having products with source 'synkk')
    const activeDesktopSlugs = await Product.distinct('slug', { source: 'synkk' });
    const desktopUsers = await User.find({ slug: { $in: activeDesktopSlugs } }).select('_id');
    const activeDesktopIds = desktopUsers.map(u => String(u._id));

    const allActiveIds = Array.from(new Set([...activeInvIds, ...activeSaleIds, ...activeCredIds, ...activeDesktopIds]));

    // Only query User collection with valid ObjectIds — skip placeholders like "DEFAULT"
    const validObjectIds = allActiveIds.filter(id => isValidObjectId(String(id)));
    const invalidIds = allActiveIds.filter(id => !isValidObjectId(String(id)));

    const users = validObjectIds.length > 0
      ? await User.find({ _id: { $in: validObjectIds } }).select('businessName username slug email')
      : [];

    const formatted = users.map(u => ({
      id: String(u._id),
      name: u.businessName || u.username || u.slug || 'Pharmacy Branch'
    }));

    // Add valid ObjectIds that have no matching User doc (real users from prod DB)
    const matchedIds = users.map(u => String(u._id));
    for (const id of validObjectIds) {
      if (!matchedIds.includes(String(id))) {
        formatted.push({
          id: String(id),
          name: `Pharmacy (${String(id).slice(-6)})`
        });
      }
    }

    // Skip invalid placeholder IDs entirely — they are test/fallback artifacts
    // (e.g. "DEFAULT" saved when no user was logged in yet)

    return NextResponse.json({
      success: true,
      pharmacies: formatted
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
