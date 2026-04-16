"use client";
import { useState, useEffect, useRef, useCallback } from 'react';

interface SummaryData {
  summary: {
    visitorsToday: number;
    visitors7d: number;
    visitors30d: number;
    pageViews30d: number;
  };
  topPages: { path: string; count: number }[];
  topCountries: { country: string; count: number }[];
  deviceBreakdown: { device: string; count: number }[];
  referrerBreakdown: { referrer: string; count: number }[];
  hourlyToday: { hour: number; count: number }[];
  dailyLastWeek: { date: string; visitors: number }[];
  generatedAt: string;
}

interface ExcludedDevice {
  _id: string;
  type: 'ip' | 'cookie';
  value: string;
  label: string;
  createdAt: string;
}

interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
  loading?: boolean;
}

// ── Small sub-components ────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon }: { label: string; value: string | number; sub?: string; icon: string }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(15,110,86,0.08) 0%, rgba(15,110,86,0.03) 100%)',
      border: '1px solid rgba(15,110,86,0.18)',
      borderRadius: '16px',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      flex: '1 1 140px',
      minWidth: '130px',
    }}>
      <div style={{ fontSize: '22px' }}>{icon}</div>
      <div style={{ fontSize: '28px', fontWeight: 800, color: '#0F6E56', fontFamily: 'Sora, sans-serif', lineHeight: 1.1 }}>
        {value.toLocaleString()}
      </div>
      <div style={{ fontSize: '13px', fontWeight: 600, color: '#333', fontFamily: 'Sora, sans-serif' }}>{label}</div>
      {sub && <div style={{ fontSize: '11px', color: '#888', fontFamily: 'Sora, sans-serif' }}>{sub}</div>}
    </div>
  );
}

function BarItem({ label, count, max }: { label: string; count: number; max: number }) {
  const pct = max > 0 ? Math.max(4, Math.round((count / max) * 100)) : 4;
  return (
    <div style={{ marginBottom: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontSize: '12px', fontFamily: 'Sora, sans-serif', color: '#333', maxWidth: '70%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
        <span style={{ fontSize: '12px', fontWeight: 700, color: '#0F6E56', fontFamily: 'Sora, sans-serif' }}>{count}</span>
      </div>
      <div style={{ height: '6px', background: 'rgba(15,110,86,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, #0F6E56, #1aad88)', borderRadius: '3px', transition: 'width 0.6s ease' }} />
      </div>
    </div>
  );
}

function SectionCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: '#fff',
      border: '1px solid rgba(0,0,0,0.07)',
      borderRadius: '20px',
      padding: '20px',
      boxShadow: '0 2px 16px rgba(0,0,0,0.04)',
      marginBottom: '16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <span style={{ fontSize: '18px' }}>{icon}</span>
        <span style={{ fontSize: '15px', fontWeight: 700, color: '#1a1a1a', fontFamily: 'Sora, sans-serif' }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function DataCentreContent() {
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'ai' | 'settings'>('overview');

  // AI Query state
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    { role: 'ai', text: '👋 Hello! I\'m your PharmaStackX Analytics AI. Ask me anything about your platform\'s traffic, users, or trends.' }
  ]);
  const [question, setQuestion] = useState('');
  const [isQuerying, setIsQuerying] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Excluded devices state
  const [excludedDevices, setExcludedDevices] = useState<ExcludedDevice[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newIpLabel, setNewIpLabel] = useState('');
  const [addingCookie, setAddingCookie] = useState(false);
  const [addingIp, setAddingIp] = useState(false);
  const [deviceMsg, setDeviceMsg] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/admin/analytics/summary');
      if (!res.ok) throw new Error('Failed to load analytics');
      const json = await res.json();
      setData(json);
      setLastRefreshed(new Date());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchExcludedDevices = useCallback(async () => {
    setDevicesLoading(true);
    try {
      const res = await fetch('/api/admin/analytics/excluded-devices');
      if (res.ok) setExcludedDevices(await res.json());
    } finally {
      setDevicesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchSummary, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchSummary]);

  useEffect(() => {
    if (activeTab === 'settings') fetchExcludedDevices();
  }, [activeTab, fetchExcludedDevices]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const handleAskAI = async () => {
    if (!question.trim() || isQuerying) return;
    const q = question.trim();
    setQuestion('');
    setIsQuerying(true);

    setChatHistory(prev => [
      ...prev,
      { role: 'user', text: q },
      { role: 'ai', text: '', loading: true }
    ]);

    try {
      const res = await fetch('/api/admin/analytics/ai-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q }),
      });
      const json = await res.json();
      setChatHistory(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: 'ai', text: json.answer || json.message || 'No response.' };
        return updated;
      });
    } catch {
      setChatHistory(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: 'ai', text: '⚠️ Something went wrong. Please try again.' };
        return updated;
      });
    } finally {
      setIsQuerying(false);
    }
  };

  const handleExcludeDevice = async (type: 'cookie' | 'ip', value: string, label: string) => {
    if (!label.trim()) return;

    if (type === 'cookie') setAddingCookie(true);
    else setAddingIp(true);

    setDeviceMsg(null);
    try {
      const res = await fetch('/api/admin/analytics/excluded-devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, value, label }),
      });
      const json = await res.json();
      if (!res.ok) {
        setDeviceMsg('⚠️ ' + (json.message || 'Failed.'));
      } else {
        // For cookie exclusion, set the cookie locally too
        if (type === 'cookie') {
          document.cookie = `psx_exclude=${value}; path=/; max-age=${365 * 24 * 60 * 60}; SameSite=Lax`;
        }
        setDeviceMsg('✅ Device excluded successfully!');
        setNewLabel('');
        setNewIpLabel('');
        fetchExcludedDevices();
      }
    } catch {
      setDeviceMsg('⚠️ Network error. Try again.');
    } finally {
      setAddingCookie(false);
      setAddingIp(false);
    }
  };

  const handleDeleteExclusion = async (id: string) => {
    try {
      await fetch('/api/admin/analytics/excluded-devices', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      setExcludedDevices(prev => prev.filter(d => d._id !== id));
    } catch { /* silent */ }
  };

  const tabStyle = (active: boolean) => ({
    padding: '8px 18px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: 700,
    fontFamily: 'Sora, sans-serif',
    cursor: 'pointer',
    border: 'none',
    transition: 'all 0.2s',
    background: active ? '#0F6E56' : 'transparent',
    color: active ? '#fff' : '#666',
  });

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '12px',
    border: '1.5px solid rgba(15,110,86,0.25)',
    fontFamily: 'Sora, sans-serif',
    fontSize: '13px',
    outline: 'none',
    boxSizing: 'border-box' as const,
    marginBottom: '8px',
  };

  const btnStyle = (small?: boolean) => ({
    background: '#0F6E56',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    padding: small ? '7px 14px' : '10px 20px',
    fontFamily: 'Sora, sans-serif',
    fontWeight: 700,
    fontSize: small ? '12px' : '13px',
    cursor: 'pointer',
    transition: 'background 0.2s',
  });

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ fontFamily: 'Sora, sans-serif', paddingBottom: '32px' }}>
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <span style={{ fontSize: '28px' }}>🏢</span>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#1a1a1a' }}>Data Centre</div>
            <div style={{ fontSize: '12px', color: '#888' }}>
              {lastRefreshed ? `Last updated ${lastRefreshed.toLocaleTimeString('en-NG')}` : 'Loading…'}
            </div>
          </div>
          <button
            onClick={fetchSummary}
            disabled={loading}
            style={{ marginLeft: 'auto', ...btnStyle(true), background: loading ? '#ccc' : '#0F6E56' }}
          >
            {loading ? '⟳' : '↻ Refresh'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '6px', background: 'rgba(0,0,0,0.04)', borderRadius: '24px', padding: '4px', marginBottom: '20px' }}>
        <button style={tabStyle(activeTab === 'overview')} onClick={() => setActiveTab('overview')}>📊 Overview</button>
        <button style={tabStyle(activeTab === 'ai')} onClick={() => setActiveTab('ai')}>🤖 Ask AI</button>
        <button style={tabStyle(activeTab === 'settings')} onClick={() => setActiveTab('settings')}>🛡️ Exclusions</button>
      </div>

      {/* ── OVERVIEW TAB ── */}
      {activeTab === 'overview' && (
        <>
          {error && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '12px', padding: '14px', marginBottom: '16px', color: '#991B1B', fontSize: '13px' }}>
              ⚠️ {error} — <span onClick={fetchSummary} style={{ cursor: 'pointer', textDecoration: 'underline' }}>Retry</span>
            </div>
          )}

          {loading && !data && (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#888', fontSize: '14px' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>📡</div>
              Loading analytics…
            </div>
          )}

          {data && (
            <>
              {/* Stat Cards */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
                <StatCard icon="👤" label="Visitors Today" value={data.summary.visitorsToday} sub="Unique sessions" />
                <StatCard icon="📅" label="This Week" value={data.summary.visitors7d} sub="Unique visitors" />
                <StatCard icon="🗓️" label="This Month" value={data.summary.visitors30d} sub="Unique visitors" />
                <StatCard icon="📄" label="Page Views" value={data.summary.pageViews30d} sub="Last 30 days" />
              </div>

              {/* Top Pages */}
              {data.topPages.length > 0 && (
                <SectionCard title="Most Visited Pages" icon="📄">
                  {(() => {
                    const max = data.topPages[0]?.count || 1;
                    return data.topPages.map(p => (
                      <BarItem key={p.path} label={p.path} count={p.count} max={max} />
                    ));
                  })()}
                </SectionCard>
              )}

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {/* Top Countries */}
                {data.topCountries.length > 0 && (
                  <div style={{ flex: '1 1 200px' }}>
                    <SectionCard title="Top Countries" icon="🌍">
                      {(() => {
                        const max = data.topCountries[0]?.count || 1;
                        return data.topCountries.map(c => (
                          <BarItem key={c.country} label={c.country} count={c.count} max={max} />
                        ));
                      })()}
                    </SectionCard>
                  </div>
                )}

                {/* Device Breakdown */}
                {data.deviceBreakdown.length > 0 && (
                  <div style={{ flex: '1 1 200px' }}>
                    <SectionCard title="Device Types" icon="📱">
                      {(() => {
                        const total = data.deviceBreakdown.reduce((s, d) => s + d.count, 0);
                        return data.deviceBreakdown.map(d => {
                          const pct = total > 0 ? Math.round((d.count / total) * 100) : 0;
                          return (
                            <div key={d.device} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                              <span style={{ fontSize: '13px', color: '#333' }}>
                                {d.device === 'Mobile' ? '📱' : d.device === 'Tablet' ? '📟' : '🖥️'} {d.device || 'Unknown'}
                              </span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div style={{ width: '60px', height: '6px', background: 'rgba(15,110,86,0.1)', borderRadius: '3px' }}>
                                  <div style={{ width: `${pct}%`, height: '100%', background: '#0F6E56', borderRadius: '3px' }} />
                                </div>
                                <span style={{ fontSize: '12px', fontWeight: 700, color: '#0F6E56', minWidth: '30px' }}>{pct}%</span>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </SectionCard>
                  </div>
                )}
              </div>

              {/* Traffic Sources */}
              {data.referrerBreakdown.length > 0 && (
                <SectionCard title="Traffic Sources" icon="🔗">
                  {(() => {
                    const max = data.referrerBreakdown[0]?.count || 1;
                    return data.referrerBreakdown.map(r => (
                      <BarItem key={r.referrer} label={r.referrer} count={r.count} max={max} />
                    ));
                  })()}
                </SectionCard>
              )}

              {/* Daily trend */}
              {data.dailyLastWeek.length > 0 && (
                <SectionCard title="Daily Visitors — Last 7 Days" icon="📈">
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end', height: '80px' }}>
                    {(() => {
                      const maxV = Math.max(...data.dailyLastWeek.map(d => d.visitors), 1);
                      return data.dailyLastWeek.map(d => {
                        const h = Math.max(8, Math.round((d.visitors / maxV) * 72));
                        return (
                          <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '10px', color: '#888', fontWeight: 600 }}>{d.visitors}</span>
                            <div style={{ width: '100%', height: `${h}px`, background: 'linear-gradient(180deg, #1aad88, #0F6E56)', borderRadius: '4px 4px 2px 2px' }} />
                            <span style={{ fontSize: '9px', color: '#aaa' }}>{d.date.slice(5)}</span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </SectionCard>
              )}

              {!error && !loading && data.summary.visitorsToday === 0 && data.summary.visitors30d === 0 && (
                <div style={{ textAlign: 'center', padding: '32px', color: '#888', fontSize: '13px' }}>
                  <div style={{ fontSize: '40px', marginBottom: '12px' }}>📭</div>
                  No visitor data yet. Once users visit the site, data will appear here.
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ── AI QUERY TAB ── */}
      {activeTab === 'ai' && (
        <div>
          <SectionCard title="Ask the Analytics AI" icon="🤖">
            <p style={{ fontSize: '12px', color: '#888', marginBottom: '16px', marginTop: '-6px' }}>
              Ask anything about your platform's traffic in plain English. The AI has access to your latest analytics data.
            </p>

            {/* Example prompts */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
              {[
                'How many visitors today?',
                'Where are most users from?',
                'What\'s the most visited page?',
                'Which device do most users use?',
              ].map(prompt => (
                <button
                  key={prompt}
                  onClick={() => setQuestion(prompt)}
                  style={{ background: 'rgba(15,110,86,0.07)', border: '1px solid rgba(15,110,86,0.2)', borderRadius: '20px', padding: '5px 12px', fontSize: '11px', fontFamily: 'Sora, sans-serif', color: '#0F6E56', cursor: 'pointer', fontWeight: 600 }}
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* Chat history */}
            <div style={{ background: 'rgba(0,0,0,0.02)', borderRadius: '16px', padding: '16px', minHeight: '200px', maxHeight: '350px', overflowY: 'auto', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {chatHistory.map((msg, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '85%',
                    padding: '10px 14px',
                    borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    background: msg.role === 'user' ? '#0F6E56' : '#fff',
                    color: msg.role === 'user' ? '#fff' : '#1a1a1a',
                    fontSize: '13px',
                    lineHeight: 1.5,
                    boxShadow: '0 1px 6px rgba(0,0,0,0.08)',
                    fontFamily: 'Sora, sans-serif',
                  }}>
                    {msg.loading ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', opacity: 0.6 }}>
                        <span>typing</span>
                        <div style={{ display: 'flex', gap: '3px', marginTop: '4px' }}>
                          <style>{`
                            @keyframes dot-jump {
                              0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
                              40% { transform: translateY(-4px); opacity: 1; }
                            }
                          `}</style>
                          {[0, 1, 2].map(i => (
                            <div key={i} style={{
                              width: '4px',
                              height: '4px',
                              background: '#888',
                              borderRadius: '50%',
                              animation: `dot-jump 1.4s infinite ease-in-out ${i * 0.2}s`
                            }} />
                          ))}
                        </div>
                      </div>
                    ) : msg.text}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={question}
                onChange={e => setQuestion(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAskAI()}
                placeholder="Ask about your analytics…"
                style={{ ...inputStyle, marginBottom: 0, flex: 1 }}
              />
              <button
                onClick={handleAskAI}
                disabled={isQuerying || !question.trim()}
                style={{ ...btnStyle(), opacity: isQuerying || !question.trim() ? 0.5 : 1, whiteSpace: 'nowrap' }}
              >
                {isQuerying ? '⟳' : 'Ask'}
              </button>
            </div>
          </SectionCard>
        </div>
      )}

      {/* ── SETTINGS / EXCLUSIONS TAB ── */}
      {activeTab === 'settings' && (
        <div>
          {deviceMsg && (
            <div style={{ padding: '12px 16px', borderRadius: '12px', marginBottom: '16px', background: deviceMsg.startsWith('✅') ? 'rgba(15,110,86,0.08)' : 'rgba(220,38,38,0.06)', border: `1px solid ${deviceMsg.startsWith('✅') ? 'rgba(15,110,86,0.25)' : 'rgba(220,38,38,0.2)'}`, fontSize: '13px', color: deviceMsg.startsWith('✅') ? '#0F6E56' : '#991B1B', fontFamily: 'Sora, sans-serif' }}>
              {deviceMsg}
            </div>
          )}

          <SectionCard title="Exclude This Device" icon="🍪">
            <p style={{ fontSize: '12px', color: '#888', marginBottom: '12px', marginTop: '-6px' }}>
              Set a cookie on your current browser so this device is ignored by the tracker, regardless of IP.
            </p>
            <input
              type="text"
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              placeholder='Label (e.g. "My Phone" or "My Laptop")'
              style={inputStyle}
            />
            <button
              disabled={addingCookie || !newLabel.trim()}
              onClick={() => {
                const token = `own-${Date.now()}`;
                handleExcludeDevice('cookie', token, newLabel.trim());
              }}
              style={{ ...btnStyle(), opacity: addingCookie || !newLabel.trim() ? 0.5 : 1 }}
            >
              {addingCookie ? 'Excluding…' : '🍪 Exclude This Browser'}
            </button>
          </SectionCard>

          <SectionCard title="Exclude by IP Address" icon="🌐">
            <p style={{ fontSize: '12px', color: '#888', marginBottom: '12px', marginTop: '-6px' }}>
              Exclude your current IP address (e.g. home WiFi). This blocks all devices on that network.
            </p>
            <input
              type="text"
              value={newIpLabel}
              onChange={e => setNewIpLabel(e.target.value)}
              placeholder='Label (e.g. "Home WiFi" or "Office")'
              style={inputStyle}
            />
            <button
              disabled={addingIp || !newIpLabel.trim()}
              onClick={() => handleExcludeDevice('ip', 'auto', newIpLabel.trim())}
              style={{ ...btnStyle(), opacity: addingIp || !newIpLabel.trim() ? 0.5 : 1 }}
            >
              {addingIp ? 'Detecting IP…' : '🌐 Exclude My Current IP'}
            </button>
          </SectionCard>

          <SectionCard title="Excluded Devices & IPs" icon="🛡️">
            {devicesLoading ? (
              <p style={{ fontSize: '13px', color: '#888', textAlign: 'center', padding: '16px 0' }}>Loading…</p>
            ) : excludedDevices.length === 0 ? (
              <p style={{ fontSize: '13px', color: '#888', textAlign: 'center', padding: '16px 0' }}>
                No exclusions yet. Your stats will include all visitors.
              </p>
            ) : (
              excludedDevices.map(d => (
                <div key={d._id} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 14px',
                  background: 'rgba(0,0,0,0.02)',
                  borderRadius: '12px',
                  marginBottom: '8px',
                  border: '1px solid rgba(0,0,0,0.05)',
                }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#1a1a1a' }}>{d.label}</div>
                    <div style={{ fontSize: '11px', color: '#888' }}>
                      {d.type === 'ip' ? '🌐 IP' : '🍪 Cookie'} · {d.type === 'cookie' ? 'Browser cookie' : d.value}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteExclusion(d._id)}
                    style={{ background: 'rgba(220,38,38,0.08)', color: '#991B1B', border: 'none', borderRadius: '8px', padding: '5px 10px', fontSize: '11px', fontFamily: 'Sora, sans-serif', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </SectionCard>
        </div>
      )}
    </div>
  );
}
