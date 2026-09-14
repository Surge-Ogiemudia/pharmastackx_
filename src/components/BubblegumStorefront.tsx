'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/contexts/CartContext';

interface BubblegumStorefrontProps {
  partnerSlug?: string;
  setView?: (view: string) => void;
}

export default function BubblegumStorefront({ partnerSlug = 'bubblegum', setView }: BubblegumStorefrontProps) {
  const router = useRouter();
  const { items: cart, addToCart, removeFromCart, updateQuantity, getTotalPrice: getCartTotal } = useCart();

  const [partner, setPartner] = useState<any>({
    name: 'Bubblegum Health',
    slug: 'bubblegum',
    logoUrl: 'https://vestv.nyc3.cdn.digitaloceanspaces.com/Bubblegum.png',
    primaryColor: '#F43F5E',
    tagline: 'Expert Women’s Reproductive Health & Wellness',
    contactPhone: '07067593825',
    contactEmail: 'Business@bubblegum.health',
  });

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const categories = useMemo(() => [
    'all',
    'Contraceptive Kits',
    'Pain Relief',
    'Reproductive Health',
    'Supplements',
    'Skincare',
    'Antibiotic'
  ], []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Fetch partner profile & branding
  useEffect(() => {
    async function fetchPartner() {
      try {
        const res = await fetch(`/api/partner?slug=${encodeURIComponent(partnerSlug)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.partner) {
            setPartner(data.partner);
          }
        }
      } catch (err) {
        console.error('Failed to fetch partner info:', err);
      }
    }
    fetchPartner();
  }, [partnerSlug]);

  // Fetch partner catalog
  const fetchProducts = useCallback(async (query: string = '', category: string = 'all') => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        slug: partnerSlug,
        limit: '100',
      });
      if (query.trim()) params.append('search', query.trim());
      if (category !== 'all') params.append('drugClass', category);

      const res = await fetch(`/api/products?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setProducts(data.data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      setLoading(false);
    }
  }, [partnerSlug]);

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchProducts(searchQuery, activeCategory);
    }, 250);
    return () => clearTimeout(handler);
  }, [searchQuery, activeCategory, fetchProducts]);

  const handleAddToCart = (product: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    addToCart({
      id: product.id || product._id,
      name: product.name,
      price: product.price,
      image: product.image || 'https://via.placeholder.com/150',
      activeIngredients: product.activeIngredients || '',
      drugClass: product.category || '',
      pharmacy: partner.name || 'Bubblegum Health',
    });
    showToast(`Added "${product.name}" to cart`);
  };

  const handleCheckout = () => {
    setIsCartOpen(false);
    if (setView) {
      setView('confirmOrder');
    } else {
      router.push(`/?view=confirmOrder&slug=${encodeURIComponent(partnerSlug)}`);
    }
  };

  const cartTotalCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Check if item is already in cart
  const getCartItemQty = (productId: string) => {
    const found = cart.find(i => i.id === productId);
    return found ? found.quantity : 0;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-24">
      {/* FLOATING TOAST */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-semibold animate-fade-in border border-slate-700">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
          <span>{toast}</span>
        </div>
      )}

      {/* TOP NAVBAR (Mirrors Dashboard Header) */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* LEFT: BRAND INFO */}
          <div className="flex items-center gap-3 sm:gap-4">
            <div 
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-md overflow-hidden shrink-0"
              style={{ backgroundColor: partner.primaryColor || '#F43F5E' }}
            >
              {partner.logoUrl ? (
                <img src={partner.logoUrl} alt={partner.name} className="w-full h-full object-contain p-1.5" />
              ) : (
                partner.name.charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-slate-900">{partner.name}</h1>
              </div>
              <p className="text-xs text-slate-500 line-clamp-1">{partner.tagline || 'Expert Women’s Reproductive Health & Wellness'}</p>
            </div>
          </div>

          {/* RIGHT: STOREFRONT BADGE & CART BUTTON */}
          <div className="flex items-center gap-3">
            {partner.contactPhone && (
              <a
                href={`https://wa.me/234${partner.contactPhone.replace(/^0+/, '')}`}
                target="_blank"
                rel="noreferrer"
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition"
              >
                <span>💬</span>
                <span>Support</span>
              </a>
            )}

            <button
              onClick={() => setIsCartOpen(true)}
              className="px-4 py-2.5 bg-slate-900 hover:bg-rose-600 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <span>🛒 Order Bag</span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-rose-500 text-white">
                {cartTotalCount}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 space-y-6 sm:space-y-8">

        {/* HERO BANNER (Mirrors Dashboard Interactive Studio Banner) */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-6 relative overflow-hidden">
          <div className="space-y-3 max-w-2xl z-10">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-rose-500 text-white uppercase tracking-wider">
                Official Patient Store
              </span>
              <span className="text-xs text-slate-400">
                Verified Women&apos;s Health Catalog
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
              Confidential & Verified Women’s Healthcare Essentials
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Order genuine reproductive healthcare, emergency contraception, pain relief, and wellness essentials curated by {partner.name}. Delivered swiftly and privately to your door.
            </p>
          </div>

          <div className="bg-slate-800/80 backdrop-blur border border-slate-700 p-5 rounded-2xl flex flex-col items-center justify-center text-center space-y-2 min-w-[220px] z-10">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Live On Storefront</span>
            <span className="text-3xl font-extrabold text-rose-400">{products.length} Products</span>
            <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold pt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>In Stock & Ready to Dispatch</span>
            </div>
          </div>

          {/* Subtle background glow */}
          <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl pointer-events-none"></div>
        </div>

        {/* CATALOG & SEARCH CONTAINER (Mirrors Dashboard Master Inventory Card) */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
          
          {/* HEADER & SEARCH BAR */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Browse Curated Medications
              </h3>
              <p className="text-xs text-slate-500">
                Select products below to add directly to your order bag
              </p>
            </div>

            {/* SEARCH INPUT */}
            <div className="relative w-full sm:w-80">
              <span className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-slate-400 text-sm">
                🔍
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search medicines, ingredients..."
                className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* CATEGORY FILTER PILLS */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {categories.map((cat) => {
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {cat === 'all' ? 'All Medicines' : cat}
                </button>
              );
            })}
          </div>

          {/* PRODUCTS GRID (Mirrors Dashboard Tile Design) */}
          {loading ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-9 h-9 border-3 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs font-medium text-slate-500">Loading curated catalog...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="text-4xl">🛍️</div>
              <h4 className="text-sm font-bold text-slate-800">No matching medicines found</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {searchQuery ? `No results for "${searchQuery}". Try a different keyword.` : 'Check back shortly as new items are added to the shelf.'}
              </p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-xs font-bold text-rose-600 hover:underline pt-2"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
              {products.map((p) => {
                const qtyInCart = getCartItemQty(p.id || p._id);
                return (
                  <div
                    key={p.id || p._id}
                    onClick={() => setSelectedProduct(p)}
                    className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer"
                  >
                    <div>
                      {/* CARD TOP ROW */}
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-lg uppercase tracking-wider">
                          {p.category || 'Medicine'}
                        </span>
                        {p.POM && (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200/60">
                            Rx Required
                          </span>
                        )}
                      </div>

                      {/* TITLE (Mirrors bold uppercase style from dashboard) */}
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-rose-600 transition leading-snug line-clamp-2">
                        {p.name}
                      </h4>

                      {/* ACTIVE INGREDIENT */}
                      {p.activeIngredients && p.activeIngredients !== 'N/A' && (
                        <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                          <span>💊</span>
                          <span className="truncate">{p.activeIngredients}</span>
                        </p>
                      )}

                      {/* AVAILABILITY STATUS (Clean, no raw numbers) */}
                      <div className="mt-2.5 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        <span>In Stock</span>
                      </div>
                    </div>

                    {/* CARD FOOTER (Price & + Add Button) */}
                    <div className="pt-3 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div>
                        <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Price</div>
                        <div className="text-sm sm:text-base font-extrabold text-slate-900">
                          {p.formattedPrice || `₦${Number(p.price || 0).toLocaleString()}`}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => handleAddToCart(p, e)}
                        className={`text-xs font-bold px-3.5 py-2 rounded-xl transition shadow-xs cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                          qtyInCart > 0
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : 'bg-slate-900 hover:bg-rose-600 text-white'
                        }`}
                      >
                        {qtyInCart > 0 ? (
                          <>
                            <span>✓ Added</span>
                            <span className="bg-emerald-800/60 px-1.5 py-0.2 rounded-md text-[10px] font-extrabold">x{qtyInCart}</span>
                          </>
                        ) : (
                          <span>+ Add</span>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* PRODUCT DETAILS MODAL */}
      {selectedProduct && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setSelectedProduct(null)}
        >
          <div 
            className="bg-white w-full max-w-lg rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-8 space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg uppercase tracking-wider">
                  {selectedProduct.category || 'Medicine'}
                </span>
                <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 pt-1">
                  {selectedProduct.name}
                </h3>
                {selectedProduct.activeIngredients && (
                  <p className="text-xs text-slate-500 font-medium">
                    Active Ingredient: <strong className="text-slate-700">{selectedProduct.activeIngredients}</strong>
                  </p>
                )}
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-sm font-bold cursor-pointer transition"
              >
                ✕
              </button>
            </div>

            {selectedProduct.info && selectedProduct.info !== 'N/A' && (
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs text-slate-600 leading-relaxed max-h-40 overflow-y-auto">
                <p className="font-semibold text-slate-800 mb-1">Product Description / Usage:</p>
                {selectedProduct.info}
              </div>
            )}

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div>
                <span className="text-[11px] text-slate-400 font-semibold uppercase">Availability</span>
                <div className="text-xs font-bold text-emerald-600 flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>In stock & verified</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-slate-400 font-semibold uppercase">Retail Price</span>
                <div className="text-xl font-extrabold text-slate-900">
                  {selectedProduct.formattedPrice || `₦${Number(selectedProduct.price || 0).toLocaleString()}`}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  handleAddToCart(selectedProduct);
                  setSelectedProduct(null);
                }}
                className="flex-1 py-3 bg-slate-900 hover:bg-rose-600 text-white font-bold text-xs rounded-xl shadow transition cursor-pointer"
              >
                + Add to Order Bag
              </button>
              <button
                onClick={() => {
                  handleAddToCart(selectedProduct);
                  setSelectedProduct(null);
                  setIsCartOpen(true);
                }}
                className="py-3 px-5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow transition cursor-pointer"
              >
                Buy Now ⚡
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SLIDE-OVER ORDER BAG (CART DRAWER) */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div 
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-xs transition-opacity"
            onClick={() => setIsCartOpen(false)}
          ></div>

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white shadow-2xl border-l border-slate-200 flex flex-col justify-between">
              
              {/* DRAWER HEADER */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900">Your Order Bag</h3>
                  <p className="text-xs text-slate-500">{cartTotalCount} item(s) from {partner.name}</p>
                </div>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-sm font-bold cursor-pointer transition"
                >
                  ✕
                </button>
              </div>

              {/* DRAWER ITEMS LIST */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {cart.length === 0 ? (
                  <div className="py-20 text-center space-y-3">
                    <div className="text-4xl">🛍️</div>
                    <h4 className="text-sm font-bold text-slate-800">Your bag is empty</h4>
                    <p className="text-xs text-slate-500 max-w-xs mx-auto">
                      Explore our women&apos;s healthcare catalog and tap <strong className="text-slate-700">+ Add</strong> to begin.
                    </p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <h5 className="text-xs font-bold text-slate-900 truncate">
                          {item.name}
                        </h5>
                        <p className="text-xs font-semibold text-slate-700">
                          ₦{(item.price || 0).toLocaleString()} each
                        </p>
                      </div>

                      {/* QUANTITY CONTROLS */}
                      <div className="flex items-center gap-2">
                        <div className="flex items-center bg-white rounded-xl border border-slate-200 shadow-2xs">
                          <button
                            onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                            className="w-7 h-7 flex items-center justify-center text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-l-xl cursor-pointer"
                          >
                            −
                          </button>
                          <span className="w-7 text-center text-xs font-bold text-slate-800">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="w-7 h-7 flex items-center justify-center text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-r-xl cursor-pointer"
                          >
                            +
                          </button>
                        </div>

                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="w-7 h-7 flex items-center justify-center text-xs text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer transition"
                          title="Remove item"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* DRAWER FOOTER (CHECKOUT) */}
              {cart.length > 0 && (
                <div className="p-6 border-t border-slate-100 bg-slate-50 space-y-4">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Packaging & Privacy</span>
                    <span className="font-semibold text-emerald-600">100% Discreet & Sealed</span>
                  </div>
                  
                  <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                    <div>
                      <span className="text-xs font-semibold text-slate-500 uppercase">Subtotal</span>
                      <p className="text-[11px] text-slate-400">Delivery calculated at checkout</p>
                    </div>
                    <div className="text-xl font-extrabold text-slate-900">
                      ₦{getCartTotal().toLocaleString()}
                    </div>
                  </div>

                  <button
                    onClick={handleCheckout}
                    className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg transition cursor-pointer active:scale-98"
                  >
                    Proceed to Secure Checkout →
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
