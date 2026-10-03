import { dbConnect } from '@/lib/mongoConnect';
import User from '@/models/User';
import PMSCredential from '@/models/PMSCredential';
import { NextResponse } from 'next/server';
import { issueDeviceKey, pruneDeviceKeys } from '@/lib/synkkDeviceKey';

// Keys the extension holds per pharmacy (one per browser it is logged in on).
const EXTENSION_KEY_LABEL = 'Chrome extension';
const MAX_EXTENSION_KEYS = 5;

export async function POST(req: Request) {
  try {
    await dbConnect();
    const { email, password, terminalId } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ success: false, error: 'Email and password are required' }, { status: 400 });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return NextResponse.json({ success: false, error: 'Invalid email or password' }, { status: 401 });
    }

    // Same rule as the main login: only hashed passwords are accepted.
    let isMatch = false;
    if (user.password) {
      try {
        const bcrypt = require('bcryptjs');
        isMatch = await bcrypt.compare(password, user.password);
      } catch (e) {}
    }

    if (!isMatch) {
      return NextResponse.json({ success: false, error: 'Invalid email or password' }, { status: 401 });
    }

    const pharmacyId = String(user._id);
    const pharmacyName = user.businessName || user.username || user.slug || 'My Pharmacy';

    // INSTANTLY REGISTER THE CONNECTION
    // This ensures the pharmacy appears in the Admin Dashboard drop-down immediately upon login!
    await PMSCredential.findOneAndUpdate(
      { pharmacyId },
      { 
        $setOnInsert: { 
          pharmacyId, 
          pmsName: 'Connecting...', 
          pmsUrl: '', 
          username: '', 
          password: '' 
        } 
      },
      { upsert: true, new: true }
    );

    // Mark user as web-pos connection type in cloud profile
    await User.findByIdAndUpdate(user._id, {
      $set: {
        posType: 'web-pos',
        'synkkMeta.posMethod': 'web-pos'
      }
    });

    // The extension sends this key with its calls; it identifies the pharmacy.
    await pruneDeviceKeys(user._id, EXTENSION_KEY_LABEL, MAX_EXTENSION_KEYS);
    const terminal = typeof terminalId === 'string' && terminalId.trim() ? `: ${terminalId.trim().slice(0, 40)}` : '';
    const deviceKey = await issueDeviceKey(user._id, EXTENSION_KEY_LABEL + terminal);

    return NextResponse.json({
      success: true,
      message: 'Login successful',
      deviceKey,
      pharmacyId: pharmacyId,
      pharmacyName: pharmacyName,
      pharmacy: {
        id: pharmacyId,
        name: pharmacyName
      },
      user: {
        id: pharmacyId,
        email: user.email,
        name: pharmacyName
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
