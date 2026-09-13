'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import FindMedicinesContent from '@/components/FindMedicinesContent';

function PartnerStorefrontInner() {
  const params = useParams();
  const rawSlug = (params?.slug as string) || '';
  const slug = decodeURIComponent(rawSlug).toLowerCase().trim();

  return <FindMedicinesContent partnerSlug={slug} />;
}

export default function PartnerStorefrontPage() {
  return (
    <main style={{ minHeight: '100vh', background: '#fafaf8' }}>
      <Suspense
        fallback={
          <div
            style={{
              minHeight: '100vh',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
              fontFamily: 'sans-serif',
            }}
          >
            Loading store...
          </div>
        }
      >
        <PartnerStorefrontInner />
      </Suspense>
    </main>
  );
}
