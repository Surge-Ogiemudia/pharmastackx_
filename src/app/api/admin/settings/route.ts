import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { dbConnect } from '@/lib/mongoConnect';
import GlobalSettings from '@/models/GlobalSettings';

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

export async function GET() {
  try {
    await dbConnect();
    let settings = await GlobalSettings.findOne();
    
    if (!settings) {
      settings = await GlobalSettings.create({ isActivityCentreEnabled: true, isPulseModuleEnabled: true });
    }
    
    return NextResponse.json(settings);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getAdminSession();
    
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { isActivityCentreEnabled, isPulseModuleEnabled } = await request.json();
    await dbConnect();
    
    let settings = await GlobalSettings.findOne();
    if (!settings) {
      settings = new GlobalSettings({ isActivityCentreEnabled, isPulseModuleEnabled });
    } else {
      settings.isActivityCentreEnabled = isActivityCentreEnabled;
      settings.isPulseModuleEnabled = isPulseModuleEnabled;
    }
    
    settings.updatedBy = session.userId;
    await settings.save();
    
    return NextResponse.json(settings);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
