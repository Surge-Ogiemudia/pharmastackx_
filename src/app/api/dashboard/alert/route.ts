import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const resend = new Resend(process.env.RESEND_API_KEY || 're_mock_key_123');
const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

export async function POST(req: NextRequest) {
  try {
    // 1. Verify Admin Auth
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session_token');
    
    if (!sessionToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    const payload = jwt.verify(sessionToken.value, JWT_SECRET) as { role?: string };
    if (payload.role !== 'admin') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    // 2. Parse request
    const body = await req.json();
    const { pharmacyId, pharmacyName, reason } = body;

    if (!pharmacyId || !pharmacyName) {
      return NextResponse.json({ message: 'Missing pharmacy details' }, { status: 400 });
    }

    // 3. Send Email using Resend
    const { data, error } = await resend.emails.send({
      from: 'Synkk Alerts <onboarding@resend.dev>',
      to: ['pogiemudia@gmail.com'],
      subject: \`🚨 Synkk Alert: \${pharmacyName} Sync Failure\`,
      html: \`
        <h2>Sync Failure Alert</h2>
        <p><strong>Pharmacy:</strong> \${pharmacyName} (\${pharmacyId})</p>
        <p><strong>Status:</strong> Critical</p>
        <p><strong>Reason:</strong> \${reason || 'Unknown parsing failure'}</p>
        <br/>
        <p>Please check the Synkk Admin Dashboard for full diagnostic logs.</p>
      \`,
    });

    if (error) {
      console.error("Resend API Error:", error);
      return NextResponse.json({ message: 'Failed to send alert', error }, { status: 500 });
    }

    return NextResponse.json({ message: 'Alert sent successfully', data }, { status: 200 });
    
  } catch (error) {
    console.error('Alert API Error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
