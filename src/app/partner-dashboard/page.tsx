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

  const [activeTab, setActiveTab] = useState<'orders' | 'catalog' | 'branding' | 'pricing'>('catalog');

  // Curated Catalog & Drag-and-Drop state
  const [curatedProducts, setCuratedProducts] = useState<any[]>([]);
  const [shelfSearch, setShelfSearch] = useState('');
  const [masterProducts, setMasterProducts] = useState<any[]>([]);
  const [totalCatalogProducts, setTotalCatalogProducts] = useState(0);
  const [catalogPage, setCatalogPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogCategory, setCatalogCategory] = useState('all');
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [draggedProduct, setDraggedProduct] = useState<any | null>(null);
  const [isOverShelf, setIsOverShelf] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#F43F5E');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [markupPercentage, setMarkupPercentage] = useState(18);
  const [productMarkups, setProductMarkups] = useState<Record<string, number>>({});
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
        if (data.curatedProducts && Array.isArray(data.curatedProducts)) {
          setCuratedProducts(data.curatedProducts);
        }
        const markupsMap = p.productMarkups instanceof Map 
          ? Object.fromEntries(p.productMarkups) 
          : (p.productMarkups || {});
        setProductMarkups(markupsMap);
      } else {
        setToast({ msg: data.error || 'Failed to load partner', type: 'error' });
      }
    } catch (err: any) {
      setToast({ msg: err.message || 'Network error', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  const searchMasterCatalog = useCallback(async (searchQuery: string, categoryFilter: string = 'all', pageNum: number = 1, append: boolean = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoadingCatalog(true);
      setCatalogPage(1);
    }
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (categoryFilter && categoryFilter !== 'all') params.append('drugClass', categoryFilter);
      params.append('page', String(pageNum));
      params.append('limit', '32');
      
      const res = await fetch(`/api/products?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          if (append) {
            setMasterProducts(prev => [...prev, ...data.data]);
          } else {
            setMasterProducts(data.data);
          }
          if (data.pagination && typeof data.pagination.totalProducts === 'number') {
            setTotalCatalogProducts(data.pagination.totalProducts);
          }
        }
      }
    } catch (err) {
      console.error('Failed to search master inventory:', err);
    } finally {
      setLoadingCatalog(false);
      setLoadingMore(false);
    }
  }, []);

  const handleLoadMore = () => {
    const nextPage = catalogPage + 1;
    setCatalogPage(nextPage);
    searchMasterCatalog(catalogSearch, catalogCategory, nextPage, true);
  };

  // Search master catalog on query change or mount
  useEffect(() => {
    const timer = setTimeout(() => {
      searchMasterCatalog(catalogSearch, catalogCategory, 1, false);
    }, 250);
    return () => clearTimeout(timer);
  }, [catalogSearch, catalogCategory, searchMasterCatalog]);

  const persistCuratedAndMarkups = async (ids: string[], markups: Record<string, number>) => {
    try {
      await fetch('/api/partner', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, curatedProductIds: ids, productMarkups: markups }),
      });
    } catch (e) {
      console.error('Failed to persist curated items and markups:', e);
    }
  };

  const addToShelf = async (product: any) => {
    const productId = String(product.id || product._id);
    if (curatedProducts.some(p => String(p.id || p._id) === productId)) {
      showToast(`${product.name || product.itemName} is already on your shelf!`, 'error');
      return;
    }
    const itemToShelf = {
      id: productId,
      name: product.name || product.itemName,
      amount: product.basePrice || product.price || product.amount,
      quantity: product.stockQty !== undefined ? product.stockQty : product.quantity,
      category: product.drugClass || product.category || 'General',
      image: product.image || product.imageUrl || 'https://via.placeholder.com/150',
    };
    const nextCurated = [itemToShelf, ...curatedProducts];
    setCuratedProducts(nextCurated);
    showToast(`Added ${itemToShelf.name} to your storefront!`);
    await persistCuratedAndMarkups(nextCurated.map(p => p.id), productMarkups);
  };

  const removeFromShelf = async (productId: string) => {
    const nextCurated = curatedProducts.filter(p => String(p.id || p._id) !== productId);
    setCuratedProducts(nextCurated);
    const nextMarkups = { ...productMarkups };
    delete nextMarkups[productId];
    setProductMarkups(nextMarkups);
    showToast('Removed item from storefront shelf');
    await persistCuratedAndMarkups(nextCurated.map(p => p.id), nextMarkups);
  };

  const handleUpdateProductMarkup = async (productId: string, pctValue: number | null) => {
    const nextMarkups = { ...productMarkups };
    if (pctValue === null || isNaN(pctValue)) {
      delete nextMarkups[productId];
    } else {
      nextMarkups[productId] = Math.max(0, Math.min(100, pctValue));
    }
    setProductMarkups(nextMarkups);
    await persistCuratedAndMarkups(curatedProducts.map(p => p.id), nextMarkups);
    showToast('Markup updated for product');
  };

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
        productMarkups,
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
            📦 Orders & Settlements ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab('catalog')}
            className={`py-4 text-sm font-semibold border-b-2 transition ${
              activeTab === 'catalog' 
                ? 'border-rose-500 text-rose-600' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            💊 Curate Products ({curatedProducts.length})
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
            <p className="text-xs font-semibold text-rose-700 uppercase tracking-wider">Accrued Settlement Balance</p>
            <p className="text-2xl font-bold text-slate-900 mt-2">₦{(stats.pendingPayout || 0).toLocaleString()}</p>
            <p className="text-xs text-rose-600 mt-1 font-medium">Payable upon request / cycle</p>
          </div>
        </div>

        {/* TAB 1: ORDERS & SETTLEMENTS */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            {/* SETTLEMENT BANK DETAILS CARD */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <span>🏦 Settlement & Payout Account</span>
                  </h3>
                  <p className="text-xs text-slate-500">Corporate bank account where your profit balance will be remitted</p>
                </div>
                <button
                  onClick={() => handleSaveSettings({
                    slug,
                    bankDetails: { bankName, accountNumber, accountName }
                  })}
                  disabled={saving}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow transition cursor-pointer disabled:opacity-50 self-start sm:self-auto"
                >
                  {saving ? 'Saving...' : 'Save Bank Account'}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Bank Name</label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
                    placeholder="e.g. Zenith Bank / GTBank"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Account Number (10 Digits)</label>
                  <input
                    type="text"
                    maxLength={10}
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
                    placeholder="0123456789"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Account Name</label>
                  <input
                    type="text"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
                    placeholder="e.g. Bubblegum Health Ltd"
                  />
                </div>
              </div>
            </div>

            {/* ORDERS TABLE CARD */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Recent Customer Orders</h2>
                  <p className="text-xs text-slate-500">Live feed of orders placed on your storefront and profit cuts</p>
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
                              {o.settlementStatus === 'settled' ? 'Settled ✓' : 'Pending'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: CURATE PRODUCTS (DRAG & DROP STUDIO) */}
        {activeTab === 'catalog' && (
          <div className="space-y-6">
            {/* STUDIO HEADER BANNER */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-500 text-white uppercase tracking-wider">
                    Interactive Shelf Studio
                  </span>
                  <span className="text-xs text-slate-400">
                    Live drag & drop catalog builder
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  Drag & Drop Medicines onto your Storefront Shelf
                </h2>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Browse or search through <strong className="text-white">{totalCatalogProducts > 0 ? `${totalCatalogProducts.toLocaleString()} real medicines` : 'thousands of real medicines'}</strong> from verified PharmaStackX pharmacies. Drag any product tile directly into your virtual shelf on the right (or tap <span className="text-rose-400 font-semibold">+ Add to Shelf</span>) to sell on <span className="font-mono text-rose-300">/p/{slug}</span>.
                </p>
              </div>

              <div className="bg-slate-800/80 backdrop-blur border border-slate-700 p-5 rounded-2xl flex flex-col items-center justify-center text-center space-y-2 min-w-[220px]">
                <span className="text-xs font-semibold text-slate-400 uppercase">Live on your Storefront</span>
                <span className="text-3xl font-extrabold text-rose-400">{curatedProducts.length} Items</span>
                <a
                  href={`/p/${slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 w-full py-2 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold rounded-xl shadow transition text-center"
                >
                  Preview Storefront ↗
                </a>
              </div>
            </div>

            {/* DUAL PANEL GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* LEFT PANEL: MASTER NETWORK INVENTORY (COL 7) */}
              <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 flex flex-wrap items-center gap-2">
                      <span>PharmaStackX Master Inventory</span>
                      <span className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full">
                        {totalCatalogProducts > 0
                          ? `Showing ${masterProducts.length} of ${totalCatalogProducts.toLocaleString()} medicines`
                          : `${masterProducts.length} medicines`}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500">Pick medicines to showcase on your branded storefront</p>
                  </div>
                  <div className="text-xs text-slate-400 bg-slate-100 px-3 py-1 rounded-full self-start sm:self-auto font-medium">
                    🖐 Drag card or click + Add
                  </div>
                </div>

                {/* SEARCH & FILTERS */}
                <div className="space-y-3">
                  <div className="relative">
                    <span className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-slate-400">
                      🔍
                    </span>
                    <input
                      type="text"
                      value={catalogSearch}
                      onChange={(e) => setCatalogSearch(e.target.value)}
                      placeholder={totalCatalogProducts > 0 ? `Search ${totalCatalogProducts.toLocaleString()} medicines (e.g. Postpill, Panadol, Pregnacare, Amox)...` : "Search medicines by brand or active ingredient..."}
                      className="w-full pl-10 pr-10 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 transition"
                    />
                    {catalogSearch && (
                      <button
                        onClick={() => setCatalogSearch('')}
                        className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600 text-sm cursor-pointer"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* PRODUCT CARDS TILES */}
                {loadingCatalog ? (
                  <div className="py-20 text-center space-y-3">
                    <div className="w-8 h-8 border-3 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-xs text-slate-500 font-medium">Loading medicines from pharmacy network...</p>
                  </div>
                ) : masterProducts.length === 0 ? (
                  <div className="py-16 text-center space-y-2 border-2 border-dashed border-slate-200 rounded-2xl">
                    <div className="text-3xl">🔍</div>
                    <p className="text-sm font-semibold text-slate-700">No matching medicines found</p>
                    <p className="text-xs text-slate-400">Try searching another medicine brand or ingredient.</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-h-[680px] overflow-y-auto pr-1">
                    {masterProducts.map((p) => {
                      const productId = String(p.id || p._id);
                      const isOnShelf = curatedProducts.some(c => String(c.id || c._id) === productId);
                      const base = Number(p.basePrice || p.price || p.amount || 0);
                      const effectiveMarkup = productMarkups[productId] !== undefined 
                        ? Number(productMarkups[productId]) 
                        : markupPercentage;
                      const markup = Math.round(base * (effectiveMarkup / 100));
                      const retail = base + markup;

                      return (
                        <div
                          key={productId}
                          draggable={!isOnShelf}
                          onDragStart={(e) => {
                            if (isOnShelf) return;
                            setDraggedProduct(p);
                            e.dataTransfer.setData('text/plain', productId);
                            e.dataTransfer.effectAllowed = 'copy';
                          }}
                          onDragEnd={() => {
                            setDraggedProduct(null);
                            setIsOverShelf(false);
                          }}
                          className={`p-4 rounded-2xl border transition-all select-none relative flex flex-col justify-between ${
                            isOnShelf
                              ? 'bg-slate-50 border-slate-200 opacity-60'
                              : 'bg-white border-slate-200 hover:border-rose-400 hover:shadow-md cursor-grab active:cursor-grabbing group'
                          }`}
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                                {p.drugClass || p.category || 'Medicine'}
                              </span>
                              {!isOnShelf && (
                                <span className="text-xs text-slate-300 group-hover:text-rose-500 transition" title="Drag me!">
                                  ⠿ Drag
                                </span>
                              )}
                            </div>

                            <h4 className="text-sm font-bold text-slate-900 line-clamp-2 leading-snug">
                              {p.name || p.itemName}
                            </h4>
                            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                              <span>💊</span>
                              <span className="truncate">{p.activeIngredients && p.activeIngredients !== 'N/A' ? p.activeIngredients : 'Verified Supply'}</span>
                            </p>
                          </div>

                          {/* PRICING & ACTION */}
                          <div className="pt-3 mt-3 border-t border-slate-100 flex items-end justify-between gap-2">
                            <div>
                              <div className="text-[11px] text-slate-400">
                                Retail: <strong className="text-slate-900 text-xs">₦{retail.toLocaleString()}</strong>
                              </div>
                              <div className="text-[10px] font-bold text-emerald-600">
                                +₦{markup.toLocaleString()} ({effectiveMarkup}%) profit
                              </div>
                            </div>

                            {isOnShelf ? (
                              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
                                ✓ On Shelf
                              </span>
                            ) : (
                              <button
                                onClick={() => addToShelf(p)}
                                className="text-xs font-bold text-white bg-slate-900 hover:bg-rose-600 px-3 py-1.5 rounded-xl shadow-sm transition cursor-pointer"
                              >
                                + Add
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                    {/* LOAD MORE BUTTON / PAGINATION */}
                    {masterProducts.length < totalCatalogProducts && (
                      <div className="pt-2 text-center">
                        <button
                          onClick={handleLoadMore}
                          disabled={loadingMore}
                          className="w-full sm:w-auto px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-300 transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 mx-auto shadow-sm"
                        >
                          {loadingMore ? (
                            <>
                              <span className="w-3.5 h-3.5 border-2 border-slate-700 border-t-transparent rounded-full animate-spin"></span>
                              Loading more medicines...
                            </>
                          ) : (
                            <>
                              <span>⬇ Load More Medicines</span>
                              <span className="text-slate-500 font-normal">
                                (+32 more of {totalCatalogProducts.toLocaleString()})
                              </span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* RIGHT PANEL: STOREFRONT SHELF DROP ZONE (COL 5) */}
              <div className="lg:col-span-5 space-y-4 sticky top-24">
                <div 
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'copy';
                    if (!isOverShelf) setIsOverShelf(true);
                  }}
                  onDragLeave={() => setIsOverShelf(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsOverShelf(false);
                    if (draggedProduct) {
                      addToShelf(draggedProduct);
                      setDraggedProduct(null);
                    }
                  }}
                  className={`bg-white rounded-3xl border-2 transition-all p-6 shadow-sm ${
                    isOverShelf
                      ? 'border-rose-500 bg-rose-50/60 ring-4 ring-rose-100 scale-[1.01]'
                      : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <span>Your Storefront Shelf</span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700">
                          {curatedProducts.length}
                        </span>
                      </h3>
                      <p className="text-xs text-slate-500">Products live on /p/{slug}</p>
                    </div>

                    {curatedProducts.length > 0 && (
                      <button
                        onClick={async () => {
                          if (confirm('Clear all curated items from your shelf?')) {
                            setCuratedProducts([]);
                            setProductMarkups({});
                            await persistCuratedAndMarkups([], {});
                            showToast('Shelf cleared');
                          }
                        }}
                        className="text-xs text-slate-400 hover:text-rose-600 font-medium cursor-pointer"
                      >
                        Clear All
                      </button>
                    )}
                  </div>

                  {/* SHELF SEARCH BAR */}
                  {curatedProducts.length > 0 && (
                    <div className="relative my-2">
                      <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400 text-xs">
                        🔍
                      </span>
                      <input
                        type="text"
                        value={shelfSearch}
                        onChange={(e) => setShelfSearch(e.target.value)}
                        placeholder={`Search ${curatedProducts.length} items on shelf...`}
                        className="w-full pl-8 pr-8 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 transition"
                      />
                      {shelfSearch && (
                        <button
                          onClick={() => setShelfSearch('')}
                          className="absolute inset-y-0 right-2.5 flex items-center text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  )}

                  {/* DROP ZONE NOTIFICATION */}
                  <div className={`my-2 p-3 rounded-2xl text-center text-xs font-semibold border-2 border-dashed transition-all ${
                    isOverShelf
                      ? 'border-rose-500 bg-rose-100 text-rose-700'
                      : 'border-slate-200 text-slate-400 bg-slate-50'
                  }`}>
                    {isOverShelf ? '📥 Release to add item to your shelf!' : '📥 Drop medicine cards here to add'}
                  </div>

                  {/* CURATED LIST */}
                  {curatedProducts.length === 0 ? (
                    <div className="py-14 text-center space-y-3">
                      <div className="text-4xl">🛍️</div>
                      <h4 className="text-sm font-bold text-slate-800">Your shelf is currently empty</h4>
                      <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                        Drag items from the left or click <span className="font-semibold text-slate-700">+ Add</span> on any medicine to build your customized store catalog.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                      {curatedProducts
                        .filter((item) => {
                          if (!shelfSearch.trim()) return true;
                          const q = shelfSearch.toLowerCase();
                          return (item.name || '').toLowerCase().includes(q) ||
                                 (item.category || '').toLowerCase().includes(q);
                        })
                        .map((item) => {
                        const base = Number(item.amount || item.basePrice || item.price || 0);
                        const hasCustomMarkup = productMarkups[item.id] !== undefined;
                        const effectivePct = hasCustomMarkup 
                          ? Number(productMarkups[item.id]) 
                          : markupPercentage;
                        const markup = Math.round(base * (effectivePct / 100));
                        const retail = base + markup;

                        return (
                          <div
                            key={item.id}
                            className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200/80 flex flex-col gap-2.5 transition group"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <h5 className="text-xs font-bold text-slate-900 truncate">
                                  {item.name}
                                </h5>
                                <div className="flex items-center gap-2 mt-0.5 text-[11px]">
                                  <span className="text-slate-800 font-bold">₦{retail.toLocaleString()}</span>
                                  <span className="text-emerald-600 font-bold">(+₦{markup.toLocaleString()} cut)</span>
                                </div>
                              </div>

                              <button
                                onClick={() => removeFromShelf(item.id)}
                                className="w-6 h-6 rounded-lg bg-white border border-slate-200 hover:bg-rose-50 hover:border-rose-300 text-slate-400 hover:text-rose-600 text-xs font-bold flex items-center justify-center transition cursor-pointer shrink-0 shadow-xs"
                                title="Remove from shelf"
                              >
                                ✕
                              </button>
                            </div>

                            {/* PRODUCT SPECIFIC MARKUP CONTROLLER */}
                            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/60 text-[11px]">
                              <span className="text-slate-500 font-medium">Custom Markup:</span>
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={hasCustomMarkup ? productMarkups[item.id] : ''}
                                  placeholder={String(markupPercentage)}
                                  onChange={(e) => {
                                    const val = e.target.value === '' ? null : parseFloat(e.target.value);
                                    handleUpdateProductMarkup(item.id, val);
                                  }}
                                  className="w-14 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 text-right focus:ring-1 focus:ring-rose-500 focus:outline-none"
                                />
                                <span className="font-bold text-slate-500">%</span>
                                {hasCustomMarkup && (
                                  <button
                                    onClick={() => handleUpdateProductMarkup(item.id, null)}
                                    className="text-[10px] text-slate-400 hover:text-rose-500 underline ml-1 cursor-pointer"
                                    title="Reset to global markup default"
                                  >
                                    Reset
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* SHELF SUMMARY & LINK */}
                  {curatedProducts.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                      <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-xs text-emerald-800 flex items-center justify-between font-semibold">
                        <span>✓ Live & Auto-Saved</span>
                        <span>{curatedProducts.length} Products Active</span>
                      </div>
                      <a
                        href={`/p/${slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow transition block text-center"
                      >
                        View Live Storefront (/p/{slug}) ↗
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: STOREFRONT & BRANDING */}
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
