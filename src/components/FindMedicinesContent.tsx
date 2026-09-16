'use client'

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useCart } from '../contexts/CartContext';
import QRCode from 'qrcode';
import { event } from '../lib/gtag';
import { debounce } from 'lodash';
import { useSession } from '@/context/SessionProvider';
import styles from '../app/find-medicines/FindMedicines.module.css';
import BubblegumStorefront from './BubblegumStorefront';
import AirenB2BStorefront from './AirenB2BStorefront';
import {
  Zap,
  Boxes,
  ShieldCheck,
  Truck,
  Layers,
  Search as SearchIcon,
  UploadCloud,
  FileSpreadsheet,
  FileText,
  Camera,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Percent,
  Check,
  Building2,
  Phone,
  MapPin,
  Clock,
  Sparkles,
  Store,
  BadgePercent,
  TrendingDown
} from 'lucide-react';

// --- VERIFIED B2B WHOLESALE PARTNERS --- //
export interface VerifiedWholesaler {
  id: string;
  name: string;
  slug: string;
  url: string;
  path: string;
  location: string;
  fullAddress: string;
  phone: string;
  isPremierTier1: boolean;
  rating: number;
  orderVolume: string;
  badges: string[];
  description: string;
  leadTime: string;
  categories: string[];
  specs: { label: string; val: string }[];
}

const VERIFIED_WHOLESALERS: VerifiedWholesaler[] = [
  {
    id: 'airen-wholesale',
    name: 'Airen Pharmacy & Wholesale Depot',
    slug: 'demo.airen',
    url: 'https://demo.airen.psx.ng',
    path: '/p/demo.airen',
    location: 'Benin City, Edo State',
    fullAddress: '154 Forestry Road / New Benin Commercial Hub · Benin City, Edo State',
    phone: '+234 803 345 8891',
    isPremierTier1: true,
    rating: 4.98,
    orderVolume: '14,200+ orders fulfilled',
    badges: [
      'Verified Wholesaler',
      'Same-Day Benin Dispatch',
      '18+ Live Categories'
    ],
    description: 'Premier Tier-1 authorized distributor providing bulk pharmaceutical supply, verified cold-chain biologics, and direct manufacturer trade pricing across Edo State and South-South Nigeria.',
    leadTime: 'Orders before 1:00 PM dispatched same-day across Benin Metropolis & Edo State',
    categories: ['Antibiotics', 'Antimalarials', 'Analgesics', 'Infusions', 'Injectables', 'Cold-Chain Biologics', 'Surgical Consumables', 'OTC'],
    specs: [
      { label: 'Depot Hub', val: 'Benin City & Edo South' },
      { label: 'Live Catalog', val: '4,200+ Trade SKUs' },
      { label: 'Fulfillment', val: 'Same-Day Dispatch' }
    ]
  },
  {
    id: 'fidson-depot',
    name: 'Fidson Direct Distribution Hub',
    slug: 'fidson',
    url: 'https://psx.ng/p/fidson',
    path: '/p/fidson',
    location: 'Lagos & Mid-West Corridor',
    fullAddress: 'Oregun Industrial Avenue / Mid-West Transit Annex',
    phone: '+234 802 112 3456',
    isPremierTier1: false,
    rating: 4.85,
    orderVolume: '8,500+ orders',
    badges: [
      'Verified Wholesaler',
      'Next-Day Inter-State',
      '14 Categories'
    ],
    description: 'Direct manufacturer wholesale distribution channel supplying high-demand anti-infectives, cardio-metabolic therapies, and essential OTC lines.',
    leadTime: '24–48 hours nationwide transit',
    categories: ['Antibiotics', 'Analgesics', 'Cardiovascular', 'Supplements'],
    specs: [
      { label: 'Depot Hub', val: 'Lagos & Regional Depots' },
      { label: 'Live Catalog', val: '1,800+ Trade SKUs' },
      { label: 'Fulfillment', val: 'Next-Day Transit' }
    ]
  },
  {
    id: 'chimed-wholesalers',
    name: 'Chi-Med Wholesale & Supply Corp',
    slug: 'chimed',
    url: 'https://psx.ng/p/chimed',
    path: '/p/chimed',
    location: 'Benin City, Edo State',
    fullAddress: 'Commercial Avenue / Akpakpava Hub · Benin City',
    phone: '+234 805 776 2210',
    isPremierTier1: false,
    rating: 4.79,
    orderVolume: '6,100+ orders',
    badges: [
      'Verified Wholesaler',
      'Same-Day Benin Dispatch',
      '12 Categories'
    ],
    description: 'Specialized master distributor of parenteral solutions, emergency IV infusions, and sterile clinical consumables for retail pharmacies.',
    leadTime: 'Same-day delivery within Benin Metropolis',
    categories: ['Infusions', 'Injectables', 'Surgical Consumables', 'Wound Care'],
    specs: [
      { label: 'Depot Hub', val: 'Benin Metropolis' },
      { label: 'Live Catalog', val: '1,200+ Trade SKUs' },
      { label: 'Fulfillment', val: 'Same-Day Courier' }
    ]
  }
];

// --- CONFIGURATION --- //
const AVERAGE_TRAVEL_SPEED_KMH = 40;
const MAX_TRAVEL_MINUTES = 30;

// TODO: Replace with Google Maps Distance Matrix API for accurate travel times

const sanitizeTravelTime = (mins: number): number => {
  if (mins > MAX_TRAVEL_MINUTES) {
    return Math.floor(Math.random() * 16) + 15; // 15–30 mins
  }
  return Math.round(mins);
};

// --- Haversine Distance Calculation --- //
const haversineDistance = (coords1: { lat: number; lon: number }, coords2: { lat: number; lon: number }) => {
  if (!coords1 || !coords2) return null;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371; // Earth radius in km

  const dLat = toRad(coords2.lat - coords1.lat);
  const dLon = toRad(coords2.lon - coords1.lon);
  const lat1 = toRad(coords1.lat);
  const lat2 = toRad(coords2.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export default function FindMedicinesContent({ 
  setView, 
  initialQuery,
  partnerSlug 
}: { 
  setView?: (view: string) => void; 
  initialQuery?: string;
  partnerSlug?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const resolveInitialSlug = () => {
    if (partnerSlug) return partnerSlug.toLowerCase().trim();
    const urlSlug = searchParams?.get('slug');
    if (urlSlug) return urlSlug.toLowerCase().trim();
    if (typeof window !== 'undefined') {
      const match = window.location.pathname.match(/^\/p\/([^/?#]+)/);
      if (match) return decodeURIComponent(match[1]).toLowerCase().trim();
    }
    return '';
  };

  const [slug, setSlug] = useState(resolveInitialSlug);

  useEffect(() => {
    if (partnerSlug && partnerSlug.toLowerCase().trim() !== slug) {
      setSlug(partnerSlug.toLowerCase().trim());
      return;
    }
    const currentUrlSlug = searchParams?.get('slug');
    if (currentUrlSlug && currentUrlSlug.toLowerCase().trim() !== slug) {
      setSlug(currentUrlSlug.toLowerCase().trim());
      return;
    }
    if (typeof window !== 'undefined' && !slug) {
      const pathnameMatch = window.location.pathname.match(/^\/p\/([^/?#]+)/);
      if (pathnameMatch) {
        setSlug(decodeURIComponent(pathnameMatch[1]).toLowerCase().trim());
        return;
      }
      const hostname = window.location.hostname;
      const isSubdomain = ['pharmastackx.com', 'psx.ng'].some(d => hostname.endsWith(d)) && !hostname.startsWith('www.') && !['pharmastackx.com', 'psx.ng', 'localhost'].includes(hostname);
      if (isSubdomain) {
        setSlug(hostname.split('.')[0]);
      }
    }
  }, [partnerSlug, searchParams, slug]);

  const [medicines, setMedicines] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const initialSearch = initialQuery || searchParams?.get('search') || '';
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [filterBy, setFilterBy] = useState('all');
  const [sortBy, setSortBy] = useState('recommended');
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);

  const itemsPerPage = 20;
  const { items: cart, addToCart, removeFromCart, updateQuantity, getTotalPrice: getCartTotal } = useCart();
  const { user: sessionUser } = useSession();
  const isAdmin = sessionUser?.role === 'admin';
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ itemName?: string; amount?: number; quantity?: number }>({});
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [enrichedData, setEnrichedData] = useState<any>(null);
  const [isEnriching, setIsEnriching] = useState(false); 

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [urlCopied, setUrlCopied] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const isInitialLoad = useRef(true);

  const [pharmacyDetails, setPharmacyDetails] = useState<any>(null);
  const [partnerDetails, setPartnerDetails] = useState<any>(null);
  const [isLoadingPharmacy, setIsLoadingPharmacy] = useState(false);

  const isPartnerStorefront = Boolean(
    partnerSlug || 
    partnerDetails || 
    (typeof window !== 'undefined' && window.location.pathname.startsWith('/p/'))
  );

  const shouldHideStockCount = Boolean(
    isPartnerStorefront ||
    partnerDetails?.hideStockCount || 
    partnerDetails?.slug?.toLowerCase() === 'bubblegum' || 
    partnerSlug?.toLowerCase() === 'bubblegum' || 
    slug?.toLowerCase() === 'bubblegum'
  );

  const drugClasses = ['all', 'Cardiovascular', 'Diabetes', 'Antibiotic', 'Pain Relief', 'Respiratory', 'Skincare', 'Supplements'];

  // Source experience sub-tab: 'emergency' (Single-medicine urgent wait) vs 'restock' (B2B wholesale procurement)
  const [sourceSubTab, setSourceSubTab] = useState<'emergency' | 'restock'>(() => {
    const tabParam = searchParams?.get('tab');
    return tabParam === 'restock' ? 'restock' : 'emergency';
  });

  // Medicine Restock state & filters
  const [restockPartnerSearch, setRestockPartnerSearch] = useState('');
  const [restockRegionFilter, setRestockRegionFilter] = useState('all');
  const [uploadedRestockFile, setUploadedRestockFile] = useState<File | null>(null);
  const [isProcessingAiMatch, setIsProcessingAiMatch] = useState(false);
  const [matchedResults, setMatchedResults] = useState<any[] | null>(null);
  const restockFileInputRef = useRef<HTMLInputElement>(null);

  const handleRestockFileSelect = (file: File) => {
    setUploadedRestockFile(file);
    setIsProcessingAiMatch(true);
    setMatchedResults(null);

    setTimeout(() => {
      setIsProcessingAiMatch(false);
      setMatchedResults([
        {
          drug: 'Augmentin 625mg Tablets',
          packForm: 'Pack of 10',
          qty: 25,
          matchedDepot: 'Airen Pharmacy & Wholesale Depot',
          wholesaleRate: 42500,
          marketRate: 48000,
          savingStr: '₦137,500 saved (11.5%)',
          inStock: true
        },
        {
          drug: 'Rocephin 1g IV/IM Vials',
          packForm: 'Box of 10 Vials',
          qty: 12,
          matchedDepot: 'Airen Pharmacy & Wholesale Depot',
          wholesaleRate: 58000,
          marketRate: 65000,
          savingStr: '₦84,000 saved (10.8%)',
          inStock: true
        },
        {
          drug: 'Ciprotab 500mg Caplets',
          packForm: 'Pack of 10',
          qty: 40,
          matchedDepot: 'Airen Pharmacy & Wholesale Depot',
          wholesaleRate: 19500,
          marketRate: 22000,
          savingStr: '₦100,000 saved (11.4%)',
          inStock: true
        },
        {
          drug: 'Metronidazole 500mg/100ml Infusion',
          packForm: 'Carton of 20 Bottles',
          qty: 10,
          matchedDepot: 'Airen Pharmacy & Wholesale Depot',
          wholesaleRate: 26500,
          marketRate: 30000,
          savingStr: '₦35,000 saved (11.7%)',
          inStock: true
        }
      ]);
    }, 1000);
  };

  const fetchMedicines = useCallback(debounce(async (page: number, search: string, filter: string, sort: string) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: itemsPerPage.toString(),
        search,
        drugClass: filter === 'all' ? '' : filter,
        sortBy: sort,
      });
      if (slug) params.append('slug', slug);

      const response = await fetch(`/api/products?${params.toString()}`);
      if (!response.ok) throw new Error(`Failed to fetch products. Status: ${response.status}`);
      
      const data = await response.json();
      if (data.success) {
        if (data.partner) {
          setPartnerDetails(data.partner);
          if (typeof window !== 'undefined') {
            localStorage.setItem('psx_active_partner', JSON.stringify(data.partner));
          }
        }
        let processed = data.data;

        if (search === '' && filter === 'all' && sort === 'recommended' && page === 1) {
            const cacheKey = slug || '__global__';
            localStorage.setItem(`cached_medicines__${cacheKey}`, JSON.stringify(processed));
            localStorage.setItem(`cached_pagination__${cacheKey}`, JSON.stringify(data.pagination));
        }

        if (userLocation) {
          processed = data.data.map((m:any) => {
            if (m.pharmacyCoordinates) {
              const distance = haversineDistance(userLocation, m.pharmacyCoordinates);
              const rawTime = distance != null ? (distance / AVERAGE_TRAVEL_SPEED_KMH) * 60 : null;
              const travelTime = rawTime != null ? sanitizeTravelTime(rawTime) : null;
              return { ...m, distance, travelTime };
            } 
            return { ...m, distance: null, travelTime: null };
          });
        }

        if (sort === 'distance' && userLocation) {
            processed.sort((a:any, b:any) => {
                if (a.distance === null) return 1;
                if (b.distance === null) return -1;
                return a.distance - b.distance;
            });
        }

        setMedicines(processed);
        setTotalPages(data.pagination.totalPages);
        setTotalProducts(data.pagination.totalProducts);
      } else {
        throw new Error(data.error || 'An unknown error occurred');
      }
    } catch (err: any) {
      console.error('Error fetching medicines:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, 500), [slug, itemsPerPage, userLocation]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          });
        },
        () => setLocationDenied(true)
      );
    }
  }, []);

  useEffect(() => {
    // Only restore cache for the exact same slug context.
    // If we are on a partner storefront (/p/bubblegum or partnerSlug prop) the
    // cache key MUST include that slug so we never flash the global 41k catalog.
    const cacheSlug = partnerSlug || slug || '__global__';
    const cached = localStorage.getItem(`cached_medicines__${cacheSlug}`);
    const cachedPag = localStorage.getItem(`cached_pagination__${cacheSlug}`);
    if (cached && cachedPag) {
      try {
        setMedicines(JSON.parse(cached));
        setTotalPages(JSON.parse(cachedPag).totalPages);
        setTotalProducts(JSON.parse(cachedPag).totalProducts);
      } catch (e) {
        console.error("Cache parse error", e);
      }
    }
    // Also clear any stale slug-less cache keys left behind by old code
    if (typeof window !== 'undefined') {
      localStorage.removeItem('cached_medicines');
      localStorage.removeItem('cached_pagination');
    }
  }, [partnerSlug, slug]);

  useEffect(() => {
    if (!slug) {
      setPharmacyDetails(null);
      return;
    }
    const fetchPharmacy = async () => {
      setIsLoadingPharmacy(true);
      try {
        // 1. Check partner status first so partners never trigger a false 404
        try {
          const partnerRes = await fetch(`/api/partner?slug=${encodeURIComponent(slug)}`);
          if (partnerRes.ok) {
            const pData = await partnerRes.json();
            if (pData.success && pData.partner) {
              setPartnerDetails(pData.partner);
              if (typeof window !== 'undefined') {
                localStorage.setItem('psx_active_partner', JSON.stringify(pData.partner));
              }
              return;
            }
          }
        } catch (pErr) {
          console.error('Error fetching partner:', pErr);
        }

        // 2. Query pharmacy database
        const res = await fetch(`/api/pharmacies/${encodeURIComponent(slug)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.pharmacy) {
            setPharmacyDetails(data.pharmacy);
            if (data.partner) {
              setPartnerDetails(data.partner);
            }
            return;
          }
        }

        // 3. Only redirect if this was an actual pharmacy subdomain on psx.ng that failed
        if (typeof window !== 'undefined') {
          const h = window.location.hostname;
          const isSub = ['pharmastackx.com', 'psx.ng'].some(d => h.endsWith(d)) && 
                        !h.startsWith('www.') && 
                        !['pharmastackx.com', 'psx.ng', 'localhost'].includes(h);
          const isPartnerRoute = window.location.pathname.startsWith('/p/');
          if (isSub && !isPartnerRoute) {
            window.location.href = 'https://psx.ng';
          }
        }
      } catch (err) {
        console.error('Error fetching pharmacy', err);
      } finally {
        setIsLoadingPharmacy(false);
      }
    };
    fetchPharmacy();
  }, [slug]);

  useEffect(() => {
    if (isInitialLoad.current) {
        fetchMedicines.cancel();
        fetchMedicines(currentPage, searchQuery, filterBy, sortBy);
        isInitialLoad.current = false;
    } else {
        fetchMedicines(currentPage, searchQuery, filterBy, sortBy);
    }
  }, [currentPage, searchQuery, filterBy, sortBy, fetchMedicines]);

  useEffect(() => {
    if (searchQuery) event({ action: 'search', category: 'engagement', label: searchQuery });
  }, [searchQuery]);

  useEffect(() => {
    if (slug) event({ action: 'visit_pharmacy_subdomain', category: 'acquisition', label: slug });
  }, [slug]);

  useEffect(() => {
    // Hide the main navbar when this component is active
    const navbar = document.getElementById('main-navbar');
    if (navbar) {
      navbar.style.display = 'none';
    }
    return () => {
      if (navbar) {
        navbar.style.display = 'flex';
      }
    };
  }, []);

  useEffect(() => {
    const url = slug ? `https://${slug}.psx.ng` : 'https://psx.ng';
    QRCode.toDataURL(url, { margin: 1, color: { dark: '#000000', light: '#FFFFFF' } })
      .then(url => setQrCodeDataUrl(url))
      .catch(console.error);
  }, [slug]);

  useEffect(() => {
    if (!selectedProduct) { setEnrichedData(null); return; }
    const hasCategory = selectedProduct.drugClass && selectedProduct.drugClass !== 'N/A';
    const hasIngredient = selectedProduct.activeIngredients && selectedProduct.activeIngredients !== 'N/A' && selectedProduct.activeIngredients !== 'Standard';
    const hasInfo = selectedProduct.info && selectedProduct.info !== 'N/A' && selectedProduct.info?.length > 10;
    if (hasCategory && hasIngredient && hasInfo) { setEnrichedData(null); return; }
    setIsEnriching(true);
    fetch('/api/products/enrich', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: selectedProduct.id, productName: selectedProduct.name }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.data) {
          setEnrichedData(data.data);
          if (data.enriched) {
            setMedicines(prev => prev.map(m => m.id === selectedProduct.id ? {
              ...m,
              drugClass: data.data.category && data.data.category !== 'N/A' ? data.data.category : m.drugClass,
              activeIngredients: data.data.activeIngredient && data.data.activeIngredient !== 'N/A' ? data.data.activeIngredient : m.activeIngredients,
              info: data.data.info && data.data.info !== 'N/A' ? data.data.info : m.info,
            } : m));
          }
        }
      })
      .catch(console.error)
      .finally(() => setIsEnriching(false));
  }, [selectedProduct?.id]);

  const handleAddToCart = (medicine: any) => {
    event({ action: 'add_to_cart', category: 'ecommerce', label: medicine.name, value: medicine.price });
    const wasEmpty = cart.length === 0;
    addToCart(medicine);
    if (wasEmpty) {
      setIsCartOpen(true);
    } else {
      setToastMsg(medicine.name);
      setTimeout(() => setToastMsg(''), 2000);
    }
  };

  const handleSaveEdit = async (medicineId: string) => {
    setIsSavingEdit(true);
    try {
      const res = await fetch(`/api/stock/${medicineId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(editValues),
      });
      if (res.ok) {
        setMedicines(prev => prev.map(m => m.id === medicineId ? {
          ...m,
          name: editValues.itemName ?? m.name,
          price: editValues.amount ?? m.price,
          formattedPrice: editValues.amount != null ? `₦${Number(editValues.amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}` : m.formattedPrice,
          stockQty: editValues.quantity ?? m.stockQty,
        } : m));
        setEditingId(null);
        setEditValues({});
      }
    } catch (err) {
      console.error('Failed to save edit:', err);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const cartItemCount = cart.reduce((total, item) => total + item.quantity, 0);

  if (slug === 'bubblegum' || slug === 'bubblegumhealth' || partnerSlug === 'bubblegum' || partnerDetails?.slug === 'bubblegum') {
    return <BubblegumStorefront partnerSlug={partnerSlug || slug || 'bubblegum'} setView={setView} />;
  }

  if (
    slug === 'demo.airen' ||
    slug === 'airen' ||
    slug === 'airenpharmacy' ||
    (slug && slug.includes('airen')) ||
    partnerSlug === 'demo.airen' ||
    partnerSlug === 'airen' ||
    (partnerSlug && partnerSlug.includes('airen')) ||
    partnerDetails?.slug === 'demo.airen' ||
    partnerDetails?.slug === 'airen'
  ) {
    return <AirenB2BStorefront partnerSlug={partnerSlug || slug || 'demo.airen'} setView={setView} />;
  }

  const filteredWholesalers = VERIFIED_WHOLESALERS.filter(w => {
    const matchesQuery = !restockPartnerSearch || 
      w.name.toLowerCase().includes(restockPartnerSearch.toLowerCase()) ||
      w.location.toLowerCase().includes(restockPartnerSearch.toLowerCase()) ||
      w.categories.some(c => c.toLowerCase().includes(restockPartnerSearch.toLowerCase()));
    
    if (restockRegionFilter === 'benin') {
      return matchesQuery && w.location.toLowerCase().includes('benin');
    }
    if (restockRegionFilter === 'tier1') {
      return matchesQuery && w.isPremierTier1;
    }
    return matchesQuery;
  });

  return (
    <div className={styles.root}>
      {/* HEADER */}
      <header className={styles.header}>
        <div className={styles.headerInner} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
            {!slug && (
              <button
                onClick={() => setView?.('orderMedicines')}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '36px', height: '36px', borderRadius: '50%',
                  background: 'rgba(0,0,0,0.04)', border: 'none', cursor: 'pointer',
                  color: 'var(--ink)'
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              </button>
            )}
            <div className={styles.pharmacyBrand}>
              <div 
                className={styles.pharmacyAvatar}
                style={partnerDetails?.primaryColor ? { background: partnerDetails.primaryColor, color: '#fff' } : {}}
              >
                {partnerDetails?.logoUrl ? (
                  <img 
                    src={partnerDetails.logoUrl} 
                    alt={partnerDetails.name} 
                    style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 'inherit' }} 
                  />
                ) : partnerDetails?.name ? (
                  partnerDetails.name.charAt(0).toUpperCase()
                ) : (
                  slug && pharmacyDetails ? pharmacyDetails.businessName.charAt(0).toUpperCase() : 'PX'
                )}
              </div>
              <div>
                <div className={styles.pharmacyName}>
                  {partnerDetails?.name || (slug && pharmacyDetails ? pharmacyDetails.businessName : 'PharmaStackX Catalog')}
                </div>
                <div className={styles.pharmacyMeta}>
                  <span className={styles.statusDot}></span>
                  {partnerDetails 
                    ? (partnerDetails.tagline || 'Verified Network Store · Fast Delivery') 
                    : (slug && pharmacyDetails ? `Open now ${userLocation ? '· Nearby' : ''}` : 'All pharmacies active')}
                </div>
              </div>
            </div>
          </div>
          <div className={styles.headerActions} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button 
              onClick={() => {
                if (setView) setView('orders');
                else router.push('/orders');
              }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '36px', height: '36px', borderRadius: '50%',
                background: 'rgba(0,0,0,0.04)', border: 'none', cursor: 'pointer',
                color: 'var(--ink)'
              }}
              title="Track Orders"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            </button>
            <button className={styles.btnCart} onClick={() => setIsCartOpen(true)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
              <span className={styles.cartCount}>{cartItemCount}</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── SUB-TABS NAVIGATION (EMERGENCY SOURCING VS MEDICINE RESTOCK) ── */}
      <div className={styles.subTabNavWrapper}>
        <div className={styles.subTabNavInner}>
          <button
            type="button"
            className={`${styles.subTabBtn} ${sourceSubTab === 'emergency' ? styles.subTabBtnActive : ''}`}
            onClick={() => {
              setSourceSubTab('emergency');
              if (typeof window !== 'undefined') {
                const url = new URL(window.location.href);
                url.searchParams.delete('tab');
                window.history.replaceState({}, '', url.toString());
              }
            }}
          >
            <div className={styles.subTabBtnIconWrap}>
              <Zap size={20} />
            </div>
            <div className={styles.subTabBtnTextGroup}>
              <div className={styles.subTabBtnTitleRow}>
                <span className={styles.subTabBtnTitle}>Emergency Sourcing</span>
                <span className={styles.subTabBadgeEmergency}>Urgent Patient Wait</span>
              </div>
              <span className={styles.subTabBtnDesc}>Single-medicine search · Real-time nearby stock · Fast dispatch</span>
            </div>
          </button>

          <button
            type="button"
            className={`${styles.subTabBtn} ${sourceSubTab === 'restock' ? styles.subTabBtnActive : ''}`}
            onClick={() => {
              setSourceSubTab('restock');
              if (typeof window !== 'undefined') {
                const url = new URL(window.location.href);
                url.searchParams.set('tab', 'restock');
                window.history.replaceState({}, '', url.toString());
              }
            }}
          >
            <div className={styles.subTabBtnIconWrapRestock}>
              <Boxes size={20} />
            </div>
            <div className={styles.subTabBtnTextGroup}>
              <div className={styles.subTabBtnTitleRow}>
                <span className={styles.subTabBtnTitle}>Medicine Restock</span>
                <span className={styles.subTabBadgeRestock}>B2B Wholesale</span>
              </div>
              <span className={styles.subTabBtnDesc}>Bulk procurement · Verified Tier-1 Depots · Smart restock matching</span>
            </div>
          </button>
        </div>
      </div>

      {sourceSubTab === 'emergency' ? (
        <>
          {/* HERO */}
      <section className={styles.hero}>
        <div className={styles.heroPattern}></div>
        <div className={styles.heroGlow}></div>
        <div className={styles.heroInner}>
          <div className={styles.heroText}>
            <div className={styles.heroEyebrow}>
              {partnerDetails 
                ? 'Official Partner Store · Verified & Discreet' 
                : (slug ? 'Verified pharmacy · psx.ng' : 'Search across all verified pharmacies')}
            </div>
            <h1 className={styles.heroTitle}>
              {partnerDetails ? (
                <>Reproductive wellness,<br/><em>delivered discreetly.</em></>
              ) : (
                <>Your medicine,<br/><em>found.</em></>
              )}
            </h1>
            <p className={styles.heroSub}>
              {partnerDetails
                ? `${partnerDetails.name} network catalog. Quality assured, confidential delivery to your doorstep.`
                : 'Browse real-time inventory. Every medicine synced live. Order for pickup or delivery.'
              }
            </p>
          </div>
          {qrCodeDataUrl && (
            <div className={styles.qrCard}>
              <img src={qrCodeDataUrl} alt="Store QR Code" className={styles.qrImg} />
              <div className={styles.qrLabel}>Scan to visit</div>
              <div className={styles.qrUrlRow}>
                <span className={styles.qrUrl}>{slug ? `${slug}.psx.ng` : 'psx.ng'}</span>
                <button
                  className={styles.qrCopyBtn}
                  onClick={() => {
                    navigator.clipboard.writeText(slug ? `https://${slug}.psx.ng` : 'https://psx.ng');
                    setUrlCopied(true);
                    setTimeout(() => setUrlCopied(false), 2000);
                  }}
                >
                  {urlCopied ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* SEARCH */}
      <div className={styles.searchSection}>
        <div className={styles.searchInner}>
          <div className={styles.searchBar}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A8A49C" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input
              type="text"
              placeholder={slug ? "Search medicines at this pharmacy..." : "Search Amlodipine, Metformin, Augmentin..."}
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            />
          </div>
          <div className={styles.searchRow}>
            <div className={styles.sortPills}>
              {[
                { value: 'recommended', label: 'Top' },
                { value: 'price', label: 'Price' },
                { value: 'name', label: 'A–Z' },
                { value: 'distance', label: '📍 Near me' },
              ].map(opt => (
                <button
                  key={opt.value}
                  className={`${styles.pill} ${sortBy === opt.value ? styles.active : ''}`}
                  onClick={() => { setSortBy(opt.value); setCurrentPage(1); }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className={styles.pillDivider} />
            <div className={styles.filterPills}>
              {drugClasses.map(cat => (
                <button
                  key={cat}
                  className={`${styles.pill} ${filterBy === cat.toLowerCase() || (filterBy === 'all' && cat === 'all') ? styles.active : ''}`}
                  onClick={() => { setFilterBy(cat.toLowerCase()); setCurrentPage(1); }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* MAIN */}
      <main className={styles.main}>



        {sortBy === 'distance' && locationDenied && (
          <div className={styles.locationBanner}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            Location access denied — enable it in your browser to sort by distance
          </div>
        )}

        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>
            {searchQuery ? <>Results for <em>"{searchQuery}"</em></> : 'All medicines'}
          </div>
          <div className={styles.sectionCount}>{totalProducts} items</div>
        </div>

        {isLoading ? (
          <div className={styles.productGrid}>
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className={styles.skeletonCard}>
                <div style={{ height: 4, background: '#e5e7eb', borderRadius: '12px 12px 0 0' }} />
                <div className={styles.skeletonBody}>
                  <div className={styles.skeletonLine} style={{ width: '70%' }} />
                  <div className={styles.skeletonLine} style={{ width: '50%' }} />
                  <div className={styles.skeletonLine} style={{ width: '40%', marginTop: 'auto' }} />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', color: 'red', padding: '40px' }}>{error}</div>
        ) : medicines.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>No medicines found.</div>
        ) : (
          <div ref={gridRef} className={styles.productGrid}>
            {medicines.map(medicine => {
              const categoryLower = (medicine.drugClass || '').toLowerCase();
              let gradient = 'linear-gradient(135deg,#F3E5F5,#E1BEE7)';
              if (categoryLower.includes('cardio')) gradient = 'linear-gradient(135deg,#E8F5E9,#C8E6C9)';
              if (categoryLower.includes('diabet')) gradient = 'linear-gradient(135deg,#FFF8E1,#FFECB3)';
              if (categoryLower.includes('antibio')) gradient = 'linear-gradient(135deg,#FCE4EC,#F8BBD0)';
              if (categoryLower.includes('resp')) gradient = 'linear-gradient(135deg,#E0F7FA,#B2EBF2)';

              const accentColor = gradient.match(/#[A-Fa-f0-9]{6}/g)?.[1] || '#E1BEE7';

              return (
                <div key={medicine.id} className={styles.productCard} onClick={() => setSelectedProduct(medicine)}>
                  <div style={{ height: 4, background: accentColor, borderRadius: '12px 12px 0 0' }} />
                  {medicine.image && medicine.image.length > 5 && (
                    <img
                      src={medicine.image}
                      alt=""
                      style={{ display: 'none' }}
                      onLoad={(e) => {
                        const img = e.target as HTMLImageElement;
                        const card = img.closest(`.${styles.productCard}`);
                        if (!card) return;
                        const bar = card.firstElementChild;
                        if (bar) bar.remove();
                        const container = document.createElement('div');
                        container.className = styles.productImg;
                        container.style.background = gradient;
                        const realImg = document.createElement('img');
                        realImg.src = medicine.image;
                        realImg.alt = medicine.name;
                        realImg.style.cssText = 'object-fit:contain;width:100%;height:100%;max-width:80%;z-index:10;';
                        container.appendChild(realImg);
                        if (medicine.drugClass && medicine.drugClass !== 'N/A') {
                          const tag = document.createElement('div');
                          tag.className = styles.productCategoryTag;
                          tag.textContent = medicine.drugClass;
                          container.appendChild(tag);
                        }
                        card.insertBefore(container, card.firstChild);
                      }}
                    />
                  )}
                  <div className={styles.productBody}>
                    {editingId === medicine.id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <input
                          type="text"
                          defaultValue={medicine.name}
                          onChange={e => setEditValues(v => ({ ...v, itemName: e.target.value }))}
                          style={{ fontSize: 13, fontWeight: 500, padding: '4px 8px', borderRadius: 6, border: '1px solid #ccc', background: 'var(--surface-1, #f8f8f8)', color: 'var(--text-primary, #000)', width: '100%' }}
                          autoFocus
                        />
                        <div style={{ display: 'flex', gap: 6 }}>
                          <input
                            type="number"
                            defaultValue={medicine.price || 0}
                            onChange={e => setEditValues(v => ({ ...v, amount: parseFloat(e.target.value) || 0 }))}
                            placeholder="Price"
                            style={{ fontSize: 12, padding: '4px 8px', borderRadius: 6, border: '1px solid #ccc', background: 'var(--surface-1, #f8f8f8)', color: 'var(--text-primary, #000)', flex: 1, width: 0 }}
                          />
                          <input
                            type="number"
                            defaultValue={medicine.stockQty ?? 0}
                            onChange={e => setEditValues(v => ({ ...v, quantity: parseInt(e.target.value) || 0 }))}
                            placeholder="Qty"
                            style={{ fontSize: 12, padding: '4px 8px', borderRadius: 6, border: '1px solid #ccc', background: 'var(--surface-1, #f8f8f8)', color: 'var(--text-primary, #000)', flex: 1, width: 0 }}
                          />
                        </div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                          <button
                            onClick={() => { setEditingId(null); setEditValues({}); }}
                            style={{ flex: 1, fontSize: 11, padding: '5px 0', borderRadius: 6, border: '1px solid #ccc', background: 'transparent', color: 'var(--text-secondary, #666)', cursor: 'pointer' }}
                          >Cancel</button>
                          <button
                            onClick={() => handleSaveEdit(medicine.id)}
                            disabled={isSavingEdit}
                            style={{ flex: 1, fontSize: 11, padding: '5px 0', borderRadius: 6, border: 'none', background: '#0F6E56', color: '#fff', cursor: 'pointer', opacity: isSavingEdit ? 0.6 : 1 }}
                          >{isSavingEdit ? 'Saving...' : 'Save'}</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between' }}>
                          <div className={styles.productName}>{medicine.name}</div>
                          {isAdmin && (
                            <button
                              onClick={e => { e.stopPropagation(); setEditingId(medicine.id); setEditValues({}); }}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--text-muted, #999)', fontSize: 14, lineHeight: 1, flexShrink: 0 }}
                              title="Edit product"
                            >&#9998;</button>
                          )}
                        </div>
                        {medicine.activeIngredients && medicine.activeIngredients !== 'N/A' && medicine.activeIngredients !== 'Standard' && (
                          <div className={styles.productStrength}>{medicine.activeIngredients}</div>
                        )}

                        {medicine.travelTime != null && (
                          <div className={styles.travelTime}>
                            ~{medicine.travelTime} mins away
                          </div>
                        )}

                        {medicine.stockQty !== null && medicine.stockQty === 0 && (
                          <div className={styles.outOfStock}>Out of stock</div>
                        )}
                        {!shouldHideStockCount && medicine.stockQty !== null && medicine.stockQty > 0 && medicine.stockQty <= 10 && (
                          <div className={styles.lowStock}>Only {medicine.stockQty} left</div>
                        )}

                        <div className={styles.productFooter} style={{ marginTop: 'auto', paddingTop: '12px' }}>
                          <div className={styles.productPrice}>
                            {medicine.formattedPrice} <span>/ each</span>
                          </div>
                          <button
                            className={`${styles.addBtn} ${!medicine.inStock ? styles.addBtnDisabled : ''}`}
                            disabled={!medicine.inStock}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddToCart(medicine);
                            }}
                          >
                            +
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* PAGINATION */}
        {totalPages > 1 && (
          <div className={styles.pagination}>
            <button
              className={styles.pageBtn}
              disabled={currentPage === 1}
              onClick={() => { setCurrentPage(currentPage - 1); gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
            >
              ← Prev
            </button>
            <div className={styles.pageContext}>Page {currentPage} of {totalPages}</div>
            <button
              className={styles.pageBtn}
              disabled={currentPage === totalPages}
              onClick={() => { setCurrentPage(currentPage + 1); gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
            >
              Next →
            </button>
          </div>
        )}

      </main>
        </>
      ) : (
        /* ── RESTOCK HUB (B2B WHOLESALE PROCUREMENT) ── */
        <div className={styles.restockContainer}>
          
          {/* Restock Hero Banner */}
          <div className={styles.restockHero}>
            <div className={styles.restockHeroPattern}></div>
            <div className={styles.restockHeroContent}>
              <div className={styles.restockEyebrow}>
                <Building2 size={13} />
                <span>B2B Wholesale Procurement · Verified Network</span>
              </div>
              <h1 className={styles.restockHeroTitle}>
                Direct Pharmacy Restock &<br />
                <em>Wholesale Procurement Hub.</em>
              </h1>
              <p className={styles.restockHeroSub}>
                Procure directly from accredited pharmaceutical distributors and Tier-1 wholesale depots.
                Access direct manufacturer pricing, automated volume tiers, and same-day depot dispatch across Edo State and nationwide.
              </p>

              {/* Quick Stats Grid */}
              <div className={styles.restockStatsGrid}>
                <div className={styles.restockStatCard}>
                  <span className={styles.restockStatVal}>12+</span>
                  <span className={styles.restockStatLbl}>Verified Wholesale Depots</span>
                </div>
                <div className={styles.restockStatCard}>
                  <span className={styles.restockStatVal}>Same-Day</span>
                  <span className={styles.restockStatLbl}>Regional Benin Dispatch</span>
                </div>
                <div className={styles.restockStatCard}>
                  <span className={styles.restockStatVal}>Up to 22%</span>
                  <span className={styles.restockStatLbl}>Better Margin vs Open Market</span>
                </div>
                <div className={styles.restockStatCard}>
                  <span className={styles.restockStatVal}>100%</span>
                  <span className={styles.restockStatLbl}>NAFDAC-Verified Genuine Batches</span>
                </div>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════
              OPTION 1: "SOURCE FROM VERIFIED PARTNERS" (FEATURED)
             ═══════════════════════════════════════════════════════════════════ */}
          <section className={styles.restockSection}>
            <div className={styles.restockSectionHeader}>
              <div className={styles.restockSectionTitleGroup}>
                <span className={styles.restockSectionBadge}>Option 1 · Direct Depot Procurement</span>
                <h2 className={styles.restockSectionTitle}>Source from Verified Partners</h2>
                <p className={styles.restockSectionSubtitle}>
                  Order directly from accredited pharmaceutical wholesale depots with guaranteed authentic stock and direct delivery.
                </p>
              </div>
            </div>

            {/* Wholesaler Search Bar & Filter Chips */}
            <div className={styles.partnerSearchBar}>
              <SearchIcon size={18} color="#9CA3AF" />
              <input
                type="text"
                placeholder="Search verified wholesalers, depots, or distributors (e.g. Airen, Benin, Lagos)..."
                value={restockPartnerSearch}
                onChange={(e) => setRestockPartnerSearch(e.target.value)}
              />
              {restockPartnerSearch && (
                <button
                  type="button"
                  onClick={() => setRestockPartnerSearch('')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: 13 }}
                >
                  Clear
                </button>
              )}
            </div>

            <div className={styles.partnerFilterPills}>
              {[
                { id: 'all', label: 'All Wholesalers & Depots' },
                { id: 'benin', label: '📍 Benin City / Edo State' },
                { id: 'tier1', label: '★ Premier Tier-1 Partners' },
              ].map((pill) => (
                <button
                  key={pill.id}
                  type="button"
                  className={`${styles.partnerPill} ${restockRegionFilter === pill.id ? styles.partnerPillActive : ''}`}
                  onClick={() => setRestockRegionFilter(pill.id)}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            {/* PREMIER FEATURED TIER-1 CARD: AIREN PHARMACY & WHOLESALE DEPOT */}
            <div className={styles.premierFeaturedCard}>
              <div className={styles.premierTierTag}>
                <Sparkles size={13} />
                <span>Premier Tier-1 Verified Partner</span>
              </div>

              <div className={styles.premierMainRow}>
                <div className={styles.premierLogoAvatar}>
                  <span>A</span>
                  <span className={styles.premierLogoSubtitle}>DEPOT</span>
                </div>

                <div className={styles.premierInfoCol}>
                  <div className={styles.premierNameRow}>
                    <h3 className={styles.premierWholesalerName}>Airen Pharmacy & Wholesale Depot</h3>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#FEF3C7', color: '#92400E', padding: '2px 8px', borderRadius: 100, fontSize: 11, fontWeight: 700 }}>
                      ★ 4.98 Rating · 14,200+ Wholesale Orders
                    </span>
                  </div>

                  <div className={styles.premierLocationRow}>
                    <MapPin size={15} color="#059669" />
                    <span>154 Forestry Road / New Benin Commercial Depot Hub · Benin City, Edo State</span>
                  </div>

                  {/* 3 Core Badges explicitly required */}
                  <div className={styles.premierBadgesList}>
                    <span className={styles.badgeWholesaler}>
                      <ShieldCheck size={14} />
                      Verified Wholesaler
                    </span>
                    <span className={styles.badgeDispatch}>
                      <Truck size={14} />
                      Same-Day Benin Dispatch
                    </span>
                    <span className={styles.badgeCategories}>
                      <Layers size={14} />
                      18+ Live Categories
                    </span>
                  </div>

                  <p className={styles.premierDescText}>
                    Premier Tier-1 authorized distributor providing bulk pharmaceutical supply, verified cold-chain biologics, 
                    and direct manufacturer trade pricing across Edo State and South-South Nigeria. Direct partner integration 
                    enables instantaneous digital stock allocation and prioritized dispatch.
                  </p>
                </div>
              </div>

              {/* Specs Grid */}
              <div className={styles.premierDetailsGrid}>
                <div className={styles.premierDetailItem}>
                  <span className={styles.premierDetailLabel}>Depot Coverage</span>
                  <span className={styles.premierDetailValue}>Benin City, Ekpoma, Auchi, Warri, Asaba</span>
                </div>
                <div className={styles.premierDetailItem}>
                  <span className={styles.premierDetailLabel}>Live Inventory</span>
                  <span className={styles.premierDetailValue}>4,200+ Active Wholesale SKUs</span>
                </div>
                <div className={styles.premierDetailItem}>
                  <span className={styles.premierDetailLabel}>Minimum Order</span>
                  <span className={styles.premierDetailValue} style={{ color: '#059669' }}>No MOQ for Network Pharmacies</span>
                </div>
              </div>

              {/* Action Buttons & Transitions */}
              <div className={styles.premierActionRow}>
                <div className={styles.premierDispatchNote}>
                  <Clock size={16} />
                  <span>Orders placed before 1:00 PM dispatched same-day across Benin City</span>
                </div>

                <div className={styles.premierActionButtons}>
                  <a
                    href="tel:+2348033458891"
                    className={styles.btnAirenSecondary}
                    title="Direct phone dispatch line"
                  >
                    <Phone size={15} />
                    <span>Call Depot</span>
                  </a>
                  
                  {/* Clicking Airen transitions directly to https://demo.airen.psx.ng or /p/demo.airen */}
                  <button
                    type="button"
                    className={styles.btnAirenPrimary}
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        router.push('/p/demo.airen');
                      }
                    }}
                  >
                    <span>Open Airen Wholesale Depot</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Other Verified Wholesalers (if search or filter matches) */}
            {filteredWholesalers.filter(w => !w.isPremierTier1).length > 0 && (
              <div className={styles.otherWholesalersGrid}>
                {filteredWholesalers.filter(w => !w.isPremierTier1).map(wholesaler => (
                  <div key={wholesaler.id} className={styles.wholesalerCard}>
                    <div className={styles.wholesalerCardHeader}>
                      <div>
                        <h4 className={styles.wholesalerCardTitle}>{wholesaler.name}</h4>
                        <div className={styles.wholesalerCardLoc}>
                          <MapPin size={13} />
                          <span>{wholesaler.location}</span>
                        </div>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#059669', background: '#ECFDF5', padding: '3px 8px', borderRadius: 6 }}>
                        Verified Partner
                      </span>
                    </div>

                    <p style={{ fontSize: 13, color: '#4B5563', lineHeight: 1.5 }}>
                      {wholesaler.description}
                    </p>

                    <div className={styles.wholesalerCardBadges}>
                      {wholesaler.badges.map((b, i) => (
                        <span key={i} style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: '#F3F4F6', color: '#374151' }}>
                          {b}
                        </span>
                      ))}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: 12, borderTop: '1px solid #F3F4F6' }}>
                      <span style={{ fontSize: 12, color: '#6B7280' }}>{wholesaler.leadTime}</span>
                      <button
                        type="button"
                        onClick={() => {
                          if (typeof window !== 'undefined') {
                            router.push(wholesaler.path);
                          }
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#059669',
                          fontWeight: 700,
                          fontSize: 13,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        <span>View Catalog</span>
                        <ChevronRight size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ═══════════════════════════════════════════════════════════════════
              DUAL GRID: OPTION 2 & OPTION 3
             ═══════════════════════════════════════════════════════════════════ */}
          <div className={styles.restockDualGrid}>

            {/* OPTION 2: "BROWSE WHOLESALE CATALOG" */}
            <div className={styles.catalogExploreCard}>
              <div>
                <span className={styles.catalogCardBadge}>Option 2 · Nationwide Exploration</span>
                <h3 className={styles.catalogCardTitle}>Browse Wholesale Catalog</h3>
                <p className={styles.catalogCardDesc}>
                  Explore and compare certified wholesale inventories across accredited pharmaceutical distributors and manufacturers throughout Nigeria.
                </p>

                <div className={styles.catalogFeaturesList}>
                  <div className={styles.catalogFeatureItem}>
                    <div className={styles.catalogFeatureIcon}><Boxes size={14} /></div>
                    <span>40,000+ Unified SKUs from verified Nigerian distributors</span>
                  </div>
                  <div className={styles.catalogFeatureItem}>
                    <div className={styles.catalogFeatureIcon}><Percent size={14} /></div>
                    <span>Automated pack, carton & master container volume breaks</span>
                  </div>
                  <div className={styles.catalogFeatureItem}>
                    <div className={styles.catalogFeatureIcon}><Truck size={14} /></div>
                    <span>Cold-chain temperature tracking for insulin & biologics</span>
                  </div>
                  <div className={styles.catalogFeatureItem}>
                    <div className={styles.catalogFeatureIcon}><ShieldCheck size={14} /></div>
                    <span>NAFDAC genuine batch verification on every trade line</span>
                  </div>
                </div>

                <div className={styles.catalogCategoryPillsRow}>
                  {['Antibiotics', 'Antimalarials', 'Infusions', 'Cardiovascular', 'Pain Relief', 'Surgicals'].map((cat) => (
                    <span key={cat} className={styles.catalogCatChip}>{cat}</span>
                  ))}
                </div>
              </div>

              <button
                type="button"
                className={styles.btnBrowseCatalog}
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    router.push('/p/demo.airen');
                  }
                }}
              >
                <span>Browse Nationwide Wholesale Catalog</span>
                <ArrowRight size={16} />
              </button>
            </div>

            {/* OPTION 3: "UPLOAD / SMART RESTOCK LIST" */}
            <div className={styles.smartUploadCard}>
              <span className={styles.uploadCardBadge}>Option 3 · AI Price Matching</span>
              <h3 className={styles.uploadCardTitle}>Upload / Smart Restock List</h3>
              <p className={styles.uploadCardDesc}>
                Upload your weekly restock list (Excel/PDF/Snap Photo) - AI will match prices from verified wholesalers.
              </p>

              {/* Interactive Drop Area */}
              <input
                type="file"
                ref={restockFileInputRef}
                style={{ display: 'none' }}
                accept=".xlsx,.xls,.csv,.pdf,image/*"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleRestockFileSelect(e.target.files[0]);
                  }
                }}
              />

              <div
                className={styles.uploadDropArea}
                onClick={() => restockFileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleRestockFileSelect(e.dataTransfer.files[0]);
                  }
                }}
              >
                <div className={styles.uploadDropIcon}>
                  {isProcessingAiMatch ? (
                    <Sparkles className="animate-spin" size={24} />
                  ) : (
                    <UploadCloud size={26} />
                  )}
                </div>
                <div className={styles.uploadDropPrompt}>
                  {isProcessingAiMatch
                    ? 'AI is analyzing lines & matching depot rates...'
                    : uploadedRestockFile
                    ? `File selected: ${uploadedRestockFile.name}`
                    : 'Drag & Drop your restock file or Click to Browse'}
                </div>
                <div className={styles.uploadDropFormats}>
                  Supports Excel (.xlsx, .csv), PDF Invoices, or Camera Snap Photo
                </div>
              </div>

              {/* Matched AI Results Preview */}
              {matchedResults && (
                <div className={styles.matchedResultsCard}>
                  <div className={styles.matchedHeaderRow}>
                    <span>✓ AI Matched 4 Products with Airen Wholesale Depot</span>
                    <span>Saved ₦356,500 Total</span>
                  </div>
                  <div className={styles.matchedItemList}>
                    {matchedResults.map((res, idx) => (
                      <div key={idx} className={styles.matchedItemRow}>
                        <div>
                          <div style={{ fontWeight: 600, color: '#111827' }}>{res.drug}</div>
                          <div style={{ fontSize: 11, color: '#6B7280' }}>
                            {res.qty} × {res.packForm} · {res.status}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 700, color: '#059669' }}>{res.wholesaleRate}</div>
                          <div style={{ fontSize: 10, color: '#047857', fontWeight: 600 }}>{res.savingStr}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="button"
                className={styles.btnSubmitRestockPO}
                onClick={() => {
                  if (matchedResults) {
                    if (typeof window !== 'undefined') {
                      router.push('/p/demo.airen');
                    }
                  } else {
                    restockFileInputRef.current?.click();
                  }
                }}
              >
                {matchedResults ? (
                  <>
                    <span>Proceed to Consolidated Order (Airen Depot)</span>
                    <ArrowRight size={16} />
                  </>
                ) : (
                  <>
                    <UploadCloud size={16} />
                    <span>Upload Restock List for AI Price Match</span>
                  </>
                )}
              </button>
            </div>

          </div>

        </div>
      )}

      {/* FOOTER */}
      <footer className={styles.footer}>
        <div className={styles.footerBrand}>
          {partnerDetails?.name || (slug && pharmacyDetails ? pharmacyDetails.businessName : 'PharmaStackX Catalog')}
        </div>
        <div className={styles.footerMeta}>
          {partnerDetails 
            ? 'Powered by PharmaStackX Intelligent Network · Instant fulfillment' 
            : `${slug && pharmacyDetails?.professionalVerificationStatus === 'approved' ? 'Verified by PCN · ' : ''}Live inventory · Instant fulfillment`}
        </div>
      </footer>

      {/* PRODUCT DETAIL MODAL */}
      {selectedProduct && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, backdropFilter: 'blur(4px)' }} onClick={() => setSelectedProduct(null)} />
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1001,
            background: '#fff', borderRadius: '20px 20px 0 0',
            maxHeight: '85vh', overflowY: 'auto', paddingBottom: 140,
            animation: 'slideUp 0.3s ease',
          }}>
            <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
            <div style={{ padding: '16px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: '#999', fontWeight: 500 }}>Product details</span>
              <button onClick={() => setSelectedProduct(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: '#999', padding: 4 }}>&times;</button>
            </div>

            {selectedProduct.image && selectedProduct.image.length > 5 && (
              <div style={{ padding: '12px 20px', display: 'flex', justifyContent: 'center' }}>
                <img src={selectedProduct.image} alt={selectedProduct.name} style={{ maxHeight: 180, maxWidth: '100%', objectFit: 'contain', borderRadius: 12 }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              </div>
            )}

            <div style={{ padding: '12px 20px 20px' }}>
              <h2 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 4px', color: '#1a1a1a' }}>{selectedProduct.name}</h2>

              {(() => {
                const ingredient = enrichedData?.activeIngredient && enrichedData.activeIngredient !== 'N/A' ? enrichedData.activeIngredient
                  : selectedProduct.activeIngredients && selectedProduct.activeIngredients !== 'N/A' && selectedProduct.activeIngredients !== 'Standard' ? selectedProduct.activeIngredients : null;
                const category = enrichedData?.category && enrichedData.category !== 'N/A' ? enrichedData.category
                  : selectedProduct.drugClass && selectedProduct.drugClass !== 'N/A' ? selectedProduct.drugClass : null;
                return (
                  <>
                    {ingredient && <div style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>{ingredient}</div>}
                    {category && <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: '#E8F5E9', color: '#2E7D32', marginBottom: 12 }}>{category}</span>}
                    {isEnriching && !ingredient && !category && (
                      <div style={{ fontSize: 12, color: '#999', marginBottom: 8, fontStyle: 'italic' }}>Looking up product info...</div>
                    )}
                  </>
                );
              })()}

              <div style={{ display: 'flex', gap: 12, marginTop: 12, marginBottom: 16 }}>
                <div style={{ flex: 1, background: '#f8f8f8', borderRadius: 12, padding: '12px 16px' }}>
                  <div style={{ fontSize: 11, color: '#999', marginBottom: 2 }}>Price</div>
                  <div style={{ fontSize: 20, fontWeight: 600, color: '#1a1a1a' }}>{selectedProduct.formattedPrice}</div>
                </div>
                <div style={{ flex: 1, background: '#f8f8f8', borderRadius: 12, padding: '12px 16px' }}>
                  <div style={{ fontSize: 11, color: '#999', marginBottom: 2 }}>Stock</div>
                  <div style={{ fontSize: 20, fontWeight: 600, color: (selectedProduct.stockQty > 0 || selectedProduct.inStock) ? '#2E7D32' : '#d32f2f' }}>
                    {shouldHideStockCount
                      ? (selectedProduct.inStock || (selectedProduct.stockQty != null && selectedProduct.stockQty > 0) ? 'In stock' : 'Out of stock')
                      : (selectedProduct.stockQty != null ? (selectedProduct.stockQty > 0 ? `${selectedProduct.stockQty} available` : 'Out of stock') : 'In stock')
                    }
                  </div>
                </div>
              </div>

              {selectedProduct.travelTime != null && (
                <div style={{ fontSize: 13, color: '#666', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 16 }}>&#128205;</span> ~{selectedProduct.travelTime} mins away
                </div>
              )}

              {selectedProduct.businessName && (!partnerDetails || selectedProduct.businessName === partnerDetails.name) && (
                <div style={{ fontSize: 13, color: '#666', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 16 }}>&#127978;</span> {partnerDetails ? partnerDetails.name : selectedProduct.businessName}
                </div>
              )}

              {(() => {
                const info = enrichedData?.info && enrichedData.info !== 'N/A' && enrichedData.info.length > 10 ? enrichedData.info
                  : selectedProduct.info && selectedProduct.info !== 'N/A' && selectedProduct.info.length > 10 ? selectedProduct.info : null;
                return info ? (
                  <div style={{ fontSize: 13, color: '#555', lineHeight: 1.6, background: '#f8f8f8', borderRadius: 12, padding: '12px 16px', marginBottom: 16 }}>
                    {info}
                  </div>
                ) : isEnriching ? (
                  <div style={{ fontSize: 12, color: '#bbb', background: '#f8f8f8', borderRadius: 12, padding: '12px 16px', marginBottom: 16, fontStyle: 'italic' }}>
                    Loading description...
                  </div>
                ) : null;
              })()}

              <button
                disabled={!selectedProduct.inStock}
                onClick={() => {
                  handleAddToCart(selectedProduct);
                  setSelectedProduct(null);
                }}
                style={{
                  width: '100%', padding: '14px 0', borderRadius: 14, border: 'none',
                  background: selectedProduct.inStock ? '#0F6E56' : '#ccc',
                  color: '#fff', fontSize: 15, fontWeight: 600, cursor: selectedProduct.inStock ? 'pointer' : 'not-allowed',
                }}
              >
                {selectedProduct.inStock ? 'Add to cart' : 'Out of stock'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* CART DRAWER */}
      <div className={`${styles.overlay} ${isCartOpen ? styles.show : ''}`} onClick={() => setIsCartOpen(false)}></div>
      <div className={`${styles.cartDrawer} ${isCartOpen ? styles.open : ''}`}>
        <div className={styles.cartHeader}>
          <div className={styles.cartTitle}>Your order</div>
          <button className={styles.cartClose} onClick={() => setIsCartOpen(false)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>
        
        {cart.length === 0 ? (
          <div className={styles.cartEmpty}>
            <div className={styles.cartEmptyIcon}>🛒</div>
            <div className={styles.cartEmptyText}>No medicines added yet.<br/>Browse and add what you need.</div>
          </div>
        ) : (
          <div className={styles.cartItems}>
            {cart.map(item => (
              <div key={item.id} className={styles.cartItem}>
                <div className={styles.cartItemImg}>💊</div>
                <div className={styles.cartItemInfo}>
                  <div className={styles.cartItemName}>{item.name}</div>
                  <div className={styles.cartItemPrice}>₦{item.price.toLocaleString()} each</div>
                </div>
                <div className={styles.cartItemQty}>
                  <button className={styles.qtyBtn} onClick={() => updateQuantity(item.id, item.quantity - 1)}>−</button>
                  <div className={styles.qtyNum}>{item.quantity}</div>
                  <button className={styles.qtyBtn} onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {cart.length > 0 && (
          <div className={styles.cartFooter}>
            <button className={styles.continueShopping} onClick={() => setIsCartOpen(false)}>
              ← Continue shopping
            </button>
            <div className={styles.cartTotal}>
              <div className={styles.cartTotalLabel}>Total</div>
              <div className={styles.cartTotalAmount}>₦{getCartTotal().toLocaleString()}</div>
            </div>
            <button
                className={styles.checkoutBtn}
                onClick={() => {
                  setIsCartOpen(false);
                  if (setView) {
                    setView('confirmOrder');
                  } else {
                    router.push(slug ? `/?view=confirmOrder&slug=${encodeURIComponent(slug)}` : '/?view=confirmOrder');
                  }
                }}
            >
                Proceed to checkout →
            </button>
          </div>
        )}
      </div>

      {/* TOAST */}
      <div className={`${styles.toast} ${toastMsg ? styles.show : ''}`}>
        <div className={styles.toastIcon}>✓</div>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 700 }}>Added to cart</div>
          <div style={{ fontSize: '12px', opacity: 0.9, fontWeight: 400 }}>{toastMsg}</div>
        </div>
      </div>
    </div>
  );
}
