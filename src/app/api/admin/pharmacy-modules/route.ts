import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { dbConnect } from '@/lib/mongoConnect';
import User from '@/models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

// Verify the calling user is a super-admin
async function verifySuperAdmin(req: Request) {
  // Accept either a cookie session (web) or a Bearer token (Desktop App using session_token)
  const authHeader = req.headers.get('authorization');
  let token: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else {
    const cookieStore = await cookies();
    token = cookieStore.get('session_token')?.value;
  }

  if (!token) return null;

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string; role?: string };
    const user = await User.findById(payload.userId).select('role email').lean();
    if (!user || (user as any).role !== 'admin') return null;
    return user;
  } catch {
    return null;
  }
}

// GET /api/admin/pharmacy-modules?search=xxx
// Returns a list of all pharmacy users with their current allowedModules
export async function GET(req: Request) {
  await dbConnect();

  const admin = await verifySuperAdmin(req);
  if (!admin) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') || '';

  const query: any = { role: 'pharmacy' };
  if (search) {
    query.$or = [
      { businessName: { $regex: search, $options: 'i' } },
      { slug: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const pharmacies = await User.find(query)
    .select('_id businessName slug email allowedModules')
    .lean()
    .limit(100);

  const result = pharmacies.map((p: any) => ({
    id: p._id.toString(),
    name: p.businessName || p.slug || 'Unknown',
    slug: p.slug || '',
    email: p.email || '',
    allowedModules: p.allowedModules || {},
  }));

  return NextResponse.json({ pharmacies: result }, { status: 200 });
}

// PUT /api/admin/pharmacy-modules
// Body: { pharmacySlug: string, allowedModules: Record<string, boolean> }
// Updates the allowedModules for a specific pharmacy
export async function PUT(req: Request) {
  await dbConnect();

  const admin = await verifySuperAdmin(req);
  if (!admin) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { pharmacySlug, allowedModules } = body;

  if (!pharmacySlug || typeof allowedModules !== 'object') {
    return NextResponse.json({ message: 'Invalid payload' }, { status: 400 });
  }

  const allowedKeys = ['psxWeb', 'pos', 'emr', 'dispensary', 'orders', 'source', 'staff', 'socialAi', 'synkk'];
  const sanitized: Record<string, boolean> = {};
  for (const key of allowedKeys) {
    if (typeof allowedModules[key] === 'boolean') {
      sanitized[key] = allowedModules[key];
    }
  }

  const updated = await User.findOneAndUpdate(
    { slug: pharmacySlug, role: 'pharmacy' },
    { $set: { allowedModules: sanitized } },
    { new: true }
  ).select('businessName slug allowedModules').lean();

  if (!updated) {
    return NextResponse.json({ message: 'Pharmacy not found' }, { status: 404 });
  }

  return NextResponse.json({
    message: 'Module permissions updated',
    slug: (updated as any).slug,
    allowedModules: (updated as any).allowedModules,
  }, { status: 200 });
}
