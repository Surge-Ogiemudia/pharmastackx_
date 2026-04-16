/**
 * Lightweight fire-and-forget analytics tracker.
 * Never throws. Never blocks. Never slows down the app.
 */

let sessionId: string | null = null;

function getSessionId(): string {
  if (sessionId) return sessionId;

  // Try localStorage first so it persists across soft navigations
  if (typeof window !== 'undefined') {
    const stored = sessionStorage.getItem('psx_sid');
    if (stored) {
      sessionId = stored;
      return sessionId;
    }
    // Generate a new session ID
    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    sessionStorage.setItem('psx_sid', id);
    sessionId = id;
  }
  return sessionId || 'server';
}

export function track(event: string, extra?: Record<string, string>) {
  if (typeof window === 'undefined') return; // Server-side: skip

  const payload = {
    event,
    path: window.location.pathname,
    sessionId: getSessionId(),
    referrer: document.referrer || '',
    ...extra,
  };

  // keepalive: true ensures the request completes even if the page closes immediately
  fetch('/api/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {}); // Silently discard errors — analytics must never crash the app
}
