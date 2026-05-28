import { Key, Shield, CreditCard, Bell } from 'lucide-react';

export default function DashboardSettings() {
  return (
    <div className="space-y-8 max-w-4xl">
      
      {/* Header section */}
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Settings</h2>
        <p className="text-sm text-slate-400 mt-1">Manage your Synkk integration and billing preferences.</p>
      </div>

      {/* Security & API Keys */}
      <section className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-800/50 flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
            <Key size={20} />
          </div>
          <div>
            <h3 className="text-lg font-medium text-slate-200">API Tokens</h3>
            <p className="text-sm text-slate-400">Secure tokens used by your Synkk desktop client.</p>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl border border-slate-700/50 bg-slate-950/50">
            <div>
              <p className="text-sm font-medium text-slate-300">Desktop Sync Token</p>
              <p className="text-xs text-slate-500 mt-1">Created May 28, 2026</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm text-slate-400 bg-slate-900 px-3 py-1 rounded-lg border border-slate-800">
                sk_live_**********************
              </span>
              <button className="text-sm text-blue-400 hover:text-blue-300 font-medium">Reveal</button>
            </div>
          </div>
          <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-sm font-medium rounded-xl border border-slate-700 transition-colors text-slate-200">
            Generate New Token
          </button>
        </div>
      </section>

      {/* Subscription */}
      <section className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-800/50 flex items-center gap-3">
          <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
            <CreditCard size={20} />
          </div>
          <div>
            <h3 className="text-lg font-medium text-slate-200">Subscription Plan</h3>
            <p className="text-sm text-slate-400">You are currently on the Pro plan.</p>
          </div>
        </div>
        <div className="p-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-white">$20</span>
              <span className="text-slate-400">/ month</span>
            </div>
            <p className="text-sm text-slate-400 mt-2">Includes advanced AI mapping and priority sync queues.</p>
          </div>
          <button className="px-4 py-2 bg-white text-slate-900 hover:bg-slate-100 text-sm font-medium rounded-xl transition-colors">
            Manage Billing
          </button>
        </div>
      </section>

    </div>
  );
}
