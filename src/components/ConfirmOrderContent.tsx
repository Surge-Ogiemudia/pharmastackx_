'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  CircularProgress, 
  Alert,
  Box,
  Typography,
  Paper,
  IconButton,
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions,
} from '@mui/material';
import { DeleteOutline, CheckCircle, Error as ErrorIcon } from '@mui/icons-material';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from "next/dynamic";
import { useCart } from '../contexts/CartContext';
import { usePromo } from '../contexts/PromoContext';
import { useOrders } from '../contexts/OrderContext';
import { useSession } from '../context/SessionProvider';
import { event } from '../lib/gtag';
import { Business } from '@/types';
import './ConfirmOrder.css';

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

const STANDARD_DELIVERY_FEE = 900;
const EXPRESS_DELIVERY_FEE = 2000;

export default function ConfirmOrderContent({ setView }: { setView: (view: string) => void }) {
  const { items, updateQuantity, removeFromCart, clearCart, requestId, quoteId, fetchCartFromDB } = useCart();
  const { activePromo, applyPromo, removePromo, validatePromo, calculateDiscount } = usePromo();
  const { addOrder } = useOrders();
  const { user } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  if (!searchParams) {
    return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>;
  }

  // Sync with cloud on mount
  useEffect(() => {
    if (user?._id) {
      console.log("[ConfirmOrder] Triggering fresh Cart sync from DB...");
      fetchCartFromDB();
    }
  }, [user?._id, fetchCartFromDB]);

  // State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pharmacist, setPharmacist] = useState<Pharmacy | null>(null);
  
  const [postPaymentStatus, setPostPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [postPaymentMessage, setPostPaymentMessage] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [promoMessage, setPromoMessage] = useState('');
  const [deliveryOption, setDeliveryOption] = useState<'standard' | 'express' | 'pickup'>('standard');
  const [isProcessingFreeOrder, setIsProcessingFreeOrder] = useState(false);

  // Form Fields
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientCondition, setPatientCondition] = useState('');
  const [deliveryPhone, setDeliveryPhone] = useState('');
  const [deliveryEmail, setDeliveryEmail] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryCity, setDeliveryCity] = useState('');
  const [deliveryState, setDeliveryState] = useState('');
  const [deliveryCoords, setDeliveryCoords] = useState<[number, number] | undefined>(undefined);
  const [coordsInput, setCoordsInput] = useState('');
  const [coordsError, setCoordsError] = useState('');

  const parseCoords = (raw: string): [number, number] | null => {
    const cleaned = raw.trim().replace(/[()]/g, '');
    const parts = cleaned.split(',').map(p => parseFloat(p.trim()));
    if (parts.length !== 2 || parts.some(isNaN)) return null;
    const [lat, lng] = parts; // Google Maps uses "lat, lng"
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
    return [lng, lat]; // GeoJSON is [lng, lat]
  };
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

  const getDeliveryFee = useCallback(() => {
    if (deliveryOption === 'pickup') return 0;
    const baseDeliveryFee = deliveryOption === 'standard' ? STANDARD_DELIVERY_FEE : EXPRESS_DELIVERY_FEE;
    return baseDeliveryFee;
  }, [deliveryOption]);

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

    const orderData = {
      patientName, patientAge, patientCondition,
      deliveryEmail, deliveryPhone, deliveryAddress, deliveryCity, deliveryState,
      items: itemsForBackend,
      coupon: activePromo?.code,
      deliveryOption,
      orderType: actualOrderType,
      businesses: uniquePharmacies,
      requestId,
      quoteId,
      patientPhone: deliveryPhone,
      deliveryAddress: deliveryAddress,
      deliveryCoords: deliveryCoords,
    };
    
    const result = await addOrder(orderData);

    if (result.success) {
      if (requestId) {
        fetch(`/api/requests/${requestId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            action: 'confirm-request',
            patientPhone: deliveryPhone,
            deliveryAddress: deliveryAddress,
            deliveryCoords: deliveryCoords
          }),
        }).catch(err => console.error('Failed to confirm request:', err));
      }
      
      setPostPaymentStatus('success');
      setPostPaymentMessage('Order successfully created!');
      clearCart();
      removePromo();
    } else {
      setPostPaymentStatus('error');
      setPostPaymentMessage(`Order creation failed: ${result.message}`);
    }
    router.replace(window.location.pathname, { scroll: false });
  }, [user, items, patientName, patientAge, patientCondition, deliveryEmail, deliveryPhone, deliveryAddress, deliveryCity, deliveryState, activePromo, deliveryOption, actualOrderType, uniquePharmacies, requestId, quoteId, addOrder, clearCart, removePromo, router]);

  useEffect(() => {
    const status = searchParams?.get('redirect_status');
    if (status === 'success' && postPaymentStatus === 'idle' && items.length > 0) {
      createOrderFromCart();
    }
  }, [searchParams, postPaymentStatus, items.length, createOrderFromCart]);

  if (items.length === 0 && postPaymentStatus === 'idle') {
    return (
      <div className="co-container" style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px'}}>
        <Typography variant="h6" sx={{ mb: 2 }}>Your cart is empty</Typography>
        <button className="co-proceed-btn" onClick={() => setView('home')} style={{maxWidth: '300px'}}>Return Home</button>
      </div>
    );
  }

  return (
    <div className="co-container">
      {/* POST-PAYMENT OVERLAY */}
      {postPaymentStatus !== 'idle' && (
        <Box sx={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, bgcolor: 'rgba(255, 255, 255, 0.98)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, p: 2 }}>
            <Paper elevation={3} sx={{ p: 4, textAlign: 'center', borderRadius: '16px', maxWidth: 450, width: '100%' }}>
                {postPaymentStatus === 'processing' && <CircularProgress sx={{ mb: 2 }} />}
                {postPaymentStatus === 'success' && <CheckCircle sx={{ fontSize: 56, color: 'success.main', mb: 2 }} />}
                {postPaymentStatus === 'error' && <ErrorIcon sx={{ fontSize: 56, color: 'error.main', mb: 2 }} />}
                
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    {postPaymentStatus === 'processing' ? 'Processing...' : postPaymentStatus === 'success' ? 'Success!' : 'An Error Occurred'}
                </Typography>

                <Typography sx={{ mb: 3 }}>{postPaymentMessage}</Typography>

                <button className="co-proceed-btn" onClick={() => setView('orders')} disabled={postPaymentStatus !== 'success'}>
                    View Orders
                </button>
            </Paper>
        </Box>
      )}

      {/* HEADER */}
      <div className="co-header co-reveal">
        <button className="co-back-btn" onClick={() => setView('reviewRequest')}>
          <div className="co-back-circle">←</div>
          <div className="co-back-text">Responses</div>
        </button>
        <div className="co-header-title">Confirm order</div>
        <div style={{width: 32}}></div> {/* Spacer */}
      </div>

      {/* PHARMACIST SECTION */}
      <div className="co-section co-reveal d1">
        <div className="co-sec-label">Your pharmacist</div>
        <div className="co-pharmacist-card">
          <div className="co-pharmacist-avatar">
            <div className="co-pharmacist-avatar-text">
              {pharmacist?.name.substring(0, 2).toUpperCase() || 'PH'}
            </div>
          </div>
          <div className="co-pharmacist-info">
            <div className="co-pharmacist-name">Pharm. {pharmacist?.name || 'Loading...'}</div>
            <div className="co-pharmacist-pharmacy">
              {pharmacist?.address ? `${pharmacist.address.split(',')[0]} · ` : ''}
              {pharmacist?.distance ? `${pharmacist.distance}` : 'Calculating distance...'}
            </div>
            <div className="co-pharmacist-meta">
              <div className="co-meta-badge">
                <div className="co-meta-badge-dot"></div>
                <div className="co-meta-badge-text">Verified</div>
              </div>
              <div className="co-meta-rating">⭐ {pharmacist?.rating || '4.8'} · {pharmacist?.orderCount || '124'} orders</div>
            </div>
          </div>
          <div className="co-change-link" onClick={() => setView('reviewRequest')}>Change</div>
        </div>
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
          <div className={`co-delivery-opt ${deliveryOption === 'pickup' ? 'selected' : ''}`} onClick={() => setDeliveryOption('pickup')}>
            <div className="co-delivery-opt-radio"><div className="co-delivery-opt-radio-inner"></div></div>
            <div className="co-delivery-opt-body">
              <div className="co-delivery-opt-title">Pickup from pharmacy</div>
              <div className="co-delivery-opt-sub">You'll receive the pharmacy address and contact after payment.</div>
            </div>
            <div className="co-delivery-opt-price" style={{color: deliveryOption === 'pickup' ? 'var(--green)' : '#bbb'}}>Free</div>
          </div>

          <div className={`co-delivery-opt ${deliveryOption === 'standard' ? 'selected' : ''}`} onClick={() => setDeliveryOption('standard')}>
            <div className="co-delivery-opt-radio"><div className="co-delivery-opt-radio-inner"></div></div>
            <div className="co-delivery-opt-body">
              <div className="co-delivery-opt-title">Standard delivery</div>
              <div className="co-delivery-opt-sub">Reliable delivery, usually by tomorrow.</div>
            </div>
            <div className="co-delivery-opt-price">₦{STANDARD_DELIVERY_FEE.toLocaleString()}</div>
          </div>

          <div className={`co-delivery-opt ${deliveryOption === 'express' ? 'selected' : ''}`} onClick={() => setDeliveryOption('express')}>
            <div className="co-delivery-opt-radio"><div className="co-delivery-opt-radio-inner"></div></div>
            <div className="co-delivery-opt-body">
              <div className="co-delivery-opt-title">Express delivery</div>
              <div className="co-delivery-opt-sub">30mins – 3hrs delivery depending on location.</div>
            </div>
            <div className="co-delivery-opt-price">₦{EXPRESS_DELIVERY_FEE.toLocaleString()}</div>
          </div>
        </div>

        {deliveryOption !== 'pickup' && (
          <div id="addressSection" style={{marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10}}>
            <input className="co-address-field" type="text" placeholder="Delivery address" value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} />
            <div style={{display: 'flex', gap: 10}}>
              <input className="co-address-field" style={{flex: 1}} type="text" placeholder="City" value={deliveryCity} onChange={e => setDeliveryCity(e.target.value)} />
              <input className="co-address-field" style={{flex: 1}} type="text" placeholder="State" value={deliveryState} onChange={e => setDeliveryState(e.target.value)} />
            </div>
            <input 
              className="co-address-field" 
              type="text" 
              placeholder="Paste coordinates (e.g. 6.5244, 3.3792)" 
              value={coordsInput} 
              onChange={e => {
                setCoordsInput(e.target.value);
                const parsed = parseCoords(e.target.value);
                if (parsed) {
                  setDeliveryCoords(parsed);
                  setCoordsError('');
                } else if (e.target.value.trim()) {
                  setCoordsError('Invalid coordinates format');
                } else {
                  setCoordsError('');
                  setDeliveryCoords(undefined);
                }
              }} 
            />
            {coordsError && <div style={{color: 'red', fontSize: '10px', marginTop: '-4px', marginLeft: '12px'}}>{coordsError}</div>}
          </div>
        )}
        <div style={{marginTop: 10, fontSize: 10, color: '#bbb', fontWeight: 300}}>
          {deliveryOption === 'pickup' ? '*Pickup service charge is 25% instead of 20%' : '*Service charge is 20% for deliveries'}
        </div>
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

        <div className="co-service-note">
          <div className="co-service-bar"></div>
          <div className="co-service-text">
            PharmaStackX charges a <strong>{sfcPercentage}% service fee</strong> to keep the platform running and ensure your orders are secured.
          </div>
        </div>
      </div>

      {/* PROCEED SECTION */}
      <div className="co-proceed-section co-reveal d7">
        <PaystackButton
          total={total}
          deliveryOption={deliveryOption}
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
