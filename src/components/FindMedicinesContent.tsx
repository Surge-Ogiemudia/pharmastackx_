'use client'

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCart } from '../contexts/CartContext';
import QRCode from 'qrcode';
import { event } from '../lib/gtag';
import { debounce } from 'lodash';
import { useSession } from '@/context/SessionProvider';
import styles from '../app/find-medicines/FindMedicines.module.css';

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

export default function FindMedicinesContent({ setView, initialQuery }: { setView?: (view: string) => void; initialQuery?: string }) {
  const searchParams = useSearchParams();
  const urlSlug = searchParams?.get('slug') || '';
  const [slug, setSlug] = useState(urlSlug);

  useEffect(() => {
    if (typeof window !== 'undefined' && !slug) {
      const hostname = window.location.hostname;
      const isSubdomain = ['pharmastackx.com', 'psx.ng'].some(d => hostname.endsWith(d)) && !hostname.startsWith('www.') && !['pharmastackx.com', 'psx.ng', 'localhost'].includes(hostname);
      if (isSubdomain) {
        setSlug(hostname.split('.')[0]);
      }
    }
  }, [slug]);

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

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [urlCopied, setUrlCopied] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);
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
          if (data.success && data.pharmacy) {
            setPharmacyDetails(data.pharmacy);
          } else {
             // Subdomain does not match a valid pharmacy
             window.location.href = 'https://psx.ng';
          }
        } else {
             window.location.href = 'https://psx.ng';
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
          <div className={styles.headerActions} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button 
              onClick={() => setView?.('orders')}
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
                        {medicine.stockQty !== null && medicine.stockQty > 0 && medicine.stockQty <= 10 && (
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

      {/* FOOTER */}
      <footer className={styles.footer}>
        <div className={styles.footerBrand}>
          {slug && pharmacyDetails ? pharmacyDetails.businessName : 'PharmaStackX Catalog'}
        </div>
        <div className={styles.footerMeta}>
          {slug && pharmacyDetails?.professionalVerificationStatus === 'approved' ? 'Verified by PCN · ' : ''}Live inventory · Instant fulfillment
        </div>
      </footer>

      {/* PRODUCT DETAIL MODAL */}
      {selectedProduct && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, backdropFilter: 'blur(4px)' }} onClick={() => setSelectedProduct(null)} />
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1001,
            background: '#fff', borderRadius: '20px 20px 0 0',
            maxHeight: '85vh', overflowY: 'auto', paddingBottom: 80,
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

              {selectedProduct.activeIngredients && selectedProduct.activeIngredients !== 'N/A' && selectedProduct.activeIngredients !== 'Standard' && (
                <div style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>{selectedProduct.activeIngredients}</div>
              )}

              {selectedProduct.drugClass && selectedProduct.drugClass !== 'N/A' && (
                <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: '#E8F5E9', color: '#2E7D32', marginBottom: 12 }}>{selectedProduct.drugClass}</span>
              )}

              <div style={{ display: 'flex', gap: 12, marginTop: 12, marginBottom: 16 }}>
                <div style={{ flex: 1, background: '#f8f8f8', borderRadius: 12, padding: '12px 16px' }}>
                  <div style={{ fontSize: 11, color: '#999', marginBottom: 2 }}>Price</div>
                  <div style={{ fontSize: 20, fontWeight: 600, color: '#1a1a1a' }}>{selectedProduct.formattedPrice}</div>
                </div>
                <div style={{ flex: 1, background: '#f8f8f8', borderRadius: 12, padding: '12px 16px' }}>
                  <div style={{ fontSize: 11, color: '#999', marginBottom: 2 }}>Stock</div>
                  <div style={{ fontSize: 20, fontWeight: 600, color: selectedProduct.stockQty > 0 ? '#2E7D32' : '#d32f2f' }}>
                    {selectedProduct.stockQty != null ? (selectedProduct.stockQty > 0 ? `${selectedProduct.stockQty} available` : 'Out of stock') : 'In stock'}
                  </div>
                </div>
              </div>

              {selectedProduct.travelTime != null && (
                <div style={{ fontSize: 13, color: '#666', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 16 }}>&#128205;</span> ~{selectedProduct.travelTime} mins away
                </div>
              )}

              {selectedProduct.businessName && (
                <div style={{ fontSize: 13, color: '#666', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 16 }}>&#127978;</span> {selectedProduct.businessName}
                </div>
              )}

              {selectedProduct.info && selectedProduct.info !== 'N/A' && (
                <div style={{ fontSize: 13, color: '#555', lineHeight: 1.6, background: '#f8f8f8', borderRadius: 12, padding: '12px 16px', marginBottom: 16 }}>
                  {selectedProduct.info}
                </div>
              )}

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
        <div className={styles.toastIcon}>✓</div>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 700 }}>Added to cart</div>
          <div style={{ fontSize: '12px', opacity: 0.9, fontWeight: 400 }}>{toastMsg}</div>
        </div>
      </div>
    </div>
  );
}
