import { Search, Filter, Store, Clock, AlertCircle, CheckCircle2, ChevronRight, ServerCrash, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { dbConnect } from '@/lib/mongoConnect';
import User from '@/models/User';
import UploadLog from '@/models/UploadLog';

export default async function PharmaciesList() {
  await dbConnect();
  const users = await User.find({ role: 'pharmacy' }).lean();
  
  const networkData = await Promise.all(users.map(async (user) => {
    let lastSyncTime = user.lastSyncTime ? new Date(user.lastSyncTime) : null;
    let timeDiff = lastSyncTime ? Date.now() - lastSyncTime.getTime() : Infinity;

    let status = 'critical'; // > 24h or never
    if (timeDiff <= 15 * 60 * 1000) {
      status = 'excellent'; // < 15m
    } else if (timeDiff <= 60 * 60 * 1000) {
      status = 'healthy'; // 15m to 1h
    } else if (timeDiff <= 24 * 60 * 60 * 1000) {
      status = 'warning'; // 1h to 24h
    }

    return {
      id: user._id.toString(),
      name: user.businessName || user.username || 'Unnamed Pharmacy',
      location: user.businessAddress || user.city || 'Unknown Location',
      phone: user.phoneNumber || '',
      pos: (user as any).posSystem || 'Auto-Detected',
      installedAt: user.createdAt?.toLocaleDateString() || 'N/A',
      lastSync: lastSyncTime ? lastSyncTime.toLocaleString() : 'Never',
      syncTier: user.lastSyncTier || null,
      appVersion: user.appVersion || 'Pre-v1.1.4',
      status
    };
  }));

  const statusStyles = {
    excellent: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    healthy: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    critical: 'bg-red-500/10 text-red-400 border-red-500/20'
  };

  return (
    <div className="space-y-6">
      
      {/* Top Nav */}
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors">
        <ArrowLeft size={16} />
        Back to Dashboard
      </Link>

      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-100">Network Pharmacies</h2>
          <p className="text-sm text-slate-400 mt-1">Monitor the health and sync status of every pharmacy running Synkk.</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-sm font-medium rounded-xl border border-slate-700 transition-colors flex items-center gap-2">
            <Filter size={16} />
            Filter
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 rounded-2xl p-4 flex items-center gap-4">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input 
            type="text" 
            placeholder="Search pharmacies by name, location, or POS..." 
            className="w-full bg-slate-950/50 border border-slate-800 text-sm rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all text-slate-200 placeholder:text-slate-600"
          />
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800/50 text-xs uppercase tracking-wider text-slate-500 font-semibold bg-slate-900/20">
                <th className="p-4 rounded-tl-xl">Pharmacy Name</th>
                <th className="p-4">Location</th>
                <th className="p-4">Installed At</th>
                <th className="p-4">Last Sync</th>
                <th className="p-4">Tier</th>
                <th className="p-4">Version</th>
                <th className="p-4">Status</th>
                <th className="p-4 rounded-tr-xl"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {networkData.length > 0 ? networkData.map((pharmacy) => (
                <tr key={pharmacy.id} className="hover:bg-slate-800/20 transition-colors group">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700/50">
                        <Store className="w-5 h-5 text-slate-400" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-200">{pharmacy.name}</p>
                        <p className="text-xs text-slate-500">{pharmacy.pos}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-slate-400">{pharmacy.location}</td>
                  <td className="p-4 text-sm text-slate-400">{pharmacy.installedAt}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-1.5 text-sm text-slate-400">
                      <Clock className="w-4 h-4 text-slate-500" />
                      {pharmacy.lastSync}
                    </div>
                  </td>
                  <td className="p-4">
                    {pharmacy.syncTier ? (
                      <span className="px-2 py-1 bg-slate-800 text-slate-300 text-xs rounded border border-slate-700">
                        Tier {pharmacy.syncTier}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-600">-</span>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col items-start gap-1">
                      <span className="text-sm font-medium text-slate-200">
                        {pharmacy.appVersion}
                      </span>
                      {pharmacy.appVersion !== 'v1.1.4' && pharmacy.phone && (
                        <a 
                          href={`tel:${pharmacy.phone}`}
                          className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors uppercase tracking-wider font-semibold"
                        >
                          Call to Update
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusStyles[pharmacy.status as keyof typeof statusStyles]}`}>
                      {pharmacy.status === 'excellent' && <CheckCircle2 className="w-3.5 h-3.5" />}
                      {pharmacy.status === 'healthy' && <CheckCircle2 className="w-3.5 h-3.5" />}
                      {pharmacy.status === 'warning' && <AlertCircle className="w-3.5 h-3.5" />}
                      {pharmacy.status === 'critical' && <ServerCrash className="w-3.5 h-3.5" />}
                      {pharmacy.status.charAt(0).toUpperCase() + pharmacy.status.slice(1)}
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <Link 
                      href={`/dashboard/pharmacies/${pharmacy.id}`}
                      className="inline-flex items-center justify-center p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </Link>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No pharmacies found in the network.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
