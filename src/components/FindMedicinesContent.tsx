'use client'

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCart } from '../contexts/CartContext';
import QRCode from 'qrcode';
import { event } from '../lib/gtag';
import { debounce } from 'lodash';
import styles from '../app/find-medicines/FindMedicines.module.css';

// --- CONFIGURATION --- //
const AVERAGE_TRAVEL_SPEED_KMH = 15;

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

export default function FindMedicinesContent({ setView, initialQuery }: { setView?: (view: string) => void; initialQuery?: string }) {
  const searchParams = useSearchParams();
  const slug = searchParams?.get('slug') || '';

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

  const itemsPerPage = 12;
  const { items: cart, addToCart, removeFromCart, updateQuantity, getTotalPrice: getCartTotal } = useCart(); 

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const isInitialLoad = useRef(true);

  const [pharmacyDetails, setPharmacyDetails] = useState<any>(null);
  const [isLoadingPharmacy, setIsLoadingPharmacy] = useState(false);

  const drugClasses = ['all', 'Cardiovascular', 'Diabetes', 'Antibiotic', 'Pain Relief', 'Respiratory', 'Skincare', 'Supplements'];

  const fetchMedicines = useCallback(debounce(async (page: number, search: string, filter: string, sort: string) => {
    if (medicines.length === 0) setIsLoading(true);
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
        let processed = data.data;

        if (search === '' && filter === 'all' && sort === 'recommended' && page === 1) {
            localStorage.setItem('cached_medicines', JSON.stringify(processed));
            localStorage.setItem('cached_pagination', JSON.stringify(data.pagination));
        }

        if (userLocation) {
          processed = data.data.map((m:any) => {
            if (m.pharmacyCoordinates) {
              const distance = haversineDistance(userLocation, m.pharmacyCoordinates);
              const travelTime = distance != null ? (distance / AVERAGE_TRAVEL_SPEED_KMH) * 60 : null;
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
        () => {}
      );
    }
  }, []);

  useEffect(() => {
    const cached = localStorage.getItem('cached_medicines');
    const cachedPag = localStorage.getItem('cached_pagination');
    if (cached && cachedPag) {
      try {
        setMedicines(JSON.parse(cached));
        setTotalPages(JSON.parse(cachedPag).totalPages);
        setTotalProducts(JSON.parse(cachedPag).totalProducts);
      } catch (e) {
        console.error("Cache parse error", e);
      }
    }
  }, []);

  useEffect(() => {
    if (!slug) {
      setPharmacyDetails(null);
      return;
    }
    const fetchPharmacy = async () => {
      setIsLoadingPharmacy(true);
      try {
        const res = await fetch(`/api/pharmacies/${slug}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setPharmacyDetails(data.pharmacy);
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
    const url = slug ? `https://${slug}.psx.ng` : 'https://psx.ng';
    QRCode.toDataURL(url, { margin: 1, color: { dark: '#000000', light: '#FFFFFF' } })
      .then(url => setQrCodeDataUrl(url))
      .catch(console.error);
  }, [slug]);

  const handleAddToCart = (medicine: any) => {
    event({ action: 'add_to_cart', category: 'ecommerce', label: medicine.name, value: medicine.price });
    addToCart(medicine);
    setToastMsg(`${medicine.name} added to order`);
    setTimeout(() => setToastMsg(''), 2000);
  };

  const cartItemCount = cart.reduce((total, item) => total + item.quantity, 0);

  return (
    <div className={styles.root}>
      {/* HEADER */}
      <header className={styles.header}>
        <div className={styles.headerInner} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
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
            <div className={styles.pharmacyBrand}>
              <div className={styles.pharmacyAvatar}>{slug && pharmacyDetails ? pharmacyDetails.businessName.charAt(0).toUpperCase() : 'PX'}</div>
              <div>
                <div className={styles.pharmacyName}>{slug && pharmacyDetails ? pharmacyDetails.businessName : 'PharmaStackX Catalog'}</div>
                <div className={styles.pharmacyMeta}>
                  <span className={styles.statusDot}></span>
                  {slug && pharmacyDetails ? `Open now ${userLocation ? '· Nearby' : ''}` : 'All pharmacies active'}
                </div>
              </div>
            </div>
          </div>
          <div className={styles.headerActions}>
            <button className={styles.btnCart} onClick={() => setIsCartOpen(true)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
              <span className={styles.cartCount}>{cartItemCount}</span>
            </button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className={styles.hero}>
        <div className={styles.heroPattern}></div>
        <div className={styles.heroGlow}></div>
        <div className={styles.heroInner}>
          <div className={styles.heroText}>
            <div className={styles.heroEyebrow}>{slug ? 'Verified pharmacy · psx.ng' : 'Search across all verified pharmacies'}</div>
            <h1 className={styles.heroTitle}>Your medicine,<br/><em>found.</em></h1>
            <p className={styles.heroSub}>Browse real-time inventory. Every medicine synced live. Order for pickup or delivery.</p>
          </div>
          {qrCodeDataUrl && (
            <div className={styles.qrCard}>
              <img src={qrCodeDataUrl} alt="Store QR Code" className={styles.qrImg} />
              <div className={styles.qrLabel}>Scan to visit</div>
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

      {/* MAIN */}
      <main className={styles.main}>



        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>All medicines</div>
          <div className={styles.sectionCount}>{totalProducts} items</div>
        </div>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>
        ) : error ? (
          <div style={{ textAlign: 'center', color: 'red', padding: '40px' }}>{error}</div>
        ) : medicines.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>No medicines found.</div>
        ) : (
          <div className={styles.productGrid}>
            {medicines.map(medicine => {
              const categoryLower = (medicine.drugClass || '').toLowerCase();
              let gradient = 'linear-gradient(135deg,#F3E5F5,#E1BEE7)';
              if (categoryLower.includes('cardio')) gradient = 'linear-gradient(135deg,#E8F5E9,#C8E6C9)';
              if (categoryLower.includes('diabet')) gradient = 'linear-gradient(135deg,#FFF8E1,#FFECB3)';
              if (categoryLower.includes('antibio')) gradient = 'linear-gradient(135deg,#FCE4EC,#F8BBD0)';
              if (categoryLower.includes('resp')) gradient = 'linear-gradient(135deg,#E0F7FA,#B2EBF2)';

              return (
                <div key={medicine.id} className={styles.productCard}>
                  <div className={styles.productImg} style={{ background: gradient }}>
                    {medicine.image ? (
                      <img src={medicine.image} alt={medicine.name} />
                    ) : (
                      <div className={styles.productImgIcon}>💊</div>
                    )}
                    {medicine.drugClass && (
                      <div className={styles.productCategoryTag}>{medicine.drugClass}</div>
                    )}
                  </div>
                  <div className={styles.productBody}>
                    <div className={styles.productName}>{medicine.name}</div>
                    <div className={styles.productStrength}>{medicine.activeIngredients || 'Standard'}</div>
                    
                    {medicine.distance != null && (
                      <div className={styles.lowStock}>
                        {medicine.travelTime?.toFixed(0)} mins ({medicine.distance?.toFixed(1)} km)
                      </div>
                    )}

                    <div className={styles.productFooter} style={{ marginTop: 'auto', paddingTop: '12px' }}>
                      <div className={styles.productPrice}>
                        {medicine.formattedPrice} <span>/ each</span>
                      </div>
                      <button 
                        className={styles.addBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddToCart(medicine);
                        }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </main>

      {/* FOOTER */}
      <footer className={styles.footer}>
        <div className={styles.footerBrand}>
          {slug && pharmacyDetails ? pharmacyDetails.businessName : 'PharmaStackX Catalog'}
        </div>
        <div className={styles.footerMeta}>
          {slug && pharmacyDetails?.professionalVerificationStatus === 'approved' ? 'Verified by PCN · ' : ''}Live inventory · Instant fulfillment
        </div>
      </footer>

      {/* CART DRAWER */}
      <div className={`${styles.overlay} ${isCartOpen ? styles.show : ''}`} onClick={() => setIsCartOpen(false)}></div>
      <div className={`${styles.cartDrawer} ${isCartOpen ? styles.open : ''}`}>
        <div className={styles.cartHeader}>
          <div className={styles.cartTitle}>Your order</div>
          <button className={styles.cartClose} onClick={() => setIsCartOpen(false)}>✕</button>
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
            <div className={styles.cartTotal}>
              <div className={styles.cartTotalLabel}>Total</div>
              <div className={styles.cartTotalAmount}>₦{getCartTotal().toLocaleString()}</div>
            </div>
            <button 
                className={styles.checkoutBtn}
                onClick={() => {
                  setIsCartOpen(false);
                  setView?.('confirmOrder');
                }}
            >
                Proceed to checkout →
            </button>
          </div>
        )}
      </div>

      {/* TOAST */}
      <div className={`${styles.toast} ${toastMsg ? styles.show : ''}`}>
        {toastMsg}
      </div>
    </div>
  );
}
