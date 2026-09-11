'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function DashboardContent() {
  const searchParams = useSearchParams();
  const initialSlug = searchParams?.get('slug') || 'bubblegum';
  const [slug, setSlug] = useState(initialSlug);

  const [partner, setPartner] = useState<any>(null);
  const [stats, setStats] = useState<any>({
    totalOrders: 0,
    totalVolume: 0,
    totalProfitEarned: 0,
    pendingPayout: 0,
  });
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const [activeTab, setActiveTab] = useState<'orders' | 'branding' | 'pricing' | 'payouts'>('orders');

  // Form states
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#F43F5E');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [markupPercentage, setMarkupPercentage] = useState(18);
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');

  const fetchPartnerData = useCallback(async (targetSlug: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/partner?slug=${encodeURIComponent(targetSlug)}`);
      const data = await res.json();
      if (data.success && data.partner) {
        const p = data.partner;
        setPartner(p);
        setName(p.name || '');
        setTagline(p.tagline || '');
        setLogoUrl(p.logoUrl || '');
        setPrimaryColor(p.primaryColor || '#F43F5E');
        setContactEmail(p.contactEmail || '');
        setContactPhone(p.contactPhone || '');
        setMarkupPercentage(p.markupPercentage ?? 18);
        setBankName(p.bankDetails?.bankName || '');
        setAccountNumber(p.bankDetails?.accountNumber || '');
        setAccountName(p.bankDetails?.accountName || '');

        setStats(data.stats || {});
        setOrders(data.orders || []);
      } else {
        setToast({ msg: data.error || 'Failed to load partner', type: 'error' });
      }
    } catch (err: any) {
      setToast({ msg: err.message || 'Network error', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (slug) fetchPartnerData(slug);
  }, [slug, fetchPartnerData]);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleSaveSettings = async (overrideData?: any) => {
    setSaving(true);
    try {
      const payload = overrideData || {
        slug,
        name,
        tagline,
        logoUrl,
        primaryColor,
        contactEmail,
        contactPhone,
        markupPercentage,
        bankDetails: {
          bankName,
          accountNumber,
          accountName,
        }
      };

      const res = await fetch('/api/partner', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setPartner(data.partner);
        showToast('Settings saved successfully!');
      } else {
        showToast(data.error || 'Failed to update settings', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const storeUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/p/${slug}` 
    : `https://www.psx.ng/p/${slug}`;

  const copyStoreUrl = () => {
    navigator.clipboard.writeText(storeUrl);
    showToast('Storefront link copied to clipboard!');
  };

  // Sample markup math for preview
  const sampleBase = 2000;
  const sampleProfit = Math.round(sampleBase * (markupPercentage / 100));
  const sampleTotal = sampleBase + sampleProfit;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-medium text-slate-500">Loading Partner Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* TOAST ALERT */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-xl text-white font-medium text-sm flex items-center gap-2 transition-all ${
          toast.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
        }`}>
          <span>{toast.type === 'success' ? '✓' : '⚠'}</span>
          <span>{toast.msg}</span>
        </div>
      )}

      {/* TOP HEADER */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div 
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-md overflow-hidden bg-rose-500"
              style={{ backgroundColor: primaryColor }}
            >
              {logoUrl ? (
                <img src={logoUrl} alt={name} className="w-full h-full object-contain p-1" />
              ) : (
                name.charAt(0).toUpperCase() || 'P'
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">{name || 'Partner Dashboard'}</h1>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                  Active Partner
                </span>
              </div>
              <p className="text-xs text-slate-500">{tagline || 'White-label Fulfillment Partner'}</p>
            </div>
          </div>

          {/* STORE LINK BADGE */}
          <div className="hidden sm:flex items-center gap-3">
            <div className="bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 flex items-center gap-2">
              <span className="text-xs text-slate-400 font-mono">Storefront:</span>
              <span className="text-xs font-semibold text-slate-700 font-mono">/p/{slug}</span>
              <button 
                onClick={copyStoreUrl}
                className="text-xs text-rose-600 hover:text-rose-700 font-medium ml-1 cursor-pointer"
                title="Copy Link"
              >
                Copy
              </button>
            </div>
            <a 
              href={`/p/${slug}`} 
              target="_blank" 
              rel="noreferrer"
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow transition"
            >
              Visit Storefront ↗
            </a>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-8 border-t border-slate-100">
          <button
            onClick={() => setActiveTab('orders')}
            className={`py-4 text-sm font-semibold border-b-2 transition ${
              activeTab === 'orders' 
                ? 'border-rose-500 text-rose-600' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            📦 Orders & Deliveries ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab('branding')}
            className={`py-4 text-sm font-semibold border-b-2 transition ${
              activeTab === 'branding' 
                ? 'border-rose-500 text-rose-600' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            🎨 Storefront & Branding
          </button>
          <button
            onClick={() => setActiveTab('pricing')}
            className={`py-4 text-sm font-semibold border-b-2 transition ${
              activeTab === 'pricing' 
                ? 'border-rose-500 text-rose-600' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            💰 Markup & Pricing ({markupPercentage}%)
          </button>
          <button
            onClick={() => setActiveTab('payouts')}
            className={`py-4 text-sm font-semibold border-b-2 transition ${
              activeTab === 'payouts' 
                ? 'border-rose-500 text-rose-600' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            🏦 Bank Details (T+1 Settlement)
          </button>
        </div>
      </header>

      {/* STATS OVERVIEW CARDS */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Orders</p>
            <p className="text-2xl font-bold text-slate-900 mt-2">{stats.totalOrders || 0}</p>
            <p className="text-xs text-emerald-600 mt-1 font-medium">Synced via PharmaStackX</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Sales Volume</p>
            <p className="text-2xl font-bold text-slate-900 mt-2">₦{(stats.totalVolume || 0).toLocaleString()}</p>
            <p className="text-xs text-slate-500 mt-1">Processed through Paystack</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Profit Earned</p>
            <p className="text-2xl font-bold text-rose-600 mt-2">₦{(stats.totalProfitEarned || 0).toLocaleString()}</p>
            <p className="text-xs text-slate-500 mt-1">At {markupPercentage}% Partner Cut</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm bg-gradient-to-br from-rose-50 to-white">
            <p className="text-xs font-semibold text-rose-700 uppercase tracking-wider">Pending T+1 Payout</p>
            <p className="text-2xl font-bold text-slate-900 mt-2">₦{(stats.pendingPayout || 0).toLocaleString()}</p>
            <p className="text-xs text-rose-600 mt-1 font-medium">Settles to your bank tomorrow</p>
          </div>
        </div>

        {/* TAB 1: ORDERS & DELIVERIES FEED */}
        {activeTab === 'orders' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Recent Customer Orders</h2>
                <p className="text-xs text-slate-500">Live feed of orders placed on your storefront</p>
              </div>
              <button 
                onClick={() => fetchPartnerData(slug)} 
                className="text-xs text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
              >
                Refresh Orders 🔄
              </button>
            </div>

            {orders.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="text-4xl">🛒</div>
                <h3 className="text-base font-semibold text-slate-800">No orders yet</h3>
                <p className="text-sm text-slate-500 max-w-md mx-auto">
                  When patients order from your storefront (<span className="font-mono text-xs text-rose-600">/p/{slug}</span>), they will show up here instantly with delivery status and your profit cut.
                </p>
                <div className="pt-2">
                  <button 
                    onClick={copyStoreUrl}
                    className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold rounded-xl shadow transition"
                  >
                    Share Storefront Link
                  </button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-400 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4">Order ID & Date</th>
                      <th className="px-6 py-4">Patient / Destination</th>
                      <th className="px-6 py-4">Items Summary</th>
                      <th className="px-6 py-4">Total Paid</th>
                      <th className="px-6 py-4">Your Profit (₦)</th>
                      <th className="px-6 py-4">Delivery Status</th>
                      <th className="px-6 py-4">Settlement</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {orders.map((o) => (
                      <tr key={o.id} className="hover:bg-slate-50/60 transition">
                        <td className="px-6 py-4">
                          <p className="font-mono text-xs font-semibold text-slate-800">#{o.id.slice(-6).toUpperCase()}</p>
                          <p className="text-[11px] text-slate-400">
                            {new Date(o.date).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-medium text-slate-900">{o.patientName || 'Confidential'}</p>
                          <p className="text-xs text-slate-400">{[o.deliveryCity, o.deliveryState].filter(Boolean).join(', ') || 'Lagos'}</p>
                        </td>
                        <td className="px-6 py-4 max-w-xs truncate text-xs" title={o.itemsSummary}>
                          {o.itemsSummary || `${o.itemsCount} item(s)`}
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-900">
                          ₦{(o.totalAmount || 0).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 font-bold text-emerald-600">
                          +₦{(o.partnerProfit || 0).toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                            o.status === 'Completed' || o.status === 'Dispatched'
                              ? 'bg-emerald-100 text-emerald-700'
                              : o.status === 'Cancelled'
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}>
                            {o.status || 'Pending'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                            o.settlementStatus === 'settled'
                              ? 'bg-slate-100 text-slate-600'
                              : 'bg-rose-50 text-rose-600'
                          }`}>
                            {o.settlementStatus === 'settled' ? 'Settled ✓' : 'T+1 Pending'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: STOREFRONT & BRANDING */}
        {activeTab === 'branding' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Storefront Customization</h2>
                <p className="text-xs text-slate-500">Configure how your white-labeled medicine portal appears to patients</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Brand / Business Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                    placeholder="e.g. Bubblegum Health"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Tagline / Subtitle</label>
                  <input
                    type="text"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                    placeholder="e.g. Expert Women’s Reproductive Healthcare"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Logo Image URL</label>
                <input
                  type="text"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono text-xs"
                  placeholder="https://..."
                />
                <p className="text-[11px] text-slate-400">Direct link to your transparent PNG logo (hosted on your CDN/S3/Vercel)</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Brand Primary Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-10 h-10 rounded-xl cursor-pointer border-0 p-0"
                    />
                    <input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-32 px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono uppercase"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Support Phone / WhatsApp</label>
                  <input
                    type="text"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                    placeholder="e.g. 07067593825"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => handleSaveSettings()}
                  disabled={saving}
                  className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-xl shadow transition cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Branding Changes'}
                </button>
              </div>
            </div>

            {/* PREVIEW CARD */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-700">Live Header Preview</h3>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow overflow-hidden"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {logoUrl ? <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-1" /> : (name ? name[0] : 'P')}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">{name || 'Store Name'}</div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                      {tagline || 'Verified Network Store'}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-slate-500 leading-relaxed">
                  Patients visiting <span className="font-mono text-rose-600 font-semibold">{storeUrl}</span> will see this header with your branding across all medicine searches, cart, and checkout.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: PRICING & MARKUP */}
        {activeTab === 'pricing' && (
          <div className="max-w-3xl bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Partner Markup & Margin Settings</h2>
              <p className="text-xs text-slate-500">Configure the percentage added on top of the pharmacy base cost for your revenue</p>
            </div>

            <div className="space-y-4 bg-slate-50 p-6 rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-800">Your Markup Percentage:</span>
                <span className="text-2xl font-extrabold text-rose-600">{markupPercentage}%</span>
              </div>
              <input
                type="range"
                min="5"
                max="35"
                step="1"
                value={markupPercentage}
                onChange={(e) => setMarkupPercentage(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-rose-600"
              />
              <div className="flex justify-between text-xs text-slate-400 font-medium">
                <span>5% (Low margin)</span>
                <span>15% - 20% (Standard Agreed)</span>
                <span>35% (Premium)</span>
              </div>
            </div>

            {/* LIVE SAMPLE CALCULATION */}
            <div className="border border-slate-200 rounded-xl p-5 space-y-3">
              <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Example Medicine Pricing (Postpill)</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Pharmacy Base Price:</span>
                  <span className="font-mono">₦{sampleBase.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Your {markupPercentage}% Profit Cut:</span>
                  <span className="font-mono">+₦{sampleProfit.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-900 font-bold border-t border-slate-100 pt-2 text-base">
                  <span>Customer Pays (Retail Total):</span>
                  <span className="font-mono text-rose-600">₦{sampleTotal.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => handleSaveSettings({ slug, markupPercentage })}
                disabled={saving}
                className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-xl shadow transition cursor-pointer disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Update Markup Percentage'}
              </button>
            </div>
          </div>
        )}

        {/* TAB 4: BANK DETAILS (T+1 SETTLEMENT) */}
        {activeTab === 'payouts' && (
          <div className="max-w-2xl bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Bank Account for T+1 Payouts</h2>
              <p className="text-xs text-slate-500">Provide your corporate bank account details where your daily accumulated profit will be remitted</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Bank Name</label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                  placeholder="e.g. Zenith Bank / GTBank / Access Bank"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Account Number (10 Digits)</label>
                <input
                  type="text"
                  maxLength={10}
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
                  placeholder="0123456789"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Account Name</label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                  placeholder="e.g. Bubblegum Health Ltd"
                />
              </div>
            </div>

            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 space-y-1">
              <p className="font-bold">🔒 T+1 Next-Day Settlement Schedule</p>
              <p>Customer payments are aggregated and settled directly into this account on a T+1 (next business day) schedule after delivery confirmation.</p>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => handleSaveSettings({
                  slug,
                  bankDetails: { bankName, accountNumber, accountName }
                })}
                disabled={saving}
                className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-xl shadow transition cursor-pointer disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Bank Details'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PartnerDashboardPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-sm text-slate-500">Loading Dashboard...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
