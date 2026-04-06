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
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    let settings = await GlobalSettings.findOne();
    
    if (!settings) {
      settings = await GlobalSettings.create({ 
        isActivityCentreEnabled: true,
        disabledWhatsAppStates: [] 
      });
    }
    
    return NextResponse.json({
        disabledWhatsAppStates: settings.disabledWhatsAppStates || []
    });
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

    const { disabledWhatsAppStates } = await request.json();
    if (!Array.isArray(disabledWhatsAppStates)) {
        return NextResponse.json({ message: 'Invalid data format' }, { status: 400 });
    }

    await dbConnect();
    
    let settings = await GlobalSettings.findOne();
    if (!settings) {
      settings = new GlobalSettings({ 
          isActivityCentreEnabled: true,
          disabledWhatsAppStates 
      });
    } else {
      settings.disabledWhatsAppStates = disabledWhatsAppStates;
    }
    
    settings.updatedBy = session.userId;
    await settings.save();
    
    return NextResponse.json({
        success: true,
        disabledWhatsAppStates: settings.disabledWhatsAppStates
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
