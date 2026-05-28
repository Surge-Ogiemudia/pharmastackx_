import { Search, ShoppingBag, Clock, DollarSign, ExternalLink } from 'lucide-react';
import { dbConnect } from '@/lib/mongoConnect';
import Order from '@/models/Order';

export default async function OrdersPage() {
  await dbConnect();
  
  const orders = await Order.find().limit(100).sort({ createdAt: -1 }).lean();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-100">Global Orders</h2>
          <p className="text-sm text-slate-400 mt-1">Browse all orders generated through Pharmastackx (showing latest 100).</p>
        </div>
      </div>

      <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 rounded-2xl p-4 flex items-center gap-4">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input 
            type="text" 
            placeholder="Search orders..." 
            className="w-full bg-slate-950/50 border border-slate-800 text-sm rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 text-slate-200"
          />
        </div>
      </div>

      <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800/50 text-xs uppercase tracking-wider text-slate-500 font-semibold bg-slate-900/20">
                <th className="p-4 rounded-tl-xl">Order ID</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Fulfilling Pharmacy</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Status</th>
                <th className="p-4 rounded-tr-xl">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {orders.length > 0 ? orders.map((order) => (
                <tr key={order._id.toString()} className="hover:bg-slate-800/20 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700/50">
                        <ShoppingBag className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <p className="font-mono text-xs text-slate-200">{order._id.toString().substring(0, 8).toUpperCase()}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-slate-300">
                    <p className="font-medium">{order.firstName} {order.lastName}</p>
                    <p className="text-xs text-slate-500">{order.email}</p>
                  </td>
                  <td className="p-4 text-sm text-emerald-400 font-medium">
                    {Array.isArray(order.businesses) ? order.businesses.join(', ') : order.businesses || 'N/A'}
                  </td>
                  <td className="p-4 text-sm font-semibold text-slate-200">
                    ₦{order.totalAmount?.toLocaleString()}
                  </td>
                  <td className="p-4">
                    <span className={\`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border \${order.status === 'Completed' || order.status === 'successful' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : order.status === 'Pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}\`}>
                      {order.status || 'Pending'}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-slate-400">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No orders found.
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
