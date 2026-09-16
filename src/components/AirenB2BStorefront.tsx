'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/contexts/CartContext';
import {
  Search,
  Building2,
  ShieldCheck,
  Truck,
  Phone,
  MapPin,
  Plus,
  Minus,
  ShoppingCart,
  ArrowRight,
  Sparkles,
  BadgeCheck,
  Boxes,
  FileSpreadsheet,
  FileText,
  X,
  Share2,
  Pill,
  Check
} from 'lucide-react';

export interface WholesaleProduct {
  id: string;
  name: string;
  strength: string;
  category: 'Antibiotics' | 'Antimalarials' | 'Analgesics & Pain' | 'Infusions & Injectables' | 'Consumables & Surgical' | 'OTC';
  manufacturer: string;
  minForm: string; // "Min: Pack of 10", "Min: Box", "Carton", etc.
  packType: 'pack' | 'box' | 'carton';
  price: number; // Wholesale price per minimum pack/box in NGN
  unitPrice: number;
  unitsPerPack: number;
  stockCount: number;
  depotLocation: string;
  lotNumber: string;
  expiryDate: string;
  nafdacReg: string;
  storageCondition: string;
  activeIngredients: string;
  image?: string;
  isColdChain?: boolean;
}

const DEFAULT_WHOLESALE_PRODUCTS: WholesaleProduct[] = [
  // --- ANTIBIOTICS ---
  {
    id: 'airen-wh-01',
    name: 'Augmentin 625mg Tablets',
    strength: '625mg (Amoxicillin 500mg + Clavulanic Acid 125mg)',
    category: 'Antibiotics',
    manufacturer: 'GSK Pharmaceuticals',
    minForm: 'Min: Pack of 10',
    packType: 'pack',
    price: 42500,
    unitPrice: 4250,
    unitsPerPack: 10,
    stockCount: 64,
    depotLocation: 'Benin Depot • Bay A-12',
    lotNumber: 'LOT-AUG2408',
    expiryDate: '11/2026',
    nafdacReg: '04-2391',
    storageCondition: 'Store below 25°C dry place',
    activeIngredients: 'Amoxicillin Trihydrate + Potassium Clavulanate',
  },
  {
    id: 'airen-wh-02',
    name: 'Rocephin 1g IV/IM Vial',
    strength: '1g Powder for Injection + Water for Inj',
    category: 'Antibiotics',
    manufacturer: 'Roche Products Ltd',
    minForm: 'Min: Box of 10 Vials',
    packType: 'box',
    price: 58000,
    unitPrice: 5800,
    unitsPerPack: 10,
    stockCount: 36,
    depotLocation: 'Benin Depot • Bay A-14',
    lotNumber: 'LOT-ROC9912',
    expiryDate: '09/2026',
    nafdacReg: '04-0988',
    storageCondition: 'Store below 30°C protect from light',
    activeIngredients: 'Ceftriaxone Sodium Sterile',
  },
  {
    id: 'airen-wh-03',
    name: 'Ciprotab 500mg Caplets',
    strength: '500mg Ciprofloxacin HCl',
    category: 'Antibiotics',
    manufacturer: 'Fidson Healthcare Plc',
    minForm: 'Min: Pack of 10',
    packType: 'pack',
    price: 19500,
    unitPrice: 1950,
    unitsPerPack: 10,
    stockCount: 92,
    depotLocation: 'Benin Depot • Bay A-09',
    lotNumber: 'LOT-CPT2401',
    expiryDate: '01/2027',
    nafdacReg: '04-5112',
    storageCondition: 'Store in a cool dry place',
    activeIngredients: 'Ciprofloxacin Hydrochloride',
  },
  {
    id: 'airen-wh-04',
    name: 'Zithromax 500mg Tablets',
    strength: '500mg Azithromycin Dihydrate',
    category: 'Antibiotics',
    manufacturer: 'Pfizer Anglophone West Africa',
    minForm: 'Min: Pack of 5',
    packType: 'pack',
    price: 34000,
    unitPrice: 6800,
    unitsPerPack: 5,
    stockCount: 45,
    depotLocation: 'Benin Depot • Bay A-18',
    lotNumber: 'LOT-ZTH8831',
    expiryDate: '08/2026',
    nafdacReg: '04-1845',
    storageCondition: 'Store below 30°C',
    activeIngredients: 'Azithromycin USP',
  },
  {
    id: 'airen-wh-05',
    name: 'Ampiclox Neonatal Drops',
    strength: 'Ampicillin 60mg + Cloxacillin 30mg / 0.6ml',
    category: 'Antibiotics',
    manufacturer: 'Beecham Pharmaceuticals',
    minForm: 'Carton (24 Bottles)',
    packType: 'carton',
    price: 64800,
    unitPrice: 2700,
    unitsPerPack: 24,
    stockCount: 28,
    depotLocation: 'Benin Depot • Bay A-03',
    lotNumber: 'LOT-APX5540',
    expiryDate: '04/2026',
    nafdacReg: '04-0329',
    storageCondition: 'Store dry below 25°C',
    activeIngredients: 'Ampicillin + Cloxacillin Sodium',
  },

  // --- ANTIMALARIALS ---
  {
    id: 'airen-wh-06',
    name: 'Coartem 80/480mg Forte 6s',
    strength: 'Artemether 80mg + Lumefantrine 480mg',
    category: 'Antimalarials',
    manufacturer: 'Novartis Pharma Services',
    minForm: 'Min: Pack of 30',
    packType: 'pack',
    price: 78000,
    unitPrice: 2600,
    unitsPerPack: 30,
    stockCount: 80,
    depotLocation: 'Benin Depot • Bay M-02',
    lotNumber: 'LOT-CTM2407',
    expiryDate: '02/2027',
    nafdacReg: '04-3422',
    storageCondition: 'Store below 30°C',
    activeIngredients: 'Artemether + Lumefantrine',
  },
  {
    id: 'airen-wh-07',
    name: 'Lonart Forte Tablets',
    strength: 'Artemether 80mg + Lumefantrine 480mg',
    category: 'Antimalarials',
    manufacturer: 'Bliss GVS Pharma',
    minForm: 'Min: Pack of 20',
    packType: 'pack',
    price: 46000,
    unitPrice: 2300,
    unitsPerPack: 20,
    stockCount: 110,
    depotLocation: 'Benin Depot • Bay M-05',
    lotNumber: 'LOT-LNT3381',
    expiryDate: '06/2027',
    nafdacReg: '04-4901',
    storageCondition: 'Store below 30°C dry',
    activeIngredients: 'Artemether + Lumefantrine',
  },
  {
    id: 'airen-wh-08',
    name: 'Artesunate 60mg Injection Vials',
    strength: '60mg Powder + Sodium Bicarbonate Diluent',
    category: 'Antimalarials',
    manufacturer: 'Guilin Pharmaceutical / Fosun',
    minForm: 'Min: Box of 20 Vials',
    packType: 'box',
    price: 45000,
    unitPrice: 2250,
    unitsPerPack: 20,
    stockCount: 52,
    depotLocation: 'Benin Depot • Bay M-11',
    lotNumber: 'LOT-AST7720',
    expiryDate: '10/2026',
    nafdacReg: '04-6102',
    storageCondition: 'Store below 25°C protect from light',
    activeIngredients: 'Artesunate Sterile Powder',
  },
  {
    id: 'airen-wh-09',
    name: 'Artemether 80mg/ml Injection',
    strength: '80mg/ml Oily Ampoules (IM)',
    category: 'Antimalarials',
    manufacturer: 'Juhel Nigeria Ltd',
    minForm: 'Min: Box of 50 Ampoules',
    packType: 'box',
    price: 38500,
    unitPrice: 770,
    unitsPerPack: 50,
    stockCount: 44,
    depotLocation: 'Benin Depot • Bay M-14',
    lotNumber: 'LOT-ART9944',
    expiryDate: '12/2026',
    nafdacReg: '04-4320',
    storageCondition: 'Protect from sunlight, store below 25°C',
    activeIngredients: 'Artemether',
  },

  // --- ANALGESICS & PAIN ---
  {
    id: 'airen-wh-10',
    name: 'Cataflam 50mg Tablets',
    strength: '50mg Diclofenac Potassium Sugar-Coated',
    category: 'Analgesics & Pain',
    manufacturer: 'Novartis Consumer Health',
    minForm: 'Min: Pack of 10',
    packType: 'pack',
    price: 32500,
    unitPrice: 3250,
    unitsPerPack: 10,
    stockCount: 75,
    depotLocation: 'Benin Depot • Bay P-01',
    lotNumber: 'LOT-CAT2410',
    expiryDate: '07/2026',
    nafdacReg: '04-1229',
    storageCondition: 'Store below 25°C',
    activeIngredients: 'Diclofenac Potassium',
  },
  {
    id: 'airen-wh-11',
    name: 'Paracetamol 1000mg/100ml IV Infusion',
    strength: '10mg/ml (1g/100ml) Sterile Solution',
    category: 'Analgesics & Pain',
    manufacturer: 'Juhel Healthcare',
    minForm: 'Carton (20 Bottles)',
    packType: 'carton',
    price: 29000,
    unitPrice: 1450,
    unitsPerPack: 20,
    stockCount: 95,
    depotLocation: 'Benin Depot • Bay P-08',
    lotNumber: 'LOT-PCM8821',
    expiryDate: '05/2027',
    nafdacReg: '04-8930',
    storageCondition: 'Do not refrigerate or freeze',
    activeIngredients: 'Paracetamol IV Solution',
  },
  {
    id: 'airen-wh-12',
    name: 'Dynapar AQ 75mg/ml Injection',
    strength: '75mg/1ml Diclofenac Sodium Solution',
    category: 'Analgesics & Pain',
    manufacturer: 'Troikaa Pharmaceuticals',
    minForm: 'Min: Box of 25 Ampoules',
    packType: 'box',
    price: 24500,
    unitPrice: 980,
    unitsPerPack: 25,
    stockCount: 60,
    depotLocation: 'Benin Depot • Bay P-12',
    lotNumber: 'LOT-DYN6641',
    expiryDate: '11/2026',
    nafdacReg: '04-7711',
    storageCondition: 'Store below 25°C',
    activeIngredients: 'Diclofenac Sodium Aqueous',
  },
  {
    id: 'airen-wh-13',
    name: 'Tramadol 50mg/ml Injection (2ml)',
    strength: '100mg / 2ml Tramadol Hydrochloride',
    category: 'Analgesics & Pain',
    manufacturer: 'Hovid Berhad / Swiss Pharma',
    minForm: 'Min: Box of 50 Ampoules',
    packType: 'box',
    price: 48000,
    unitPrice: 960,
    unitsPerPack: 50,
    stockCount: 30,
    depotLocation: 'Benin Depot • Vault Sec-02',
    lotNumber: 'LOT-TRM2409',
    expiryDate: '08/2026',
    nafdacReg: '04-4012',
    storageCondition: 'Controlled Storage • Vault Log Required',
    activeIngredients: 'Tramadol Hydrochloride',
  },

  // --- INFUSIONS & INJECTABLES ---
  {
    id: 'airen-wh-14',
    name: 'Ringers Lactate 500ml Infusion',
    strength: 'Compound Sodium Lactate IV 500ml',
    category: 'Infusions & Injectables',
    manufacturer: 'Dana Pharmaceuticals / Juhel',
    minForm: 'Carton (24 Bottles)',
    packType: 'carton',
    price: 23500,
    unitPrice: 979,
    unitsPerPack: 24,
    stockCount: 140,
    depotLocation: 'Benin Depot • Bay F-01',
    lotNumber: 'LOT-RL2419',
    expiryDate: '03/2027',
    nafdacReg: '04-0104',
    storageCondition: 'Store between 15°C - 30°C',
    activeIngredients: 'Sodium Chloride, Potassium Chloride, Calcium Chloride, Sodium Lactate',
  },
  {
    id: 'airen-wh-15',
    name: 'Normal Saline 0.9% 500ml IV Infusion',
    strength: 'Sodium Chloride 0.9% w/v Sterile IV',
    category: 'Infusions & Injectables',
    manufacturer: 'Juhel Nigeria Ltd',
    minForm: 'Carton (24 Bottles)',
    packType: 'carton',
    price: 19800,
    unitPrice: 825,
    unitsPerPack: 24,
    stockCount: 165,
    depotLocation: 'Benin Depot • Bay F-02',
    lotNumber: 'LOT-NS2433',
    expiryDate: '04/2027',
    nafdacReg: '04-0108',
    storageCondition: 'Store between 15°C - 30°C',
    activeIngredients: 'Sodium Chloride 0.9% IV',
  },
  {
    id: 'airen-wh-16',
    name: 'Dextrose 5% in Water 500ml Infusion',
    strength: 'Glucose 5% w/v Isotonic Infusion',
    category: 'Infusions & Injectables',
    manufacturer: 'Dana Pharmaceuticals',
    minForm: 'Carton (24 Bottles)',
    packType: 'carton',
    price: 21600,
    unitPrice: 900,
    unitsPerPack: 24,
    stockCount: 90,
    depotLocation: 'Benin Depot • Bay F-05',
    lotNumber: 'LOT-DX5521',
    expiryDate: '02/2027',
    nafdacReg: '04-0115',
    storageCondition: 'Store below 30°C',
    activeIngredients: 'Dextrose Monohydrate 5%',
  },
  {
    id: 'airen-wh-17',
    name: 'Metronidazole 500mg/100ml IV Infusion',
    strength: '500mg / 100ml Infusion Bag/Bottle',
    category: 'Infusions & Injectables',
    manufacturer: 'Unique Pharmaceuticals',
    minForm: 'Carton (20 Bottles)',
    packType: 'carton',
    price: 26500,
    unitPrice: 1325,
    unitsPerPack: 20,
    stockCount: 78,
    depotLocation: 'Benin Depot • Bay F-09',
    lotNumber: 'LOT-MTZ2411',
    expiryDate: '10/2026',
    nafdacReg: '04-2290',
    storageCondition: 'Protect from direct light',
    activeIngredients: 'Metronidazole Infusion 0.5%',
  },

  // --- CONSUMABLES & SURGICAL ---
  {
    id: 'airen-wh-18',
    name: 'Surgical Gloves 7.5 Powder-Free Sterile',
    strength: 'Size 7.5 Latex Surgical Gloves (Pairs)',
    category: 'Consumables & Surgical',
    manufacturer: 'Medicorp International',
    minForm: 'Min: Box of 50 Pairs',
    packType: 'box',
    price: 28500,
    unitPrice: 570,
    unitsPerPack: 50,
    stockCount: 88,
    depotLocation: 'Benin Depot • Bay S-02',
    lotNumber: 'LOT-GLV9931',
    expiryDate: '12/2028',
    nafdacReg: '03-7741',
    storageCondition: 'Store away from ozone and heat sources',
    activeIngredients: 'Medical Grade Latex Sterile',
  },
  {
    id: 'airen-wh-19',
    name: 'Branula IV Cannula 20G with Injection Port',
    strength: '20 Gauge Pink IV Cannula with Wing & Port',
    category: 'Consumables & Surgical',
    manufacturer: 'Nipro Medical Healthcare',
    minForm: 'Min: Box of 100 Units',
    packType: 'box',
    price: 37000,
    unitPrice: 370,
    unitsPerPack: 100,
    stockCount: 65,
    depotLocation: 'Benin Depot • Bay S-06',
    lotNumber: 'LOT-CAN2409',
    expiryDate: '07/2028',
    nafdacReg: '03-5188',
    storageCondition: 'Dry place, sterile packaging intact',
    activeIngredients: 'PTFE / Polyurethane Catheter',
  },
  {
    id: 'airen-wh-20',
    name: 'IV Infusion Giving Sets (Vented + Filter)',
    strength: '20 drops/ml with Luer Lock & Air Vent',
    category: 'Consumables & Surgical',
    manufacturer: 'Sol-Millennium Healthcare',
    minForm: 'Carton (200 Sets)',
    packType: 'carton',
    price: 49500,
    unitPrice: 247,
    unitsPerPack: 200,
    stockCount: 42,
    depotLocation: 'Benin Depot • Bay S-11',
    lotNumber: 'LOT-GIV8830',
    expiryDate: '01/2029',
    nafdacReg: '03-8821',
    storageCondition: 'Sterile EO Gas Sterilization',
    activeIngredients: 'Medical Grade PVC Tubing',
  },
  {
    id: 'airen-wh-21',
    name: 'Absorbent Cotton Wool 500g BPC Roll',
    strength: '500g 100% Pure Bleached Cotton',
    category: 'Consumables & Surgical',
    manufacturer: 'Medplus Surgical Supplies',
    minForm: 'Min: Bale of 20 Rolls',
    packType: 'carton',
    price: 33000,
    unitPrice: 1650,
    unitsPerPack: 20,
    stockCount: 50,
    depotLocation: 'Benin Depot • Bay S-18',
    lotNumber: 'LOT-COT2410',
    expiryDate: '12/2029',
    nafdacReg: '03-1209',
    storageCondition: 'Keep dry and sealed',
    activeIngredients: '100% Absorbent Natural Cotton',
  },

  // --- OTC ---
  {
    id: 'airen-wh-22',
    name: 'Emzor Paracetamol Syrup 60ml',
    strength: '120mg / 5ml Strawberry Flavour',
    category: 'OTC',
    manufacturer: 'Emzor Pharmaceutical Industries',
    minForm: 'Carton (40 Bottles)',
    packType: 'carton',
    price: 22800,
    unitPrice: 570,
    unitsPerPack: 40,
    stockCount: 125,
    depotLocation: 'Benin Depot • Bay O-01',
    lotNumber: 'LOT-EMP2411',
    expiryDate: '06/2026',
    nafdacReg: '04-0231',
    storageCondition: 'Store below 25°C',
    activeIngredients: 'Paracetamol BP 120mg/5ml',
  },
  {
    id: 'airen-wh-23',
    name: 'Vitamin C 100mg Chewable (Jar)',
    strength: '100mg Ascorbic Acid Orange Tablets',
    category: 'OTC',
    manufacturer: 'Emzor Pharmaceutical Industries',
    minForm: 'Min: Jar of 1000 Tablets',
    packType: 'box',
    price: 15500,
    unitPrice: 15.5,
    unitsPerPack: 1000,
    stockCount: 95,
    depotLocation: 'Benin Depot • Bay O-04',
    lotNumber: 'LOT-VTC2402',
    expiryDate: '03/2027',
    nafdacReg: '04-0551',
    storageCondition: 'Keep container tightly closed',
    activeIngredients: 'Ascorbic Acid + Sodium Ascorbate',
  },
  {
    id: 'airen-wh-24',
    name: 'Andrews Liver Salt 5g Sachets',
    strength: 'Effervescent powder for antacid & laxative',
    category: 'OTC',
    manufacturer: 'GSK Consumer Healthcare',
    minForm: 'Min: Box of 50 Sachets',
    packType: 'box',
    price: 16800,
    unitPrice: 336,
    unitsPerPack: 50,
    stockCount: 70,
    depotLocation: 'Benin Depot • Bay O-08',
    lotNumber: 'LOT-ALS2412',
    expiryDate: '09/2026',
    nafdacReg: '04-0199',
    storageCondition: 'Store in dry place below 30°C',
    activeIngredients: 'Sodium Bicarbonate, Citric Acid, Magnesium Sulfate',
  },
  {
    id: 'airen-wh-25',
    name: 'Strepsils Honey & Lemon Lozenges',
    strength: 'Dichlorobenzyl alcohol 1.2mg + Amylmetacresol 0.6mg',
    category: 'OTC',
    manufacturer: 'Reckitt Benckiser',
    minForm: 'Min: Outer of 24 Packs (48 Lozenges)',
    packType: 'box',
    price: 29500,
    unitPrice: 1229,
    unitsPerPack: 24,
    stockCount: 55,
    depotLocation: 'Benin Depot • Bay O-12',
    lotNumber: 'LOT-STP2419',
    expiryDate: '11/2026',
    nafdacReg: '04-1883',
    storageCondition: 'Store below 25°C',
    activeIngredients: '2,4-Dichlorobenzyl alcohol + Amylmetacresol',
  }
];

const CATEGORIES = [
  'All Wholesale',
  'Antibiotics',
  'Antimalarials',
  'Analgesics & Pain',
  'Infusions & Injectables',
  'Consumables & Surgical',
  'OTC'
] as const;

type CategoryType = typeof CATEGORIES[number];

interface AirenB2BStorefrontProps {
  partnerSlug?: string;
  setView?: (view: string) => void;
}

export default function AirenB2BStorefront({
  partnerSlug = 'demo.airen',
  setView
}: AirenB2BStorefrontProps) {
  const router = useRouter();
  const {
    items: cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    getTotalPrice: getCartTotal
  } = useCart();

  // Component States
  const [products, setProducts] = useState<WholesaleProduct[]>(DEFAULT_WHOLESALE_PRODUCTS);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('All Wholesale');
  const [filterInStockOnly, setFilterInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'recommended' | 'priceLow' | 'priceHigh' | 'stockHigh'>('recommended');
  
  // UI Interaction States
  const [isPoDrawerOpen, setIsPoDrawerOpen] = useState(false);
  const [selectedProductDetail, setSelectedProductDetail] = useState<WholesaleProduct | null>(null);
  const [fulfillmentType, setFulfillmentType] = useState<'depot_pickup' | 'express_dispatch'>('express_dispatch');
  const [toast, setToast] = useState<string | null>(null);
  const [copiedPo, setCopiedPo] = useState(false);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  // Attempt to load external products from /api/products or partner info
  useEffect(() => {
    let isMounted = true;
    async function loadCatalog() {
      try {
        setLoading(true);
        const res = await fetch(`/api/products?slug=${encodeURIComponent(partnerSlug)}&limit=100`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.success && Array.isArray(data.data) && data.data.length > 0) {
            // Merge or map DB products
            const dbMapped: WholesaleProduct[] = data.data.map((item: any, idx: number) => {
              const price = item.amount || item.price || 28000;
              const unitCount = 10;
              return {
                id: item._id || item.id || `db-${idx}`,
                name: item.itemName || item.name || 'Wholesale Medicine',
                strength: item.strength || item.activeIngredient || 'Pharmaceutical Grade',
                category: (['Antibiotics', 'Antimalarials', 'Analgesics & Pain', 'Infusions & Injectables', 'Consumables & Surgical', 'OTC'].includes(item.category)
                  ? item.category
                  : 'Antibiotics') as WholesaleProduct['category'],
                manufacturer: item.manufacturer || item.brand || item.businessName || 'Verified Distributor',
                minForm: item.unit ? `Min: ${item.unit}` : 'Min: Pack of 10',
                packType: 'pack',
                price: price,
                unitPrice: Math.round(price / unitCount),
                unitsPerPack: unitCount,
                stockCount: item.quantity || 40,
                depotLocation: 'Benin Central Depot',
                lotNumber: `LOT-${Math.floor(100000 + Math.random() * 900000)}`,
                expiryDate: '12/2026',
                nafdacReg: item.nafdacNumber || '04-XXXX',
                storageCondition: 'Store below 30°C',
                activeIngredients: item.activeIngredient || '',
                image: item.imageUrl || item.image || '',
              };
            });
            // Combine with default catalog to ensure rich coverage across all required categories
            setProducts([...DEFAULT_WHOLESALE_PRODUCTS, ...dbMapped]);
          }
        }
      } catch (err) {
        console.warn('Using default wholesale catalog for Airen Depot:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadCatalog();
    return () => { isMounted = false; };
  }, [partnerSlug]);

  // Cart Helper functions
  const getItemCartQty = (productId: string): number => {
    const item = cart.find(i => i.id === productId);
    return item ? item.quantity : 0;
  };

  const handleSetQuantity = (product: WholesaleProduct, newQty: number) => {
    const safeQty = Math.max(0, newQty);
    const existing = cart.find(i => i.id === product.id);

    if (safeQty === 0) {
      if (existing) {
        removeFromCart(product.id);
        showToast(`Removed ${product.name} from wholesale cart`);
      }
      return;
    }

    if (!existing) {
      addToCart({
        id: product.id,
        name: `${product.name} (${product.minForm})`,
        price: product.price,
        image: product.image || '',
        activeIngredients: product.strength,
        drugClass: product.category,
        pharmacy: 'Airen Pharmacy & Wholesale Depot',
      });
      if (safeQty > 1) {
        setTimeout(() => updateQuantity(product.id, safeQty), 25);
      }
    } else {
      updateQuantity(product.id, safeQty);
    }
  };

  const handleBulkStep = (product: WholesaleProduct, step: number) => {
    const currentQty = getItemCartQty(product.id);
    const nextQty = currentQty + step;
    handleSetQuantity(product, nextQty);
    showToast(`Added +${step} ${product.minForm.replace('Min: ', '')} of ${product.name}`);
  };

  const handleStepDown = (product: WholesaleProduct) => {
    const currentQty = getItemCartQty(product.id);
    if (currentQty <= 0) return;
    handleSetQuantity(product, currentQty - 1);
  };

  // Filtered and Sorted Products
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      // Category filter
      if (selectedCategory !== 'All Wholesale' && product.category !== selectedCategory) {
        return false;
      }

      // In-stock toggle
      if (filterInStockOnly && product.stockCount <= 0) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = product.name.toLowerCase().includes(q);
        const matchesStrength = product.strength.toLowerCase().includes(q);
        const matchesMfr = product.manufacturer.toLowerCase().includes(q);
        const matchesCategory = product.category.toLowerCase().includes(q);
        const matchesNafdac = product.nafdacReg.toLowerCase().includes(q);
        const matchesLot = product.lotNumber.toLowerCase().includes(q);
        const matchesIngredients = product.activeIngredients.toLowerCase().includes(q);
        return matchesName || matchesStrength || matchesMfr || matchesCategory || matchesNafdac || matchesLot || matchesIngredients;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'priceLow') return a.price - b.price;
      if (sortBy === 'priceHigh') return b.price - a.price;
      if (sortBy === 'stockHigh') return b.stockCount - a.stockCount;
      return 0; // Default recommended order
    });
  }, [products, selectedCategory, filterInStockOnly, searchQuery, sortBy]);

  // Aggregate Cart Metrics
  const totalCartLines = cart.length;
  const totalCartUnits = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalCartValue = getCartTotal();

  // Checkout navigation
  const handleProceedToCheckout = () => {
    setIsPoDrawerOpen(false);
    if (setView) {
      setView('confirmOrder');
    } else {
      router.push(`/?view=confirmOrder&slug=${encodeURIComponent(partnerSlug)}`);
    }
  };

  // Generate WhatsApp Purchase Order Message for Benin Wholesale Desk
  const handleWhatsAppPoDispatch = () => {
    if (cart.length === 0) return;

    const itemsSummary = cart.map((item, idx) => 
      `${idx + 1}. *${item.name}*\n   Qty: ${item.quantity} packs/cartons @ ₦${item.price.toLocaleString()} = ₦${(item.quantity * item.price).toLocaleString()}`
    ).join('\n\n');

    const message = 
`*AIREN PHARMACY & WHOLESALE DEPOT - PURCHASE ORDER*
---------------------------------------
*Depot Hub:* Central Depot, Airport Rd, Benin City, Edo State
*Fulfillment Type:* ${fulfillmentType === 'depot_pickup' ? 'Self-Pickup at Benin Depot' : 'Priority Courier Dispatch (Edo / Delta)'}
*Date:* ${new Date().toLocaleDateString('en-GB')}

*ORDER ITEMS:*
${itemsSummary}

---------------------------------------
*Total Line Items:* ${totalCartLines}
*Total Units (Packs/Cartons):* ${totalCartUnits}
*Total Wholesale Amount:* ₦${totalCartValue.toLocaleString()}
---------------------------------------
Please confirm stock reservation and provide depot dispatch invoice.`;

    const phone = '2348033000000';
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/${phone}?text=${encoded}`, '_blank');
  };

  // Copy PO Text
  const handleCopyPoText = () => {
    const itemsSummary = cart.map((item, idx) => 
      `${idx + 1}. ${item.name} | Qty: ${item.quantity} | Total: ₦${(item.quantity * item.price).toLocaleString()}`
    ).join('\n');

    const text = 
`AIREN PHARMACY & WHOLESALE DEPOT - WHOLESALE PO
Date: ${new Date().toLocaleDateString('en-GB')}
Depot: Benin City Central Hub
Fulfillment: ${fulfillmentType === 'depot_pickup' ? 'Depot Self-Pickup' : 'Direct Dispatch'}

Items:
${itemsSummary}

Total Amount: ₦${totalCartValue.toLocaleString()}`;

    navigator.clipboard.writeText(text);
    setCopiedPo(true);
    showToast('Purchase Order summary copied to clipboard');
    setTimeout(() => setCopiedPo(false), 2500);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500 selection:text-white pb-36">
      {/* FLOATING TOAST NOTIFICATION */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900/95 backdrop-blur-md text-slate-100 border border-emerald-500/40 shadow-2xl rounded-xl px-4 py-3 flex items-center gap-3 text-xs sm:text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-200">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
          <span>{toast}</span>
        </div>
      )}

      {/* TOP NOTIFICATION & DEPOT DISPATCH TICKER */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 border-b border-emerald-800/30 text-xs py-2 px-4 sm:px-8 text-slate-300 flex items-center justify-between">
        <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-semibold text-emerald-400 tracking-wide uppercase text-[11px]">Depot Status:</span>
          <span className="text-slate-300 truncate">
            Benin Central Depot Active • Same-Day Dispatch across Edo & Delta for orders before 2:00 PM
          </span>
        </div>
        <div className="hidden md:flex items-center gap-6 text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> 100% NAFDAC Verified Batches
          </span>
          <span className="flex items-center gap-1">
            <Truck className="w-3.5 h-3.5 text-blue-400" /> Cold-Chain Compliant (2°C - 8°C)
          </span>
          <span className="flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5 text-slate-400" /> PCN Registered Wholesale Depot
          </span>
        </div>
      </div>

      {/* ENTERPRISE B2B HEADER */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-xl border-b border-slate-800/80 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            
            {/* BRANDING & CREDENTIALS */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                {/* Custom Depot Shield Logo */}
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-800 p-0.5 shadow-lg shadow-emerald-950/50 flex items-center justify-center">
                  <div className="w-full h-full bg-slate-950/40 rounded-[10px] flex items-center justify-center backdrop-blur-xs">
                    <Building2 className="w-6 h-6 text-emerald-300" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                      Airen Pharmacy & Wholesale Depot
                    </h1>
                  </div>

                  {/* Tier-1 Badge */}
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      <BadgeCheck className="w-3.5 h-3.5 text-emerald-400" />
                      Tier-1 Verified Distributor - Edo State
                    </span>
                    <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-slate-400">
                      <MapPin className="w-3 h-3 text-slate-500" /> Benin Central Hub (Airport Rd Corridor)
                    </span>
                  </div>
                </div>
              </div>

              {/* Mobile Cart Trigger */}
              <button
                onClick={() => setIsPoDrawerOpen(true)}
                className="lg:hidden relative p-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-slate-200 hover:text-emerald-400 transition-colors"
                aria-label="View Wholesale Cart"
              >
                <ShoppingCart className="w-5 h-5" />
                {totalCartUnits > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500 text-slate-950 shadow-md">
                    {totalCartUnits}
                  </span>
                )}
              </button>
            </div>

            {/* QUICK ACTIONS & WHOLESALE DESK */}
            <div className="flex items-center gap-3 justify-between sm:justify-end">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Wholesale Desk Hotline</span>
                <a 
                  href="tel:08033000000" 
                  className="text-xs font-semibold text-slate-200 hover:text-emerald-400 flex items-center justify-end gap-1"
                >
                  <Phone className="w-3 h-3 text-emerald-400" /> 0803 300 0000 / 0812 000 0000
                </a>
              </div>

              <button
                onClick={handleWhatsAppPoDispatch}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-300 transition-all flex items-center gap-1.5 shadow-sm"
              >
                <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Quick WhatsApp Order</span>
              </button>

              <button
                onClick={() => setIsPoDrawerOpen(true)}
                className="hidden lg:flex items-center gap-2.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-900/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <ShoppingCart className="w-4 h-4 text-slate-950" />
                <span>Wholesale Cart ({totalCartUnits})</span>
                <span className="w-1.5 h-1.5 rounded-full bg-slate-950/40"></span>
                <span>₦{totalCartValue.toLocaleString()}</span>
              </button>
            </div>
          </div>

          {/* SEARCH BAR & QUICK FILTERS */}
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-col md:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search wholesale active molecules, brands (e.g. Augmentin, Cataflam, Coartem), NAFDAC or pack form..."
                className="w-full pl-10 pr-10 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Sort & In-Stock Toggles */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilterInStockOnly(!filterInStockOnly)}
                className={`px-3 py-2 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition-colors ${
                  filterInStockOnly
                    ? 'bg-emerald-950/60 border-emerald-600 text-emerald-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Boxes className="w-3.5 h-3.5 text-emerald-400" />
                <span>In-Stock Only</span>
              </button>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-hidden focus:border-emerald-500"
              >
                <option value="recommended">Sort: Default</option>
                <option value="priceLow">Price: Low to High</option>
                <option value="priceHigh">Price: High to Low</option>
                <option value="stockHigh">Highest Depot Stock</option>
              </select>
            </div>
          </div>

          {/* CATEGORY FILTER CHIPS */}
          <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-emerald-600 text-slate-950 shadow-md shadow-emerald-900/40'
                      : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  {cat === 'All Wholesale' && <Boxes className="w-3 h-3" />}
                  {cat === 'Antibiotics' && <Pill className="w-3 h-3" />}
                  {cat === 'Antimalarials' && <Sparkles className="w-3 h-3" />}
                  {cat === 'Infusions & Injectables' && <Truck className="w-3 h-3" />}
                  <span>{cat}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* DEPOT TRUST & VALUE PROPOSITIONS STRIP */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-slate-900/60 border border-slate-800/90 rounded-2xl p-3 sm:p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-white">Tier-1 Guaranteed</h4>
              <p className="text-[11px] text-slate-400">Direct factory allocation batches</p>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/90 rounded-2xl p-3 sm:p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
              <Truck className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-white">Edo & Delta Logistics</h4>
              <p className="text-[11px] text-slate-400">Depot pickup or express van</p>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/90 rounded-2xl p-3 sm:p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
              <Boxes className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-white">Minimum Pack Sizing</h4>
              <p className="text-[11px] text-slate-400">Pack of 10s, Boxes, Full Cartons</p>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/90 rounded-2xl p-3 sm:p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-white">Instant PO Slip</h4>
              <p className="text-[11px] text-slate-400">Export purchase orders easily</p>
            </div>
          </div>
        </div>
      </section>

      {/* PRODUCT GRID SECTION */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <span>{selectedCategory}</span>
              <span className="text-xs font-normal text-slate-400">
                ({filteredProducts.length} wholesale catalog {filteredProducts.length === 1 ? 'item' : 'items'})
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Wholesale pricing reserved for registered pharmacies, hospitals, clinics & patent medicine vendors.
            </p>
          </div>

          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs text-emerald-400 hover:underline"
            >
              Clear filter
            </button>
          )}
        </div>

        {/* LOADING INDICATOR */}
        {loading && (
          <div className="py-16 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 border border-slate-800 text-xs text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              Synchronizing Airen Benin Depot inventory...
            </div>
          </div>
        )}

        {/* EMPTY STATE */}
        {!loading && filteredProducts.length === 0 && (
          <div className="py-16 text-center bg-slate-900/40 rounded-3xl border border-slate-800 p-8">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
              <Boxes className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-200">No wholesale lines matching your filter</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              We couldn&apos;t find any wholesale stock matching &quot;{searchQuery}&quot; in {selectedCategory}. Try adjusting your search term or browsing other categories.
            </p>
            <button
              onClick={() => { setSearchQuery(''); setSelectedCategory('All Wholesale'); }}
              className="mt-4 px-4 py-2 rounded-xl bg-emerald-600 text-slate-950 font-bold text-xs hover:bg-emerald-500 transition-colors"
            >
              Reset All Filters
            </button>
          </div>
        )}

        {/* PRODUCT TILES GRID */}
        {!loading && filteredProducts.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map((product) => {
              const cartQty = getItemCartQty(product.id);
              const isInCart = cartQty > 0;

              return (
                <div
                  key={product.id}
                  className={`relative flex flex-col justify-between rounded-2xl p-4 transition-all duration-200 ${
                    isInCart
                      ? 'bg-slate-900/90 border-2 border-emerald-500 shadow-lg shadow-emerald-950/40'
                      : 'bg-slate-900/70 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 shadow-md'
                  }`}
                >
                  {/* TOP ROW: BADGES & MANUFACTURER */}
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      {/* Minimum Sales Form Badge */}
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-extrabold uppercase tracking-wide bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        {product.minForm}
                      </span>

                      {/* Manufacturer Tag */}
                      <span className="text-[10px] font-semibold text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700/60 truncate max-w-[130px]" title={product.manufacturer}>
                        {product.manufacturer}
                      </span>
                    </div>

                    {/* PRODUCT NAME & STRENGTH */}
                    <div className="mb-2">
                      <h3 className="text-base font-bold text-white tracking-tight leading-snug line-clamp-2">
                        {product.name}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                        {product.strength}
                      </p>
                    </div>

                    {/* LOT & NAFDAC META BADGES */}
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mb-3 flex-wrap">
                      <span className="bg-slate-950 px-2 py-0.5 rounded-sm border border-slate-800">
                        NAFDAC: {product.nafdacReg}
                      </span>
                      <span className="bg-slate-950 px-2 py-0.5 rounded-sm border border-slate-800">
                        Lot: {product.lotNumber.replace('LOT-', '')}
                      </span>
                      <span className="text-slate-400">
                        Exp: {product.expiryDate}
                      </span>
                    </div>

                    {/* LIVE DEPOT STOCK INDICATOR */}
                    <div className="flex items-center justify-between bg-slate-950/70 rounded-xl px-3 py-2 border border-slate-800/80 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span className="text-[11px] font-semibold text-emerald-400">
                          In Stock at Benin Depot
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-slate-300">
                        {product.stockCount} {product.packType === 'carton' ? 'cartons' : 'packs'}
                      </span>
                    </div>

                    {/* WHOLESALE PRICE IN BOLD NAIRA */}
                    <div className="mb-4">
                      <div className="flex items-baseline gap-1.5 flex-wrap">
                        <span className="text-xl sm:text-2xl font-black text-white tracking-tight">
                          ₦{product.price.toLocaleString()}
                        </span>
                        <span className="text-xs font-semibold text-emerald-400">
                          / {product.minForm.replace('Min: ', '')}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        ≈ ₦{product.unitPrice.toLocaleString()} per unit in pack
                      </p>
                    </div>
                  </div>

                  {/* BOTTOM: BULK QUANTITY STEPPER & QUICK-ADD CHIPS */}
                  <div className="pt-2 border-t border-slate-800/80">
                    {/* Stepper with - and + */}
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <div className="flex items-center bg-slate-950 border border-slate-700/80 rounded-xl p-1 flex-1">
                        <button
                          type="button"
                          onClick={() => handleStepDown(product)}
                          disabled={cartQty === 0}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        
                        <div className="flex-1 text-center">
                          <span className="text-xs sm:text-sm font-black text-white">
                            {cartQty > 0 ? `${cartQty} in Cart` : '0 in Cart'}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleBulkStep(product, 1)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-slate-950 transition-colors"
                          aria-label="Add 1 pack"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Quick Details Trigger */}
                      <button
                        type="button"
                        onClick={() => setSelectedProductDetail(product)}
                        className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                        title="View Batch & Storage Details"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                    </div>

                    {/* BULK QUICK-ADD STEPPER PILLS (+1, +5, +10) */}
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleBulkStep(product, 1)}
                        className="py-1.5 px-2 rounded-lg text-xs font-bold bg-slate-800/90 hover:bg-emerald-600 text-slate-200 hover:text-slate-950 border border-slate-700/70 transition-all hover:scale-[1.02]"
                      >
                        +1
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBulkStep(product, 5)}
                        className="py-1.5 px-2 rounded-lg text-xs font-bold bg-slate-800/90 hover:bg-emerald-600 text-slate-200 hover:text-slate-950 border border-slate-700/70 transition-all hover:scale-[1.02]"
                      >
                        +5
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBulkStep(product, 10)}
                        className="py-1.5 px-2 rounded-lg text-xs font-bold bg-slate-800/90 hover:bg-emerald-600 text-slate-200 hover:text-slate-950 border border-slate-700/70 transition-all hover:scale-[1.02]"
                      >
                        +10
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* B2B FLOATING WHOLESALE CART SUMMARY BAR */}
      <aside 
        aria-label="Wholesale Cart Summary"
        className="fixed bottom-0 inset-x-0 z-40 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800 shadow-2xl transition-all duration-300"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            
            {/* LEFT: CART METRICS */}
            <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase font-bold tracking-wider text-slate-400">Wholesale Total:</span>
                    <span className="text-lg sm:text-xl font-black text-white">
                      ₦{totalCartValue.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <span>{totalCartLines} lines</span>
                    <span>•</span>
                    <span className="text-emerald-400 font-semibold">{totalCartUnits} wholesale units</span>
                    <span>•</span>
                    <span>Benin Depot Dispatch</span>
                  </div>
                </div>
              </div>

              {/* Mobile View Button */}
              <button
                onClick={() => setIsPoDrawerOpen(true)}
                className="sm:hidden px-3 py-2 rounded-xl bg-slate-800 text-slate-200 border border-slate-700 text-xs font-semibold"
              >
                Review PO
              </button>
            </div>

            {/* RIGHT: ACTIONS & CHECKOUT BUTTON */}
            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                onClick={() => setIsPoDrawerOpen(true)}
                className="hidden sm:flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>Review Wholesale PO</span>
              </button>

              <button
                onClick={handleProceedToCheckout}
                disabled={totalCartLines === 0}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 text-slate-950 disabled:text-slate-500 font-black text-xs sm:text-sm tracking-wide shadow-lg shadow-emerald-900/30 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:hover:scale-100"
              >
                <span>Proceed to Wholesale Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* WHOLESALE PURCHASE ORDER (PO) SLIDE-OUT DRAWER */}
      {isPoDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div 
            onClick={() => setIsPoDrawerOpen(false)}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs transition-opacity"
          />

          {/* Drawer Panel */}
          <div className="relative w-full max-w-xl bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col h-full z-10 animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white">Wholesale Purchase Order</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Airen Depot PO
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Review itemized packaging lines before checkout or dispatch.
                </p>
              </div>

              <button
                onClick={() => setIsPoDrawerOpen(false)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content: Cart Items */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {cart.length === 0 ? (
                <div className="py-16 text-center text-slate-400">
                  <ShoppingCart className="w-12 h-12 mx-auto text-slate-600 mb-2" />
                  <p className="text-sm font-semibold">Wholesale Cart is empty</p>
                  <p className="text-xs text-slate-500 mt-1">Add packs, boxes, or cartons from the catalog.</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800">
                    <span>Item & Packaging</span>
                    <span>Quantity & Total</span>
                  </div>

                  {cart.map((item) => {
                    return (
                      <div
                        key={item.id}
                        className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                            {item.name}
                          </h4>
                          <p className="text-[11px] text-emerald-400 mt-0.5">
                            ₦{item.price.toLocaleString()} / unit
                          </p>
                          <span className="text-[10px] text-slate-500">
                            Depot Stock Reserved
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          {/* Stepper */}
                          <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg">
                            <button
                              onClick={() => {
                                if (item.quantity <= 1) removeFromCart(item.id);
                                else updateQuantity(item.id, item.quantity - 1);
                              }}
                              className="px-2 py-1 text-slate-400 hover:text-white"
                            >
                              -
                            </button>
                            <span className="px-2.5 py-1 text-xs font-bold text-white">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="px-2 py-1 text-slate-400 hover:text-white"
                            >
                              +
                            </button>
                          </div>

                          <div className="text-right min-w-[75px]">
                            <span className="text-xs sm:text-sm font-black text-white">
                              ₦{(item.price * item.quantity).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* FULFILLMENT SELECTOR */}
                  <div className="mt-5 p-4 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
                      Fulfillment Method
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setFulfillmentType('express_dispatch')}
                        className={`p-2.5 rounded-lg text-left border transition-all ${
                          fulfillmentType === 'express_dispatch'
                            ? 'bg-emerald-950/40 border-emerald-500 text-white'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-bold text-xs">
                          <Truck className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Express Dispatch</span>
                        </div>
                        <span className="text-[10px] text-slate-400 mt-0.5 block">
                          Benin, Warri, Asaba courier
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setFulfillmentType('depot_pickup')}
                        className={`p-2.5 rounded-lg text-left border transition-all ${
                          fulfillmentType === 'depot_pickup'
                            ? 'bg-emerald-950/40 border-emerald-500 text-white'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-bold text-xs">
                          <Building2 className="w-3.5 h-3.5 text-blue-400" />
                          <span>Depot Self-Pickup</span>
                        </div>
                        <span className="text-[10px] text-slate-400 mt-0.5 block">
                          Airport Rd Hub (Free)
                        </span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer Summary & Actions */}
            {cart.length > 0 && (
              <div className="p-5 border-t border-slate-800 bg-slate-950/90 space-y-3">
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Total Pack/Box Units:</span>
                    <span className="text-white font-bold">{totalCartUnits} units</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Wholesale Subtotal:</span>
                    <span className="text-white font-bold">₦{totalCartValue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-base font-black text-white pt-2 border-t border-slate-800">
                    <span>Total Payable:</span>
                    <span className="text-emerald-400">₦{totalCartValue.toLocaleString()}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    onClick={handleCopyPoText}
                    className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    {copiedPo ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <FileSpreadsheet className="w-3.5 h-3.5 text-slate-400" />}
                    <span>{copiedPo ? 'Copied' : 'Copy PO Text'}</span>
                  </button>

                  <button
                    onClick={handleWhatsAppPoDispatch}
                    className="py-2.5 rounded-xl bg-emerald-950 hover:bg-emerald-900 border border-emerald-700/50 text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Send to WhatsApp</span>
                  </button>
                </div>

                <button
                  onClick={handleProceedToCheckout}
                  className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm tracking-wide shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
                >
                  <span>Proceed to Wholesale Checkout</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* QUICK PRODUCT DETAIL & BATCH MODAL */}
      {selectedProductDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            onClick={() => setSelectedProductDetail(null)}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs"
          />

          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl z-10 animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {selectedProductDetail.category}
                </span>
                <h3 className="text-xl font-bold text-white mt-1.5">
                  {selectedProductDetail.name}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedProductDetail.strength}
                </p>
              </div>

              <button
                onClick={() => setSelectedProductDetail(null)}
                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs bg-slate-950/80 p-4 rounded-2xl border border-slate-800 mb-5">
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Manufacturer:</span>
                <span className="text-white font-semibold">{selectedProductDetail.manufacturer}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Minimum Order Form:</span>
                <span className="text-emerald-400 font-bold">{selectedProductDetail.minForm}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Wholesale Price:</span>
                <span className="text-white font-black text-sm">₦{selectedProductDetail.price.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">NAFDAC Reg No:</span>
                <span className="text-white font-mono">{selectedProductDetail.nafdacReg}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Depot Batch / Lot:</span>
                <span className="text-white font-mono">{selectedProductDetail.lotNumber}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Expiry Date:</span>
                <span className="text-white font-semibold">{selectedProductDetail.expiryDate}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Storage Specification:</span>
                <span className="text-amber-300 font-medium">{selectedProductDetail.storageCondition}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Depot Location:</span>
                <span className="text-slate-200">{selectedProductDetail.depotLocation}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  handleBulkStep(selectedProductDetail, 1);
                  setSelectedProductDetail(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs tracking-wide transition-colors"
              >
                Add +1 {selectedProductDetail.minForm.replace('Min: ', '')} to Cart
              </button>
              <button
                onClick={() => setSelectedProductDetail(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-semibold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
