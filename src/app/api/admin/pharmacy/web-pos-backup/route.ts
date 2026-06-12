import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import User from '@/models/User';
import { encryptMasterData } from '@/lib/encryption';

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    
    // In production, you would want to secure this route with an API key
    // or verify that the request is coming from Synkk desktop
    const body = await req.json();
    const { slug, username, password, url } = body;

    if (!slug || !username || !password || !url) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const user = await User.findOne({ slug });
    if (!user) {
      return NextResponse.json({ error: 'Pharmacy not found' }, { status: 404 });
    }

    // Bundle the credentials
    const credentialsPayload = JSON.stringify({
      username,
      password,
      url,
      timestamp: new Date().toISOString()
    });

    // Encrypt the bundle using Application-Level Master Encryption
    const encryptedBlob = encryptMasterData(credentialsPayload);

    // Save to the database
    user.encryptedWebPosData = encryptedBlob;
    await user.save();

    return NextResponse.json({ 
      success: true, 
      message: 'Web POS credentials securely encrypted and backed up' 
    });

  } catch (error: any) {
    console.error('[Web POS Backup API Error]:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
