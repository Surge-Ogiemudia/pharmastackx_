import { Search, Filter, Pill, ChevronRight, Hash, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { dbConnect } from '@/lib/mongoConnect';
import Product from '@/models/Product';

export default async function MedicinesPage() {
  await dbConnect();
  
  // Fetch a sample of medicines (first 100 to avoid freezing if large)
  const products = await Product.find().limit(100).sort({ _id: -1 }).lean();

  return (
    <div className="space-y-6">
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors">
        <ArrowLeft size={16} />
        Back to Dashboard
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-100">Indexed Medicines</h2>
          <p className="text-sm text-slate-400 mt-1">Browse all medicines synced by pharmacies across the network (showing latest 100).</p>
        </div>
      </div>

      <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 rounded-2xl p-4 flex items-center gap-4">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input 
            type="text" 
            placeholder="Search medicines..." 
            className="w-full bg-slate-950/50 border border-slate-800 text-sm rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 text-slate-200"
          />
        </div>
      </div>

      <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800/50 text-xs uppercase tracking-wider text-slate-500 font-semibold bg-slate-900/20">
                <th className="p-4 rounded-tl-xl">Medicine Name</th>
                <th className="p-4">Pharmacy / Source</th>
                <th className="p-4">Price</th>
                <th className="p-4">Stock</th>
                <th className="p-4">Category</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {products.length > 0 ? products.map((product) => (
                <tr key={product._id.toString()} className="hover:bg-slate-800/20 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700/50">
                        <Pill className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-200">{product.itemName}</p>
                        <p className="text-xs text-slate-500">{product.info?.substring(0, 40)}{(product.info && product.info.length > 40) ? '...' : ''}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-slate-400 font-medium text-emerald-400">{product.businessName}</td>
                  <td className="p-4 text-sm text-slate-300">₦{product.amount?.toLocaleString()}</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${(product.quantity || 0) > 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                      <Hash className="w-3.5 h-3.5" />
                      {product.quantity || 0}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-slate-400">{product.category || 'N/A'}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    No medicines found.
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
