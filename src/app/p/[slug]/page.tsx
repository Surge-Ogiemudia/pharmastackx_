'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import FindMedicinesContent from '@/components/FindMedicinesContent';
import BubblegumStorefront from '@/components/BubblegumStorefront';

function PartnerStorefrontInner() {
  const params = useParams();
  const rawSlug = (params?.slug as string) || '';
  const slug = decodeURIComponent(rawSlug).toLowerCase().trim();

  if (slug === 'bubblegum' || slug === 'bubblegumhealth') {
    return <BubblegumStorefront partnerSlug={slug} />;
  }

  return <FindMedicinesContent partnerSlug={slug} />;
}

export default function PartnerStorefrontPage() {
  return (
    <main style={{ minHeight: '100vh', background: '#fafaf8' }}>
      <Suspense
        fallback={
          <div className="fixed inset-0 z-[999999] bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-rose-500 animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="w-3 h-3 rounded-full bg-rose-400 animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-3 h-3 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }}></span>
              <span className="w-3 h-3 rounded-full bg-slate-700 animate-bounce" style={{ animationDelay: '450ms' }}></span>
            </div>
          </div>
        }
      >
        <PartnerStorefrontInner />
      </Suspense>
    </main>
  );
}
