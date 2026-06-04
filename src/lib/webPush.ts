import webpush from 'web-push';

const VAPID_PUBLIC  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY ?? '';
const VAPID_EMAIL   = `mailto:${process.env.EMAIL_USER ?? 'pharmastackx@gmail.com'}`;

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

export async function sendWebPush(
  subscription: webpush.PushSubscription,
  payload: PushPayload
): Promise<'sent' | 'expired' | 'failed'> {
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return 'sent';
  } catch (err: any) {
    if (err.statusCode === 410 || err.statusCode === 404) return 'expired';
    console.error('Web push error:', err?.statusCode, err?.message);
    return 'failed';
  }
}
