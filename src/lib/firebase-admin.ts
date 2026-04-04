
import * as admin from 'firebase-admin';

export function getFirebaseAdmin() {
  // Check if the SDK has already been initialized
  if (!admin.apps.length) {
    const serviceAccountStr = process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS;

    if (!serviceAccountStr) {
      console.warn('The GOOGLE_SERVICE_ACCOUNT_CREDENTIALS environment variable is not set. Real-time notifications will fail.');
      return admin; // Return early or handle gracefully to not crash build
    }

    try {
      const serviceAccount = JSON.parse(serviceAccountStr);

      // Vercel can sometimes escape newlines. This line ensures the private key is correctly formatted.
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } catch (error: any) {
      console.error("Firebase Admin Initialization Error:", error.message);
      // We log instead of throw so we don't crash Next.js SSG
    }
  }

  return admin;
}
