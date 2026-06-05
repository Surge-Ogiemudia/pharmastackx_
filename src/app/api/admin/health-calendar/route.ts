import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import HealthCalendarEvent from '@/models/HealthCalendarEvent';
import User from '@/models/User';

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export async function GET() {
  try {
    await dbConnect();
    const events = await HealthCalendarEvent.find({}).sort({ month: 1, day: 1 });
    return NextResponse.json({ events });
  } catch (err) {
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const { adminId, name, month, day, category } = await req.json();

    if (!adminId || !name || !month || !day || !category) {
      return NextResponse.json({ message: 'Missing fields' }, { status: 400 });
    }
    const admin = await User.findById(adminId);
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
    }

    const event = await HealthCalendarEvent.create({ name, month: Number(month), day: Number(day), category, isActive: true, createdBy: adminId });
    return NextResponse.json({ success: true, event });
  } catch (err) {
    console.error('POST health-calendar error:', err);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();
    const { eventId, adminId } = await req.json();
    const admin = await User.findById(adminId);
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
    }
    await HealthCalendarEvent.findByIdAndDelete(eventId);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
