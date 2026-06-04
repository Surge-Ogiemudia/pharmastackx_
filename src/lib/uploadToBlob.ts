import { put } from '@vercel/blob';

/**
 * Converts a Gemini inlineData response part to a Vercel Blob URL.
 * Throws with a descriptive message on failure so callers can surface it.
 */
export async function uploadBase64ToBlob(
  base64: string,
  mimeType: string,
  filename: string
): Promise<string> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  if (!token) {
    throw new Error('BLOB_READ_WRITE_TOKEN is not set in environment variables.');
  }

  const buffer = Buffer.from(base64, 'base64');

  const blob = await put(filename, buffer, {
    access:      'public',
    contentType: mimeType,
    token,
  });

  return blob.url;
}
