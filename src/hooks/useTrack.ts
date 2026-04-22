'use client';

export function useTrack() {
  const track = (
    event: string,
    component: string,
    label?: string,
    meta?: Record<string, any>
  ) => {
    fetch('/api/analytics/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, component, label, meta }),
    }).catch(() => {});
  };

  return { track };
}
