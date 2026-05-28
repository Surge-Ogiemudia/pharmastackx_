import { ArrowLeft, ServerCrash, Activity, Database, ShoppingCart, RefreshCw, X, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export default function PharmacyDetail({ params }: { params: { id: string } }) {
  // Mock data for the specific pharmacy
  const pharmacy = {
    id: params.id,
    name: 'Oak Street Pharmacy',
    location: 'Portland, OR',
    status: 'Critical',
    posSoftware: 'Unknown/Custom SQL',
    installDate: 'May 28, 2026',
    lastSync: 'Failed (15 mins ago)',
    totalMedicines: 0,
    storefrontViews: 450,
    ordersGenerated: 2,
  };

  const [isSending, setIsSending] = useState(false);
  const [alertSent, setAlertSent] = useState(false);

  const sendAlert = async () => {
    setIsSending(true);
    try {
      const res = await fetch('/api/dashboard/alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          pharmacyId: pharmacy.id, 
          pharmacyName: pharmacy.name,
          reason: 'Gemini AI failed to parse POS Schema. Missing headers.'
        })
      });
      if (res.ok) setAlertSent(true);
      else alert('Failed to send alert (Auth Error or Resend Error)');
    } catch (e) {
      alert('Network error');
    }
    setIsSending(false);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      
      {/* Top Nav */}
      <Link href="/dashboard/pharmacies" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors">
        <ArrowLeft size={16} />
        Back to Network
      </Link>

      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 p-6 rounded-2xl">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-2xl font-bold tracking-tight text-white">{pharmacy.name}</h2>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
              <ServerCrash size={14} />
              {pharmacy.status} Sync Failure
            </span>
          </div>
          <p className="text-slate-400 text-sm">{pharmacy.location} &bull; ID: {pharmacy.id}</p>
        </div>
        
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-sm font-medium rounded-xl border border-slate-700 transition-colors flex items-center gap-2">
            Force Re-Sync
          </button>
          <button 
            onClick={sendAlert}
            disabled={isSending || alertSent}
            className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors flex items-center gap-2 ${
              alertSent ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-red-600 hover:bg-red-500 text-white shadow-[0_0_10px_rgba(220,38,38,0.3)]'
            }`}
          >
            {isSending ? <Loader2 size={16} className="animate-spin" /> : alertSent ? 'Alert Sent!' : 'Email Owner (Alert)'}
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'POS Software', value: pharmacy.posSoftware, icon: Database },
          { label: 'Indexed Medicines', value: pharmacy.totalMedicines.toString(), icon: Activity },
          { label: 'Storefront Views', value: pharmacy.storefrontViews.toString(), icon: RefreshCw },
          { label: 'Orders Generated', value: pharmacy.ordersGenerated.toString(), icon: ShoppingCart },
        ].map((metric, i) => (
          <div key={i} className="bg-slate-900/30 border border-slate-800/50 p-4 rounded-xl">
            <div className="flex items-center gap-2 text-slate-400 mb-2">
              <metric.icon size={16} />
              <span className="text-xs font-medium uppercase tracking-wider">{metric.label}</span>
            </div>
            <p className="text-xl font-semibold text-slate-200">{metric.value}</p>
          </div>
        ))}
      </div>

      {/* Diagnostics / Error Logs */}
      <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-800/50">
          <h3 className="text-lg font-medium text-slate-200">Diagnostics & AI Logs</h3>
        </div>
        <div className="p-6 space-y-6">
          
          <div className="bg-red-950/20 border border-red-900/30 rounded-xl p-4">
            <h4 className="text-sm font-semibold text-red-400 mb-2">Latest Error (15 mins ago)</h4>
            <p className="text-sm text-slate-300 font-mono">
              [Vercel Backend] Gemini AI failed to parse POS Schema. <br/>
              Reason: The uploaded CSV contains completely empty column headers. AI could not confidently map 'item_name' to any valid column.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-medium text-slate-400 mb-3">Sync History</h4>
            <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-800 before:to-transparent">
              
              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-red-500 bg-slate-900 text-red-400 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-[0_0_10px_rgba(239,68,68,0.2)]">
                  <X size={16} />
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-red-900/30 bg-red-950/10">
                  <div className="flex justify-between mb-1">
                    <span className="font-bold text-red-400 text-sm">Schema Mapping Failed</span>
                    <span className="text-xs text-slate-500">15 mins ago</span>
                  </div>
                  <p className="text-xs text-slate-400">AI analysis returned a 400 Bad Request due to missing headers.</p>
                </div>
              </div>

              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-emerald-500 bg-slate-900 text-emerald-400 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                  <Activity size={16} />
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-800/50 bg-slate-900/30">
                  <div className="flex justify-between mb-1">
                    <span className="font-bold text-emerald-400 text-sm">Synkk Installed</span>
                    <span className="text-xs text-slate-500">May 28, 2026</span>
                  </div>
                  <p className="text-xs text-slate-400">Desktop client successfully registered with Vercel backend.</p>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
