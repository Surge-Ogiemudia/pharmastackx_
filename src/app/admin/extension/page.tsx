'use client';

import { useState, useEffect, useRef } from 'react';

export default function ExtensionDashboardPage() {
  const [pharmacies, setPharmacies] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedPharmacyId, setSelectedPharmacyId] = useState('');
  const [data, setData] = useState<any>({ sales: [], inventory: [], pmsInfo: null, networkLogsCount: 0 });
  const [loading, setLoading] = useState(true);
  const [showPass, setShowPass] = useState(false);

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
                      💻 {s.terminalId || 'Terminal-1'}
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
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#fff', marginBottom: '16px' }}>
            📦 Inventory Sync History {data.inventory.length > 0 && <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 'normal', marginLeft: '8px' }}>({data.inventory.length} snapshots)</span>}
          </h2>

          {data.inventory.length === 0 ? (
            <div style={{ color: '#64748b', fontSize: '14px', textAlign: 'center', padding: '24px' }}>
              No inventory synced yet.
            </div>
          ) : (
            data.inventory.map((inv: any) => (
              <div key={inv._id} style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '12px' }}>
                  <span style={{ fontWeight: 'bold', color: '#38bdf8' }}>Pharmacy: {pharmacyMap.get(inv.pharmacyId) || inv.pharmacyId}</span>
                  <span style={{ color: '#64748b' }}>
                    Synced: {new Date(inv.lastSynced).toLocaleTimeString()} • <strong style={{ color: '#00d4aa' }}>{inv.items?.length || 0} items</strong>
                  </span>
                </div>

                <div style={{ maxHeight: '350px', overflowY: 'auto', border: '1px solid #1e293b', borderRadius: '6px' }}>
                  <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                    <thead style={{ backgroundColor: '#1e293b', position: 'sticky', top: 0, zIndex: 1 }}>
                      <tr>
                        <th style={{ padding: '6px', textAlign: 'center', color: '#94a3b8', width: '45px' }}>S/N</th>
                        <th style={{ padding: '6px', textAlign: 'left', color: '#94a3b8' }}>Item Name</th>
                        <th style={{ padding: '6px', textAlign: 'center', color: '#94a3b8', width: '60px' }}>Qty</th>
                        <th style={{ padding: '6px', textAlign: 'right', color: '#94a3b8', width: '90px' }}>Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inv.items.map((i: any, idx: number) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #1e293b' }}>
                          <td style={{ padding: '6px', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>{idx + 1}</td>
                          <td style={{ padding: '6px', color: '#e2e8f0' }}>{i.name}</td>
                          <td style={{ padding: '6px', textAlign: 'center', color: '#94a3b8' }}>{i.qty}</td>
                          <td style={{ padding: '6px', textAlign: 'right', color: '#00d4aa' }}>₦{typeof i.price === 'number' ? i.price.toLocaleString() : i.price}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}
