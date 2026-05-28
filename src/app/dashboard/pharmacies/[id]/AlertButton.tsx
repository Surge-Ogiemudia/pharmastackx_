'use client';

import { useState } from 'react';
import { ServerCrash, Loader2 } from 'lucide-react';

export default function AlertButton({ pharmacyId, pharmacyName, reason }: { pharmacyId: string, pharmacyName: string, reason: string }) {
  const [isAlerting, setIsAlerting] = useState(false);

  const handleAlert = async () => {
    setIsAlerting(true);
    await fetch('/api/dashboard/alert', {
      method: 'POST',
      body: JSON.stringify({ pharmacyId, pharmacyName, reason }),
    });
    setTimeout(() => setIsAlerting(false), 1000);
  };

  return (
    <button 
      onClick={handleAlert}
      disabled={isAlerting}
      className="w-full mt-6 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-medium py-2.5 rounded-lg border border-red-500/20 transition-colors flex items-center justify-center gap-2"
    >
      {isAlerting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ServerCrash className="w-4 h-4" />}
      {isAlerting ? 'Sending Alert...' : 'Email Owner (Alert)'}
    </button>
  );
}
