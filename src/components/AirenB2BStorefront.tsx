'use client';

import React from 'react';
import { ShoppingCart, Package, Search, Users, Sparkles, Settings, LogOut, X } from 'lucide-react';

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

export default function AirenB2BStorefront() {
  return (
    <div className="flex h-screen bg-[#000000] text-white overflow-hidden font-sans">
      
      {/* Sidebar */}
      <div className="w-[300px] bg-[#121622] flex flex-col justify-between h-full border-r border-white/5">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-6 border-b border-white/5">
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

      {/* Main Content Area (Blank Slate) */}
      <div className="flex-1 bg-[#050505]">
        {/* We will build this area step by step */}
      </div>

    </div>
  );
}
