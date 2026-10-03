import crypto from 'crypto';
import User from '@/models/User';

// Per-install keys for the Synkk desktop app. Each key identifies one pharmacy:
// the desktop gets it once (POST /api/synkk/device-key, while logged in) and
// sends it as "Authorization: Bearer sdk_...". Only a SHA-256 fingerprint is
// stored, on the pharmacy's user record. Keys don't expire; revoking them
// (DELETE /api/synkk/device-key) forces the desktop to request a new one.

const PREFIX = 'sdk_';
const MAX_KEYS_PER_PHARMACY = 10;

export function hashDeviceKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

export function bearerToken(req: Request): string | null {
  const header = req.headers.get('authorization');
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice(7).trim() || null;
}

/** The pharmacy a device key belongs to, or null. Callers must have called dbConnect(). */
export async function pharmacyFromDeviceKey(token: string | null) {
  if (!token || !token.startsWith(PREFIX)) return null;
  const hash = hashDeviceKey(token);
  const pharmacy = await User.findOne({ 'synkkDeviceKeys.hash': hash });
  if (!pharmacy) return null;
  User.updateOne(
    { _id: pharmacy._id, 'synkkDeviceKeys.hash': hash },
    { $set: { 'synkkDeviceKeys.$.lastUsedAt': new Date() } },
  ).catch(() => {});
  return pharmacy;
}

/** Creates a new key for the pharmacy and returns it; only its fingerprint is stored. */
export async function issueDeviceKey(pharmacyId: unknown, label?: string): Promise<string> {
  const key = PREFIX + crypto.randomBytes(32).toString('base64url');
  await User.updateOne(
    { _id: pharmacyId },
    {
      $push: {
        synkkDeviceKeys: {
          $each: [{ hash: hashDeviceKey(key), label, createdAt: new Date() }],
          $slice: -MAX_KEYS_PER_PHARMACY,
        },
      },
    },
  );
  return key;
}

/**
 * Removes the oldest keys whose label starts with labelPrefix so that at most
 * keep - 1 remain, making room for a new one without evicting other devices' keys.
 */
export async function pruneDeviceKeys(pharmacyId: unknown, labelPrefix: string, keep: number): Promise<void> {
  const doc = await User.findById(pharmacyId).select('+synkkDeviceKeys').lean();
  const matching = (doc?.synkkDeviceKeys || [])
    .filter((k) => (k.label || '').startsWith(labelPrefix))
    .sort((x, y) => new Date(x.createdAt || 0).getTime() - new Date(y.createdAt || 0).getTime());
  const excess = matching.slice(0, Math.max(0, matching.length - (keep - 1)));
  if (excess.length === 0) return;
  await User.updateOne(
    { _id: pharmacyId },
    { $pull: { synkkDeviceKeys: { hash: { $in: excess.map((k) => k.hash) } } } },
  );
}

export async function revokeDeviceKeys(pharmacyId: unknown): Promise<void> {
  await User.updateOne({ _id: pharmacyId }, { $unset: { synkkDeviceKeys: 1 } });
}
