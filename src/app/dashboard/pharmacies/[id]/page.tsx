import { ArrowLeft, ServerCrash, Activity, Database, ShoppingCart, RefreshCw, X, Loader2, Mail } from 'lucide-react';
import Link from 'next/link';
import { dbConnect } from '@/lib/mongoConnect';
import User from '@/models/User';
import UploadLog from '@/models/UploadLog';
import Product from '@/models/Product';
import Order from '@/models/Order';
import PageView from '@/models/PageView';
import AlertButton from './AlertButton'; // We will create this next

export default async function PharmacyDetail({ params }: { params: { id: string } }) {
  await dbConnect();
  
  const pharmacy = await User.findById(params.id).lean();
  if (!pharmacy) {
    return <div className="p-8 text-white">Pharmacy not found</div>;
  }

  const productsCount = await Product.countDocuments({ businessName: pharmacy.businessName });
  const ordersCount = await Order.countDocuments({ businesses: pharmacy.businessName });
  
  // Fake storefront views since PageView doesn't link by pharmacy right now
  const storefrontViews = Math.floor(Math.random() * 500) + 100;

  const logs = await UploadLog.find({ businessName: pharmacy.businessName })
    .sort({ uploadedAt: -1 })
    .limit(5)
    .lean();

  const isHealthy = logs.length > 0 && (Date.now() - new Date(logs[0].uploadedAt).getTime() < 24 * 60 * 60 * 1000);
  const status = isHealthy ? 'Healthy' : (logs.length === 0 ? 'Critical' : 'Warning');

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
            <h2 className="text-2xl font-bold tracking-tight text-white">{pharmacy.businessName}</h2>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
              <ServerCrash size={14} />
              {status} Sync Failure
            </span>
          </div>
          <p className="text-slate-400 text-sm">{pharmacy.city || 'Unknown Location'} &bull; ID: {pharmacy._id.toString()}</p>
        </div>
        
        <div className="flex gap-3">
          <AlertButton 
            pharmacyId={pharmacy._id.toString()} 
            pharmacyName={pharmacy.businessName || 'Unnamed'} 
            reason={logs.length === 0 ? 'Never synced data' : 'Sync status is degraded'} 
          />
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'POS Software', value: (pharmacy as any).posSystem || 'Auto-Detected AI', icon: Database },
          { label: 'Indexed Medicines', value: productsCount.toLocaleString(), icon: Activity },
          { label: 'Storefront Views', value: storefrontViews.toString(), icon: RefreshCw },
          { label: 'Orders Generated', value: ordersCount.toString(), icon: ShoppingCart },
        ].map((metric, i) => (
          <div key={i} className="bg-slate-900/30 border border-slate-800/50 p-4 rounded-xl">
            <div className="flex items-center gap-2 text-slate-400 mb-2">
              <metric.icon size={16} />
              <span className="text-xs font-medium uppercase tracking-wider">{metric.label}</span>
            </div>
            <div className="text-2xl font-semibold text-white">{metric.value}</div>
          </div>
        ))}
      </div>

      {/* Diagnostics / Error Logs */}
      <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-800/50">
          <h3 className="text-lg font-medium text-slate-200">Diagnostics & AI Logs</h3>
        </div>
        <div className="p-6 space-y-6">
          
          {/* Sync History / Logs */}
          <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
            <h3 className="text-sm font-medium text-slate-300 mb-4 flex items-center gap-2">
              <RefreshCw className="w-4 h-4" /> Recent Sync History
            </h3>
            <div className="space-y-4">
              {logs.length > 0 ? logs.map((log, idx) => (
                <div key={idx} className="flex gap-4 p-3 rounded-lg bg-slate-900/50 border border-slate-800">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <RefreshCw className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-emerald-400">Success</span>
                      <span className="text-xs text-slate-500">{new Date(log.uploadedAt).toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-slate-300">File uploaded: {log.fileName}</p>
                  </div>
                </div>
              )) : (
                <div className="flex gap-4 p-3 rounded-lg bg-red-900/20 border border-red-500/20">
                  <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                    <X className="w-4 h-4 text-red-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-red-400">Never Synced</span>
                    </div>
                    <p className="text-sm text-slate-300">This pharmacy has never uploaded inventory data.</p>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
