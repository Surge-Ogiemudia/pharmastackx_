import { Search, Filter, ServerCrash, ExternalLink } from 'lucide-react';
import Link from 'next/link';

const mockPharmacies = [
  { id: 'PHR-001', name: 'Downtown Health Pharmacy', location: 'New York, NY', pos: 'Vend POS', installDate: '2025-10-12', lastSync: '2 mins ago', status: 'Healthy' },
  { id: 'PHR-002', name: 'MediCare Plus', location: 'Austin, TX', pos: 'Custom CSV', installDate: '2026-01-05', lastSync: '15 mins ago', status: 'Healthy' },
  { id: 'PHR-003', name: 'Family Rx Hub', location: 'Chicago, IL', pos: 'Square', installDate: '2026-03-22', lastSync: '4 days ago', status: 'Warning' },
  { id: 'PHR-004', name: 'Oak Street Pharmacy', location: 'Portland, OR', pos: 'Unknown', installDate: '2026-05-28', lastSync: 'Failed', status: 'Critical' },
  { id: 'PHR-005', name: 'Sunrise Medications', location: 'Miami, FL', pos: 'LightSpeed', installDate: '2025-11-30', lastSync: '10 mins ago', status: 'Healthy' },
];

export default function PharmaciesList() {
  return (
    <div className="space-y-6">
      
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
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-900 border-b border-slate-800/50 text-slate-400 uppercase tracking-wider text-xs font-semibold">
              <tr>
                <th className="px-6 py-4">Pharmacy Name</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4">POS System</th>
                <th className="px-6 py-4">Last Sync</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {mockPharmacies.map((pharmacy) => (
                <tr key={pharmacy.id} className="hover:bg-slate-800/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-200">{pharmacy.name}</div>
                    <div className="text-xs text-slate-500 mt-1 font-mono">{pharmacy.id}</div>
                  </td>
                  <td className="px-6 py-4 text-slate-400">{pharmacy.location}</td>
                  <td className="px-6 py-4 text-slate-300">
                    <span className="bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700/50 text-xs">
                      {pharmacy.pos}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-400">{pharmacy.lastSync}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                      pharmacy.status === 'Healthy' 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                        : pharmacy.status === 'Warning'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : 'bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.2)]'
                    }`}>
                      {pharmacy.status === 'Critical' && <ServerCrash size={12} />}
                      {pharmacy.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link 
                      href={`/dashboard/pharmacies/${pharmacy.id}`}
                      className="inline-flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 font-medium transition-colors opacity-0 group-hover:opacity-100"
                    >
                      Details <ExternalLink size={14} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
