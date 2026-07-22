import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import User from '@/models/User';

const API_KEY = process.env.INTERNAL_API_KEY || 'psx-internal-key-123';

function verifyApiKey(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || authHeader !== `Bearer ${API_KEY}`) {
    return false;
  }
  return true;
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  if (!verifyApiKey(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await dbConnect();
    // Await params if it's a promise (Next.js 15), otherwise use as is
    const resolvedParams = await params;
    const { id } = resolvedParams;

    const user = await User.findByIdAndDelete(id);

    if (!user) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Staff deleted successfully' }, { status: 200 });
  } catch (error: any) {
    console.error('Error deleting staff:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  if (!verifyApiKey(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await dbConnect();
    const resolvedParams = await params;
    const { id } = resolvedParams;
    const body = await req.json();

    const user = await User.findByIdAndUpdate(id, body, { new: true });

    if (!user) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Staff updated successfully', user }, { status: 200 });
  } catch (error: any) {
    console.error('Error updating staff:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
