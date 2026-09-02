import { dbConnect } from '@/lib/mongoConnect';
import ExtensionSale from '@/models/ExtensionSale';
import ExtensionInventory from '@/models/ExtensionInventory';
import PMSCredential from '@/models/PMSCredential';
import NetworkLog from '@/models/NetworkLog';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const pharmacyId = searchParams.get('pharmacyId');

    const query = pharmacyId ? { pharmacyId } : {};

    const sales = await ExtensionSale.find(query).sort({ timestamp: -1 }).limit(30);
    const inventory = await ExtensionInventory.find(query).sort({ lastSynced: -1 }).limit(10);
    const networkLogs = await NetworkLog.find(query).sort({ timestamp: -1 }).limit(50);
    
    let pmsInfo: any = null;
    if (pharmacyId) {
      let creds = await PMSCredential.findOne({ pharmacyId });
      
      let detectedUrl = (creds && creds.pmsUrl) ? creds.pmsUrl : null;
      let detectedUsername = (creds && creds.username) ? creds.username : null;
      let detectedPassword = (creds && creds.password) ? creds.password : null;

      if (networkLogs && networkLogs.length > 0) {
        for (const log of networkLogs) {
          const u = log.url || '';
          if (
            u.includes('localhost') || u.includes('127.0.0.1') || 
            u.includes('google') || u.includes('gstatic') || u.includes('googleapis') ||
            u.includes('chrome-extension') || u.includes('analytics') || u.includes('facebook') ||
            u.includes('doubleclick') || u.includes('microsoft') || u.includes('fonts.')
          ) continue;
          
          try {
            const parsedUrl = new URL(u);
            if (parsedUrl.host && parsedUrl.host.includes('.')) {
              if (!detectedUrl) {
                detectedUrl = `${parsedUrl.protocol}//${parsedUrl.host}${parsedUrl.pathname}`;
              }
            }
          } catch(e) {}

          if (!detectedUsername && log.requestPayload && typeof log.requestPayload === 'object') {
            for (const [k, v] of Object.entries(log.requestPayload)) {
              const kl = k.toLowerCase();
              if ((kl.includes('user') || kl.includes('email') || kl.includes('login')) && typeof v === 'string') {
                detectedUsername = v;
                break;
              }
            }
          }
        }
      }

      if (detectedUrl || detectedUsername) {
        creds = await PMSCredential.findOneAndUpdate(
          { pharmacyId },
          { 
            pharmacyId,
            pmsUrl: detectedUrl || (creds ? creds.pmsUrl : ''),
            username: detectedUsername || (creds ? creds.username : ''),
            password: detectedPassword || (creds ? creds.password : ''),
            lastUpdated: new Date()
          },
          { upsert: true, returnDocument: 'after' }
        );
      }

      pmsInfo = {
        pmsName: (creds && creds.pmsName) || 'Web PMS',
        pmsUrl: detectedUrl || (creds ? creds.pmsUrl : 'None'),
        username: detectedUsername || (creds ? creds.username : 'None'),
        password: detectedPassword || (creds ? creds.password : ''),
        hasCredentials: !!(creds && (creds.username || creds.password)),
        aiStatus: detectedUrl ? 'Successfully extracted via AI stream' : 'Analyzing network packets...'
      };
    }

    return NextResponse.json({
      success: true,
      sales,
      inventory,
      pmsInfo,
      networkLogsCount: networkLogs.length
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
