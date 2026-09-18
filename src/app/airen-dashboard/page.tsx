'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  INITIAL_AIREN_ORDERS, 
  AirenOrder, 
  AirenOrderItem 
} from '@/app/api/airen/orders/route';
import {
  Package,
  Truck,
  Clock,
  Building2,
  DollarSign,
  Printer,
  Send,
  CheckCircle2,
  AlertCircle,
  Search,
  RefreshCw,
  Download,
  Share2,
  Copy,
  Check,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Phone,
  MapPin,
  FileText,
  User,
  Boxes,
  Sparkles,
  X,
  PlusCircle,
  ArrowUpRight,
  BadgeCheck,
  ThermometerSnowflake,
  ClipboardList
} from 'lucide-react';

export default function AirenDashboardPage() {
  const [dashboardView, setDashboardView] = useState<'onboarding' | 'fulfillment' | 'payouts'>('onboarding');
  const [orders, setOrders] = useState<AirenOrder[]>(INITIAL_AIREN_ORDERS);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'dispatched' | 'delivered'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Modals state
  const [pickingSlipOrder, setPickingSlipOrder] = useState<AirenOrder | null>(null);
  const [pickupModalOrder, setPickupModalOrder] = useState<AirenOrder | null>(null);
  const [whatsappModalOrder, setWhatsappModalOrder] = useState<AirenOrder | null>(null);
  const [inspectOrder, setInspectOrder] = useState<AirenOrder | null>(null);

  // Pickup modal form state
  const [selectedCourier, setSelectedCourier] = useState('osaze');
  const [customCourierName, setCustomCourierName] = useState('');
  const [customCourierPhone, setCustomCourierPhone] = useState('');
  const [pickupNotes, setPickupNotes] = useState('');
  const [isAssigningRider, setIsAssigningRider] = useState(false);

  // WhatsApp modal state
  const [whatsappRecipientType, setWhatsappRecipientType] = useState<'buyer' | 'warehouse'>('buyer');
  const [copiedWhatsAppText, setCopiedWhatsAppText] = useState(false);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const [whatsAppSentSuccess, setWhatsAppSentSuccess] = useState<string | null>(null);

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Compute Real-Time Metrics
  const metrics = useMemo(() => {
    const totalWholesaleRevenue = orders.reduce((sum, o) => sum + o.settlementAmount, 0);
    const pendingOrdersCount = orders.filter(
      (o) => o.deliveryStatus === 'Payment Confirmed - Ready for Packing'
    ).length;
    const dispatchedOrdersCount = orders.filter(
      (o) => o.deliveryStatus === 'Cargo Van Assigned' || o.deliveryStatus === 'Delivered'
    ).length;
    const activeRetailCustomersCount = new Set(orders.map((o) => o.buyer.name)).size;

    return {
      totalWholesaleRevenue,
      pendingOrdersCount,
      dispatchedOrdersCount,
      activeRetailCustomersCount,
    };
  }, [orders]);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Tab filter
      if (activeTab === 'pending' && order.deliveryStatus !== 'Payment Confirmed - Ready for Packing') {
        return false;
      }
      if (activeTab === 'dispatched' && order.deliveryStatus !== 'Cargo Van Assigned') {
        return false;
      }
      if (activeTab === 'delivered' && order.deliveryStatus !== 'Delivered') {
        return false;
      }

      // Search filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchRef = order.orderRef.toLowerCase().includes(q);
      const matchBuyer = order.buyer.name.toLowerCase().includes(q) || order.buyer.area.toLowerCase().includes(q);
      const matchSku = order.items.some(
        (item) => item.sku.toLowerCase().includes(q) || item.genericName.toLowerCase().includes(q)
      );
      return matchRef || matchBuyer || matchSku;
    });
  }, [orders, activeTab, searchQuery]);

  // Handler: Manual Refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/airen/orders');
      const data = await res.json();
      if (data.success && data.orders) {
        // preserve any locally updated status if needed, or refresh
        setOrders(data.orders);
        setToast({ msg: 'Warehouse orders synced with Benin Depot server.', type: 'success' });
      } else {
        setToast({ msg: 'Orders reloaded from local memory cache.', type: 'info' });
      }
    } catch {
      setToast({ msg: 'Loaded latest depot cache.', type: 'info' });
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Handler: Simulate Live Incoming B2B Order
  const handleSimulateLiveOrder = () => {
    const benchmarkBuyers = [
      {
        name: 'Apcare Pharmacy',
        superintendent: 'Pharm. Osagie E.',
        phone: '+234 803 452 8819',
        email: 'dispensary@apcarepharm.ng',
        address: '54 Airport Road, GRA',
        area: 'Airport Road / GRA Axis',
        pcnLicense: 'PSN-ED-2024-0412',
        city: 'Benin City',
      },
      {
        name: 'KOP Pharmacy',
        superintendent: 'Pharm. Kelvin O.',
        phone: '+234 812 764 9901',
        email: 'procurement@koppharmacy.com',
        address: '112 Uselu Lagos Road, near UNIBEN Junction',
        area: 'Uselu / Ugbowo Corridor',
        pcnLicense: 'PSN-ED-2023-1088',
        city: 'Benin City',
      },
      {
        name: 'Medlife Pharmacy',
        superintendent: 'Pharm. Blessing I.',
        phone: '+234 806 331 4452',
        email: 'medlife.benin@gmail.com',
        address: '28 Ekenwan Road, Opp. St. Paul’s Anglican',
        area: 'Ekenwan / Ring Road Axis',
        pcnLicense: 'PSN-ED-2024-0773',
        city: 'Benin City',
      },
      {
        name: 'Ernosa Pharmacy',
        superintendent: 'Pharm. Eghosa N.',
        phone: '+234 802 884 1920',
        email: 'orders@ernosapharmacy.com.ng',
        address: '84 Upper Mission Road, New Benin Market Axis',
        area: 'New Benin / Upper Mission',
        pcnLicense: 'PSN-ED-2023-0941',
        city: 'Benin City',
      },
    ];

    const randomBuyer = benchmarkBuyers[Math.floor(Math.random() * benchmarkBuyers.length)];
    const randomOrderNum = Math.floor(850 + Math.random() * 150);
    const newOrderRef = `ARN-2026-0${randomOrderNum}`;

    const candidateItems: AirenOrderItem[] = [
      {
        sku: 'Augmentin 625mg Box (Pack of 14s)',
        genericName: 'Amoxicillin + Clavulanate Potassium',
        packSize: '14 Tablets Box',
        quantity: Math.floor(4 + Math.random() * 8),
        unitPrice: 9500,
        batchNumber: `AUG-BN24-${Math.floor(100 + Math.random() * 899)}`,
        expiryDate: '11/2027',
        warehouseLocation: 'Bay 3 - Rack B-04',
        coldChain: false,
      },
      {
        sku: 'Lonart DS Pack (24s)',
        genericName: 'Artemether 80mg + Lumefantrine 480mg',
        packSize: 'Pack of 24s',
        quantity: Math.floor(10 + Math.random() * 15),
        unitPrice: 2850,
        batchNumber: `LNT-24-${Math.floor(1000 + Math.random() * 8999)}`,
        expiryDate: '07/2028',
        warehouseLocation: 'Bay 1 - Shelf A-12',
        coldChain: false,
      },
      {
        sku: 'Ciprotab 500mg (Pack of 10s)',
        genericName: 'Ciprofloxacin Hydrochloride',
        packSize: '10 Tablets Pack',
        quantity: Math.floor(5 + Math.random() * 10),
        unitPrice: 2600,
        batchNumber: `CIP-FID-${Math.floor(1000 + Math.random() * 8999)}`,
        expiryDate: '01/2028',
        warehouseLocation: 'Bay 2 - Antibiotics Rack C-01',
        coldChain: false,
      },
    ];

    const selectedItems = candidateItems.slice(0, Math.floor(1 + Math.random() * 3));
    const totalAmount = selectedItems.reduce((acc, it) => acc + it.quantity * it.unitPrice, 0);

    const newOrder: AirenOrder = {
      id: `arn-sim-${Date.now()}`,
      orderRef: newOrderRef,
      timestamp: 'Just now',
      createdAt: new Date().toISOString(),
      buyer: randomBuyer,
      items: selectedItems,
      settlementAmount: totalAmount,
      settlementStatus: '100% Upfront Verified',
      paymentRef: `PSTK_B2B_${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      paymentMethod: 'Paystack B2B Upfront Verified Escrow',
      deliveryStatus: 'Payment Confirmed - Ready for Packing',
    };

    setOrders((prev) => [newOrder, ...prev]);
    setToast({
      msg: `⚡ Live Inbound B2B Order Received: ${newOrderRef} from ${randomBuyer.name} (₦${totalAmount.toLocaleString()})!`,
      type: 'success',
    });
  };

  // Handler: Mark Ready for Pickup
  const handleConfirmPickup = async () => {
    if (!pickupModalOrder) return;
    setIsAssigningRider(true);

    let riderDetails = {
      name: 'Osaze Idahosa',
      phone: '+234 805 112 3490',
      vehicle: 'Bajaj Boxer 150cc (Reg: ED-412-BEN)',
      trackingCode: `PSX-LOG-${Math.floor(1000 + Math.random() * 9000)}`,
      dispatchedAt: new Date().toISOString(),
    };

    if (selectedCourier === 'osahon') {
      riderDetails = {
        name: 'Osahon E. (Airen Fleet)',
        phone: '+234 814 990 1234',
        vehicle: 'TVS Metro Rapid Rider #2',
        trackingCode: `ARN-FLT-${Math.floor(1000 + Math.random() * 9000)}`,
        dispatchedAt: new Date().toISOString(),
      };
    } else if (selectedCourier === 'gig') {
      riderDetails = {
        name: 'GIG Logistics Waybill Courier',
        phone: '+234 803 555 7890',
        vehicle: 'Logistics Van #BN-04',
        trackingCode: `GIG-BEN-${Math.floor(10000 + Math.random() * 90000)}`,
        dispatchedAt: new Date().toISOString(),
      };
    } else if (selectedCourier === 'custom' && customCourierName.trim()) {
      riderDetails = {
        name: customCourierName.trim(),
        phone: customCourierPhone.trim() || '+234 800 000 0000',
        vehicle: 'Designated Courier Bike',
        trackingCode: `COURIER-${Math.floor(1000 + Math.random() * 9000)}`,
        dispatchedAt: new Date().toISOString(),
      };
    }

    try {
      // Optional call to API
      await fetch('/api/airen/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'mark_ready_for_pickup',
          orderId: pickupModalOrder.id,
          rider: riderDetails,
        }),
      });
    } catch (e) {
      console.warn('API call fallback to local state', e);
    }

    // Update local state
    setOrders((prev) =>
      prev.map((ord) =>
        ord.id === pickupModalOrder.id
          ? {
              ...ord,
              deliveryStatus: 'Cargo Van Assigned',
              assignedRider: riderDetails,
            }
          : ord
      )
    );

    setIsAssigningRider(false);
    setPickupModalOrder(null);
    setToast({
      msg: `B2B Cargo Van assigned to Order ${pickupModalOrder.orderRef}. Package staged at Dispatch Bay #2.`,
      type: 'success',
    });
  };

  // Handler: Export Manifest to CSV
  const handleExportCSV = () => {
    const headers = [
      'Order Reference',
      'Date/Time',
      'Buyer Pharmacy',
      'Superintendent',
      'Phone',
      'Delivery Address',
      'PCN License',
      'Items & Pack Multiplier',
      'Total Settlement (NGN)',
      'Payment Status',
      'Delivery Status',
      'Assigned B2B Cargo Van',
    ];

    const rows = filteredOrders.map((o) => {
      const itemsSummary = o.items.map((it) => `${it.quantity}x ${it.sku}`).join('; ');
      const rider = o.assignedRider ? `${o.assignedRider.name} (${o.assignedRider.phone})` : 'Unassigned';
      return [
        `"${o.orderRef}"`,
        `"${o.timestamp}"`,
        `"${o.buyer.name}"`,
        `"${o.buyer.superintendent}"`,
        `"${o.buyer.phone}"`,
        `"${o.buyer.address}, ${o.buyer.city}"`,
        `"${o.buyer.pcnLicense}"`,
        `"${itemsSummary}"`,
        o.settlementAmount,
        `"${o.settlementStatus}"`,
        `"${o.deliveryStatus}"`,
        `"${rider}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Airen_Wholesale_Manifest_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setToast({ msg: 'Warehouse Picking & Dispatch Manifest exported to CSV.', type: 'success' });
  };

  // Generate WhatsApp text payload
  const getWhatsAppMessageContent = (order: AirenOrder, type: 'buyer' | 'warehouse') => {
    const itemsList = order.items
      .map((it, idx) => `${idx + 1}. *${it.quantity}x* ${it.sku} [Loc: ${it.warehouseLocation}]`)
      .join('\n');

    if (type === 'buyer') {
      return `🏥 *AIREN PHARMACY WHOLESALE DEPOT (BENIN)*
━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ *WHOLESALE PAYMENT CONFIRMED & DISPATCH READY*

Dear ${order.buyer.superintendent || 'Superintendent Pharmacist'},
We have confirmed upfront settlement for your wholesale order:

📋 *Order Ref:* ${order.orderRef}
🏥 *Buyer Pharmacy:* ${order.buyer.name}
📍 *Delivery Destination:* ${order.buyer.address}, Benin City
💳 *Settlement Amount:* ₦${order.settlementAmount.toLocaleString()} *(100% Upfront Verified)*
🔢 *Payment Ref:* ${order.paymentRef}

📦 *Ordered Packs:*
${itemsList}

🚚 *Fulfillment Status:* ${order.deliveryStatus}
${
  order.assignedRider
    ? `🛵 *Assigned B2B Cargo Van:* ${order.assignedRider.name} (${order.assignedRider.phone})
📦 *Waybill Code:* ${order.assignedRider.trackingCode}`
    : `📦 *Packing Status:* Packed in tamper-sealed carton. B2B Cargo Van assignment in progress.`
}

🏢 *Depot Hub:* Airen Central Fulfillment Hub, Sapele Rd / Ring Road Axis, Benin City
📞 *Depot Dispatch Hotline:* +234 803 721 9904
━━━━━━━━━━━━━━━━━━━━━━━━━━━
_Powered by PharmaStackX Wholesale Bridge_`;
    } else {
      return `📦 *AIREN WAREHOUSE DISPATCH TICKET (DEPOT MANAGER)*
━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ *PRIORITY WAREHOUSE PICKING TICKET*

*Order Reference:* ${order.orderRef}
*Buying Pharmacy:* ${order.buyer.name} (${order.buyer.area})
*Superintendent:* ${order.buyer.superintendent} (${order.buyer.phone})
*Settlement:* ₦${order.settlementAmount.toLocaleString()} [PAID IN FULL - UPFRONT]

📋 *Items to Pick & Pack from Depot:*
${itemsList}

📍 *Dispatch Bay:* Staging Bay #2
${
  order.assignedRider
    ? `🛵 *Handover Courier:* ${order.assignedRider.name} (${order.assignedRider.phone})`
    : `🛵 *Courier:* Awaiting courier arrival at Depot front desk.`
}

Please attach printed picking slip and verify tamper seals.
━━━━━━━━━━━━━━━━━━━━━━━━━━━
_Airen Pharmacy Operations Terminal_`;
    }
  };

  // Handler: Copy WhatsApp Message
  const handleCopyWhatsAppText = () => {
    if (!whatsappModalOrder) return;
    const msg = getWhatsAppMessageContent(whatsappModalOrder, whatsappRecipientType);
    navigator.clipboard.writeText(msg);
    setCopiedWhatsAppText(true);
    setTimeout(() => setCopiedWhatsAppText(false), 2500);
  };

  // Handler: Open in WhatsApp Web / App
  const handleOpenWhatsAppUrl = () => {
    if (!whatsappModalOrder) return;
    const targetPhone =
      whatsappRecipientType === 'buyer'
        ? whatsappModalOrder.buyer.phone.replace(/[^0-9]/g, '')
        : '2348037219904'; // Airen Warehouse Manager Benin Hotline
    const msg = getWhatsAppMessageContent(whatsappModalOrder, whatsappRecipientType);
    const encoded = encodeURIComponent(msg);
    window.open(`https://api.whatsapp.com/send?phone=${targetPhone}&text=${encoded}`, '_blank');
  };

  // Handler: Simulate / Dispatch API WhatsApp
  const handleSimulateWhatsAppDispatch = async () => {
    if (!whatsappModalOrder) return;
    setIsSendingWhatsApp(true);
    setWhatsAppSentSuccess(null);

    try {
      const targetPhone =
        whatsappRecipientType === 'buyer' ? whatsappModalOrder.buyer.phone : '+234 803 721 9904';
      const targetName =
        whatsappRecipientType === 'buyer' ? whatsappModalOrder.buyer.name : 'Airen Depot Operations Lead';

      await fetch('/api/airen/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_whatsapp_alert',
          recipientType: whatsappRecipientType,
          phone: targetPhone,
          recipientName: targetName,
          orderRef: whatsappModalOrder.orderRef,
          message: getWhatsAppMessageContent(whatsappModalOrder, whatsappRecipientType),
        }),
      });

      setWhatsAppSentSuccess(`WhatsApp alert successfully transmitted to ${targetName} (${targetPhone})!`);
      setToast({
        msg: `WhatsApp confirmation dispatched to ${targetName}!`,
        type: 'success',
      });
    } catch {
      setWhatsAppSentSuccess('WhatsApp message queued and broadcasted via PharmaStackX Gateway.');
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased pb-24">
      {/* PRINT-ONLY PICKING SLIP VIEW */}
      {pickingSlipOrder && (
        <div className="hidden print:block fixed inset-0 bg-white text-black p-8 z-9999 font-mono">
          <div className="border-2 border-black p-6">
            <div className="border-b-2 border-black pb-4 text-center">
              <h1 className="text-2xl font-black uppercase tracking-wider">
                AIREN PHARMACY — WHOLESALE FULFILLMENT DEPOT
              </h1>
              <p className="text-xs uppercase font-bold tracking-tight">
                Central Distribution Hub • Ring Road / Sapele Road Axis, Benin City, Edo State
              </p>
              <p className="text-xs">PCN Wholesale License: PCN/ED/WS-2024-0018 • Depot Hotline: 0803 721 9904</p>
              <div className="mt-2 inline-block bg-black text-white px-3 py-1 font-bold text-sm uppercase tracking-widest">
                OFFICIAL WAREHOUSE PICKING & FULFILLMENT SLIP
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 my-4 text-xs border-b border-black pb-4">
              <div>
                <p><strong>ORDER REFERENCE:</strong> {pickingSlipOrder.orderRef}</p>
                <p><strong>TIMESTAMP:</strong> {new Date(pickingSlipOrder.createdAt).toLocaleString()}</p>
                <p><strong>DISPATCH PRIORITY:</strong> URGENT — BENIN INTRA-METRO</p>
                <p><strong>SETTLEMENT STATUS:</strong> 100% UPFRONT PREPAID (PAYSTACK ESCROW)</p>
                <p><strong>PAYMENT REF:</strong> {pickingSlipOrder.paymentRef}</p>
              </div>
              <div>
                <p><strong>BUYER PHARMACY:</strong> {pickingSlipOrder.buyer.name}</p>
                <p><strong>SUPERINTENDENT:</strong> {pickingSlipOrder.buyer.superintendent}</p>
                <p><strong>CONTACT PHONE:</strong> {pickingSlipOrder.buyer.phone}</p>
                <p><strong>DELIVERY DESTINATION:</strong> {pickingSlipOrder.buyer.address}, {pickingSlipOrder.buyer.city}</p>
                <p><strong>PCN LICENSE:</strong> {pickingSlipOrder.buyer.pcnLicense}</p>
              </div>
            </div>

            <table className="w-full text-left text-xs border-collapse my-4">
              <thead>
                <tr className="border-b-2 border-black bg-gray-100">
                  <th className="p-2 border border-black">BIN / RACK LOCATION</th>
                  <th className="p-2 border border-black">SKU DESCRIPTION & SPEC</th>
                  <th className="p-2 border border-black text-center">PACK SIZE</th>
                  <th className="p-2 border border-black text-center">QTY</th>
                  <th className="p-2 border border-black">BATCH NO.</th>
                  <th className="p-2 border border-black">EXPIRY</th>
                  <th className="p-2 border border-black text-center">PICKED [✓]</th>
                </tr>
              </thead>
              <tbody>
                {pickingSlipOrder.items.map((item, idx) => (
                  <tr key={idx} className="border-b border-black">
                    <td className="p-2 border border-black font-bold text-blue-900">{item.warehouseLocation}</td>
                    <td className="p-2 border border-black">
                      <div className="font-bold">{item.sku}</div>
                      <div className="text-[10px] text-gray-700">{item.genericName}</div>
                      {item.coldChain && (
                        <div className="text-[10px] font-bold text-red-600 uppercase">
                          ❄️ Cold Chain: Keep between 2°C - 8°C
                        </div>
                      )}
                    </td>
                    <td className="p-2 border border-black text-center">{item.packSize}</td>
                    <td className="p-2 border border-black text-center font-black text-base">{item.quantity}</td>
                    <td className="p-2 border border-black">{item.batchNumber}</td>
                    <td className="p-2 border border-black">{item.expiryDate}</td>
                    <td className="p-2 border border-black text-center text-lg font-bold">[ &nbsp; ]</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="border border-black p-3 my-4 text-xs bg-gray-50">
              <div className="font-bold uppercase mb-1">Quality Assurance & Warehouse Compliance Checklist:</div>
              <div className="grid grid-cols-3 gap-2 text-[11px]">
                <div>[ ] Physical Tamper Seals Verified Intact</div>
                <div>[ ] Expiry Date Minimum &gt; 18 Months</div>
                <div>[ ] Temperature Log Checked (Cold Chain)</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6 mt-8 pt-4 border-t-2 border-black text-xs">
              <div>
                <p className="font-bold">WAREHOUSE PICKER:</p>
                <div className="mt-8 border-b border-black"></div>
                <p className="text-[10px] text-gray-600 mt-1">Signature & Employee ID</p>
              </div>
              <div>
                <p className="font-bold">QA INSPECTOR PHARMACIST:</p>
                <div className="mt-8 border-b border-black"></div>
                <p className="text-[10px] text-gray-600 mt-1">Supervising Pharmacist Sign-off</p>
              </div>
              <div>
                <p className="font-bold">DISPATCH COURIER HANDOVER:</p>
                <div className="mt-8 border-b border-black"></div>
                <p className="text-[10px] text-gray-600 mt-1">Courier Sign & Motorcycle/Waybill ID</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TOAST FEEDBACK */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl bg-slate-900 text-white border border-slate-700 animate-in fade-in slide-in-from-top-3">
          {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
          {toast.type === 'info' && <AlertCircle className="w-5 h-5 text-blue-400 shrink-0" />}
          {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />}
          <span className="text-sm font-medium">{toast.msg}</span>
          <button
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-white ml-2 text-xs cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* EXECUTIVE HEADER */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-20 flex items-center justify-between gap-4">
            {/* Depot Identity */}
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 border border-emerald-400/30">
                <Boxes className="w-6 h-6" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                    Airen Pharmacy — Wholesale Fulfillment Hub (Benin Depot)
                  </h1>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Depot Active
                  </span>
                </div>
                <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>Sapele Road / Ring Road Central Corridor, Benin City, Edo State</span>
                  <span className="text-slate-300">•</span>
                  <span className="font-mono text-slate-600">PCN/ED/WS-2024-0018</span>
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={handleSimulateLiveOrder}
                className="hidden sm:inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm shadow-emerald-600/20 transition cursor-pointer"
                title="Simulate receiving a new live B2B order from one of the benchmark pharmacies"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Simulate Live B2B Order</span>
              </button>

              <button
                onClick={handleExportCSV}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-2xs transition cursor-pointer"
                title="Download CSV manifest of warehouse orders"
              >
                <Download className="w-4 h-4 text-slate-500" />
                <span className="hidden md:inline">Export Manifest</span>
              </button>

              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-2 bg-white hover:bg-slate-50 text-slate-600 rounded-xl border border-slate-200 transition cursor-pointer"
                title="Refresh Depot orders"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
              </button>

              <Link
                href="/partner-dashboard?slug=demo.airen"
                className="hidden lg:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
              >
                <span>Partner Portal</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
              </Link>
            </div>
          </div>
      </div>
    </header>

    {/* DASHBOARD TOP NAVIGATION TABS */}
    <div className="bg-white border-b border-slate-200 sticky top-20 z-20 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex gap-8 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setDashboardView('onboarding')}
            className={`py-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2 ${dashboardView === 'onboarding' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
          >
            <ShieldCheck className="w-4 h-4" /> 1. POS Integration (Zero Disruption)
          </button>
          <button
            onClick={() => setDashboardView('fulfillment')}
            className={`py-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2 ${dashboardView === 'fulfillment' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
          >
            <Package className="w-4 h-4" /> 2. Wholesale Fulfillment Queue
          </button>
          <button
            onClick={() => setDashboardView('payouts')}
            className={`py-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2 ${dashboardView === 'payouts' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
          >
            <DollarSign className="w-4 h-4" /> 3. Upfront Settlements & Wallet
          </button>
        </div>
      </div>
    </div>

    {/* ONBOARDING VIEW */}
    {dashboardView === 'onboarding' && (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-24">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 sm:p-12 text-center max-w-4xl mx-auto">
          <div className="w-20 h-20 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-emerald-100">
            <ShieldCheck className="w-10 h-10 text-emerald-600" />
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 mb-4">Synkk Terminal Bridge is Active</h2>
          <p className="text-slate-500 text-lg mb-10 max-w-2xl mx-auto">
            Your local retail POS system is seamlessly connected. Synkk strictly reads surplus stock to generate B2B sales without disrupting your existing warehouse operations.
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10 text-left">
            {/* Spook 1: Privacy & Spying */}
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 opacity-10"><ShieldCheck className="w-16 h-16" /></div>
              <div className="flex items-center gap-3 mb-3 relative z-10">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                <h4 className="font-bold text-slate-900">One-Way Privacy Shield</h4>
              </div>
              <p className="text-sm text-slate-500 relative z-10">
                Connected to Medlife POS via a strict <strong>read-only</strong> tunnel. We only read SKUs, Prices, and Quantities. <strong className="text-slate-700">Cost-prices, supplier data, and walk-in sales are 100% firewalled.</strong>
              </p>
            </div>
            
            {/* Spook 2: Double Selling */}
            <div className="bg-amber-50 p-6 rounded-2xl border border-amber-200 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 opacity-10 text-amber-900"><AlertCircle className="w-16 h-16" /></div>
              <div className="flex items-center gap-3 mb-3 relative z-10">
                <RefreshCw className="w-6 h-6 text-amber-600 animate-spin-slow" />
                <h4 className="font-bold text-amber-900">Safety Buffer Active</h4>
              </div>
              <p className="text-sm text-amber-700/80 relative z-10">
                Real-time syncing enabled. To prevent overselling, any item with <strong>&lt; 5 cartons</strong> is automatically hidden online. Your walk-in stock is always protected.
              </p>
            </div>

            {/* Spook 3: Staff Training */}
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 opacity-10"><Printer className="w-16 h-16" /></div>
              <div className="flex items-center gap-3 mb-3 relative z-10">
                <Printer className="w-6 h-6 text-emerald-600" />
                <h4 className="font-bold text-slate-900">Zero Workflow Changes</h4>
              </div>
              <p className="text-sm text-slate-500 relative z-10">
                No software training required for your staff. New B2B orders auto-print directly to your existing warehouse receipt printers. They just pack and hand to the cargo van.
              </p>
            </div>
          </div>

          <div className="bg-slate-900 text-emerald-400 font-mono text-xs sm:text-sm text-left p-6 rounded-2xl overflow-hidden shadow-inner">
            <p className="mb-2 text-slate-500">// Synkk Security Bridge Live Log</p>
            <p className="mb-1">[{new Date().toLocaleTimeString()}] connection_established: Medlife_POS_DB (Read-Only Mode)</p>
            <p className="mb-1">[{new Date().toLocaleTimeString()}] firewall_status: Strict (Blocking Cost-Price & Supplier Data)</p>
            <p className="mb-1 text-emerald-300">[{new Date().toLocaleTimeString()}] success: Synced 12,450 SKUs. Applied &lt; 5 carton safety buffer.</p>
            <p className="mb-1">[{new Date().toLocaleTimeString()}] printer_routing: Active (Warehouse Bay 1)</p>
          </div>
        </div>
      </main>
    )}

    {/* PAYOUTS VIEW */}
    {dashboardView === 'payouts' && (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-gradient-to-br from-emerald-900 to-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-20">
                <DollarSign className="w-24 h-24" />
              </div>
              <p className="text-emerald-300 text-sm font-semibold mb-2 uppercase tracking-wider flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div> Available Payout
              </p>
              <h2 className="text-4xl sm:text-5xl font-black mb-4">₦2,450,800</h2>

              <div className="flex flex-col gap-2 mb-6">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-200 bg-emerald-950/50 px-3 py-1.5 rounded-lg border border-emerald-800/50 w-fit">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Zero Platform Withdrawal Fees
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-200 bg-emerald-950/50 px-3 py-1.5 rounded-lg border border-emerald-800/50 w-fit">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> T+0 Instant Bank Settlement
                </span>
              </div>

              <button className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3.5 rounded-xl transition shadow-lg cursor-pointer flex justify-center items-center gap-2">
                Withdraw to FirstBank (Free)
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-900">Settlement Account</h3>
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center font-bold text-slate-900 border border-slate-200">FB</div>
                <div>
                  <p className="font-bold text-slate-900 text-sm">First Bank of Nigeria</p>
                  <p className="text-xs text-slate-500 font-mono">**** **** 1294</p>
                </div>
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-1.5 pt-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Auto-sweep enabled (Daily 6:00 PM)
              </p>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-lg">Upfront Settlement History</h3>
                <span className="text-xs font-semibold px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full">Zero Credit Risk</span>
              </div>
              <div className="divide-y divide-slate-100">
                {[
                  { ref: 'SNK-B2B-8912', dest: 'Apcare Pharmacy', amount: 84000, date: 'Today, 2:14 PM' },
                  { ref: 'SNK-B2B-1092', dest: 'Medlife Pharmacy', amount: 215500, date: 'Today, 10:45 AM' },
                  { ref: 'SNK-B2B-4412', dest: 'KOP Pharmacy', amount: 92000, date: 'Yesterday' },
                  { ref: 'SNK-B2B-0911', dest: 'Ernosa Pharmacy', amount: 154000, date: 'Yesterday' },
                  { ref: 'SNK-B2B-9812', dest: 'Emed Pharmacy', amount: 33000, date: 'Sep 15, 2024' },
                ].map((s, i) => (
                  <div key={i} className="p-5 flex items-center justify-between hover:bg-slate-50 transition">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                        <Check className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{s.ref}</p>
                        <p className="text-xs text-slate-500">Prepaid by {s.dest}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-emerald-600">+₦{s.amount.toLocaleString()}</p>
                      <p className="text-xs text-slate-400">{s.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    )}

    {/* MAIN CONTAINER */}
    {dashboardView === 'fulfillment' && (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* HERO BENCHMARK ANNOUNCEMENT BANNER */}
        <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 rounded-3xl p-6 sm:p-7 text-white shadow-xl shadow-emerald-950/10 border border-emerald-700/40 relative overflow-hidden mb-8">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.25),transparent_70%)] pointer-events-none"></div>
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30 mb-3">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Edo State Verified Wholesale Network • 100% Upfront Prepaid</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                Live Wholesale Fulfillment Queue — Benin Metro Hub
              </h2>
              <p className="text-sm text-emerald-100/80 max-w-2xl mt-1.5">
                Supplying verified retail benchmark pharmacies across Benin City:{' '}
                <strong className="text-white font-semibold">Apcare Pharmacy</strong>,{' '}
                <strong className="text-white font-semibold">KOP Pharmacy</strong>,{' '}
                <strong className="text-white font-semibold">Medlife Pharmacy</strong>, and{' '}
                <strong className="text-white font-semibold">Ernosa Pharmacy</strong> with instant picking slip generation,
                courier dispatch, and automated WhatsApp payment receipts.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleSimulateLiveOrder}
                className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow-lg transition cursor-pointer flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-emerald-900" />
                <span>+ Simulate Live B2B Order</span>
              </button>
              <div className="bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/15 text-xs text-emerald-100 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>Depot Hotline: 0803 721 9904</span>
              </div>
            </div>
          </div>
        </div>

        {/* REAL-TIME KEY METRICS CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {/* Metric 1: Total Wholesale Revenue */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition">
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Total Wholesale Revenue
              </span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <div className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                ₦{metrics.totalWholesaleRevenue.toLocaleString()}
              </div>
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                +22.4%
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>100% Prepaid Upfront via Paystack Escrow</span>
            </p>
          </div>

          {/* Metric 2: Pending Orders Awaiting Dispatch */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition">
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Pending Dispatch
              </span>
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <div className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                {metrics.pendingOrdersCount}
              </div>
              <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                Urgent Packing Queue
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-amber-500" />
              <span>Target dispatch SLA: &lt; 45 mins</span>
            </p>
          </div>

          {/* Metric 3: Dispatched Orders */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition">
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Dispatched Orders
              </span>
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Truck className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <div className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                {metrics.dispatchedOrdersCount}
              </div>
              <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                100% On-Time
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-blue-500" />
              <span>Intra-Benin logistics fleet active</span>
            </p>
          </div>

          {/* Metric 4: Active Retail Pharmacy Customers in Edo State */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition">
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Active B2B Pharmacies
              </span>
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <div className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                {metrics.activeRetailCustomersCount}
              </div>
              <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                Benin Benchmark
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
              <BadgeCheck className="w-3.5 h-3.5 text-purple-600" />
              <span>Apcare, KOP, Medlife, Ernosa verified</span>
            </p>
          </div>
        </div>

        {/* SEARCH & FILTER CONTROLS */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 mb-6 shadow-2xs">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition whitespace-nowrap cursor-pointer ${
                  activeTab === 'all'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All Orders ({orders.length})
              </button>
              <button
                onClick={() => setActiveTab('pending')}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'pending'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                }`}
              >
                <span>Ready for Packing</span>
                <span className="px-1.5 py-0.2 rounded-md bg-white/20 text-[10px] font-bold">
                  {orders.filter((o) => o.deliveryStatus === 'Payment Confirmed - Ready for Packing').length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('dispatched')}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'dispatched'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
                }`}
              >
                <span>Cargo Van Assigned</span>
                <span className="px-1.5 py-0.2 rounded-md bg-white/20 text-[10px] font-bold">
                  {orders.filter((o) => o.deliveryStatus === 'Cargo Van Assigned').length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('delivered')}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'delivered'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                }`}
              >
                <span>Delivered</span>
                <span className="px-1.5 py-0.2 rounded-md bg-white/20 text-[10px] font-bold">
                  {orders.filter((o) => o.deliveryStatus === 'Delivered').length}
                </span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Buyer Pharmacy, Ref, or SKU..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* LIVE INCOMING ORDERS TABLE */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden mb-12">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Live Wholesale Inbound & Packing Queue
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                {filteredOrders.length} {filteredOrders.length === 1 ? 'Order' : 'Orders'}
              </span>
            </div>
            <div className="text-xs text-slate-500 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Live Updates Enabled</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4 sm:px-6">Order Ref & Time</th>
                  <th className="py-3.5 px-4">Buyer Pharmacy</th>
                  <th className="py-3.5 px-4">Ordered SKUs & Packs</th>
                  <th className="py-3.5 px-4">Settlement</th>
                  <th className="py-3.5 px-4">Delivery Status</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Warehouse Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-slate-400">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                        <Boxes className="w-6 h-6" />
                      </div>
                      <p className="font-semibold text-slate-700">No orders match your filter criteria.</p>
                      <p className="text-xs mt-1">Try changing the filter or search keywords.</p>
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => {
                    const isReadyForPacking = order.deliveryStatus === 'Payment Confirmed - Ready for Packing';
                    const isRiderAssigned = order.deliveryStatus === 'Cargo Van Assigned';
                    const isDelivered = order.deliveryStatus === 'Delivered';

                    return (
                      <tr
                        key={order.id}
                        className="hover:bg-slate-50/70 transition-colors group"
                      >
                        {/* Order Reference & Timestamp */}
                        <td className="py-4 px-4 sm:px-6">
                          <div className="flex flex-col">
                            <button
                              onClick={() => setInspectOrder(order)}
                              className="font-mono font-bold text-slate-900 hover:text-emerald-700 flex items-center gap-1.5 text-left cursor-pointer"
                            >
                              <span>{order.orderRef}</span>
                              <ChevronRight className="w-3 h-3 text-slate-400 group-hover:text-emerald-600 transition" />
                            </button>
                            <span className="text-[11px] text-slate-500 mt-0.5">{order.timestamp}</span>
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded w-fit mt-1.5">
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                              <span>{order.settlementStatus}</span>
                            </span>
                          </div>
                        </td>

                        {/* Buyer Pharmacy */}
                        <td className="py-4 px-4">
                          <div className="flex items-start gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold shrink-0">
                              {order.buyer.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                <span>{order.buyer.name}</span>
                                <span title="Verified Edo PSN Benchmark">
                                  <BadgeCheck className="w-3.5 h-3.5 text-blue-500" />
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                <MapPin className="w-3 h-3 text-slate-400" />
                                <span>{order.buyer.area}</span>
                              </p>
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                {order.buyer.superintendent} • {order.buyer.phone}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Ordered SKUs with pack quantities */}
                        <td className="py-4 px-4 max-w-xs sm:max-w-sm">
                          <div className="flex flex-wrap gap-1.5">
                            {order.items.map((item, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-[11px] font-medium border border-slate-200/60"
                                title={`Batch: ${item.batchNumber} • Expiry: ${item.expiryDate} • Loc: ${item.warehouseLocation}`}
                              >
                                <span className="font-bold text-emerald-700">{item.quantity}x</span>
                                <span className="truncate max-w-[180px]">{item.sku}</span>
                                {item.coldChain && (
                                  <span title="Cold Chain item">
                                    <ThermometerSnowflake className="w-3 h-3 text-blue-500 shrink-0" />
                                  </span>
                                )}
                              </span>
                            ))}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-2">
                            <span>{order.items.length} unique {order.items.length === 1 ? 'SKU' : 'SKUs'}</span>
                            <span>•</span>
                            <span className="font-mono">Pick Locs: {order.items.map(i => i.warehouseLocation.split(' ')[0]).join(', ')}</span>
                          </div>
                        </td>

                        {/* Settlement Amount */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="font-bold text-slate-900 text-sm">
                            ₦{order.settlementAmount.toLocaleString()}
                          </div>
                          <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                            Prepaid (100% Upfront)
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono truncate max-w-[120px]">
                            {order.paymentRef}
                          </div>
                        </td>

                        {/* Delivery Status */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          {isReadyForPacking && (
                            <div>
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                                <Package className="w-3.5 h-3.5 text-amber-600 animate-bounce" />
                                <span>Ready for Packing</span>
                              </span>
                              <div className="text-[10px] text-slate-500 mt-1">Pending slip print & courier pickup</div>
                            </div>
                          )}

                          {isRiderAssigned && (
                            <div>
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                                <Truck className="w-3.5 h-3.5 text-blue-600" />
                                <span>Cargo Van Assigned</span>
                              </span>
                              {order.assignedRider && (
                                <div className="text-[10px] text-slate-600 mt-1">
                                  <span className="font-medium">{order.assignedRider.name}</span>
                                  <span className="text-slate-400"> ({order.assignedRider.trackingCode})</span>
                                </div>
                              )}
                            </div>
                          )}

                          {isDelivered && (
                            <div>
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Delivered</span>
                              </span>
                              {order.deliveryPod && (
                                <div className="text-[10px] text-slate-500 mt-1">
                                  Signed by {order.deliveryPod.receivedBy}
                                </div>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Action Tools */}
                        <td className="py-4 px-4 sm:px-6 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Action 1: Print Warehouse Picking Slip */}
                            <button
                              onClick={() => {
                                setPickingSlipOrder(order);
                                setTimeout(() => window.print(), 300);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition cursor-pointer"
                              title="Print Warehouse Picking Slip for picker staff"
                            >
                              <Printer className="w-3.5 h-3.5 text-slate-600" />
                              <span className="hidden xl:inline">Picking Slip</span>
                            </button>

                            {/* Action 2: Mark Ready for Pickup */}
                            <button
                              onClick={() => {
                                setPickupModalOrder(order);
                                setSelectedCourier('osaze');
                              }}
                              disabled={isDelivered}
                              className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                                isReadyForPacking
                                  ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                              } ${isDelivered ? 'opacity-40 cursor-not-allowed' : ''}`}
                              title="Assign B2B cargo van and trigger warehouse pickup"
                            >
                              <Truck className="w-3.5 h-3.5" />
                              <span className="hidden xl:inline">
                                {isReadyForPacking ? 'Mark Pickup' : 'Reassign Van'}
                              </span>
                            </button>

                            {/* Action 3: Send WhatsApp Alert & Payment Receipt */}
                            <button
                              onClick={() => {
                                setWhatsappModalOrder(order);
                                setWhatsappRecipientType('buyer');
                                setWhatsAppSentSuccess(null);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition cursor-pointer"
                              title="Send WhatsApp confirmation & upfront payment receipt"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span className="hidden xl:inline">WhatsApp Alert</span>
                            </button>

                            {/* Inspect details button */}
                            <button
                              onClick={() => setInspectOrder(order)}
                              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                              title="Inspect full order breakdown"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    )}

    {/* MODAL 1: WAREHOUSE PICKING SLIP PREVIEW & PRINT MODAL */}
      {pickingSlipOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto print:hidden">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Printer className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="font-bold text-sm">Warehouse Picking Slip</h3>
                  <p className="text-[11px] text-slate-400">
                    Order Ref: {pickingSlipOrder.orderRef} • {pickingSlipOrder.buyer.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPickingSlipOrder(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Preview */}
            <div className="p-6 text-xs space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-3">
                  <div>
                    <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                      Fulfillment Depot Hub
                    </span>
                    <h4 className="font-bold text-slate-900 text-sm">
                      Airen Pharmacy Central Wholesale Depot (Benin)
                    </h4>
                    <p className="text-slate-500 text-[11px]">Sapele Rd / Ring Road Axis • PCN/ED/WS-2024-0018</p>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                      URGENT BENIN METRO
                    </span>
                    <p className="font-mono text-slate-600 mt-1">{pickingSlipOrder.orderRef}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-[11px]">
                  <div>
                    <span className="text-slate-400 block">Buyer Destination:</span>
                    <span className="font-bold text-slate-800">{pickingSlipOrder.buyer.name}</span>
                    <p className="text-slate-600">{pickingSlipOrder.buyer.address}, {pickingSlipOrder.buyer.city}</p>
                    <p className="text-slate-500">Contact: {pickingSlipOrder.buyer.superintendent} ({pickingSlipOrder.buyer.phone})</p>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Payment & Settlement:</span>
                    <span className="font-bold text-emerald-700">100% Upfront Verified</span>
                    <p className="text-slate-600">Total: ₦{pickingSlipOrder.settlementAmount.toLocaleString()}</p>
                    <p className="text-slate-500 font-mono">Ref: {pickingSlipOrder.paymentRef}</p>
                  </div>
                </div>
              </div>

              {/* Items to pick */}
              <div>
                <h4 className="font-bold text-slate-900 mb-2 flex items-center justify-between">
                  <span>Warehouse Items to Pick & Pack ({pickingSlipOrder.items.length})</span>
                  <span className="text-[11px] text-slate-500 font-normal">Check items as they are boxed</span>
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                  {pickingSlipOrder.items.map((item, idx) => (
                    <div key={idx} className="p-3 flex items-center justify-between bg-white hover:bg-slate-50">
                      <div className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded border-2 border-slate-300 mt-0.5 flex items-center justify-center"></div>
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{item.sku}</span>
                            {item.coldChain && (
                              <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded font-semibold">
                                ❄️ Cold Chain (2-8°C)
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-3 mt-0.5">
                            <span className="font-medium text-emerald-700">Bin: {item.warehouseLocation}</span>
                            <span>Batch: {item.batchNumber}</span>
                            <span>Exp: {item.expiryDate}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-base font-black text-slate-900">{item.quantity}</span>
                        <span className="text-[11px] text-slate-500 block">{item.packSize}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quality Checklist */}
              <div className="bg-emerald-50/60 border border-emerald-200/60 rounded-xl p-3 text-[11px] text-emerald-950 space-y-1">
                <div className="font-bold text-emerald-900">Warehouse QA Protocols:</div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Tamper seal tape applied to exterior carton</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Cold pack included for temperature-sensitive vials</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => setPickingSlipOrder(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Close Preview
              </button>
              <button
                onClick={() => window.print()}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Warehouse Slip Now</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: MARK READY FOR PICKUP & RIDER ASSIGNMENT */}
      {pickupModalOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Truck className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-bold text-sm">Mark Ready for Pickup</h3>
                  <p className="text-[11px] text-slate-400">Order: {pickupModalOrder.orderRef}</p>
                </div>
              </div>
              <button
                onClick={() => setPickupModalOrder(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900">
                <p className="font-bold">Dispatching to: {pickupModalOrder.buyer.name}</p>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  Destination: {pickupModalOrder.buyer.address}, Benin City
                </p>
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-2">
                  Select Intra-Benin Courier / Dispatch Rider:
                </label>
                <div className="space-y-2">
                  <label
                    onClick={() => setSelectedCourier('osaze')}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                      selectedCourier === 'osaze'
                        ? 'border-emerald-500 bg-emerald-50/50'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="courier"
                      checked={selectedCourier === 'osaze'}
                      onChange={() => setSelectedCourier('osaze')}
                      className="mt-0.5 text-emerald-600"
                    />
                    <div>
                      <div className="font-bold text-slate-900">
                        PharmaStackX Intra-Benin Rapid Fleet
                      </div>
                      <p className="text-slate-500 text-[11px]">
                        Cargo Van: Osaze Idahosa • +234 805 112 3490 (Bajaj Boxer 150cc)
                      </p>
                      <span className="inline-block mt-1 text-[10px] font-semibold text-emerald-700 bg-emerald-100/70 px-2 py-0.2 rounded">
                        Available at Benin Depot Gate • 35m Metro ETA
                      </span>
                    </div>
                  </label>

                  <label
                    onClick={() => setSelectedCourier('osahon')}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                      selectedCourier === 'osahon'
                        ? 'border-emerald-500 bg-emerald-50/50'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="courier"
                      checked={selectedCourier === 'osahon'}
                      onChange={() => setSelectedCourier('osahon')}
                      className="mt-0.5 text-emerald-600"
                    />
                    <div>
                      <div className="font-bold text-slate-900">
                        Airen In-house Express Fleet
                      </div>
                      <p className="text-slate-500 text-[11px]">
                        Cargo Van: Osahon E. • +234 814 990 1234 (TVS Metro #2)
                      </p>
                      <span className="inline-block mt-1 text-[10px] font-semibold text-blue-700 bg-blue-100/70 px-2 py-0.2 rounded">
                        Internal Wholesale Dispatch Team
                      </span>
                    </div>
                  </label>

                  <label
                    onClick={() => setSelectedCourier('gig')}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                      selectedCourier === 'gig'
                        ? 'border-emerald-500 bg-emerald-50/50'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="courier"
                      checked={selectedCourier === 'gig'}
                      onChange={() => setSelectedCourier('gig')}
                      className="mt-0.5 text-emerald-600"
                    />
                    <div>
                      <div className="font-bold text-slate-900">GIG Logistics (Benin Hub Waybill)</div>
                      <p className="text-slate-500 text-[11px]">
                        Waybill Desk • +234 803 555 7890 (Direct Depot Van)
                      </p>
                    </div>
                  </label>

                  <label
                    onClick={() => setSelectedCourier('custom')}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                      selectedCourier === 'custom'
                        ? 'border-emerald-500 bg-emerald-50/50'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="courier"
                      checked={selectedCourier === 'custom'}
                      onChange={() => setSelectedCourier('custom')}
                      className="mt-0.5 text-emerald-600"
                    />
                    <div className="w-full">
                      <div className="font-bold text-slate-900">Other / In-Person Pickup</div>
                      {selectedCourier === 'custom' && (
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <input
                            type="text"
                            placeholder="Rider / Driver Name"
                            value={customCourierName}
                            onChange={(e) => setCustomCourierName(e.target.value)}
                            className="p-2 border border-slate-300 rounded-lg text-xs"
                          />
                          <input
                            type="text"
                            placeholder="Phone Number"
                            value={customCourierPhone}
                            onChange={(e) => setCustomCourierPhone(e.target.value)}
                            className="p-2 border border-slate-300 rounded-lg text-xs"
                          />
                        </div>
                      )}
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">
                  Dispatch Bay Handover Instructions (Optional):
                </label>
                <input
                  type="text"
                  value={pickupNotes}
                  onChange={(e) => setPickupNotes(e.target.value)}
                  placeholder="e.g., Staged at Dispatch Bay #2. Fragile cartons."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => setPickupModalOrder(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPickup}
                disabled={isAssigningRider}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
              >
                {isAssigningRider ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Truck className="w-4 h-4" />
                )}
                <span>Confirm Cargo Van Pickup Handover</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: WHATSAPP ALERT & PAYMENT RECEIPT DISPATCH */}
      {whatsappModalOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="px-6 py-4 bg-emerald-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Send className="w-5 h-5 text-emerald-300" />
                <div>
                  <h3 className="font-bold text-sm">Send WhatsApp Alert & Payment Receipt</h3>
                  <p className="text-[11px] text-emerald-200">
                    Order Ref: {whatsappModalOrder.orderRef} • ₦{whatsappModalOrder.settlementAmount.toLocaleString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setWhatsappModalOrder(null)}
                className="text-emerald-200 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 text-xs">
              {/* Recipient Toggle */}
              <div>
                <label className="font-bold text-slate-800 block mb-2">Select Notification Recipient:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setWhatsappRecipientType('buyer');
                      setWhatsAppSentSuccess(null);
                    }}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition ${
                      whatsappRecipientType === 'buyer'
                        ? 'border-emerald-500 bg-emerald-50/50 text-emerald-950 font-bold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>1. Buyer Pharmacy</span>
                    </div>
                    <p className="text-[11px] font-normal text-slate-500 mt-1 truncate">
                      {whatsappModalOrder.buyer.superintendent} ({whatsappModalOrder.buyer.name})
                    </p>
                  </button>

                  <button
                    onClick={() => {
                      setWhatsappRecipientType('warehouse');
                      setWhatsAppSentSuccess(null);
                    }}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition ${
                      whatsappRecipientType === 'warehouse'
                        ? 'border-emerald-500 bg-emerald-50/50 text-emerald-950 font-bold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Boxes className="w-3.5 h-3.5 text-emerald-600" />
                      <span>2. Airen Warehouse Lead</span>
                    </div>
                    <p className="text-[11px] font-normal text-slate-500 mt-1 truncate">
                      Benin Depot Manager (+234 803 721 9904)
                    </p>
                  </button>
                </div>
              </div>

              {/* Message Preview Box with WhatsApp Aesthetic */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-slate-700">Live WhatsApp Message Preview:</span>
                  <button
                    onClick={handleCopyWhatsAppText}
                    className="text-emerald-700 hover:text-emerald-800 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    {copiedWhatsAppText ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedWhatsAppText ? 'Copied!' : 'Copy Text'}</span>
                  </button>
                </div>
                <div className="bg-[#E5DDD5] p-3 rounded-2xl border border-slate-300">
                  <div className="bg-white rounded-xl p-3 shadow-xs font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-slate-900 border border-emerald-100">
                    {getWhatsAppMessageContent(whatsappModalOrder, whatsappRecipientType)}
                    <div className="text-right text-[9px] text-slate-400 mt-1 font-sans">
                      12:15 PM ✓✓
                    </div>
                  </div>
                </div>
              </div>

              {/* Success alert */}
              {whatsAppSentSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{whatsAppSentSuccess}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <button
                onClick={() => setWhatsappModalOrder(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSimulateWhatsAppDispatch}
                  disabled={isSendingWhatsApp}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition cursor-pointer flex items-center gap-1.5"
                  title="Simulate dispatch via PharmaStackX Whapi Integration"
                >
                  {isSendingWhatsApp ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                  <span>Send via API Gateway</span>
                </button>

                <button
                  onClick={handleOpenWhatsAppUrl}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open in WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: ORDER INSPECTION DRAWER */}
      {inspectOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-end p-0">
          <div className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">
            <div>
              {/* Header */}
              <div className="px-6 py-5 bg-slate-900 text-white flex items-center justify-between sticky top-0 z-10">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base">{inspectOrder.orderRef}</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-white">
                      100% Upfront Paid
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Buyer: {inspectOrder.buyer.name} • {inspectOrder.timestamp}
                  </p>
                </div>
                <button
                  onClick={() => setInspectOrder(null)}
                  className="text-slate-400 hover:text-white p-2 rounded-xl cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-6 text-xs">
                {/* Status card */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-slate-500 text-[11px] block">Current Fulfillment Status</span>
                    <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                      {inspectOrder.deliveryStatus}
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {inspectOrder.assignedRider
                        ? `Assigned: ${inspectOrder.assignedRider.name} (${inspectOrder.assignedRider.phone})`
                        : 'Awaiting packing verification & pickup'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 text-[11px] block">Settlement Value</span>
                    <span className="font-black text-emerald-700 text-base">
                      ₦{inspectOrder.settlementAmount.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Buyer Profile */}
                <div>
                  <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-slate-500" />
                    <span>Buyer Pharmacy Details</span>
                  </h4>
                  <div className="border border-slate-200 rounded-2xl p-4 bg-white space-y-2 text-slate-700">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Pharmacy:</span>
                      <span className="font-bold text-slate-900">{inspectOrder.buyer.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Superintendent:</span>
                      <span>{inspectOrder.buyer.superintendent}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Contact Phone:</span>
                      <span className="font-mono">{inspectOrder.buyer.phone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Premises Address:</span>
                      <span className="text-right max-w-xs">{inspectOrder.buyer.address}, Benin City</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">PCN License ID:</span>
                      <span className="font-mono font-bold text-emerald-700">{inspectOrder.buyer.pcnLicense}</span>
                    </div>
                  </div>
                </div>

                {/* SKUs */}
                <div>
                  <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                    <Boxes className="w-4 h-4 text-slate-500" />
                    <span>Ordered SKUs & Pack Breakdown ({inspectOrder.items.length})</span>
                  </h4>
                  <div className="border border-slate-200 rounded-2xl divide-y divide-slate-100 overflow-hidden">
                    {inspectOrder.items.map((item, idx) => (
                      <div key={idx} className="p-3 bg-white flex items-center justify-between">
                        <div>
                          <div className="font-bold text-slate-900">{item.sku}</div>
                          <div className="text-[11px] text-slate-500">
                            {item.genericName} • {item.packSize}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-2">
                            <span className="font-semibold text-blue-700">Loc: {item.warehouseLocation}</span>
                            <span>Batch: {item.batchNumber}</span>
                            <span>Exp: {item.expiryDate}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-slate-900 text-sm">{item.quantity} packs</span>
                          <span className="text-[11px] text-slate-500 block">
                            @ ₦{item.unitPrice.toLocaleString()} / pack
                          </span>
                          <span className="text-[11px] font-bold text-emerald-700">
                            ₦{(item.quantity * item.unitPrice).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payment Breakdown */}
                <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Upfront Settlement:</span>
                    <span className="font-semibold text-slate-900">₦{inspectOrder.settlementAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Payment Gateway:</span>
                    <span>{inspectOrder.paymentMethod}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Transaction Ref:</span>
                    <span className="font-mono text-slate-700">{inspectOrder.paymentRef}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-200 font-bold">
                    <span>Depot Net Payout:</span>
                    <span className="text-emerald-700 text-sm">₦{inspectOrder.settlementAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 sticky bottom-0">
              <button
                onClick={() => {
                  setPickingSlipOrder(inspectOrder);
                  setInspectOrder(null);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Slip</span>
              </button>

              <button
                onClick={() => {
                  setWhatsappModalOrder(inspectOrder);
                  setInspectOrder(null);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
