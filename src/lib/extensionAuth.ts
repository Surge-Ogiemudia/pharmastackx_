import { dbConnect } from '@/lib/mongoConnect';
import { bearerToken, pharmacyFromDeviceKey } from '@/lib/synkkDeviceKey';

// The Chrome extension's calls identify the pharmacy with the device key it
// received at login (POST /api/extension/login), never with a pharmacyId it
// sends. The key comes as "Authorization: Bearer sdk_..." from the extension's
// background and side panel, or as a "deviceKey" body field from its content
// script, whose requests run under the POS page's origin.

/** The pharmacy id (as a string) the request's device key belongs to, or null. */
export async function extensionPharmacyId(req: Request, body?: { deviceKey?: unknown } | null): Promise<string | null> {
  const fromBody = typeof body?.deviceKey === 'string' ? body.deviceKey : null;
  const key = bearerToken(req) || fromBody;
  if (!key) return null;
  await dbConnect();
  const pharmacy = await pharmacyFromDeviceKey(key);
  return pharmacy ? String(pharmacy._id) : null;
}
