import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { dbConnect } from '@/lib/mongoConnect';
import ExcludedDevice from '@/models/ExcludedDevice';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

async function getAdminSession() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session_token');
  if (!sessionToken) return null;
  try {
    const payload = jwt.verify(sessionToken.value, JWT_SECRET) as { userId: string; role?: string };
    if (payload.role !== 'admin') return null;
    return payload;
  } catch {
    return null;
  }
}

// GET — list all excluded devices
export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  await dbConnect();
  const devices = await ExcludedDevice.find().sort({ createdAt: -1 });
  return NextResponse.json(devices);
}

// POST — add a new exclusion
export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  await dbConnect();
  const body = await req.json();
  const { type, value, label } = body;

  if (!type || !value || !label) {
    return NextResponse.json({ message: 'Missing required fields: type, value, label' }, { status: 400 });
  }

  // If type is 'ip' and value is 'auto', resolve the caller's IP
  let resolvedValue = value;
  if (type === 'ip' && value === 'auto') {
    const forwarded = req.headers.get('x-forwarded-for');
    resolvedValue = forwarded ? forwarded.split(',')[0].trim() : req.headers.get('x-real-ip') || '';
    if (!resolvedValue) {
      return NextResponse.json({ message: 'Could not detect your IP address.' }, { status: 400 });
    }
  }

  try {
    const device = await ExcludedDevice.create({ type, value: resolvedValue, label });
    return NextResponse.json(device, { status: 201 });
  } catch (err: any) {
    if (err.code === 11000) {
      return NextResponse.json({ message: 'This device/IP is already excluded.' }, { status: 409 });
    }
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}

// DELETE — remove exclusion by ID
export async function DELETE(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  await dbConnect();
  const { id } = await req.json();
  if (!id) return NextResponse.json({ message: 'Missing id' }, { status: 400 });

  await ExcludedDevice.findByIdAndDelete(id);
  return NextResponse.json({ ok: true });
}
