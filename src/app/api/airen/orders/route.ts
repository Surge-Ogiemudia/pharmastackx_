import { NextRequest, NextResponse } from 'next/server';

export interface AirenOrderItem {
  sku: string;
  genericName: string;
  packSize: string;
  quantity: number;
  unitPrice: number;
  batchNumber: string;
  expiryDate: string;
  warehouseLocation: string; // e.g., 'Aisle 2 - Shelf B4'
  coldChain?: boolean;
}

export interface AirenOrder {
  id: string;
  orderRef: string;
  timestamp: string;
  createdAt: string;
  buyer: {
    name: string;
    superintendent: string;
    phone: string;
    email: string;
    address: string;
    area: string;
    pcnLicense: string;
    city: string;
  };
  items: AirenOrderItem[];
  settlementAmount: number;
  settlementStatus: '100% Upfront Verified' | 'Settled via Escrow';
  paymentRef: string;
  paymentMethod: string;
  deliveryStatus: 'Payment Confirmed - Ready for Packing' | 'Cargo Van Assigned' | 'Delivered';
  assignedRider?: {
    name: string;
    phone: string;
    vehicle: string;
    trackingCode: string;
    dispatchedAt?: string;
  };
  deliveryPod?: {
    receivedBy: string;
    deliveredAt: string;
    signatureNote: string;
  };
}

export const INITIAL_AIREN_ORDERS: AirenOrder[] = [
  {
    id: 'arn-001',
    orderRef: 'ARN-2026-0841',
    timestamp: '14 mins ago',
    createdAt: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
    buyer: {
      name: 'Apcare Pharmacy',
      superintendent: 'Pharm. Osagie E.',
      phone: '+234 803 452 8819',
      email: 'dispensary@apcarepharm.ng',
      address: '54 Airport Road, GRA',
      area: 'Airport Road / GRA Axis',
      pcnLicense: 'PSN-ED-2024-0412',
      city: 'Benin City',
    },
    items: [
      {
        sku: 'Augmentin 625mg Box (Pack of 14s)',
        genericName: 'Amoxicillin + Clavulanate Potassium',
        packSize: '14 Tablets Box',
        quantity: 5,
        unitPrice: 9500,
        batchNumber: 'AUG-BN24-098',
        expiryDate: '11/2027',
        warehouseLocation: 'Bay 3 - Rack B-04',
        coldChain: false,
      },
      {
        sku: 'Lonart DS Pack (24s)',
        genericName: 'Artemether 80mg + Lumefantrine 480mg',
        packSize: 'Pack of 6s / 24s',
        quantity: 10,
        unitPrice: 2850,
        batchNumber: 'LNT-24-4411',
        expiryDate: '06/2028',
        warehouseLocation: 'Bay 1 - Shelf A-12',
        coldChain: false,
      },
      {
        sku: 'Coartem 80/480mg Tablets',
        genericName: 'Artemether + Lumefantrine (Novartis)',
        packSize: 'Pack of 6 Dispersible',
        quantity: 15,
        unitPrice: 3200,
        batchNumber: 'CRT-NV-8120',
        expiryDate: '03/2028',
        warehouseLocation: 'Bay 1 - Shelf A-14',
        coldChain: false,
      },
      {
        sku: 'Ventolin Inhaler 100mcg (GSK)',
        genericName: 'Salbutamol Sulphate 200 Doses',
        packSize: 'Canister with Actuator',
        quantity: 4,
        unitPrice: 8200,
        batchNumber: 'VNT-GSK-0091',
        expiryDate: '09/2027',
        warehouseLocation: 'Bay 4 - Respiratory Rack R-02',
        coldChain: false,
      },
    ],
    settlementAmount: 156800,
    settlementStatus: '100% Upfront Verified',
    paymentRef: 'PSTK_B2B_992841029',
    paymentMethod: 'Paystack B2B Dedicated Virtual Account',
    deliveryStatus: 'Payment Confirmed - Ready for Packing',
  },
  {
    id: 'arn-002',
    orderRef: 'ARN-2026-0839',
    timestamp: '48 mins ago',
    createdAt: new Date(Date.now() - 48 * 60 * 1000).toISOString(),
    buyer: {
      name: 'KOP Pharmacy',
      superintendent: 'Pharm. Kelvin O.',
      phone: '+234 812 764 9901',
      email: 'procurement@koppharmacy.com',
      address: '112 Uselu Lagos Road, near UNIBEN Junction',
      area: 'Uselu / Ugbowo Corridor',
      pcnLicense: 'PSN-ED-2023-1088',
      city: 'Benin City',
    },
    items: [
      {
        sku: 'Ciprotab 500mg (Pack of 10s)',
        genericName: 'Ciprofloxacin Hydrochloride (Fidson)',
        packSize: 'Blister Pack 10 Tablets',
        quantity: 10,
        unitPrice: 2600,
        batchNumber: 'CIP-FID-5512',
        expiryDate: '01/2028',
        warehouseLocation: 'Bay 2 - Antibiotics Rack C-01',
        coldChain: false,
      },
      {
        sku: 'Paracetamol 500mg BP (Tins of 1000s, Emzor)',
        genericName: 'Paracetamol 500mg Bulk Tin',
        packSize: 'Tin of 1000 Tablets',
        quantity: 25,
        unitPrice: 4800,
        batchNumber: 'PCM-EMZ-9932',
        expiryDate: '12/2028',
        warehouseLocation: 'Bay 5 - Bulk Pallet P-09',
        coldChain: false,
      },
      {
        sku: 'Amoxil 500mg Capsules (Beecham)',
        genericName: 'Amoxicillin 500mg Capsules',
        packSize: 'Pack of 100s',
        quantity: 8,
        unitPrice: 7500,
        batchNumber: 'AMX-BCH-3310',
        expiryDate: '05/2027',
        warehouseLocation: 'Bay 2 - Antibiotics Rack C-05',
        coldChain: false,
      },
      {
        sku: 'Vitamin C 1000mg Effervescent (Redoxon)',
        genericName: 'Ascorbic Acid + Zinc (Bayer)',
        packSize: 'Tube of 10 Tablets',
        quantity: 12,
        unitPrice: 3900,
        batchNumber: 'VTC-BAY-1049',
        expiryDate: '10/2027',
        warehouseLocation: 'Bay 6 - OTC & Wellness Shelf W-03',
        coldChain: false,
      },
    ],
    settlementAmount: 252800,
    settlementStatus: '100% Upfront Verified',
    paymentRef: 'NIP_TXN_8819204018',
    paymentMethod: 'Direct NIP Instant Wholesale Transfer',
    deliveryStatus: 'Cargo Van Assigned',
    assignedRider: {
      name: 'Osaze Idahosa',
      phone: '+234 805 112 3490',
      vehicle: 'Bajaj Boxer 150cc (Reg: ED-412-BEN)',
      trackingCode: 'PSX-LOG-9921',
      dispatchedAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    },
  },
  {
    id: 'arn-003',
    orderRef: 'ARN-2026-0835',
    timestamp: '1 hour 25 mins ago',
    createdAt: new Date(Date.now() - 85 * 60 * 1000).toISOString(),
    buyer: {
      name: 'Medlife Pharmacy',
      superintendent: 'Pharm. Blessing I.',
      phone: '+234 806 331 4452',
      email: 'medlife.benin@gmail.com',
      address: '28 Ekenwan Road, Opp. St. Paul’s Anglican',
      area: 'Ekenwan / Ring Road Axis',
      pcnLicense: 'PSN-ED-2024-0773',
      city: 'Benin City',
    },
    items: [
      {
        sku: 'Lonart DS Pack (24s)',
        genericName: 'Artemether 80mg + Lumefantrine 480mg',
        packSize: 'Pack of 24s',
        quantity: 20,
        unitPrice: 2850,
        batchNumber: 'LNT-24-4419',
        expiryDate: '07/2028',
        warehouseLocation: 'Bay 1 - Shelf A-12',
        coldChain: false,
      },
      {
        sku: 'Augmentin 625mg Box (Pack of 14s)',
        genericName: 'Amoxicillin + Clavulanate Potassium',
        packSize: '14 Tablets Box',
        quantity: 10,
        unitPrice: 9500,
        batchNumber: 'AUG-BN24-099',
        expiryDate: '11/2027',
        warehouseLocation: 'Bay 3 - Rack B-04',
        coldChain: false,
      },
      {
        sku: 'Rocephin 1g Injection (Roche)',
        genericName: 'Ceftriaxone Sodium 1g Vial + Solvent',
        packSize: '10 Vials Pack',
        quantity: 6,
        unitPrice: 14500,
        batchNumber: 'ROC-RCH-7721',
        expiryDate: '04/2028',
        warehouseLocation: 'Cold Chain Bay - Refrigerator #1 (4°C)',
        coldChain: true,
      },
      {
        sku: 'ORS Oral Rehydration Salts (WHO formula)',
        genericName: 'Oral Electrolyte Replacement Sachets',
        packSize: 'Carton of 50 Sachets',
        quantity: 30,
        unitPrice: 450,
        batchNumber: 'ORS-WHO-0012',
        expiryDate: '10/2028',
        warehouseLocation: 'Bay 5 - Shelf D-01',
        coldChain: false,
      },
      {
        sku: 'Metronidazole 400mg (Flagyl, Sanofi)',
        genericName: 'Metronidazole 400mg',
        packSize: 'Pack of 100 Tablets',
        quantity: 15,
        unitPrice: 1800,
        batchNumber: 'FLG-SNF-9023',
        expiryDate: '08/2027',
        warehouseLocation: 'Bay 2 - Shelf B-08',
        coldChain: false,
      },
    ],
    settlementAmount: 279500,
    settlementStatus: '100% Upfront Verified',
    paymentRef: 'PSTK_B2B_1102934812',
    paymentMethod: 'Paystack Upfront B2B Settlement',
    deliveryStatus: 'Payment Confirmed - Ready for Packing',
  },
  {
    id: 'arn-004',
    orderRef: 'ARN-2026-0828',
    timestamp: '3 hours ago',
    createdAt: new Date(Date.now() - 180 * 60 * 1000).toISOString(),
    buyer: {
      name: 'Ernosa Pharmacy',
      superintendent: 'Pharm. Eghosa N.',
      phone: '+234 802 884 1920',
      email: 'orders@ernosapharmacy.com.ng',
      address: '84 Upper Mission Road, New Benin Market Axis',
      area: 'New Benin / Upper Mission',
      pcnLicense: 'PSN-ED-2023-0941',
      city: 'Benin City',
    },
    items: [
      {
        sku: 'CATAFLAM 50mg Tablets (Novartis)',
        genericName: 'Diclofenac Potassium 50mg',
        packSize: 'Pack of 20 Tablets',
        quantity: 12,
        unitPrice: 4100,
        batchNumber: 'CAT-NVT-4431',
        expiryDate: '12/2027',
        warehouseLocation: 'Bay 4 - Analgesics Rack E-03',
        coldChain: false,
      },
      {
        sku: 'Artemether + Lumefantrine 20/120mg (Packs)',
        genericName: 'Co-Arinate Pediatric',
        packSize: 'Pack of 18 Tablets',
        quantity: 20,
        unitPrice: 1750,
        batchNumber: 'ACT-PED-8802',
        expiryDate: '03/2028',
        warehouseLocation: 'Bay 1 - Shelf A-09',
        coldChain: false,
      },
      {
        sku: 'Gsunate 60mg Artesunate Inj (Guilin)',
        genericName: 'Artesunate 60mg Vial + Bicarbonate + Saline',
        packSize: 'Box of 1 Vial Kit',
        quantity: 10,
        unitPrice: 3800,
        batchNumber: 'GSN-GLN-1940',
        expiryDate: '09/2027',
        warehouseLocation: 'Bay 2 - Injectables Vault J-04',
        coldChain: false,
      },
      {
        sku: 'B-Complex Injectables (Vials)',
        genericName: 'Vitamin B1, B2, B6, Nicotinamide',
        packSize: 'Pack of 10x 2ml Ampoules',
        quantity: 15,
        unitPrice: 1600,
        batchNumber: 'BCX-AMP-3392',
        expiryDate: '02/2028',
        warehouseLocation: 'Bay 2 - Injectables Vault J-06',
        coldChain: false,
      },
      {
        sku: 'Ventolin Expectorant 100ml Syrup',
        genericName: 'Salbutamol + Guaifenesin 100ml (GSK)',
        packSize: '100ml Amber Bottle',
        quantity: 8,
        unitPrice: 2200,
        batchNumber: 'VNT-EXP-7711',
        expiryDate: '06/2027',
        warehouseLocation: 'Bay 4 - Liquids Shelf L-02',
        coldChain: false,
      },
    ],
    settlementAmount: 163800,
    settlementStatus: '100% Upfront Verified',
    paymentRef: 'ACC_B2B_ESC_338190',
    paymentMethod: 'Access Bank Instant Wholesale Escrow',
    deliveryStatus: 'Delivered',
    assignedRider: {
      name: 'Godstime Omoruyi',
      phone: '+234 814 559 8812',
      vehicle: 'TVS Metro Rider #7',
      trackingCode: 'PSX-LOG-8820',
      dispatchedAt: new Date(Date.now() - 140 * 60 * 1000).toISOString(),
    },
    deliveryPod: {
      receivedBy: 'Faith (Pharm. Technician - Ernosa)',
      deliveredAt: 'Today, 10:15 AM',
      signatureNote: 'All 5 SKUs verified intact. Cold-chain seal checked.',
    },
  },
  {
    id: 'arn-005',
    orderRef: 'ARN-2026-0814',
    timestamp: 'Yesterday',
    createdAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
    buyer: {
      name: 'KOP Pharmacy',
      superintendent: 'Pharm. Kelvin O.',
      phone: '+234 812 764 9901',
      email: 'procurement@koppharmacy.com',
      address: '112 Uselu Lagos Road, near UNIBEN Junction',
      area: 'Uselu / Ugbowo Corridor',
      pcnLicense: 'PSN-ED-2023-1088',
      city: 'Benin City',
    },
    items: [
      {
        sku: 'Paracetamol 500mg BP (Tins of 1000s, Emzor)',
        genericName: 'Paracetamol 500mg Bulk Tin',
        packSize: 'Tin of 1000 Tablets',
        quantity: 40,
        unitPrice: 4800,
        batchNumber: 'PCM-EMZ-9910',
        expiryDate: '12/2028',
        warehouseLocation: 'Bay 5 - Bulk Pallet P-09',
        coldChain: false,
      },
      {
        sku: 'Augmentin 1g Box (Pack of 14s, GSK)',
        genericName: 'Amoxicillin 875mg + Clavulanate 125mg',
        packSize: 'Box of 14 Tablets',
        quantity: 15,
        unitPrice: 9500,
        batchNumber: 'AUG-1G-4421',
        expiryDate: '10/2027',
        warehouseLocation: 'Bay 3 - Rack B-05',
        coldChain: false,
      },
    ],
    settlementAmount: 334500,
    settlementStatus: '100% Upfront Verified',
    paymentRef: 'PSTK_B2B_776192834',
    paymentMethod: 'Paystack B2B Upfront Transfer',
    deliveryStatus: 'Delivered',
    assignedRider: {
      name: 'Osaze Idahosa',
      phone: '+234 805 112 3490',
      vehicle: 'Bajaj Boxer 150cc',
      trackingCode: 'PSX-LOG-7711',
    },
    deliveryPod: {
      receivedBy: 'Pharm. Kelvin O.',
      deliveredAt: 'Yesterday, 3:40 PM',
      signatureNote: 'Warehouse batch numbers confirmed against packing slip.',
    },
  },
  {
    id: 'arn-006',
    orderRef: 'ARN-2026-0809',
    timestamp: '2 days ago',
    createdAt: new Date(Date.now() - 49 * 60 * 60 * 1000).toISOString(),
    buyer: {
      name: 'Apcare Pharmacy',
      superintendent: 'Pharm. Osagie E.',
      phone: '+234 803 452 8819',
      email: 'dispensary@apcarepharm.ng',
      address: '54 Airport Road, GRA',
      area: 'Airport Road / GRA Axis',
      pcnLicense: 'PSN-ED-2024-0412',
      city: 'Benin City',
    },
    items: [
      {
        sku: 'Rocephin 1g Injection (Roche)',
        genericName: 'Ceftriaxone Sodium 1g Vial + Solvent',
        packSize: '10 Vials Pack',
        quantity: 8,
        unitPrice: 14500,
        batchNumber: 'ROC-RCH-7710',
        expiryDate: '04/2028',
        warehouseLocation: 'Cold Chain Bay - Refrigerator #1',
        coldChain: true,
      },
      {
        sku: 'Ciprotab 500mg (Pack of 10s)',
        genericName: 'Ciprofloxacin Hydrochloride',
        packSize: '10s Pack',
        quantity: 12,
        unitPrice: 2600,
        batchNumber: 'CIP-FID-5489',
        expiryDate: '12/2027',
        warehouseLocation: 'Bay 2 - Antibiotics Rack C-01',
        coldChain: false,
      },
      {
        sku: 'Lonart DS Pack (24s)',
        genericName: 'Artemether + Lumefantrine',
        packSize: 'Pack of 24s',
        quantity: 20,
        unitPrice: 2850,
        batchNumber: 'LNT-24-4402',
        expiryDate: '06/2028',
        warehouseLocation: 'Bay 1 - Shelf A-12',
        coldChain: false,
      },
    ],
    settlementAmount: 204200,
    settlementStatus: '100% Upfront Verified',
    paymentRef: 'PSTK_B2B_556102941',
    paymentMethod: 'Paystack B2B Upfront Transfer',
    deliveryStatus: 'Delivered',
    assignedRider: {
      name: 'Osaze Idahosa',
      phone: '+234 805 112 3490',
      vehicle: 'Bajaj Boxer 150cc',
      trackingCode: 'PSX-LOG-6690',
    },
    deliveryPod: {
      receivedBy: 'Pharm. Osagie E.',
      deliveredAt: '2 days ago, 11:20 AM',
      signatureNote: 'Direct delivery to GRA branch.',
    },
  },
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const filter = searchParams.get('filter');

    let orders = [...INITIAL_AIREN_ORDERS];

    if (filter === 'pending') {
      orders = orders.filter(o => o.deliveryStatus === 'Payment Confirmed - Ready for Packing');
    } else if (filter === 'dispatched') {
      orders = orders.filter(o => o.deliveryStatus === 'Cargo Van Assigned');
    } else if (filter === 'delivered') {
      orders = orders.filter(o => o.deliveryStatus === 'Delivered');
    }

    const totalRevenue = INITIAL_AIREN_ORDERS.reduce((acc, curr) => acc + curr.settlementAmount, 0);
    const pendingCount = INITIAL_AIREN_ORDERS.filter(o => o.deliveryStatus === 'Payment Confirmed - Ready for Packing').length;
    const dispatchedCount = INITIAL_AIREN_ORDERS.filter(o => o.deliveryStatus === 'Cargo Van Assigned' || o.deliveryStatus === 'Delivered').length;
    const activeCustomersCount = new Set(INITIAL_AIREN_ORDERS.map(o => o.buyer.name)).size;

    return NextResponse.json({
      success: true,
      depot: {
        name: 'Airen Pharmacy',
        hub: 'Wholesale Fulfillment Hub (Benin Depot)',
        location: 'Benin Central Warehouse (Sapele Road / Ring Road Corridor), Benin City, Edo State',
        pcnLicense: 'PCN/ED/WS-2024-0018',
        contactPhone: '+234 803 721 9904',
        manager: 'Pharm. Airen O. (Depot Director)',
        operatingHours: 'Monday - Saturday: 7:30 AM - 7:00 PM',
      },
      metrics: {
        totalWholesaleRevenue: totalRevenue,
        pendingDispatchCount: pendingCount,
        dispatchedCount: dispatchedCount,
        activeRetailCustomersCount: activeCustomersCount,
        benchmarkPharmacies: ['Apcare Pharmacy', 'KOP Pharmacy', 'Medlife Pharmacy', 'Ernosa Pharmacy'],
      },
      orders,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, orderId, rider } = body;

    if (action === 'mark_ready_for_pickup') {
      return NextResponse.json({
        success: true,
        message: `Order marked Ready for Pickup. Courier assigned.`,
        orderId,
        newStatus: 'Cargo Van Assigned',
        assignedRider: rider || {
          name: 'Osaze Idahosa (PharmaStackX Intra-Benin Rapid Fleet)',
          phone: '+234 805 112 3490',
          vehicle: 'Bajaj Boxer 150cc',
          trackingCode: `PSX-LOG-${Math.floor(1000 + Math.random() * 9000)}`,
        },
      });
    }

    if (action === 'send_whatsapp_alert') {
      const { recipientType, phone, recipientName, orderRef } = body;
      return NextResponse.json({
        success: true,
        message: `WhatsApp alert dispatched to ${recipientName} (${recipientType}: ${phone}) for Order ${orderRef}.`,
        dispatchedAt: new Date().toISOString(),
        gateway: 'PharmaStackX Whapi Gateway (Production Sandbox)',
      });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
