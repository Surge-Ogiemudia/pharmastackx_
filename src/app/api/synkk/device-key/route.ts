import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { dbConnect } from '@/lib/mongoConnect';
import User from '@/models/User';
import { bearerToken, issueDeviceKey, revokeDeviceKeys } from '@/lib/synkkDeviceKey';

const OWNER_ROLES = ['pharmacy', 'vendor', 'clinic'];
const STAFF_ROLES = ['pharmacist', 'staff', 'store_manager', 'store_keeper', 'stockManager'];

/**
 * The pharmacy the logged-in user acts for, from the session_token cookie or a
 * login JWT sent as a Bearer token (the desktop app's main process).
 */
async function sessionPharmacy(req: NextRequest) {
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;

  const bearer = bearerToken(req);
  const token = req.cookies.get('session_token')?.value || (bearer && !bearer.startsWith('sdk_') ? bearer : null);
  if (!token) return null;

  let payload: { userId?: string };
  try {
    payload = jwt.verify(token, secret) as { userId?: string };
  } catch {
    return null;
  }
  if (!payload.userId) return null;

  await dbConnect();
  const user = await User.findById(payload.userId);
  if (!user) return null;
  if (OWNER_ROLES.includes(user.role)) return user;
  if (STAFF_ROLES.includes(user.role) && user.pharmacy) {
    const pharmacy = await User.findById(user.pharmacy);
    if (pharmacy && OWNER_ROLES.includes(pharmacy.role)) return pharmacy;
  }
  return null;
}

/** Issues a device key for the logged-in pharmacy. The key is returned only once. */
export async function POST(req: NextRequest) {
  const pharmacy = await sessionPharmacy(req);
  if (!pharmacy) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!pharmacy.slug) {
    return NextResponse.json({ error: 'Pharmacy has no storefront slug yet' }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const label = typeof body?.label === 'string' ? body.label.slice(0, 60) : undefined;

  const key = await issueDeviceKey(pharmacy._id, label);
  return NextResponse.json({ key, slug: pharmacy.slug });
}

/** Revokes every device key of the logged-in pharmacy. */
export async function DELETE(req: NextRequest) {
  const pharmacy = await sessionPharmacy(req);
  if (!pharmacy) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  await revokeDeviceKeys(pharmacy._id);
  return NextResponse.json({ success: true });
}
