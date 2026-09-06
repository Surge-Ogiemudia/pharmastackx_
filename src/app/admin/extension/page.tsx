'use client';

import { useState, useEffect, useRef } from 'react';

export default function ExtensionDashboardPage() {
  const [pharmacies, setPharmacies] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedPharmacyId, setSelectedPharmacyId] = useState('');
  const [data, setData] = useState<any>({ sales: [], inventory: [], searches: [], pmsInfo: null, networkLogsCount: 0 });
  const [loading, setLoading] = useState(true);
  const [showPass, setShowPass] = useState(false);
  const [syncTriggered, setSyncTriggered] = useState(false);

  // Ref always holds the LATEST selectedPharmacyId — safe to use inside intervals
  const selectedPharmacyIdRef = useRef('');

  async function loadPharmacies() {
    try {
      const res = await fetch('/api/extension/pharmacies');
      const json = await res.json();
      if (json.success && json.pharmacies) {
        setPharmacies(json.pharmacies);
      }
    } catch (e) {}
  }

  async function loadDashboardData(pharmacyId: string) {
    setLoading(true);
    try {
      const url = pharmacyId 
        ? `/api/extension/dashboard-data?pharmacyId=${pharmacyId}`
        : '/api/extension/dashboard-data';
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (e) {}
    setLoading(false);
  }

  useEffect(() => {
    loadPharmacies();
    loadDashboardData('');
    const interval = setInterval(() => {
      // Always read from ref — never the stale closure
      loadDashboardData(selectedPharmacyIdRef.current);
      loadPharmacies();
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectPharmacy = (id: string) => {
    setSelectedPharmacyId(id);
    selectedPharmacyIdRef.current = id; // Keep ref in sync so interval sees the latest
    loadDashboardData(id);
  };

  const pmsInfo = data.pmsInfo;
  
  const pharmacyMap = new Map();
  pharmacies.forEach(p => pharmacyMap.set(p.id, p.name));

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#090d16', color: '#e2e8f0', fontFamily: 'system-ui, sans-serif', padding: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#00d4aa', margin: 0 }}>
            📡 PharmastackX Extension Sync Dashboard
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '14px', margin: '4px 0 0 0' }}>
            Live Real-Time Web PMS Interceptors, Credentials Vault & Network Streams
          </p>
        </div>

        <div>
          <label style={{ fontSize: '13px', color: '#94a3b8', marginRight: '8px' }}>Filter Pharmacy:</label>
          <select 
            value={selectedPharmacyId} 
            onChange={(e) => handleSelectPharmacy(e.target.value)}
            style={{ backgroundColor: '#1e293b', color: '#fff', border: '1px solid #334155', borderRadius: '6px', padding: '8px 12px', fontSize: '14px' }}
          >
            <option value="">All Connected Pharmacies</option>
            {pharmacies.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* PMS Info Card */}
      {pmsInfo && (
        <div style={{ backgroundColor: '#111827', border: '1px solid #00d4aa', borderRadius: '8px', padding: '16px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '15px', fontWeight: 600, color: '#00d4aa' }}>
              🔑 Connected Web PMS Portal: {pmsInfo.pmsName}
            </span>
            <a 
              href={pmsInfo.pmsUrl !== 'None' ? pmsInfo.pmsUrl : '#'} 
              target="_blank" 
              rel="noreferrer"
              style={{ color: '#38bdf8', fontSize: '13px', textDecoration: 'none', maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block' }}
            >
              {pmsInfo.pmsUrl} ↗
            </a>
          </div>
          <div style={{ display: 'flex', gap: '30px', fontSize: '13px', flexWrap: 'wrap' }}>
            <div>
              <span style={{ color: '#94a3b8' }}>PMS Username: </span>
              <strong style={{ color: '#fff' }}>{pmsInfo.username || 'None'}</strong>
            </div>
            <div>
              <span style={{ color: '#94a3b8' }}>PMS Password: </span>
              <strong style={{ color: '#fff' }}>
                {showPass ? (pmsInfo.password || 'None') : '••••••••'}
              </strong>
              <button 
                onClick={() => setShowPass(!showPass)}
                style={{ marginLeft: '10px', background: 'none', border: 'none', color: '#00d4aa', cursor: 'pointer', fontSize: '12px', textDecoration: 'underline' }}
              >
                {showPass ? 'Hide' : 'Show'}
              </button>
            </div>
            <div>
              <span style={{ color: '#94a3b8' }}>AI Extractor Status: </span>
              <span style={{ color: '#22c55e', fontWeight: 500 }}>{pmsInfo.aiStatus}</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
        
        {/* Sales Card */}
        <div style={{ backgroundColor: '#111827', border: '1px solid #1e293b', borderRadius: '8px', padding: '16px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#fff', marginBottom: '16px' }}>
            💳 Recent Live Sales Intercepted
          </h2>

          {data.sales.length === 0 ? (
            <div style={{ color: '#64748b', fontSize: '14px', textAlign: 'center', padding: '24px' }}>
              No sales intercepted yet.
            </div>
          ) : (
            data.sales.map((s: any) => (
              <div key={s._id} style={{ marginBottom: '16px', border: '1px solid #1e293b', borderRadius: '6px', padding: '12px', backgroundColor: '#0f172a' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div>
                    <span style={{ backgroundColor: 'rgba(0,212,170,0.1)', color: '#00d4aa', padding: '2px 8px', borderRadius: '4px', fontSize: '12px' }}>
                      Branch: {pharmacyMap.get(s.pharmacyId) || s.pharmacyId}
                    </span>
                    <span style={{ backgroundColor: 'rgba(56,189,248,0.1)', color: '#38bdf8', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', marginLeft: '6px' }}>
                      💻 {s.terminalId || 'Counter 1'}
                    </span>
                  </div>
                  <span style={{ color: '#64748b', fontSize: '12px' }}>
                    {new Date(s.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                  <tbody>
                    {s.items.map((item: any, idx: number) => (
                      <tr key={idx} style={{ borderBottom: '1px dotted #334155' }}>
                        <td style={{ padding: '4px 0', color: '#cbd5e1' }}>{item.name}</td>
                        <td style={{ padding: '4px 0', color: '#94a3b8', textAlign: 'center' }}>x{item.qty}</td>
                        <td style={{ padding: '4px 0', color: '#00d4aa', textAlign: 'right' }}>₦{item.price}</td>
                      </tr>
                    ))}
                    <tr>
                      <td colSpan={2} style={{ paddingTop: '8px', fontWeight: 'bold', color: '#00d4aa' }}>TOTAL</td>
                      <td style={{ paddingTop: '8px', fontWeight: 'bold', color: '#00d4aa', textAlign: 'right' }}>₦{s.totalAmount}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ))
          )}
        </div>

        {/* Inventory Card */}
        <div style={{ backgroundColor: '#111827', border: '1px solid #1e293b', borderRadius: '8px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#fff', margin: 0 }}>
              📦 Inventory Snapshots {data.inventory.length > 0 && <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 'normal', marginLeft: '8px' }}>({data.inventory.length})</span>}
            </h2>
            <button
              onClick={async () => {
                if (!selectedPharmacyIdRef.current) {
                  alert('Please select a pharmacy first.');
                  return;
                }
                setSyncTriggered(true);
                try {
                  await fetch('/api/extension/request-sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ pharmacyId: selectedPharmacyIdRef.current, action: 'trigger' })
                  });
                } catch(e) {}
                setTimeout(() => setSyncTriggered(false), 6000);
              }}
              style={{
                backgroundColor: syncTriggered ? 'rgba(34,197,94,0.2)' : 'rgba(0,212,170,0.15)',
                color: syncTriggered ? '#4ade80' : '#00d4aa',
                border: '1px solid rgba(0,212,170,0.3)',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {syncTriggered ? '⚡ Signal Sent to POS...' : '⚡ Request Snapshot Now'}
            </button>
          </div>

          {data.inventory.length === 0 ? (
            <div style={{ color: '#64748b', fontSize: '14px', textAlign: 'center', padding: '24px' }}>
              No inventory synced yet.
            </div>
          ) : (
            data.inventory.map((inv: any, idx: number) => {
              const extraKeys: string[] = [];
              if (inv.items && Array.isArray(inv.items)) {
                inv.items.forEach((item: any) => {
                  if (item.extra && typeof item.extra === 'object') {
                    Object.keys(item.extra).forEach(k => {
                      if (!extraKeys.includes(k)) extraKeys.push(k);
                    });
                  }
                });
              }

              const isPrevalent = idx === 0;

              return (
                <div key={inv._id || idx} style={{ 
                  marginBottom: '20px',
                  backgroundColor: isPrevalent ? 'rgba(0, 212, 170, 0.03)' : 'transparent',
                  padding: isPrevalent ? '12px' : '8px',
                  borderRadius: '8px',
                  border: isPrevalent ? '1px solid rgba(0, 212, 170, 0.25)' : '1px solid #1e293b'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '12px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 'bold', color: '#38bdf8' }}>Pharmacy: {pharmacyMap.get(inv.pharmacyId) || inv.pharmacyId}</span>
                      {isPrevalent ? (
                        <span style={{ backgroundColor: 'rgba(0, 212, 170, 0.2)', color: '#00d4aa', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, border: '1px solid rgba(0, 212, 170, 0.4)' }}>
                          ★ Prevalent (Latest)
                        </span>
                      ) : (
                        <span style={{ backgroundColor: 'rgba(148, 163, 184, 0.12)', color: '#94a3b8', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', border: '1px solid #334155' }}>
                          📜 Former Record
                        </span>
                      )}
                    </div>
                    <span style={{ color: '#64748b' }}>
                      Synced: {new Date(inv.lastSynced).toLocaleTimeString()} ({new Date(inv.lastSynced).toLocaleDateString()}) • <strong style={{ color: '#00d4aa' }}>{inv.items?.length || 0} items</strong>
                    </span>
                  </div>

                  <div style={{ maxHeight: '350px', overflowY: 'auto', border: '1px solid #1e293b', borderRadius: '6px' }}>
                    <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                      <thead style={{ backgroundColor: '#1e293b', position: 'sticky', top: 0, zIndex: 1 }}>
                        <tr>
                          <th style={{ padding: '6px', textAlign: 'center', color: '#94a3b8', width: '45px' }}>S/N</th>
                          <th style={{ padding: '6px', textAlign: 'left', color: '#94a3b8' }}>Item Name</th>
                          {extraKeys.map(k => (
                            <th key={k} style={{ padding: '6px', textAlign: 'left', color: '#38bdf8', textTransform: 'capitalize' }}>
                              {k}
                            </th>
                          ))}
                          <th style={{ padding: '6px', textAlign: 'center', color: '#94a3b8', width: '60px' }}>Qty</th>
                          <th style={{ padding: '6px', textAlign: 'right', color: '#94a3b8', width: '90px' }}>Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inv.items.map((i: any, idx: number) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #1e293b' }}>
                            <td style={{ padding: '6px', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>{idx + 1}</td>
                            <td style={{ padding: '6px', color: '#e2e8f0', fontWeight: 500 }}>{i.name}</td>
                            {extraKeys.map(k => (
                              <td key={k} style={{ padding: '6px', color: '#cbd5e1' }}>
                                {(i.extra && i.extra[k] !== undefined && i.extra[k] !== '') ? String(i.extra[k]) : '-'}
                              </td>
                            ))}
                            <td style={{ padding: '6px', textAlign: 'center', color: '#94a3b8' }}>{i.qty}</td>
                            <td style={{ padding: '6px', textAlign: 'right', color: '#00d4aa' }}>₦{typeof i.price === 'number' ? i.price.toLocaleString() : i.price}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Search Demand & Lost Sales Radar Card */}
        <div style={{ backgroundColor: '#111827', border: '1px solid #1e293b', borderRadius: '8px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#fff', margin: 0 }}>
              🔍 Search Demand & Stockout Radar
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {data.searches && data.searches.length > 0 && (
                <>
                  <span style={{ fontSize: '11px', backgroundColor: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', padding: '2px 8px', borderRadius: '12px' }}>
                    {data.searches.filter((s: any) => s.resultCount === 0).length} Unmet Demands
                  </span>
                  <button
                    onClick={async () => {
                      if (confirm('Clear search records?')) {
                        await fetch('/api/extension/record-search?all=true', { method: 'DELETE' });
                        loadDashboardData(selectedPharmacyIdRef.current);
                      }
                    }}
                    style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '11px', padding: '2px 4px' }}
                    title="Clear search radar"
                  >
                    ✕ Clear
                  </button>
                </>
              )}
            </div>
          </div>

          {(!data.searches || data.searches.length === 0) ? (
            <div style={{ color: '#64748b', fontSize: '14px', textAlign: 'center', padding: '24px' }}>
              No search queries intercepted yet. As staff look up medicines on their POS, queries will stream here live.
            </div>
          ) : (
            <div style={{ maxHeight: '450px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {data.searches.map((s: any) => {
                const isOutOfStock = s.resultCount === 0;
                return (
                  <div key={s._id} style={{
                    border: isOutOfStock ? '1px solid rgba(239,68,68,0.3)' : '1px solid #1e293b',
                    borderRadius: '6px',
                    padding: '10px 12px',
                    backgroundColor: isOutOfStock ? 'rgba(239,68,68,0.05)' : '#0f172a',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 600, fontSize: '14px', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {s.query}
                        </span>
                        {isOutOfStock ? (
                          <span style={{ fontSize: '10px', backgroundColor: 'rgba(239,68,68,0.2)', color: '#f87171', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                            OUT OF STOCK
                          </span>
                        ) : (
                          <span style={{ fontSize: '10px', backgroundColor: 'rgba(34,197,94,0.15)', color: '#4ade80', padding: '1px 6px', borderRadius: '4px', fontWeight: 500 }}>
                            {s.resultCount} In Stock
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', gap: '8px' }}>
                        <span>{pharmacyMap.get(s.pharmacyId) || s.pharmacyId}</span>
                        <span>•</span>
                        <span>{s.terminalId || 'Counter 1'}</span>
                      </div>
                    </div>
                    <span style={{ color: '#64748b', fontSize: '11px', whiteSpace: 'nowrap' }}>
                      {new Date(s.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
