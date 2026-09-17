'use client';

import React from 'react';
import { ShoppingCart, Package, Search, Users, Sparkles, Settings, LogOut, X, Menu } from 'lucide-react';

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
  return (
    <div className="flex h-screen bg-[#050505] text-white overflow-hidden font-sans">
      
      {/* Sidebar */}
      <div className="w-[300px] bg-[#121622] flex flex-col justify-between h-full border-r border-white/5">
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
      <div className="flex-1 flex flex-col">
        {/* Top Header Bar */}
        <div className="h-[73px] flex items-center px-6 border-b border-white/5 bg-[#121622]">
          <button className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-slate-300 mr-4 transition-colors">
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-bold text-[15px] text-white">Terminal</span>
        </div>

        {/* Page Content */}
        <div className="flex-1 p-8 flex flex-col">
          <h1 className="text-xl font-bold text-white mb-2">B2B Sourcing</h1>
          <p className="text-slate-400 text-[14px] mb-8">
            Check neighboring pharmacy stock in real-time and source out-of-stock medicines instantly.
          </p>

          {/* Search Bar */}
          <div className="flex items-center bg-[#0d121c] border border-white/10 rounded-xl p-1.5 focus-within:border-slate-500 transition-colors">
            <div className="pl-4 pr-3 text-slate-400">
              <Search className="w-5 h-5" />
            </div>
            <input 
              type="text" 
              placeholder="Search for out-of-stock medicine..."
              className="flex-1 bg-transparent text-white text-[15px] outline-none placeholder:text-slate-500 py-2"
            />
            <button className="bg-[#1e293b] hover:bg-[#334155] text-slate-300 px-7 py-2.5 rounded-lg text-sm font-medium transition-colors">
              Find
            </button>
          </div>

          {/* Empty State */}
          <div className="flex-1 flex flex-col items-center justify-center mt-12 mb-20">
            <Search className="w-[72px] h-[72px] text-slate-800 mb-6" strokeWidth={1.5} />
            <p className="text-[#3b82f6]/60 text-[15px] font-medium">Type a medicine name to see who has it in stock nearby.</p>
          </div>
        </div>
      </div>

    </div>
  );
}
