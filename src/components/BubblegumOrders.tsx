'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';

interface BubblegumOrdersProps {
  partnerSlug?: string;
  setView: (view: string) => void;
}

interface OrderItem {
  name: string;
  price: number;
  qty: number;
  image?: string;
}

interface OrderData {
  _id: string;
  createdAt: string;
  patientName: string;
  deliveryPhone: string;
  deliveryEmail: string;
  deliveryAddress: string;
  deliveryCity: string;
  deliveryState: string;
  deliveryOption: string;
  courierName?: string;
  courierLogo?: string;
  deliveryFee?: number;
  totalAmount: number;
  status: 'Pending' | 'Accepted' | 'Dispatched' | 'In Transit' | 'Completed' | 'Cancelled';
  shipbubbleStatus?: string;
  shipbubbleTrackingUrl?: string;
  items: OrderItem[];
}

export default function BubblegumOrders({ partnerSlug = 'bubblegum', setView }: BubblegumOrdersProps) {
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const fetchOrders = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    try {
      if (typeof window === 'undefined') return;

      const key = `${partnerSlug.toLowerCase()}_orders`;
      const partnerOrderIds: string[] = JSON.parse(localStorage.getItem(key) || '[]');
      const generalGuestOrderIds: string[] = JSON.parse(localStorage.getItem('psx_guest_orders') || '[]');
      const combinedIds = Array.from(new Set([...partnerOrderIds, ...generalGuestOrderIds]));

      if (combinedIds.length === 0) {
        setOrders([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const res = await fetch(`/api/orders?ids=${combinedIds.join(',')}&partnerSlug=${encodeURIComponent(partnerSlug)}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setOrders(data);
        }
      }
    } catch (err) {
      console.error('Failed to load guest orders:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLastRefreshed(new Date());
    }
  }, [partnerSlug]);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(() => {
      fetchOrders();
    }, 20000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const getStatusStep = (status: string) => {
    switch (status) {
      case 'Pending':
        return 1;
      case 'Accepted':
        return 2;
      case 'Dispatched':
      case 'In Transit':
        return 3;
      case 'Completed':
        return 4;
      default:
        return 1;
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFBFB] text-slate-800 pb-20 font-sans">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-rose-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setView('storefront')}
              className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 transition-colors flex items-center gap-1.5 text-sm font-semibold"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Back to Shop</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></div>
            <span className="font-bold text-slate-900 tracking-tight text-base sm:text-lg">
              Bubblegum <span className="text-rose-600">Orders</span>
            </span>
          </div>

          <button
            onClick={() => fetchOrders(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-full transition-all active:scale-95 disabled:opacity-50"
          >
            <svg
              className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-8">
        <div className="mb-6 bg-rose-50/70 border border-rose-100 rounded-2xl p-3.5 flex items-center gap-3 text-xs sm:text-sm text-rose-900 shadow-sm">
          <span className="text-lg">🔒</span>
          <div>
            <strong>Private Device Session:</strong> Your order history is saved directly on this browser. You can close this window and reopen it anytime to track delivery progress.
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((n) => (
              <div key={n} className="bg-white border border-rose-100 rounded-3xl p-6 animate-pulse space-y-4 shadow-sm">
                <div className="h-5 bg-rose-100/60 rounded-full w-1/3"></div>
                <div className="h-10 bg-rose-50 rounded-2xl"></div>
                <div className="h-20 bg-slate-50 rounded-2xl"></div>
              </div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white border border-rose-100 rounded-3xl p-10 sm:p-14 text-center shadow-sm max-w-md mx-auto mt-6">
            <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-500 mx-auto flex items-center justify-center text-3xl mb-4">
              🛍️
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">No Orders Found Yet</h3>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              You haven&apos;t placed any orders on this device yet. Check out our curated reproductive health & wellness products.
            </p>
            <button
              onClick={() => setView('storefront')}
              className="w-full bg-rose-600 hover:bg-rose-700 text-white font-semibold py-3.5 px-6 rounded-2xl shadow-lg shadow-rose-200 transition-all active:scale-[0.98]"
            >
              Start Shopping
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => {
              const currentStep = getStatusStep(order.status);
              const orderDate = order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              }) : 'Recently Placed';

              return (
                <div
                  key={order._id}
                  className="bg-white border border-rose-100/80 rounded-3xl shadow-sm overflow-hidden transition-all hover:shadow-md"
                >
                  <div className="p-5 sm:p-6 bg-gradient-to-r from-rose-50/50 via-white to-white border-b border-rose-50 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-rose-600 bg-rose-100/60 px-2.5 py-0.5 rounded-full">
                          Order #{order._id.slice(-6).toUpperCase()}
                        </span>
                        <span className="text-xs text-slate-400">{orderDate}</span>
                      </div>
                      <h4 className="text-base font-bold text-slate-900 mt-1">
                        For {order.patientName || 'Customer'}
                      </h4>
                    </div>

                    <div className="text-right">
                      <div className="text-xs text-slate-400">Total Paid</div>
                      <div className="text-lg sm:text-xl font-black text-rose-600">
                        ₦{Number(order.totalAmount || 0).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="p-5 sm:p-6 border-b border-slate-100 bg-slate-50/40">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center justify-between">
                      <span>Live Delivery Status</span>
                      <span className={`px-2.5 py-0.5 rounded-full font-semibold ${
                        order.status === 'Completed'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-rose-100 text-rose-700'
                      }`}>
                        {order.status === 'In Transit' ? '🚚 In Transit' : order.status}
                      </span>
                    </div>

                    <div className="relative flex items-center justify-between max-w-2xl mx-auto px-2">
                      <div className="absolute top-1/2 left-4 right-4 -translate-y-1/2 h-1 bg-slate-200 z-0">
                        <div
                          className="h-full bg-rose-500 transition-all duration-700"
                          style={{
                            width: currentStep === 1 ? '15%' : currentStep === 2 ? '48%' : currentStep === 3 ? '80%' : '100%'
                          }}
                        />
                      </div>

                      {[
                        { step: 1, title: 'Paid', subtitle: 'Paystack Confirmed', icon: '💳' },
                        { step: 2, title: 'Packing', subtitle: 'At Pharmacy', icon: '📦' },
                        { step: 3, title: 'Dispatched', subtitle: order.courierName || 'In Transit', icon: '🛵' },
                        { step: 4, title: 'Delivered', subtitle: 'Order Complete', icon: '✅' },
                      ].map((s) => {
                        const isDone = currentStep >= s.step;
                        const isCurrent = currentStep === s.step;

                        return (
                          <div key={s.step} className="relative z-10 flex flex-col items-center text-center">
                            <div
                              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm sm:text-base font-bold transition-all shadow-sm ${
                                isDone
                                  ? 'bg-rose-600 text-white shadow-rose-200'
                                  : 'bg-white text-slate-300 border-2 border-slate-200'
                              } ${isCurrent ? 'ring-4 ring-rose-100 scale-110' : ''}`}
                            >
                              {s.icon}
                            </div>
                            <span className={`text-xs font-bold mt-2 ${isDone ? 'text-slate-900' : 'text-slate-400'}`}>
                              {s.title}
                            </span>
                            <span className="text-[10px] text-slate-400 max-w-[70px] truncate hidden sm:inline-block">
                              {s.subtitle}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm">
                    <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100">
                      <div className="font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                        <span>📍 Delivery Destination</span>
                      </div>
                      <p className="text-slate-600 leading-relaxed">
                        {[order.deliveryAddress, order.deliveryCity, order.deliveryState].filter(Boolean).join(', ') || 'Address on file'}
                      </p>
                      <p className="text-slate-500 mt-2">
                        📞 Recipient Phone: <strong className="text-slate-800">{order.deliveryPhone || 'N/A'}</strong>
                      </p>
                    </div>

                    <div className="bg-rose-50/40 rounded-2xl p-4 border border-rose-100/60">
                      <div className="font-bold text-rose-900 mb-2 flex items-center gap-1.5">
                        <span>🚚 Assigned Logistics Partner</span>
                      </div>
                      <div className="flex items-center gap-3">
                        {order.courierLogo ? (
                          <div className="w-10 h-10 rounded-xl bg-white border border-rose-100 p-1 flex items-center justify-center shrink-0">
                            <Image
                              src={order.courierLogo}
                              alt={order.courierName || 'Courier'}
                              width={32}
                              height={32}
                              className="max-h-full max-w-full object-contain"
                              unoptimized
                            />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 font-bold flex items-center justify-center shrink-0">
                            🛵
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-slate-900 text-sm">
                            {order.courierName || (order.deliveryOption === 'pickup' ? 'Self Pickup' : 'Standard Delivery')}
                          </div>
                          <div className="text-xs text-slate-500">
                            {order.deliveryOption === 'pickup'
                              ? 'Collect directly from pharmacy'
                              : `Delivery Fee: ₦${Number(order.deliveryFee || 0).toLocaleString()}`}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="px-5 sm:px-6 pb-5 sm:pb-6">
                    <div className="border-t border-slate-100 pt-4">
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                        Purchased Items ({(order.items || []).length})
                      </div>
                      <div className="divide-y divide-slate-100">
                        {(order.items || []).map((item, idx) => (
                          <div key={idx} className="py-2.5 flex items-center justify-between text-xs sm:text-sm">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-lg bg-rose-50 text-rose-600 font-bold flex items-center justify-center text-[11px]">
                                {item.qty}x
                              </span>
                              <span className="font-medium text-slate-800">{item.name}</span>
                            </div>
                            <span className="font-semibold text-slate-900">
                              ₦{Number((item.price || 0) * (item.qty || 1)).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-10 text-center">
          <button
            onClick={() => setView('storefront')}
            className="inline-flex items-center gap-2 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 font-semibold px-6 py-3 rounded-2xl shadow-sm transition-all active:scale-95"
          >
            <span>Continue Shopping on Bubblegum</span>
            <span>→</span>
          </button>
        </div>
      </main>
    </div>
  );
}
