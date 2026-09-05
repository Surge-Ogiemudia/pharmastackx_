'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  Search, 
  MapPin, 
  AlertCircle, 
  ShoppingCart, 
  RefreshCw, 
  ExternalLink, 
  X, 
  CheckCircle2, 
  ChevronRight, 
  Settings, 
  LogOut, 
  Link2, 
  AlertTriangle, 
  Info 
} from 'lucide-react';

interface ConfirmModalState {
  isOpen: boolean;
  title: string;
  description: string;
  consequences: string[];
  confirmLabel: string;
  confirmVariant: 'danger' | 'warning' | 'primary';
  onConfirm: () => void;
}

function ExtensionContent() {
  const searchParams = useSearchParams();
  const [pharmacyName, setPharmacyName] = useState<string>('My Pharmacy');
  const [terminalId, setTerminalId] = useState<string>('Counter 1');
  const [slug, setSlug] = useState<string>('');
  const [syncCount, setSyncCount] = useState<number | null>(null);
  const [lastSyncText, setLastSyncText] = useState<string>('Synced just now');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Settings Menu & Modal State
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({
    isOpen: false,
    title: '',
    description: '',
    consequences: [],
    confirmLabel: '',
    confirmVariant: 'primary',
    onConfirm: () => {}
  });

  // Search & Sourcing State
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Slide-over Checkout Drawer State
  const [checkoutItem, setCheckoutItem] = useState<any | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [orderSuccessMsg, setOrderSuccessMsg] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const settingsMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const paramPharm = searchParams?.get('pharmacy');
    const paramSlug = searchParams?.get('slug');
    const paramTerminal = searchParams?.get('terminal');
    const paramCount = searchParams?.get('count');

    if (paramPharm) setPharmacyName(paramPharm);
    if (paramSlug) setSlug(paramSlug);
    if (paramTerminal) setTerminalId(paramTerminal);
    if (paramCount) setSyncCount(parseInt(paramCount, 10));

    // Listen to messages from extension shell
    const handleShellMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === 'SYNC_STATE_UPDATE') {
        if (e.data.pharmacyName) setPharmacyName(e.data.pharmacyName);
        if (e.data.terminalId) setTerminalId(e.data.terminalId);
        if (e.data.syncCount !== undefined) setSyncCount(e.data.syncCount);
        if (e.data.lastSyncText) setLastSyncText(e.data.lastSyncText);
      }
      if (e.data && (e.data.type === 'PSX_ORDER_DONE' || e.data === 'PSX_CHECKOUT_COMPLETED')) {
        setCheckoutUrl(null);
        setCheckoutItem(null);
        setOrderSuccessMsg('Order placed successfully with dispatch!');
        setTimeout(() => setOrderSuccessMsg(null), 7000);
      }
    };
    window.addEventListener('message', handleShellMessage);
    return () => window.removeEventListener('message', handleShellMessage);
  }, [searchParams]);

  // Click outside to close settings
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(e.target as Node)) {
        setIsSettingsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Autocomplete debounce
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.trim().length >= 2 && !hasSearched) {
        try {
          const res = await fetch(`/api/source/autocomplete?query=${encodeURIComponent(query)}`);
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.suggestions?.length > 0) {
              setSuggestions(data.suggestions);
              setShowSuggestions(true);
            } else {
              setSuggestions([]);
              setShowSuggestions(false);
            }
          }
        } catch (e) {
          console.error(e);
        }
      } else {
        setShowSuggestions(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query, hasSearched]);

  const handleSearch = async (e: React.FormEvent | string) => {
    if (typeof e !== 'string') e.preventDefault();
    const searchQuery = typeof e === 'string' ? e : query;
    if (searchQuery.trim().length < 2) return;

    setQuery(searchQuery);
    setShowSuggestions(false);
    setLoading(true);
    setHasSearched(true);

    try {
      const res = await fetch(`/api/source?query=${encodeURIComponent(searchQuery)}&exclude=${encodeURIComponent(slug)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.results) {
          setResults(data.results);
        } else {
          setResults([]);
        }
      } else {
        setResults([]);
      }
    } catch (error) {
      console.error('Failed to search', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCheckout = (item: any) => {
    const seller = item.pharmacy?.slug || item.pharmacy?.name || item.sellerPharmacy || 'Verified Pharmacy';
    const itemName = item.itemName || item.name;
    const price = item.price || 0;
    const buyer = slug || pharmacyName;
    const url = `https://www.psx.ng/?view=confirmOrder&action=checkout&item=${encodeURIComponent(itemName)}&price=${price}&seller=${encodeURIComponent(seller)}&buyer=${encodeURIComponent(buyer)}`;
    
    setCheckoutItem(item);
    setCheckoutUrl(url);
  };

  // Trigger Force Sync (with confirmation)
  const promptForceSync = () => {
    setIsSettingsOpen(false);
    setConfirmModal({
      isOpen: true,
      title: 'Force Stock Reconciliation?',
      description: 'This triggers an immediate catalog scrape and cloud sync from your open Web POS tab.',
      consequences: [
        'Ensure your POS Inventory / Products page is open in another tab.',
        'This updates your live cloud catalog with current on-shelf stock counts.'
      ],
      confirmLabel: 'Force Sync Now',
      confirmVariant: 'primary',
      onConfirm: () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setIsSyncing(true);
        if (typeof window !== 'undefined' && window.parent) {
          window.parent.postMessage({ type: 'TRIGGER_FORCE_SYNC' }, '*');
        }
        setTimeout(() => {
          setIsSyncing(false);
          setLastSyncText('Synced just now');
        }, 1200);
      }
    });
  };

  // Trigger Re-link POS (with confirmation)
  const promptRelinkPOS = () => {
    setIsSettingsOpen(false);
    setConfirmModal({
      isOpen: true,
      title: 'Re-link Web POS Setup?',
      description: 'You are about to re-run the POS URL detection and table training wizard.',
      consequences: [
        'Live background sync will be paused until the new POS setup is confirmed.',
        'Choose this if your POS website address changed or table layout updated.',
        'You will be guided through a 2-step portal link & table scan.'
      ],
      confirmLabel: 'Proceed to Re-link',
      confirmVariant: 'warning',
      onConfirm: () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        if (typeof window !== 'undefined' && window.parent) {
          window.parent.postMessage({ type: 'EXTENSION_RELINK_POS' }, '*');
        }
      }
    });
  };

  // Trigger Logout (with confirmation)
  const promptLogout = () => {
    setIsSettingsOpen(false);
    setConfirmModal({
      isOpen: true,
      title: 'Sign Out of Terminal?',
      description: 'You are disconnecting this Chrome counter terminal from your pharmacy account.',
      consequences: [
        'Live inventory & sales sync will STOP immediately for this till counter.',
        'You will LOSE the ability to search and procure out-of-stock medicines.',
        'You will need your pharmacy login credentials to reconnect.'
      ],
      confirmLabel: 'Sign Out & Disconnect',
      confirmVariant: 'danger',
      onConfirm: () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        if (typeof window !== 'undefined' && window.parent) {
          window.parent.postMessage({ type: 'EXTENSION_LOGOUT' }, '*');
        }
      }
    });
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#0b0f17] text-slate-100 font-sans select-none overflow-hidden relative">
      
      {/* Top Header Bar */}
      <header className="flex items-center justify-between px-3.5 py-2.5 bg-[#111827] border-b border-white/10 shrink-0 z-20">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-sky-600 flex items-center justify-center font-black text-xs text-slate-950 shadow-md shrink-0">
            {pharmacyName.substring(0, 3).toUpperCase()}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-xs text-white truncate max-w-[150px]">{pharmacyName}</span>
            <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Live Sync Active
            </span>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-1.5 shrink-0 relative" ref={settingsMenuRef}>
          <span className="px-2 py-0.5 rounded bg-slate-800/80 border border-white/5 text-[10px] font-semibold text-slate-400">
            💻 {terminalId}
          </span>
          
          <button 
            onClick={promptForceSync}
            title="Force Sync Inventory"
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-emerald-400' : ''}`} />
          </button>

          {/* Settings Menu Trigger */}
          <button 
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            title="Terminal Settings & Diagnostics"
            className={`p-1.5 rounded transition ${isSettingsOpen ? 'bg-slate-800 text-emerald-400' : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`}
          >
            <Settings className="w-3.5 h-3.5" />
          </button>

          {/* Settings Dropdown Menu */}
          {isSettingsOpen && (
            <div className="absolute top-full right-0 mt-1.5 w-48 bg-[#161f30] border border-white/10 rounded-xl shadow-2xl py-1.5 z-40 animate-in fade-in slide-in-from-top-1 duration-150 divide-y divide-white/5">
              <button
                onClick={promptRelinkPOS}
                className="w-full px-3 py-2 text-left text-xs text-slate-200 hover:bg-slate-800 flex items-center gap-2 transition"
              >
                <Link2 className="w-3.5 h-3.5 text-sky-400" />
                <span>Re-link POS Portal</span>
              </button>

              <button
                onClick={promptForceSync}
                className="w-full px-3 py-2 text-left text-xs text-slate-200 hover:bg-slate-800 flex items-center gap-2 transition"
              >
                <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                <span>Force Stock Sync</span>
              </button>

              <button
                onClick={promptLogout}
                className="w-full px-3 py-2 text-left text-xs text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out Terminal</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5">
        
        {/* Sync Status Banner Card */}
        <div className="bg-[#161f30] border border-white/5 rounded-xl p-3 relative overflow-hidden shadow-sm">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-400 via-sky-400 to-emerald-500"></div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-semibold text-slate-200">Catalog Health</span>
            <span className="text-emerald-400 font-bold">
              {syncCount !== null ? `${syncCount.toLocaleString()} items` : 'Live Synced'}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>{lastSyncText}</span>
            <div className="flex items-center gap-2">
              <span 
                onClick={promptRelinkPOS} 
                className="text-slate-400 hover:text-sky-300 cursor-pointer text-[10.5px]"
              >
                Re-link ⚙️
              </span>
              <span>·</span>
              <span 
                onClick={promptForceSync} 
                className="text-sky-400 hover:underline cursor-pointer flex items-center gap-0.5 font-medium"
              >
                Sync ↻
              </span>
            </div>
          </div>
        </div>

        {/* Success Toast Banner */}
        {orderSuccessMsg && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between text-emerald-300 text-xs animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{orderSuccessMsg}</span>
            </div>
            <button onClick={() => setOrderSuccessMsg(null)} className="text-emerald-400 hover:text-emerald-200">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Sourcing Section Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-emerald-400" />
              B2B Stock Sourcing
            </h3>
            <p className="text-[10px] text-slate-400">Procure out-of-stock items nearby</p>
          </div>
        </div>

        {/* Search Input Box */}
        <form onSubmit={handleSearch} className="relative">
          <div className="flex items-center bg-[#161f30] border border-white/10 rounded-xl px-3 py-1.5 focus-within:border-emerald-400/60 focus-within:ring-2 focus-within:ring-emerald-400/20 transition">
            <Search className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
            <input 
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setHasSearched(false);
              }}
              placeholder="Search drug e.g. Augmentin, Paracetamol..."
              className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
            />
            {query && (
              <button 
                type="button" 
                onClick={() => { setQuery(''); setHasSearched(false); }}
                className="text-slate-500 hover:text-white mr-1.5 text-xs"
              >
                ✕
              </button>
            )}
            <button 
              type="submit" 
              disabled={loading}
              className="px-2.5 py-1 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-[11px] rounded-lg transition shrink-0"
            >
              {loading ? '...' : 'Find'}
            </button>
          </div>

          {/* Autocomplete Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[#161f30] border border-white/10 rounded-xl shadow-2xl max-h-48 overflow-y-auto z-30 divide-y divide-white/5">
              {suggestions.map((sug, idx) => (
                <div 
                  key={idx}
                  onClick={() => handleSearch(sug)}
                  className="px-3 py-2 text-xs text-slate-200 hover:bg-slate-800/80 hover:text-emerald-400 cursor-pointer flex items-center justify-between transition"
                >
                  <span>{sug}</span>
                  <ChevronRight className="w-3 h-3 text-slate-500" />
                </div>
              ))}
            </div>
          )}
        </form>

        {/* Results List */}
        <div className="space-y-2.5">
          {loading ? (
            <div className="py-8 text-center text-slate-400 text-xs animate-pulse flex flex-col items-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-emerald-400" />
              Searching neighboring inventory...
            </div>
          ) : results.length > 0 ? (
            results.map((item, idx) => {
              const pName = item.pharmacy?.name || item.sellerPharmacy || 'Neighbor Pharmacy';
              const pDist = item.distance ? `${item.distance.toFixed(1)} km` : '1.4 km';
              const pEta = item.eta || '6 mins';
              const price = item.price ? `₦${Number(item.price).toLocaleString()}` : 'Contact';
              const stock = item.stock || item.quantity || 8;

              return (
                <div 
                  key={idx}
                  className="bg-[#161f30] border border-white/5 hover:border-emerald-400/30 rounded-xl p-3 flex flex-col gap-2 transition"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs text-white truncate">{item.itemName || item.name}</h4>
                      <p className="text-[10px] text-slate-400 truncate">{pName}</p>
                    </div>
                    <span className="font-extrabold text-xs text-emerald-400 shrink-0">{price}</span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-white/5">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-sky-400" />
                      {pDist} ({pEta})
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold text-[9.5px]">
                      ● {stock} in stock
                    </span>
                  </div>

                  <button 
                    onClick={() => handleOpenCheckout(item)}
                    className="w-full mt-1 py-1.5 bg-gradient-to-r from-emerald-400 to-emerald-500 hover:from-emerald-300 hover:to-emerald-400 text-slate-950 font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 shadow-sm transition"
                  >
                    <ShoppingCart className="w-3 h-3" />
                    Get It · Procure Now
                  </button>
                </div>
              );
            })
          ) : hasSearched ? (
            <div className="p-6 text-center bg-[#161f30]/60 border border-dashed border-white/10 rounded-xl text-slate-400 flex flex-col items-center gap-1.5">
              <AlertCircle className="w-6 h-6 text-slate-500 mb-1" />
              <p className="font-semibold text-xs text-slate-300">No stock found nearby</p>
              <p className="text-[10px] text-slate-500 max-w-[220px]">
                No neighboring pharmacies currently have confirmed stock for "{query}".
              </p>
            </div>
          ) : (
            <div className="p-6 text-center bg-[#161f30]/40 border border-dashed border-white/10 rounded-xl text-slate-400 flex flex-col items-center gap-1.5">
              <span className="text-2xl mb-1">💊</span>
              <p className="font-semibold text-xs text-slate-300">Search Neighbor Inventory</p>
              <p className="text-[10px] text-slate-500 max-w-[220px]">
                Type any drug name above to find verified nearby stock with real-time ETA and wholesale pricing.
              </p>
            </div>
          )}
        </div>

      </div>

      {/* Confirmation & Consequence Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-xs bg-[#161f30] border border-white/10 rounded-2xl p-4 shadow-2xl flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                confirmModal.confirmVariant === 'danger' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                confirmModal.confirmVariant === 'warning' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              }`}>
                {confirmModal.confirmVariant === 'danger' ? <AlertCircle className="w-4 h-4" /> :
                 confirmModal.confirmVariant === 'warning' ? <AlertTriangle className="w-4 h-4" /> :
                 <Info className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-xs text-white">{confirmModal.title}</h4>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{confirmModal.description}</p>
              </div>
            </div>

            {/* Consequence Points */}
            {confirmModal.consequences.length > 0 && (
              <div className="bg-[#0b0f17]/80 rounded-xl p-2.5 border border-white/5 space-y-1.5">
                {confirmModal.consequences.map((c, i) => (
                  <p key={i} className="text-[10.5px] text-slate-300 leading-normal flex items-start gap-1.5">
                    <span>•</span>
                    <span>{c}</span>
                  </p>
                ))}
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className={`flex-1 py-1.5 rounded-lg font-bold text-xs transition ${
                  confirmModal.confirmVariant === 'danger' ? 'bg-rose-600 hover:bg-rose-500 text-white' :
                  confirmModal.confirmVariant === 'warning' ? 'bg-amber-500 hover:bg-amber-400 text-slate-950' :
                  'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                }`}
              >
                {confirmModal.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Slide-over Checkout Drawer */}
      <div 
        className={`absolute inset-0 bg-[#0b0f17] z-50 flex flex-col transition-transform duration-300 ease-out ${
          checkoutUrl ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#111827] border-b border-white/10 shrink-0">
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-xs text-white truncate">
              {checkoutItem?.itemName || checkoutItem?.name || 'Procure Item'}
            </span>
            <span className="text-[10px] text-slate-400 truncate">
              Seller: {checkoutItem?.pharmacy?.name || checkoutItem?.sellerPharmacy || 'Verified Pharmacy'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button 
              onClick={() => {
                if (checkoutUrl) window.open(checkoutUrl, '_blank');
              }}
              title="Open in new tab"
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={() => {
                setCheckoutUrl(null);
                setCheckoutItem(null);
              }}
              title="Close drawer"
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 bg-white relative">
          {checkoutUrl && (
            <iframe 
              src={checkoutUrl}
              className="w-full h-full border-none"
              title="PharmastackX B2B Checkout"
            />
          )}
        </div>
      </div>

    </div>
  );
}

export default function ExtensionPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen bg-[#0b0f17] text-slate-400 text-xs">
        Loading Cockpit...
      </div>
    }>
      <ExtensionContent />
    </Suspense>
  );
}
