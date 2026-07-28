import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import SynkkLog from '@/models/SynkkLog';
import User from '@/models/User';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const validToken = process.env.SYNKK_API_KEY || 'dev-token';
    
    if (token !== validToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    
    await dbConnect();
    
    const logEntry = new SynkkLog(body);
    await logEntry.save();
    
    if (body.pharmacySlug) {
      const updateData: any = {
        'synkkMeta.lastSyncResult': body.result || 'unknown',
        'synkkMeta.authStatus': body.result === 'success' ? 'success' : (body.result === 'failed' ? 'failed' : 'unknown')
      };
      
      if (body.posMethod) updateData['synkkMeta.posMethod'] = body.posMethod;
      if (body.posName) updateData['synkkMeta.posName'] = body.posName;
      if (body.posDomain) updateData['synkkMeta.posDomain'] = body.posDomain;
      
      await User.updateOne(
        { slug: body.pharmacySlug },
        { $set: updateData }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Telemetry error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
