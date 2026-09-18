'use client';

import { Suspense, useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import FindMedicinesContent from '@/components/FindMedicinesContent';
import BubblegumStorefront from '@/components/BubblegumStorefront';
import AirenB2BStorefront from '@/components/AirenB2BStorefront';
import AirenStorefront from '@/components/AirenStorefront';
import ConfirmOrderContent from '@/components/ConfirmOrderContent';
import BubblegumOrders from '@/components/BubblegumOrders';

function PartnerStorefrontInner() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawSlug = (params?.slug as string) || '';
  const slug = decodeURIComponent(rawSlug).toLowerCase().trim();

  const viewFromQuery = searchParams?.get('view');
  const [view, setView] = useState<string>(viewFromQuery || 'storefront');

  useEffect(() => {
    const currentView = searchParams?.get('view');
    if (currentView) {
      setView(currentView);
    } else {
      setView('storefront');
    }
  }, [searchParams]);

  const handleSetView = (newView: string) => {
    setView(newView);
    const sp = new URLSearchParams(window.location.search);
    if (newView === 'confirmOrder') {
      sp.set('view', 'confirmOrder');
      if (slug) sp.set('slug', slug);
      router.push(`?${sp.toString()}`);
    } else if (newView === 'orders' || newView === 'orderManagement') {
      sp.set('view', 'orders');
      if (slug) sp.set('slug', slug);
      router.push(`?${sp.toString()}`);
    } else {
      sp.delete('view');
      const q = sp.toString();
      router.push(window.location.pathname + (q ? `?${q}` : ''));
    }
  };

  if (view === 'confirmOrder') {
    return (
      <div className="min-h-screen bg-[#fafaf8]">
        <ConfirmOrderContent setView={handleSetView} />
      </div>
    );
  }

  if (view === 'orders' || view === 'orderManagement') {
    return <BubblegumOrders partnerSlug={slug} setView={handleSetView} />;
  }

  if (slug === 'bubblegum' || slug === 'bubblegumhealth') {
    return <BubblegumStorefront partnerSlug={slug} setView={handleSetView} />;
  }

  if (slug === 'demo.airen') {
    return <AirenB2BStorefront partnerSlug={slug} setView={handleSetView} />;
  }

  if (slug === 'airen' || slug === 'airenpharmacy' || slug.includes('airen')) {
    return <AirenStorefront partnerSlug={slug} setView={handleSetView} />;
  }

  return <FindMedicinesContent partnerSlug={slug} setView={handleSetView} />;
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
