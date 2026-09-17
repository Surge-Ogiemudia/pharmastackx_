import React, { useState, useEffect } from 'react';
import { ShoppingCart, Package, Search, Users, Sparkles, Settings, LogOut, X, Menu, Loader2, MapPin } from 'lucide-react';

interface NavItemProps {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  isDanger?: boolean;
}

function NavItem({ icon: Icon, label, active, isDanger }: NavItemProps) {
  return (
    <button 
      className={`flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 text-[15px] font-medium w-full ${
        active 
          ? 'bg-[#042f2e]/60 text-[#10b981] border border-[#065f46]/50' 
          : isDanger 
            ? 'text-red-400 hover:bg-red-400/10'
            : 'text-slate-300 hover:bg-white/5 hover:text-white'
      }`}
    >
      <Icon 
        className={`w-5 h-5 ${active ? 'text-[#10b981]' : isDanger ? 'text-red-400' : 'text-slate-400'}`} 
        strokeWidth={active ? 2.5 : 2} 
      />
      <span className="tracking-wide">{label}</span>
    </button>
  );
}

interface AirenB2BStorefrontProps {
  partnerSlug?: string;
  setView?: (view: string) => void;
}

export default function AirenB2BStorefront({ partnerSlug, setView }: AirenB2BStorefrontProps) {
  const [activeSubTab, setActiveSubTab] = useState<'wholesale' | 'retail'>('wholesale');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  useEffect(() => {
    if (activeSubTab !== 'retail' || !searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/products?search=${encodeURIComponent(searchQuery)}&limit=10`);
        const json = await res.json();
        setSearchResults(json.data || []);
      } catch (err) {
        console.error("Search failed", err);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery, activeSubTab]);

  return (
    <div className="flex h-screen bg-[#050505] text-white overflow-hidden font-sans">
      
      {/* Sidebar */}
      <div className="w-[300px] bg-[#121622] flex flex-col justify-between h-full border-r border-white/5 shrink-0">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-6 border-b border-white/5 h-[73px]">
            <div>
              <h2 className="text-[15px] font-semibold text-white tracking-wide">Retail Pharmacy User</h2>
              <p className="text-[13px] text-slate-400 mt-1">Retail Pharmacy User</p>
            </div>
            <button className="text-slate-500 hover:text-white transition-colors p-1">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Top Navigation */}
          <div className="flex flex-col gap-1.5 px-4 mt-6">
            <NavItem icon={ShoppingCart} label="POS Register" />
            <NavItem icon={Package} label="Online Orders & Leads" />
            <NavItem icon={Search} label="Source" active />
            <NavItem icon={Users} label="Staff Management" />
            <NavItem icon={Sparkles} label="Subdomain & Social AI" />
          </div>
        </div>

        {/* Bottom Navigation */}
        <div className="flex flex-col gap-1.5 px-4 mb-8">
          <NavItem icon={Settings} label="Terminal Settings" />
          <NavItem icon={LogOut} label="Sign Out" isDanger />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <div className="h-[73px] flex items-center px-6 border-b border-white/5 bg-[#121622] shrink-0">
          <button className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-slate-300 mr-4 transition-colors">
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-bold text-[15px] text-white">Terminal</span>
        </div>

        {/* Page Content */}
        <div className="flex-1 p-8 flex flex-col overflow-y-auto">
          <h1 className="text-2xl font-bold text-white mb-2">B2B Sourcing</h1>
          <p className="text-slate-400 text-[15px] mb-8">
            Check neighboring pharmacy stock in real-time and source out-of-stock medicines instantly.
          </p>

          {/* Sub Tabs */}
          <div className="flex gap-6 mb-8 border-b border-white/10">
            <button 
              onClick={() => setActiveSubTab('wholesale')}
              className={`pb-3 text-[15px] font-medium border-b-2 transition-colors ${activeSubTab === 'wholesale' ? 'border-[#10b981] text-[#10b981]' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
            >
              Verified Wholesale Partner/Distributor
            </button>
            <button 
              onClick={() => setActiveSubTab('retail')}
              className={`pb-3 text-[15px] font-medium border-b-2 transition-colors ${activeSubTab === 'retail' ? 'border-[#10b981] text-[#10b981]' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
            >
              Small order from other retail pharmacies
            </button>
          </div>

          {activeSubTab === 'wholesale' && (
            <div className="flex-1 flex flex-col items-center justify-center opacity-40">
              <Package className="w-16 h-16 text-slate-500 mb-4" strokeWidth={1} />
              <p className="text-slate-400 text-[15px]">Select a verified wholesale partner to restock in bulk.</p>
            </div>
          )}

          {activeSubTab === 'retail' && (
            <div className="flex flex-col flex-1">
              {/* Search Bar */}
              <div className="flex items-center bg-[#0d121c] border border-white/10 rounded-xl p-1.5 focus-within:border-[#10b981]/50 transition-colors shrink-0">
                <div className="pl-4 pr-3 text-slate-400">
                  <Search className="w-5 h-5" />
                </div>
                <input 
                  type="text" 
                  placeholder="Search for out-of-stock medicine (e.g. Augmentin)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent text-white text-[15px] outline-none placeholder:text-slate-500 py-2"
                />
                <button className="bg-[#1e293b] hover:bg-[#334155] text-slate-300 px-7 py-2.5 rounded-lg text-sm font-medium transition-colors">
                  Find
                </button>
              </div>

              {/* Search Results */}
              <div className="mt-8 flex-1">
                {isSearching ? (
                  <div className="flex justify-center items-center py-20">
                    <Loader2 className="w-8 h-8 text-[#10b981] animate-spin" />
                  </div>
                ) : searchQuery && searchResults.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {searchResults.map((item, idx) => (
                      <div key={idx} className="bg-[#121622] border border-white/5 p-5 rounded-xl hover:border-white/10 transition-colors">
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="font-semibold text-white text-[16px] leading-tight">{item.name || 'Unknown Item'}</h3>
                          <span className="font-bold text-[#10b981] text-[15px]">{item.formattedPrice || `N${item.price?.toLocaleString()}`}</span>
                        </div>
                        <p className="text-slate-400 text-sm mb-4 line-clamp-2">
                          {item.info && item.info.trim() !== '' ? item.info : 'No description available.'}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mb-4 bg-white/5 w-fit px-2.5 py-1 rounded-md">
                          <MapPin className="w-3.5 h-3.5" />
                          <span>{item.businessName || item.pharmacy || 'Unknown Pharmacy'}</span>
                        </div>
                        <button className="w-full py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white text-sm font-medium transition-colors">
                          Source Item
                        </button>
                      </div>
                    ))}
                  </div>
                ) : searchQuery ? (
                  <div className="flex flex-col items-center justify-center py-20 opacity-50">
                    <Search className="w-12 h-12 text-slate-600 mb-4" strokeWidth={1} />
                    <p className="text-slate-400">No medicines found for "{searchQuery}"</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 opacity-40">
                    <Search className="w-16 h-16 text-slate-500 mb-4" strokeWidth={1} />
                    <p className="text-[#3b82f6]/60 text-[15px] font-medium">Type a medicine name to see who has it in stock nearby.</p>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

    </div>
  );
}
