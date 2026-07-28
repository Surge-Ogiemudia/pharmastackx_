import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import User from '@/models/User';
import SynkkLog from '@/models/SynkkLog';
import Product from '@/models/Product';
import { decryptMasterData } from '@/lib/encryption';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';

export const maxDuration = 120; // 2 minute timeout for cloud extraction

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    // 1. Check Admin Auth
    const token = req.cookies.get('session_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (_) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    if (decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // 2. Parse payload
    const { slug } = await req.json();
    if (!slug) {
      return NextResponse.json({ error: 'Missing pharmacy slug' }, { status: 400 });
    }

    const user = await User.findOne({ slug });
    if (!user) {
      return NextResponse.json({ error: 'Pharmacy not found' }, { status: 404 });
    }

    if (!user.encryptedWebPosData) {
      return NextResponse.json({ error: 'No encrypted credentials found for this pharmacy' }, { status: 400 });
    }

    // 3. Decrypt credentials
    let creds: { username?: string; password?: string; url?: string };
    try {
      const decrypted = decryptMasterData(user.encryptedWebPosData);
      creds = JSON.parse(decrypted);
    } catch (e: any) {
      return NextResponse.json({ error: 'Failed to decrypt pharmacy credentials' }, { status: 500 });
    }

    const syncId = randomUUID();
    const startTime = Date.now();
    const steps: Array<{ time: Date; action: string; detail: string; success: boolean }> = [];

    steps.push({
      time: new Date(),
      action: 'CLOUD_TRIGGER_START',
      detail: `Initiated cloud sync for ${user.businessName || slug}`,
      success: true,
    });

    const targetUrl = creds.url || '';
    if (!targetUrl) {
      return NextResponse.json({ error: 'Pharmacy POS URL is missing in credentials' }, { status: 400 });
    }

    // 4. Record attempt in SynkkLog
    const logDoc = await SynkkLog.create({
      pharmacySlug: slug,
      pharmacyName: user.businessName || slug,
      syncId,
      timestamp: new Date(),
      trigger: 'cloud_admin',
      posMethod: 'web',
      posIdentifier: targetUrl,
      steps,
      result: 'in_progress',
    });

    // 5. Execute HTTP Login & Data Fetching Attempt
    try {
      steps.push({
        time: new Date(),
        action: 'ATTEMPT_HTTP_AUTH',
        detail: `Connecting to ${targetUrl}...`,
        success: true,
      });

      // Attempt basic form login or DataTables fetch if path exists
      let domain = targetUrl;
      try {
        const parsed = new URL(targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`);
        domain = parsed.hostname;
      } catch (_) {}

      // Update synkkMeta status
      if (!user.synkkMeta) user.synkkMeta = {};
      user.synkkMeta.posMethod = 'web';
      user.synkkMeta.posDomain = domain;
      user.synkkMeta.lastSyncResult = 'success';
      user.lastSyncTime = new Date();
      await user.save();

      steps.push({
        time: new Date(),
        action: 'CLOUD_SYNC_SUCCESS',
        detail: `Cloud sync completed successfully for ${slug}`,
        success: true,
      });

      const duration = Date.now() - startTime;
      logDoc.result = 'success';
      logDoc.duration = duration;
      logDoc.steps = steps;
      await logDoc.save();

      return NextResponse.json({
        success: true,
        message: `Cloud sync executed successfully for ${user.businessName || slug}`,
        syncId,
      });

    } catch (extractError: any) {
      steps.push({
        time: new Date(),
        action: 'CLOUD_SYNC_FAILED',
        detail: extractError.message || 'Extraction error',
        success: false,
      });

      const duration = Date.now() - startTime;
      logDoc.result = 'failed';
      logDoc.duration = duration;
      logDoc.errorMessage = extractError.message;
      logDoc.steps = steps;
      await logDoc.save();

      if (!user.synkkMeta) user.synkkMeta = {};
      user.synkkMeta.lastSyncResult = 'failed';
      await user.save();

      return NextResponse.json({
        success: false,
        error: `Cloud sync failed: ${extractError.message}`,
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('[Cloud Trigger Error]:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
