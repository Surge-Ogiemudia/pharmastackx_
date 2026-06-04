import { put } from '@vercel/blob';

/**
 * Converts a Gemini inlineData response part to a Vercel Blob URL.
 * Returns null if upload fails, so callers can record the failure cleanly.
 */
export async function uploadBase64ToBlob(
  base64: string,
  mimeType: string,
  filename: string
): Promise<string | null> {
  try {
    const buffer = Buffer.from(base64, 'base64');
    const blob = await put(filename, buffer, {
      access: 'public',
      contentType: mimeType,
    });
    return blob.url;
  } catch (err) {
    console.error('Vercel Blob upload failed:', err);
    return null;
  }
}
