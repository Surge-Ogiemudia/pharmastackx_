import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

/**
 * Ensures the master key is exactly 32 bytes for AES-256.
 */
function getMasterKey(): Buffer {
  const keyStr = process.env.MASTER_POS_KEY || 'default_insecure_development_key_change_me!';
  // Hash the key to guarantee it is exactly 32 bytes
  return crypto.createHash('sha256').update(String(keyStr)).digest();
}

/**
 * Encrypts a string using AES-256-GCM with the master key.
 * Returns a base64 string formatted as: iv.authTag.encryptedData
 */
export function encryptMasterData(text: string): string {
  const iv = crypto.randomBytes(12); // Recommended 96-bit IV for GCM
  const key = getMasterKey();
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  const authTag = cipher.getAuthTag().toString('base64');
  
  return `${iv.toString('base64')}.${authTag}.${encrypted}`;
}

/**
 * Decrypts a string that was encrypted by encryptMasterData.
 */
export function decryptMasterData(encryptedStr: string): string {
  const parts = encryptedStr.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted payload format. Expected iv.authTag.encryptedData');
  }
  
  const iv = Buffer.from(parts[0], 'base64');
  const authTag = Buffer.from(parts[1], 'base64');
  const encrypted = parts[2];
  
  const key = getMasterKey();
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
