import { ArrowUpRight, Activity, Users, Store, DollarSign } from 'lucide-react';

const stats = [
  { name: 'Total Live Pharmacies', value: '142', change: '+12 this week', icon: Store },
  { name: 'Total Medicines Indexed', value: '428,591', change: '+15k this week', icon: Activity },
  { name: 'Total Storefront Views', value: '2.4M', change: '+18% vs last month', icon: Users },
  { name: 'Revenue Share (YTD)', value: '$184,250', change: '+5.4% vs last month', icon: DollarSign },
];

export default function AdminDashboardOverview() {
  return (
    <div className="space-y-6">
      
      {/* Header section */}
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-100">Global Network Analytics</h2>
        <p className="text-sm text-slate-400 mt-1">High-level view of the entire Pharmastackx and Synkk ecosystem.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className="relative overflow-hidden rounded-2xl bg-slate-900/50 border border-slate-800/50 p-6 backdrop-blur-sm transition-all hover:bg-slate-900/80 hover:border-slate-700/50">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <stat.icon size={80} />
            </div>
            <div className="relative z-10 flex items-center justify-between">
              <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                <stat.icon size={20} className="text-blue-400" />
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                {stat.change}
                <ArrowUpRight size={14} />
              </span>
            </div>
            <div className="relative z-10 mt-6">
              <p className="text-sm font-medium text-slate-400">{stat.name}</p>
              <p className="text-3xl font-semibold tracking-tight text-slate-50 mt-1">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (Main Chart placeholder) */}
        <div className="col-span-1 lg:col-span-2 rounded-2xl bg-slate-900/50 border border-slate-800/50 p-6 backdrop-blur-sm min-h-[400px] flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-slate-200">Network Growth (Pharmacies)</h3>
            <select className="bg-slate-950 border border-slate-800 text-slate-300 text-sm rounded-lg px-3 py-1.5 outline-none">
              <option>Last 30 Days</option>
              <option>Last 6 Months</option>
              <option>Year to Date</option>
            </select>
          </div>
          <div className="flex-1 flex items-center justify-center border border-dashed border-slate-700/50 rounded-xl bg-slate-900/30">
            <p className="text-slate-500 text-sm">Interactive Growth Line Chart goes here</p>
          </div>
        </div>

        {/* Right Column (Common POS Systems) */}
        <div className="col-span-1 rounded-2xl bg-slate-900/50 border border-slate-800/50 p-6 backdrop-blur-sm">
          <h3 className="text-lg font-medium mb-6 text-slate-200">Most Common POS Systems</h3>
          <div className="space-y-5">
            {[
              { name: 'Vend POS', percent: 45, count: 64 },
              { name: 'Square', percent: 25, count: 35 },
              { name: 'Custom SQL/CSV', percent: 15, count: 21 },
              { name: 'LightSpeed', percent: 10, count: 14 },
              { name: 'Unknown/Failed', percent: 5, count: 8 },
            ].map((pos) => (
              <div key={pos.name}>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium text-slate-300">{pos.name}</span>
                  <span className="text-slate-500">{pos.count} stores</span>
                </div>
                <div className="w-full bg-slate-800/50 rounded-full h-2 border border-slate-700/50 overflow-hidden">
                  <div 
                    className={`h-2 rounded-full ${pos.name === 'Unknown/Failed' ? 'bg-red-500' : 'bg-blue-500'}`}
                    style={{ width: `${pos.percent}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
