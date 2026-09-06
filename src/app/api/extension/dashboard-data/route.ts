import { dbConnect } from '@/lib/mongoConnect';
import ExtensionSale from '@/models/ExtensionSale';
import ExtensionInventory from '@/models/ExtensionInventory';
import ExtensionSearch from '@/models/ExtensionSearch';
import PMSCredential from '@/models/PMSCredential';
import NetworkLog from '@/models/NetworkLog';
import User from '@/models/User';
import Product from '@/models/Product';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    let pharmacyId = searchParams.get('pharmacyId');
    let desktopSlug = null;

    if (pharmacyId && !/^[0-9a-fA-F]{24}$/.test(pharmacyId)) {
      const escapeRegex = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const escapedId = escapeRegex(pharmacyId);
      
      const user = await User.findOne({ 
        $or: [
          { slug: { $regex: new RegExp(`^${escapedId}$`, 'i') } },
          { businessName: { $regex: new RegExp(`^${escapedId}$`, 'i') } }
        ]
      });
      if (user) {
        pharmacyId = String(user._id);
        desktopSlug = user.slug;
      }
    } else if (pharmacyId) {
      const userDoc = await User.findById(pharmacyId).select('slug');
      if (userDoc) desktopSlug = userDoc.slug;
    }

    const query = pharmacyId ? { pharmacyId } : {};

    const sales = await ExtensionSale.find(query).sort({ timestamp: -1 }).limit(30);
    const rawExtensionInventory = await ExtensionInventory.find(query).sort({ lastSynced: -1 }).limit(10);
    // Filter out corrupted/blank snapshots where items have no valid names
    const extensionInventory = rawExtensionInventory.filter((inv: any) => 
      inv.items && inv.items.length > 0 && inv.items.some((item: any) => item && item.name && String(item.name).trim().length > 0)
    );
    const searches = await ExtensionSearch.find(query).sort({ timestamp: -1 }).limit(40);
    const networkLogs = await NetworkLog.find(query).sort({ timestamp: -1 }).limit(50);
    
    // Fetch Desktop Sync Inventory
    let desktopInventory: any[] = [];
    if (desktopSlug) {
      const products = await Product.find({ slug: desktopSlug, source: 'synkk' })
        .sort({ updatedAt: -1 })
        .lean();
        
      if (products.length > 0) {
        desktopInventory = [{
          _id: 'desktop_sync_pseudo_batch',
          pharmacyId: pharmacyId,
          lastSynced: (products[0] as any).updatedAt || new Date(),
          type: 'desktop_sync',
          items: products.map((p: any) => ({
            name: p.itemName,
            price: p.amount,
            qty: p.quantity
          }))
        }];
      }
    }

    // Merge inventories:
    // extensionInventory contains all timestamped historical snapshots (newest first, sorted by lastSynced: -1).
    // If no snapshots exist yet, fall back to desktopInventory from live products.
    let mergedInventory = [...extensionInventory];
    if (mergedInventory.length === 0 && desktopInventory.length > 0) {
      mergedInventory = [...desktopInventory];
    } else {
      mergedInventory = mergedInventory
        .sort((a: any, b: any) => new Date(b.lastSynced).getTime() - new Date(a.lastSynced).getTime())
        .slice(0, 15);
    }
    
    let pmsInfo: any = null;
    let creds: any = null;
    if (pharmacyId) {
      creds = await PMSCredential.findOne({ pharmacyId });
      
      let detectedUrl = (creds && creds.pmsUrl) ? creds.pmsUrl : null;
      let detectedUsername = (creds && creds.username) ? creds.username : null;
      let detectedPassword = (creds && creds.password) ? creds.password : null;

      if (networkLogs && networkLogs.length > 0) {
        for (const log of networkLogs) {
          const u = log.url || '';
          if (
            u.includes('localhost') || u.includes('127.0.0.1') || 
            u.includes('192.168.') || u.includes('10.0.') || 
            u.includes(':8080') || u.includes(':3000') || 
            u.includes('/api/') || u.includes('graphql')
          ) {
            detectedUrl = new URL(u).origin;
            
            if (log.payload && typeof log.payload === 'object') {
              if (log.payload.username || log.payload.email) detectedUsername = log.payload.username || log.payload.email;
              if (log.payload.password) detectedPassword = log.payload.password;
            }
          }
        }
        
        if (detectedUrl && (!creds || creds.pmsUrl !== detectedUrl)) {
          creds = await PMSCredential.findOneAndUpdate(
            { pharmacyId },
            { 
              $set: { 
                pmsUrl: detectedUrl,
                username: detectedUsername,
                password: detectedPassword
              } 
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
      } else if (desktopInventory.length > 0) {
        // Desktop Sync user fallback
        pmsInfo = {
          pmsName: 'Local Database (Desktop Sync)',
          pmsUrl: 'Offline Native DB',
          username: 'N/A',
          password: '',
          hasCredentials: true,
          aiStatus: 'Synced natively via Desktop Engine'
        };
      }
    }

    const isWebPos = extensionInventory.length > 0 || Boolean(creds && creds.pmsUrl && creds.pmsUrl !== 'None' && creds.pmsUrl !== 'Offline Native DB');
    const connectionType = isWebPos ? 'web-pos' : (desktopInventory.length > 0 ? 'desktop' : 'unknown');

    return NextResponse.json({
      success: true,
      sales,
      inventory: mergedInventory,
      extensionInventory,
      desktopInventory,
      searches,
      pmsInfo,
      isWebPos,
      connectionType,
      networkLogsCount: networkLogs.length
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
