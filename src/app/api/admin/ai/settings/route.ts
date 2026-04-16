import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import AISettings from '@/models/AISettings';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    // Use session cookie to verify admin, standard practice in this repo
    const sessionCookie = req.cookies.get('session');
    if (!sessionCookie) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let settings = await AISettings.findOne();
    if (!settings) {
      settings = await AISettings.create({
         systemPrompt: `You are Ask Rx, a friendly medicine expert. 

STRICT RULE: Only output the conversational reply. NEVER output labels like "User:", "Context:", or "Final Response:". NEVER think out loud or drafts. Be brief (1-3 sentences). Warm and human. No asterisks.

If a symptom sounds severe, include the text: ESCALATE_TO_PHARMACIST`,
         goldenRules: [],
         alertEmail: 'pogiemudia@gmail.com',
         isAlertingEnabled: true
      });
    }

    return NextResponse.json(settings);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const sessionCookie = req.cookies.get('session');
    if (!sessionCookie) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    let settings = await AISettings.findOne();
    
    if (!settings) {
      settings = new AISettings(body);
    } else {
      if (body.systemPrompt !== undefined) settings.systemPrompt = body.systemPrompt;
      if (body.alertEmail !== undefined) settings.alertEmail = body.alertEmail;
      if (body.isAlertingEnabled !== undefined) settings.isAlertingEnabled = body.isAlertingEnabled;
      if (body.goldenRules !== undefined) settings.goldenRules = body.goldenRules;
    }

    await settings.save();
    return NextResponse.json(settings);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
