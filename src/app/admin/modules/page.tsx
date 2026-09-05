'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';

interface PharmacyItem {
  id: string;
  name: string;
  slug: string;
  email?: string;
  allowedModules: Record<string, boolean>;
}

const ALL_MODULES: { key: string; label: string; desc: string }[] = [
  { key: 'psxWeb', label: 'PSX Web', desc: 'Main Web Platform' },
  { key: 'pos', label: 'Point of Sale', desc: 'POS Register Module' },
  { key: 'emr', label: 'EMR Terminal', desc: 'Electronic Medical Records' },
  { key: 'dispensary', label: 'Dispensary', desc: 'Prescription & Dispensing' },
  { key: 'orders', label: 'Orders & Leads', desc: 'Online Order Ingestion' },
  { key: 'source', label: 'Source', desc: 'Patient Sourcing & Search' },
  { key: 'staff', label: 'Staff Mgmt', desc: 'Staff Roles & Shifts' },
  { key: 'socialAi', label: 'Social & Subdomain', desc: 'AI Posts & Site Builder' },
  { key: 'synkk', label: 'Synkk Engine', desc: 'Local Database Sync' },
];

export default function AdminModulesPage() {
  const [query, setQuery] = useState('');
  const [pharmacies, setPharmacies] = useState<PharmacyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchPharmacies('');
  }, []);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3000);
  };

  const fetchPharmacies = async (search: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/pharmacy-modules?search=${encodeURIComponent(search)}`);
      if (res.ok) {
        const json = await res.json();
        setPharmacies(json.pharmacies || []);
      } else {
        showToast('Failed to fetch pharmacies', 'error');
      }
    } catch (e: any) {
      showToast(e.message || 'Error loading pharmacies', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleModule = async (pharmacy: PharmacyItem, moduleKey: string) => {
    const isCurrentlyAllowed = pharmacy.allowedModules[moduleKey] !== false;
    const nextAllowedState = !isCurrentlyAllowed;

    const nextAllowedModules = {
      ...pharmacy.allowedModules,
      [moduleKey]: nextAllowedState,
    };

    // Optimistic UI update
    setPharmacies((prev) =>
      prev.map((p) => (p.slug === pharmacy.slug ? { ...p, allowedModules: nextAllowedModules } : p))
    );

    const updateIdentifier = `${pharmacy.slug}:${moduleKey}`;
    setUpdatingKey(updateIdentifier);

    try {
      const res = await fetch('/api/admin/pharmacy-modules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pharmacySlug: pharmacy.slug,
          allowedModules: nextAllowedModules,
        }),
      });

      if (!res.ok) throw new Error('Failed to update permissions');

      showToast(
        `${nextAllowedState ? 'Unlocked' : 'Locked'} ${moduleKey} for ${pharmacy.name}`
      );
    } catch (e: any) {
      // Revert optimistic update
      setPharmacies((prev) =>
        prev.map((p) => (p.slug === pharmacy.slug ? { ...p, allowedModules: pharmacy.allowedModules } : p))
      );
      showToast(e.message || 'Update failed', 'error');
    } finally {
      setUpdatingKey(null);
    }
  };

  const handleSetAll = async (pharmacy: PharmacyItem, allowAll: boolean) => {
    const nextAllowedModules: Record<string, boolean> = {};
    ALL_MODULES.forEach((m) => {
      nextAllowedModules[m.key] = allowAll;
    });

    setPharmacies((prev) =>
      prev.map((p) => (p.slug === pharmacy.slug ? { ...p, allowedModules: nextAllowedModules } : p))
    );

    setUpdatingKey(`${pharmacy.slug}:all`);

    try {
      const res = await fetch('/api/admin/pharmacy-modules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pharmacySlug: pharmacy.slug,
          allowedModules: nextAllowedModules,
        }),
      });

      if (!res.ok) throw new Error('Failed to update');

      showToast(`${allowAll ? 'Unlocked all' : 'Locked all'} modules for ${pharmacy.name}`);
    } catch (e: any) {
      setPharmacies((prev) =>
        prev.map((p) => (p.slug === pharmacy.slug ? { ...p, allowedModules: pharmacy.allowedModules } : p))
      );
      showToast(e.message || 'Update failed', 'error');
    } finally {
      setUpdatingKey(null);
    }
  };

  const filteredPharmacies = pharmacies.filter(
    (p) =>
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.slug.toLowerCase().includes(query.toLowerCase()) ||
      (p.email && p.email.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#090d16', color: '#e2e8f0', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <Navbar />

      {/* Toast */}
      {toastMsg && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9999,
            padding: '12px 20px',
            borderRadius: '12px',
            backgroundColor: toastMsg.type === 'success' ? '#10b981' : '#ef4444',
            color: '#000',
            fontWeight: 700,
            fontSize: '14px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>{toastMsg.type === 'success' ? '✓' : '✕'}</span>
          <span>{toastMsg.text}</span>
        </div>
      )}

      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '32px 20px' }}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            marginBottom: '28px',
            paddingBottom: '20px',
            borderBottom: '1px solid #1e293b',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '24px' }}>🛡️</span>
              <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.5px' }}>
                Remote Module Entitlements
              </h1>
            </div>
            <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '6px', marginBottom: 0 }}>
              Remotely lock or unlock terminal modules for specific pharmacies. Changes take effect instantly in both Desktop App and Web PWA upon sync.
            </p>
          </div>

          <button
            onClick={() => fetchPharmacies(query)}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 18px',
              backgroundColor: '#1e293b',
              color: '#cbd5e1',
              border: '1px solid #334155',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <span>↻</span>
            <span>{loading ? 'Refreshing...' : 'Refresh List'}</span>
          </button>
        </div>

        {/* Search Bar */}
        <div style={{ marginBottom: '24px' }}>
          <input
            type="text"
            placeholder="Search by pharmacy name, slug, or email..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              fetchPharmacies(e.target.value);
            }}
            style={{
              width: '100%',
              backgroundColor: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '12px',
              padding: '14px 18px',
              color: '#fff',
              fontSize: '14px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* List of Pharmacies */}
        {loading && pharmacies.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
            <div style={{ fontSize: '28px', marginBottom: '12px' }}>⏳</div>
            <p>Loading pharmacy accounts...</p>
          </div>
        ) : filteredPharmacies.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '60px 20px',
              backgroundColor: '#0f172a',
              border: '1px solid #1e293b',
              borderRadius: '16px',
              color: '#64748b',
            }}
          >
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🏢</div>
            <h3 style={{ color: '#cbd5e1', margin: '0 0 6px 0' }}>No Pharmacies Found</h3>
            <p style={{ margin: 0, fontSize: '13px' }}>No accounts matched your search criteria.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {filteredPharmacies.map((pharmacy) => {
              const activeCount = ALL_MODULES.filter(
                (m) => pharmacy.allowedModules[m.key] !== false
              ).length;

              return (
                <div
                  key={pharmacy.id}
                  style={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #1e293b',
                    borderRadius: '16px',
                    padding: '22px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
                  }}
                >
                  {/* Pharmacy Card Header */}
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      paddingBottom: '16px',
                      marginBottom: '18px',
                      borderBottom: '1px solid #1e293b',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '12px',
                          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(56, 189, 248, 0.2))',
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          color: '#34d399',
                          fontSize: '16px',
                          textTransform: 'uppercase',
                        }}
                      >
                        {pharmacy.name.substring(0, 2)}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#fff' }}>
                            {pharmacy.name}
                          </h3>
                          <span
                            style={{
                              fontSize: '11px',
                              fontFamily: 'monospace',
                              padding: '2px 8px',
                              borderRadius: '999px',
                              backgroundColor: '#1e293b',
                              color: '#94a3b8',
                              border: '1px solid #334155',
                            }}
                          >
                            {pharmacy.slug}
                          </span>
                        </div>
                        {pharmacy.email && (
                          <span style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', display: 'block' }}>
                            {pharmacy.email}
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          padding: '4px 10px',
                          borderRadius: '8px',
                          backgroundColor: activeCount === ALL_MODULES.length ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                          color: activeCount === ALL_MODULES.length ? '#34d399' : '#fbbf24',
                          border: `1px solid ${activeCount === ALL_MODULES.length ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                        }}
                      >
                        {activeCount} / {ALL_MODULES.length} Allowed
                      </span>

                      <button
                        onClick={() => handleSetAll(pharmacy, true)}
                        style={{
                          padding: '5px 12px',
                          backgroundColor: 'rgba(16, 185, 129, 0.1)',
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                          color: '#34d399',
                          borderRadius: '8px',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Allow All
                      </button>

                      <button
                        onClick={() => handleSetAll(pharmacy, false)}
                        style={{
                          padding: '5px 12px',
                          backgroundColor: 'rgba(239, 68, 68, 0.1)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          color: '#f87171',
                          borderRadius: '8px',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Lock All
                      </button>
                    </div>
                  </div>

                  {/* Modules Grid */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                      gap: '12px',
                    }}
                  >
                    {ALL_MODULES.map(({ key, label, desc }) => {
                      const isAllowed = pharmacy.allowedModules[key] !== false;
                      const isUpdating = updatingKey === `${pharmacy.slug}:${key}`;

                      return (
                        <div
                          key={key}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px 14px',
                            borderRadius: '12px',
                            border: `1px solid ${isAllowed ? '#1e293b' : 'rgba(245, 158, 11, 0.3)'}`,
                            backgroundColor: isAllowed ? '#090d16' : 'rgba(245, 158, 11, 0.05)',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div style={{ minWidth: 0, paddingRight: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '13px' }}>{isAllowed ? '🔓' : '🔒'}</span>
                              <span
                                style={{
                                  fontSize: '13px',
                                  fontWeight: 700,
                                  color: isAllowed ? '#e2e8f0' : '#fbbf24',
                                }}
                              >
                                {label}
                              </span>
                            </div>
                            <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginTop: '2px' }}>
                              {desc}
                            </span>
                          </div>

                          <button
                            onClick={() => handleToggleModule(pharmacy, key)}
                            disabled={isUpdating}
                            style={{
                              padding: '6px 14px',
                              borderRadius: '8px',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: isUpdating ? 'wait' : 'pointer',
                              border: 'none',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              transition: 'all 0.15s ease',
                              backgroundColor: isAllowed ? '#10b981' : '#334155',
                              color: isAllowed ? '#000' : '#94a3b8',
                              boxShadow: isAllowed ? '0 2px 8px rgba(16, 185, 129, 0.3)' : 'none',
                            }}
                          >
                            {isUpdating ? '...' : isAllowed ? 'ALLOWED' : 'LOCKED'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
