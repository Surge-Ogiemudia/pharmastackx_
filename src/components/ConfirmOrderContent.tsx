'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CircularProgress,
  Alert,
  Box,
  Typography,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { DeleteOutline } from '@mui/icons-material';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from "next/dynamic";
import { useCart } from '../contexts/CartContext';
import { usePromo } from '../contexts/PromoContext';
import { useOrders } from '../contexts/OrderContext';
import { useSession } from '../context/SessionProvider';
import { event } from '../lib/gtag';
import { Business } from '@/types';
import './ConfirmOrder.css';
import PostPaymentFlow from './PostPaymentFlow';

const PaystackButton = dynamic(
  () => import("./PaystackButton"),
  { ssr: false }
);

interface Pharmacy {
  _id: string;
  name: string;
  address?: string;
  distance?: string; 
  rating?: number;
  orderCount?: number;
}

interface Quote {
  _id: string;
  pharmacy: Pharmacy;
  items: any[];
}

interface RequestData {
  _id: string;
  quotes: Quote[];
}

export interface CourierOption {
  courierId: string;
  courierName: string;
  courierImage?: string;
  serviceCode: string;
  serviceType: string;
  total: number;
  deliveryEta: string;
  pickupEta?: string;
  isCheapest?: boolean;
  isFastest?: boolean;
}

export default function ConfirmOrderContent({ setView }: { setView: (view: string) => void }) {
  const { items, updateQuantity, removeFromCart, clearCart, requestId, quoteId, fetchCartFromDB, initializeCart } = useCart();
  const { activePromo, applyPromo, removePromo, validatePromo, calculateDiscount } = usePromo();
  const { addOrder } = useOrders();
  const { user } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  if (!searchParams) {
    return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>;
  }

  // Sync with cloud on mount OR parse B2B URL params
  useEffect(() => {
    const action = searchParams?.get('action');
    if (action === 'checkout') {
      const itemName = searchParams.get('item');
      const priceStr = searchParams.get('price');
      const seller = searchParams.get('seller');
      
      if (itemName && priceStr && seller) {
        console.log("[ConfirmOrder] Initializing B2B Checkout Cart from URL");
        const price = parseFloat(priceStr) || 0;
        const b2bItem = {
          id: `b2b-${Date.now()}`,
          name: itemName,
          image: '',
          activeIngredients: 'Sourced from B2B',
          drugClass: 'B2B Item',
          price: price,
          pharmacy: seller,
          quantity: 1,
          isQuoteItem: false
        };
        // Initialize the cart locally and skip DB sync
        initializeCart([b2bItem], 'b2b-request', 'b2b-quote', true);
        return;
      }
    }

    if (user?._id) {
      console.log("[ConfirmOrder] Triggering fresh Cart sync from DB...");
      fetchCartFromDB();
    }
  }, [user?._id, fetchCartFromDB, searchParams, initializeCart]);

  // State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pharmacist, setPharmacist] = useState<Pharmacy | null>(null);
  
  const [postPaymentStatus, setPostPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [postPaymentMessage, setPostPaymentMessage] = useState('');
  const [showPostPaymentFlow, setShowPostPaymentFlow] = useState(false);
  const [completedRequestId, setCompletedRequestId] = useState<string | null>(null);
  const [completedPharmacyName, setCompletedPharmacyName] = useState<string | undefined>(undefined);
  const [promoCode, setPromoCode] = useState('');
  const [promoMessage, setPromoMessage] = useState('');
  const [deliveryOption, setDeliveryOption] = useState<'delivery' | 'pickup' | 'standard' | 'express'>('delivery');
  const [couriers, setCouriers] = useState<CourierOption[]>([]);
  const [selectedCourier, setSelectedCourier] = useState<CourierOption | null>(null);
  const [loadingRates, setLoadingRates] = useState(false);
  const [ratesError, setRatesError] = useState<string | null>(null);
  const [requestToken, setRequestToken] = useState<string | null>(null);
  const [isProcessingFreeOrder, setIsProcessingFreeOrder] = useState(false);

  // Form Fields
  const [patientName, setPatientName] = useState(() => (typeof window !== 'undefined' ? sessionStorage.getItem('psx_checkout_name') || '' : ''));
  const [patientAge, setPatientAge] = useState(() => (typeof window !== 'undefined' ? sessionStorage.getItem('psx_checkout_age') || '' : ''));
  const [patientCondition, setPatientCondition] = useState(() => (typeof window !== 'undefined' ? sessionStorage.getItem('psx_checkout_condition') || '' : ''));
  const [deliveryPhone, setDeliveryPhone] = useState(() => (typeof window !== 'undefined' ? sessionStorage.getItem('psx_checkout_phone') || '' : ''));
  const [deliveryEmail, setDeliveryEmail] = useState(() => (typeof window !== 'undefined' ? sessionStorage.getItem('psx_checkout_email') || '' : ''));
  const [deliveryAddress, setDeliveryAddress] = useState(() => (typeof window !== 'undefined' ? sessionStorage.getItem('psx_checkout_address') || '' : ''));
  const [deliveryCity, setDeliveryCity] = useState(() => (typeof window !== 'undefined' ? sessionStorage.getItem('psx_checkout_city') || '' : ''));
  const [deliveryState, setDeliveryState] = useState(() => (typeof window !== 'undefined' ? sessionStorage.getItem('psx_checkout_state') || '' : ''));

  // Persist form state
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('psx_checkout_name', patientName);
      sessionStorage.setItem('psx_checkout_age', patientAge);
      sessionStorage.setItem('psx_checkout_condition', patientCondition);
      sessionStorage.setItem('psx_checkout_phone', deliveryPhone);
      sessionStorage.setItem('psx_checkout_email', deliveryEmail);
      sessionStorage.setItem('psx_checkout_address', deliveryAddress);
      sessionStorage.setItem('psx_checkout_city', deliveryCity);
      sessionStorage.setItem('psx_checkout_state', deliveryState);
    }
  }, [patientName, patientAge, patientCondition, deliveryPhone, deliveryEmail, deliveryAddress, deliveryCity, deliveryState]);

  const [itemToRemove, setItemToRemove] = useState<string | null>(null);
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);

  const handleOpenRemoveDialog = (id: string) => {
    setItemToRemove(id);
    setIsRemoveDialogOpen(true);
  };

  const handleCloseRemoveDialog = () => {
    setIsRemoveDialogOpen(false);
    setItemToRemove(null);
  };

  const handleConfirmRemove = () => {
    if (itemToRemove) {
      removeFromCart(itemToRemove);
      handleCloseRemoveDialog();
    }
  };

  // Fetch Pharmacist Details
  useEffect(() => {
    const fetchRequestDetails = async () => {
      // Prioritize identifying the request from the URL if possible, or use Context
      const idFromUrl = searchParams?.get('requestId') || requestId;
      const qFromUrl = searchParams?.get('quoteId') || quoteId;
      
      if (!idFromUrl || !qFromUrl) return;
      
      try {
        const res = await fetch(`/api/requests/${idFromUrl}`);
        if (res.ok) {
          const data: RequestData = await res.json();
          const selectedQuote = data.quotes.find(q => q._id === quoteId);
          if (selectedQuote) {
            setPharmacist(selectedQuote.pharmacy);
          }
        }
      } catch (err) {
        console.error('Failed to fetch pharmacist details:', err);
      }
    };
    fetchRequestDetails();
  }, [requestId, quoteId]);

  // Pre-fill user data
  useEffect(() => {
    if (user) {
      setDeliveryEmail(user.email || '');
      setPatientName(user.username || '');
      
      const professionalRoles = ['clinic', 'pharmacy', 'pharmacist'];
      if (professionalRoles.includes(user.role)) {
        const businessUser = user as Business;
        if (businessUser.address) {
          setDeliveryPhone(businessUser.phone || '');
          setDeliveryAddress(businessUser.address.street || '');
          setDeliveryCity(businessUser.address.city || '');
          setDeliveryState(businessUser.address.state || '');
        }
      }
    }
  }, [user]);

  // Reveal Animations
  useEffect(() => {
    const timer = setTimeout(() => {
      document.querySelectorAll('.co-reveal').forEach(el => {
        el.classList.add('visible');
      });
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Validation
  const isAddressRequired = deliveryOption !== 'pickup';
  const isFormValid = useMemo(() => {
    return (
      patientName.trim() !== '' &&
      patientAge.trim() !== '' &&
      deliveryPhone.trim() !== '' &&
      deliveryEmail.trim() !== '' &&
      (!isAddressRequired || (
        deliveryAddress.trim() !== '' &&
        deliveryCity.trim() !== '' &&
        deliveryState.trim() !== ''
      ))
    );
  }, [patientName, patientAge, deliveryPhone, deliveryEmail, isAddressRequired, deliveryAddress, deliveryCity, deliveryState]);

  // Calculations
  const subtotal = useMemo(() => items.reduce((sum, item) => sum + (item.price * item.quantity), 0), [items]);
  const uniquePharmacies = useMemo(() => [...new Set(items.map(item => item.pharmacy))], [items]);
  const isSingleOrder = uniquePharmacies.length <= 1;
  const actualOrderType = isSingleOrder ? 'S' : 'MN';

  // Fetch live courier rates from Shipbubble
  const fetchCourierRates = useCallback(async (address: string, city: string, state: string) => {
    if (!address || address.trim().length < 3) return;
    setLoadingRates(true);
    setRatesError(null);
    try {
      const primaryPharmacy = uniquePharmacies[0] || (pharmacist ? pharmacist.name : 'PharmaStackX Central Hub');
      const res = await fetch('/api/shipping/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pharmacyName: primaryPharmacy,
          deliveryAddress: address,
          deliveryCity: city,
          deliveryState: state,
          recipientName: patientName,
          recipientPhone: deliveryPhone,
          recipientEmail: deliveryEmail,
          items: items.map(i => ({ name: i.name, quantity: i.quantity, price: i.price }))
        })
      });

      const data = await res.json();
      if (data.success && Array.isArray(data.couriers) && data.couriers.length > 0) {
        setCouriers(data.couriers);
        setRequestToken(data.requestToken || null);
        setSelectedCourier(prev => {
          if (prev && data.couriers.some((c: CourierOption) => c.courierId === prev.courierId)) {
            return data.couriers.find((c: CourierOption) => c.courierId === prev.courierId);
          }
          return data.cheapestCourier || data.couriers[0];
        });
      } else {
        setRatesError(data.message || 'Unable to fetch courier rates for this address.');
      }
    } catch (err: any) {
      console.error('Failed to fetch courier rates:', err);
      setRatesError('Failed to connect to courier network.');
    } finally {
      setLoadingRates(false);
    }
  }, [uniquePharmacies, pharmacist, patientName, deliveryPhone, deliveryEmail, items]);

  useEffect(() => {
    if (deliveryOption === 'pickup') return;
    if (!deliveryAddress || deliveryAddress.trim().length < 3) return;

    const timer = setTimeout(() => {
      fetchCourierRates(deliveryAddress, deliveryCity, deliveryState);
    }, 700);

    return () => clearTimeout(timer);
  }, [deliveryAddress, deliveryCity, deliveryState, deliveryOption, fetchCourierRates]);

  const getDeliveryFee = useCallback(() => {
    if (deliveryOption === 'pickup') return 0;
    if (selectedCourier) return selectedCourier.total;
    if (couriers.length > 0) return couriers[0].total;
    return 1500;
  }, [deliveryOption, selectedCourier, couriers]);

  const deliveryFee = getDeliveryFee();
  const sfcPercentage = deliveryOption === 'pickup' ? 25 : 20;
  const sfcAmount = subtotal * (sfcPercentage / 100);
  const { discountAmount, deliveryDiscount, sfcDiscount, finalTotal } = calculateDiscount(subtotal, deliveryFee, sfcAmount);
  const total = finalTotal;

  // Actions
  const handleApplyPromo = () => {
    if (!promoCode.trim()) return;
    const validation = validatePromo(promoCode, subtotal);
    if (!validation.valid) {
      setPromoMessage(validation.message);
      return;
    }
    const result = applyPromo(promoCode);
    setPromoMessage(result.message);
    if (result.success) setPromoCode('');
  };

  const createOrderFromCart = useCallback(async () => {
    setPostPaymentStatus('processing');
    setPostPaymentMessage('Payment successful. Creating your order, please wait...');

    if (!user) {
      setPostPaymentStatus('error');
      setPostPaymentMessage('Error: User session expired. Please log in again.');
      return;
    }

    const itemsForBackend = items.map(item => ({
      isQuoteItem: true,
      name: item.name,
      price: item.price,
      qty: item.quantity,
      image: item.image,
    }));

    const activePartnerSlug = searchParams?.get('partner') || searchParams?.get('slug') || (() => {
      try {
        const stored = typeof window !== 'undefined' ? localStorage.getItem('psx_active_partner') : null;
        return stored ? JSON.parse(stored).slug : undefined;
      } catch (e) { return undefined; }
    })();

    const orderData = {
      patientName, patientAge, patientCondition,
      deliveryEmail, deliveryPhone, deliveryCity, deliveryState,
      items: itemsForBackend,
      coupon: activePromo?.code,
      deliveryOption: deliveryOption === 'pickup' ? 'pickup' : (selectedCourier ? selectedCourier.courierName : 'courier'),
      orderType: actualOrderType,
      businesses: uniquePharmacies,
      requestId,
      quoteId,
      patientPhone: deliveryPhone,
      deliveryAddress,
      partnerSlug: activePartnerSlug,
      courierName: selectedCourier ? selectedCourier.courierName : (deliveryOption === 'pickup' ? 'Pickup' : 'Standard Courier'),
      courierId: selectedCourier?.courierId,
      courierLogo: selectedCourier?.courierImage,
      deliveryFee: deliveryFee,
      shipbubbleRequestToken: requestToken || undefined,
    };
    
    const result = await addOrder(orderData);

    if (result.success) {
      const capturedRequestId = requestId;
      const capturedPharmacyName = uniquePharmacies[0];
      if (capturedRequestId) {
        fetch(`/api/requests/${capturedRequestId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'confirm-request',
            patientPhone: deliveryPhone,
            deliveryAddress: [deliveryAddress, deliveryCity, deliveryState].filter(Boolean).join(', '),
            state: deliveryState,
          }),
        }).catch(err => console.error('Failed to confirm request:', err));
      }

      clearCart();
      removePromo();
      router.replace(window.location.pathname, { scroll: false });
      setPostPaymentStatus('idle');
      setCompletedRequestId(capturedRequestId ?? null);
      setCompletedPharmacyName(capturedPharmacyName);
      setShowPostPaymentFlow(true);
    } else {
      setPostPaymentStatus('error');
      setPostPaymentMessage(`Order creation failed: ${result.message}`);
      router.replace(window.location.pathname, { scroll: false });
    }
  }, [user, items, patientName, patientAge, patientCondition, deliveryEmail, deliveryPhone, deliveryAddress, deliveryCity, deliveryState, activePromo, deliveryOption, actualOrderType, uniquePharmacies, requestId, quoteId, addOrder, clearCart, removePromo, router, selectedCourier, deliveryFee, requestToken, searchParams]);

  useEffect(() => {
    const status = searchParams?.get('redirect_status');
    if (status === 'success' && postPaymentStatus === 'idle' && items.length > 0) {
      createOrderFromCart();
    }
  }, [searchParams, postPaymentStatus, items.length, createOrderFromCart]);


  const isReturningFromPayment = searchParams?.get('redirect_status') === 'success';

  if (items.length === 0 && postPaymentStatus === 'idle' && !showPostPaymentFlow) {
    if (isReturningFromPayment) {
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 2 }}>
          <CircularProgress />
          <Typography variant="body2" color="text.secondary">Processing your payment...</Typography>
        </Box>
      );
    }
    return (
      <div className="co-container" style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px'}}>
        <Typography variant="h6" sx={{ mb: 2 }}>Your cart is empty</Typography>
        <button className="co-proceed-btn" onClick={() => setView('home')} style={{maxWidth: '300px'}}>Return Home</button>
      </div>
    );
  }

  return (
    <div className="co-container">
      {showPostPaymentFlow && (
        <PostPaymentFlow
          requestId={completedRequestId}
          deliveryOption={deliveryOption}
          deliveryState={deliveryState}
          patientName={patientName}
          total={total}
          items={items.map(i => ({ name: i.name, qty: i.quantity, price: i.price }))}
          pharmacyName={completedPharmacyName}
          onDone={() => { setShowPostPaymentFlow(false); setView('orderManagement'); }}
        />
      )}

      {/* POST-PAYMENT PROCESSING OVERLAY */}
      {postPaymentStatus === 'processing' && (
        <Box sx={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, bgcolor: 'rgba(255,255,255,0.98)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 1000, gap: 2 }}>
          <CircularProgress sx={{ color: '#0F6E56' }} />
          <Typography variant="body2" color="text.secondary">Confirming your order...</Typography>
        </Box>
      )}

      {/* POST-PAYMENT ERROR OVERLAY (order creation failed) */}
      {postPaymentStatus === 'error' && (
        <Box sx={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, bgcolor: 'rgba(255,255,255,0.98)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, p: 2 }}>
          <Box sx={{ textAlign: 'center', maxWidth: 380 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>Order creation failed</Typography>
            <Typography sx={{ mb: 3, color: 'text.secondary' }}>{postPaymentMessage}</Typography>
            <button className="co-proceed-btn" onClick={() => setView('orders')}>Go to orders</button>
          </Box>
        </Box>
      )}

      {/* HEADER */}
      <div className="co-header co-reveal">
        <button className="co-back-btn" onClick={() => setView('findMedicines')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <div className="co-header-title">Confirm order</div>
        <div style={{width: 32}}></div>
      </div>

      {/* MEDICINES SECTION */}
      <div className="co-section co-reveal d2">
        <div className="co-sec-label">Medicines</div>
        <div className="co-med-list">
          {items.map(item => (
            <div className="co-med-item" key={item.id}>
              <div className="co-med-item-left">
                <div className="co-med-item-dot"></div>
                <div>
                  <div className="co-med-item-name">{item.name}</div>
                  <div className="co-med-item-meta">{item.quantity} units · {item.activeIngredients}</div>
                </div>
              </div>
              <div className="co-med-item-right">
                <div className="co-med-item-price">₦{(item.price * item.quantity).toLocaleString()}</div>
                <IconButton 
                  size="small" 
                  className="co-med-remove-btn"
                  onClick={() => handleOpenRemoveDialog(item.id)}
                >
                  <DeleteOutline fontSize="small" />
                </IconButton>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* REMOVE CONFIRMATION DIALOG */}
      <Dialog 
        open={isRemoveDialogOpen} 
        onClose={handleCloseRemoveDialog} 
        PaperProps={{ sx: { borderRadius: '16px' } }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontFamily: 'Sora' }}>Remove medicine?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Are you sure you want to remove this item from your order?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <button className="co-dialog-btn cancel" onClick={handleCloseRemoveDialog}>Cancel</button>
          <button className="co-dialog-btn confirm" onClick={handleConfirmRemove}>Remove</button>
        </DialogActions>
      </Dialog>

      {/* DELIVERY OPTIONS */}
      <div className="co-section co-reveal d3">
        <div className="co-sec-label">Delivery preference</div>
        <div className="co-delivery-opts">
          <div className={`co-delivery-opt ${deliveryOption !== 'pickup' ? 'selected' : ''}`} onClick={() => setDeliveryOption('delivery')}>
            <div className="co-delivery-opt-radio"><div className="co-delivery-opt-radio-inner"></div></div>
            <div className="co-delivery-opt-body">
              <div className="co-delivery-opt-title">Doorstep Delivery</div>
              <div className="co-delivery-opt-sub">Live courier pool (Gokada, Kwik, GIGL, Bubble Express) dispatched to your door.</div>
            </div>
            {selectedCourier && deliveryOption !== 'pickup' && (
              <div className="co-delivery-opt-price">₦{selectedCourier.total.toLocaleString()}</div>
            )}
          </div>

          <div className={`co-delivery-opt ${deliveryOption === 'pickup' ? 'selected' : ''}`} onClick={() => setDeliveryOption('pickup')}>
            <div className="co-delivery-opt-radio"><div className="co-delivery-opt-radio-inner"></div></div>
            <div className="co-delivery-opt-body">
              <div className="co-delivery-opt-title">Pickup from pharmacy</div>
              <div className="co-delivery-opt-sub">The pharmacy is notified instantly. Pay now and walk in to collect — no waiting.</div>
            </div>
            <div className="co-delivery-opt-price" style={{color: deliveryOption === 'pickup' ? 'var(--green)' : '#bbb'}}>Free</div>
          </div>
        </div>

        {deliveryOption !== 'pickup' && (
          <div id="addressSection" style={{marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12}}>
            <div style={{fontSize: 12, fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: 0.5}}>
              Delivery Destination
            </div>
            <input 
              className="co-address-field" 
              type="text" 
              placeholder="Street address (e.g. 15 Admiralty Way, Lekki Phase 1)" 
              value={deliveryAddress} 
              onChange={e => setDeliveryAddress(e.target.value)} 
            />
            <div style={{display: 'flex', gap: 10}}>
              <input className="co-address-field" style={{flex: 1}} type="text" placeholder="City (e.g. Lekki / Ikeja / Benin)" value={deliveryCity} onChange={e => setDeliveryCity(e.target.value)} />
              <input className="co-address-field" style={{flex: 1}} type="text" placeholder="State (e.g. Lagos / Edo)" value={deliveryState} onChange={e => setDeliveryState(e.target.value)} />
            </div>

            {/* LIVE COURIER POOL DISPLAY */}
            {loadingRates && (
              <div className="co-rates-loading">
                <CircularProgress size={18} sx={{ color: 'var(--green)' }} />
                <span>Fetching live rates from available couriers...</span>
              </div>
            )}

            {!loadingRates && couriers.length === 0 && (!deliveryAddress || deliveryAddress.trim().length < 3) && (
              <div className="co-rates-hint">
                📍 Enter your delivery address above to view real-time courier options and rates from Gokada, Kwik, GIGL, and more.
              </div>
            )}

            {!loadingRates && ratesError && couriers.length === 0 && (
              <div style={{ padding: '10px 14px', background: '#fff3e0', border: '1px solid #ffe0b2', borderRadius: 10, fontSize: 12, color: '#e65100' }}>
                ⚠️ {ratesError}
              </div>
            )}

            {!loadingRates && couriers.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <div style={{fontSize: 12, fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8}}>
                  Choose Delivery Courier
                </div>
                <div className="co-delivery-opts">
                  {couriers.map((courier) => {
                    const isSelected = selectedCourier?.courierId === courier.courierId;
                    return (
                      <div
                        key={courier.courierId}
                        className={`co-delivery-opt ${isSelected ? 'selected' : ''}`}
                        onClick={() => setSelectedCourier(courier)}
                      >
                        <div className="co-delivery-opt-radio">
                          <div className="co-delivery-opt-radio-inner"></div>
                        </div>

                        {courier.courierImage && (
                          <img 
                            src={courier.courierImage} 
                            alt={courier.courierName}
                            className="co-courier-logo" 
                          />
                        )}

                        <div className="co-delivery-opt-body">
                          <div className="co-delivery-opt-title" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                            <span>{courier.courierName}</span>
                            {courier.isCheapest && (
                              <span className="co-courier-badge cheapest">🏷️ Cheapest</span>
                            )}
                            {courier.isFastest && (
                              <span className="co-courier-badge fastest">⚡ Fastest</span>
                            )}
                          </div>
                          <div className="co-delivery-opt-sub">
                            {courier.deliveryEta} {courier.serviceType ? `· ${courier.serviceType === 'pickup' ? 'Direct Pickup' : 'Dropoff'}` : ''}
                          </div>
                        </div>

                        <div className="co-delivery-opt-price">
                          ₦{courier.total.toLocaleString()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CONTACT INFO */}
      <div className="co-section co-reveal d3">
        <div className="co-sec-label">Contact information</div>
        <div className="co-patient-info-grid">
          <input className="co-info-field" type="tel" placeholder="Phone number" value={deliveryPhone} onChange={e => setDeliveryPhone(e.target.value)} />
          <input className="co-info-field" type="email" placeholder="Email for receipt" value={deliveryEmail} onChange={e => setDeliveryEmail(e.target.value)} />
        </div>
      </div>

      {/* PATIENT INFO */}
      <div className="co-section co-reveal d4">
        <div className="co-sec-label">Patient information</div>
        <div className="co-patient-info-grid">
          <input className="co-info-field" type="text" placeholder="Patient name" value={patientName} onChange={e => setPatientName(e.target.value)} />
          <div className="co-info-row">
            <input className="co-info-field" type="number" placeholder="Age" value={patientAge} onChange={e => setPatientAge(e.target.value)} />
            <input className="co-info-field" type="text" placeholder="Condition (optional)" value={patientCondition} onChange={e => setPatientCondition(e.target.value)} />
          </div>
        </div>
      </div>

      {/* PROMO CODE */}
      <div className="co-section co-reveal d5">
        <div className="co-sec-label">Promo code</div>
        <div className="co-promo-row">
          <input className="co-promo-input" type="text" placeholder="Enter promo code" value={promoCode} onChange={e => setPromoCode(e.target.value)} />
          <button className="co-promo-btn" onClick={handleApplyPromo} disabled={!promoCode.trim()}>Apply</button>
        </div>
        {promoMessage && <Typography variant="caption" sx={{ color: promoMessage.includes('successfully') ? '#4CAF50' : '#F44336', mt: 1, display: 'block' }}>{promoMessage}</Typography>}
        {activePromo && (
          <Box sx={{ mt: 1, p: 1, bgcolor: 'var(--green-pale)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" sx={{ color: 'var(--green)', fontWeight: 600 }}>{activePromo.code} Applied</Typography>
            <button style={{ background: 'none', border: 'none', color: 'var(--pink)', fontSize: '10px', fontWeight: 600, cursor: 'pointer' }} onClick={removePromo}>Remove</button>
          </Box>
        )}
      </div>

      {/* ORDER SUMMARY */}
      <div className="co-section co-reveal d6">
        <div className="co-sec-label">Order summary</div>
        <div className="co-summary-rows">
          <div className="co-summary-row">
            <div className="co-summary-label">Items Subtotal</div>
            <div className="co-summary-value">₦{subtotal.toLocaleString()}</div>
          </div>
          {discountAmount > 0 && (
            <div className="co-summary-row">
              <div className="co-summary-label">Promo Discount</div>
              <div className="co-summary-value green">-₦{discountAmount.toLocaleString()}</div>
            </div>
          )}
          <div className="co-summary-row">
            <div className="co-summary-label">Delivery Fee</div>
            <div className="co-summary-value">{deliveryFee === 0 ? 'Free' : `₦${deliveryFee.toLocaleString()}`}</div>
          </div>
          {deliveryDiscount > 0 && (
            <div className="co-summary-row">
              <div className="co-summary-label">Delivery Discount</div>
              <div className="co-summary-value green">-₦{deliveryDiscount.toLocaleString()}</div>
            </div>
          )}
          <div className="co-summary-row">
            <div className="co-summary-label">Service Charge ({sfcPercentage}%)</div>
            <div className="co-summary-value">₦{sfcAmount.toLocaleString()}</div>
          </div>
          {sfcDiscount > 0 && (
            <div className="co-summary-row">
              <div className="co-summary-label">SFC Discount</div>
              <div className="co-summary-value green">-₦{sfcDiscount.toLocaleString()}</div>
            </div>
          )}
        </div>
        <div className="co-summary-total-row">
          <div className="co-summary-total-label">Total</div>
          <div className="co-summary-total-value">₦{total.toLocaleString()}</div>
        </div>

      </div>

      {/* PROCEED SECTION */}
      <div className="co-proceed-section co-reveal d7">
        <PaystackButton
          total={total}
          deliveryOption={deliveryOption}
          courierName={selectedCourier?.courierName}
          orderType={actualOrderType}
          uniquePharmacies={uniquePharmacies}
          subtotal={subtotal}
          deliveryFee={deliveryFee}
          sfcAmount={sfcAmount}
          sfcDiscount={sfcDiscount}
          discountAmount={discountAmount}
          deliveryDiscount={deliveryDiscount}
          promoCode={activePromo?.code}
          patientName={patientName}
          patientAge={patientAge}
          patientCondition={patientCondition}
          deliveryPhone={deliveryPhone}
          deliveryEmail={deliveryEmail}
          deliveryAddress={deliveryAddress}
          deliveryCity={deliveryCity}
          deliveryState={deliveryState}
          isFormValid={isFormValid}
        />
        <div className="co-secure-note">🔒 Secured by Paystack · Your payment is protected</div>
      </div>
    </div>
  );
}
