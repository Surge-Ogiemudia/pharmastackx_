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
import WholesalePackingSlip from './WholesalePackingSlip';

const PaystackButton = dynamic(
  () => import("./PaystackButton"),
  { ssr: false }
);

export interface DemoBeninPharmacy {
  id: string;
  name: string;
  address: string;
  landmark: string;
  city: string;
  state: string;
  phone: string;
  email: string;
  pcnLicense: string;
  superintendentName: string;
  distanceKm: number;
  transitTime: string;
}

export const DEMO_BENIN_PHARMACIES: DemoBeninPharmacy[] = [
  {
    id: 'apcare',
    name: 'Apcare Pharmacy',
    address: '42 Airport Road, GRA',
    landmark: 'Airport Road, Benin City',
    city: 'Benin City',
    state: 'Edo State',
    phone: '+234 803 210 4455',
    email: 'orders@apcarepharmacy.com',
    pcnLicense: 'PCN/ED/RET/2021/0412',
    superintendentName: 'Pharm. O. Apcare, B.Pharm, MPSN',
    distanceKm: 5.4,
    transitTime: '18 mins',
  },
  {
    id: 'kop',
    name: 'KOP Pharmacy',
    address: '78 Sapele Road',
    landmark: 'Sapele Road, Benin City',
    city: 'Benin City',
    state: 'Edo State',
    phone: '+234 805 771 9920',
    email: 'procurements@koppharmacy.ng',
    pcnLicense: 'PCN/ED/RET/2018/1190',
    superintendentName: 'Pharm. K. O. Paul, B.Pharm, MPSN',
    distanceKm: 3.8,
    transitTime: '14 mins',
  },
  {
    id: 'medlife',
    name: 'Medlife Pharmacy',
    address: '115 Uselu Lagos Road',
    landmark: 'Uselu Lagos Road, Benin City',
    city: 'Benin City',
    state: 'Edo State',
    phone: '+234 814 330 8821',
    email: 'dispensary@medlife.ng',
    pcnLicense: 'PCN/ED/RET/2020/3389',
    superintendentName: 'Pharm. M. Osahon, B.Pharm, MPSN',
    distanceKm: 6.2,
    transitTime: '22 mins',
  },
  {
    id: 'ernosa',
    name: 'Ernosa Pharmacy',
    address: '24 Ekenwan Road',
    landmark: 'Ekenwan Road, Benin City',
    city: 'Benin City',
    state: 'Edo State',
    phone: '+234 802 884 1133',
    email: 'restock@ernosapharmacy.com',
    pcnLicense: 'PCN/ED/RET/2019/2204',
    superintendentName: 'Pharm. E. Nosakhare, B.Pharm, MPSN',
    distanceKm: 4.1,
    transitTime: '16 mins',
  }
];

export const B2B_DELIVERY_METHODS = [
  {
    id: 'b2b-express' as const,
    name: 'Express Dispatch (Local Courier/Bike)',
    eta: '1-2 Hours',
    fee: 1500,
    icon: '⚡',
    description: 'Rapid motorcycle dispatch for emergency restock & light packs (up to 10kg).'
  },
  {
    id: 'b2b-haulage' as const,
    name: 'Heavy Cargo Haulage (Van/Truck for bulk cartons)',
    eta: 'Same Day',
    fee: 3500,
    icon: '🚛',
    description: 'Commercial cargo transit van for master cartons, bulk syrups & IV fluid pallets.'
  },
  {
    id: 'b2b-pickup' as const,
    name: 'Depot Self-Pickup',
    eta: 'Ready in 30 Mins',
    fee: 0,
    icon: '🏢',
    description: 'Collect directly at Airen Loading Bay, 18 Mission Road, Benin City (Free).'
  }
];

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

  // Determine if B2B / wholesale depot mode is active
  const sellerParam = searchParams?.get('seller') || '';
  const actionParam = searchParams?.get('action');
  const b2bQueryParam = searchParams?.get('b2b');
  const isAirenWholesale = sellerParam.toLowerCase().includes('airen') || items.some(i => (i.pharmacy || '').toLowerCase().includes('airen'));
  const isB2BInitial = actionParam === 'checkout' || b2bQueryParam === 'true' || isAirenWholesale;

  const [b2bMode, setB2bMode] = useState<boolean>(isB2BInitial);

  // Sync with cloud on mount OR parse B2B URL params
  useEffect(() => {
    const action = searchParams?.get('action');
    const seller = searchParams?.get('seller') || '';
    const isB2BParam = action === 'checkout' || searchParams?.get('b2b') === 'true' || seller.toLowerCase().includes('airen');

    if (action === 'checkout') {
      const itemName = searchParams.get('item');
      const priceStr = searchParams.get('price');
      
      if (itemName && priceStr) {
        console.log("[ConfirmOrder] Initializing B2B Checkout Cart from URL");
        const price = parseFloat(priceStr) || 0;
        const b2bItem = {
          id: `b2b-${Date.now()}`,
          name: itemName,
          image: '',
          activeIngredients: 'Wholesale Depot Sourced',
          drugClass: 'B2B Wholesale Consignment',
          price: price,
          pharmacy: seller || 'demo.airen',
          quantity: 1,
          isQuoteItem: false,
          packForm: 'Wholesale Pack · 10x10s'
        };
        initializeCart([b2bItem as any], 'b2b-request', 'b2b-quote', true);
        setB2bMode(true);
        return;
      }
    }

    // Default seeded wholesale items if B2B checkout is triggered with empty cart
    if (isB2BParam && items.length === 0) {
      console.log("[ConfirmOrder] Initializing High-Demand Airen Wholesale Consignment Items");
      const defaultWholesalePacks = [
        {
          id: `b2b-coartem-${Date.now()}`,
          name: 'Coartem 80/480mg Tablets (ACT)',
          image: '',
          activeIngredients: 'Artemether 80mg / Lumefantrine 480mg',
          drugClass: 'Antimalarial',
          price: 38500,
          pharmacy: 'demo.airen',
          quantity: 2,
          isQuoteItem: false,
          packForm: 'Wholesale Pack of 10x6s (60 Tabs)'
        },
        {
          id: `b2b-augmentin-${Date.now()}`,
          name: 'Augmentin 625mg Tablets (Amoxicillin/Clav)',
          image: '',
          activeIngredients: 'Amoxicillin 500mg / Clavulanate 125mg',
          drugClass: 'Antibiotic',
          price: 115000,
          pharmacy: 'demo.airen',
          quantity: 1,
          isQuoteItem: false,
          packForm: 'Wholesale Master Box (20 Packs)'
        },
        {
          id: `b2b-emzor-para-${Date.now()}`,
          name: 'Emzor Paracetamol Paediatric Syrup 100ml',
          image: '',
          activeIngredients: 'Paracetamol 120mg/5ml',
          drugClass: 'Analgesic / Antipyretic',
          price: 24500,
          pharmacy: 'demo.airen',
          quantity: 2,
          isQuoteItem: false,
          packForm: 'Master Carton of 50 Bottles (100ml)'
        }
      ];
      initializeCart(defaultWholesalePacks as any, 'b2b-request', 'b2b-quote', true);
      setB2bMode(true);
      return;
    }

    if (user?._id) {
      console.log("[ConfirmOrder] Triggering fresh Cart sync from DB...");
      fetchCartFromDB();
    }
  }, [user?._id, fetchCartFromDB, searchParams, initializeCart, items.length]);

  // State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pharmacist, setPharmacist] = useState<Pharmacy | null>(null);
  
  const [postPaymentStatus, setPostPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [postPaymentMessage, setPostPaymentMessage] = useState('');
  const [showPostPaymentFlow, setShowPostPaymentFlow] = useState(false);
  const [completedRequestId, setCompletedRequestId] = useState<string | null>(null);
  const [completedPharmacyName, setCompletedPharmacyName] = useState<string | undefined>(undefined);
  const activePartnerSlug = searchParams?.get('partner') || searchParams?.get('slug') || (() => {
    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('psx_active_partner') : null;
      return stored ? JSON.parse(stored).slug : undefined;
    } catch (e) { return undefined; }
  })();
  const [promoCode, setPromoCode] = useState('');
  const [promoMessage, setPromoMessage] = useState('');
  const [deliveryOption, setDeliveryOption] = useState<'delivery' | 'standard' | 'express'>('delivery');
  const [couriers, setCouriers] = useState<CourierOption[]>([]);
  const [selectedCourier, setSelectedCourier] = useState<CourierOption | null>(null);
  const [loadingRates, setLoadingRates] = useState(false);
  const [ratesError, setRatesError] = useState<string | null>(null);
  const [requestToken, setRequestToken] = useState<string | null>(null);
  const [isProcessingFreeOrder, setIsProcessingFreeOrder] = useState(false);

  // B2B Wholesale Depot & Demo Benin Retail Pharmacies State
  const [selectedDemoPharmacyId, setSelectedDemoPharmacyId] = useState<string>(() => {
    const buyerParam = searchParams?.get('buyer')?.toLowerCase() || '';
    if (buyerParam.includes('kop')) return 'kop';
    if (buyerParam.includes('medlife')) return 'medlife';
    if (buyerParam.includes('ernosa')) return 'ernosa';
    return 'apcare'; // Default to Apcare Pharmacy
  });

  const [b2bDeliveryMethodId, setB2bDeliveryMethodId] = useState<'b2b-express' | 'b2b-haulage' | 'b2b-pickup'>('b2b-express');
  const [b2bPaymentMethod, setB2bPaymentMethod] = useState<'bank_transfer' | 'paystack'>('bank_transfer');
  const [confirmedB2BOrder, setConfirmedB2BOrder] = useState<any | null>(null);
  const [showPackingSlipModal, setShowPackingSlipModal] = useState(false);
  const [isSimulatingTransfer, setIsSimulatingTransfer] = useState(false);
  const [buyerPcnLicense, setBuyerPcnLicense] = useState('PCN/ED/RET/2021/0412');

  // Form Fields
  const [patientName, setPatientName] = useState(() => (typeof window !== 'undefined' ? sessionStorage.getItem('psx_checkout_name') || '' : ''));
  const [patientAge, setPatientAge] = useState(() => (typeof window !== 'undefined' ? sessionStorage.getItem('psx_checkout_age') || '' : ''));
  const [patientCondition, setPatientCondition] = useState(() => (typeof window !== 'undefined' ? sessionStorage.getItem('psx_checkout_condition') || '' : ''));
  const [deliveryPhone, setDeliveryPhone] = useState(() => (typeof window !== 'undefined' ? sessionStorage.getItem('psx_checkout_phone') || '' : ''));
  const [deliveryEmail, setDeliveryEmail] = useState(() => (typeof window !== 'undefined' ? sessionStorage.getItem('psx_checkout_email') || '' : ''));
  const [deliveryAddress, setDeliveryAddress] = useState(() => (typeof window !== 'undefined' ? sessionStorage.getItem('psx_checkout_address') || '' : ''));
  const [deliveryCity, setDeliveryCity] = useState(() => (typeof window !== 'undefined' ? sessionStorage.getItem('psx_checkout_city') || '' : ''));
  const [deliveryState, setDeliveryState] = useState(() => (typeof window !== 'undefined' ? sessionStorage.getItem('psx_checkout_state') || '' : ''));

  // Automatically pre-fill selected Demo Benin Retail Pharmacy details when in B2B Mode
  useEffect(() => {
    if (b2bMode) {
      const p = DEMO_BENIN_PHARMACIES.find(pharm => pharm.id === selectedDemoPharmacyId) || DEMO_BENIN_PHARMACIES[0];
      setPatientName(p.name);
      setDeliveryAddress(p.address);
      setDeliveryCity(p.city);
      setDeliveryState(p.state);
      setDeliveryPhone(p.phone);
      setDeliveryEmail(p.email);
      setBuyerPcnLicense(p.pcnLicense);
    }
  }, [b2bMode, selectedDemoPharmacyId]);

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
  }, [requestId, quoteId, searchParams]);

  // Pre-fill user data if consumer
  useEffect(() => {
    if (user && !b2bMode) {
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
  }, [user, b2bMode]);

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
  const isAddressRequired = true;
  const isFormValid = useMemo(() => {
    if (b2bMode) {
      return (
        patientName.trim() !== '' &&
        deliveryPhone.trim() !== '' &&
        deliveryAddress.trim() !== '' &&
        deliveryCity.trim() !== '' &&
        deliveryState.trim() !== ''
      );
    }
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
  }, [b2bMode, patientName, patientAge, deliveryPhone, deliveryEmail, isAddressRequired, deliveryAddress, deliveryCity, deliveryState]);

  // Calculations
  const subtotal = useMemo(() => items.reduce((sum, item) => sum + (item.price * item.quantity), 0), [items]);
  const uniquePharmacies = useMemo(() => [...new Set(items.map(item => item.pharmacy))], [items]);
  const isSingleOrder = uniquePharmacies.length <= 1;
  const actualOrderType = isSingleOrder ? 'S' : 'MN';

  // Fetch live courier rates from Shipbubble (for consumer orders)
  const fetchCourierRates = useCallback(async (address: string, city: string, state: string) => {
    if (b2bMode || !address || address.trim().length < 3) return;
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
  }, [b2bMode, uniquePharmacies, pharmacist, patientName, deliveryPhone, deliveryEmail, items]);

  useEffect(() => {
    if (b2bMode || !deliveryAddress || deliveryAddress.trim().length < 3) return;

    const timer = setTimeout(() => {
      fetchCourierRates(deliveryAddress, deliveryCity, deliveryState);
    }, 700);

    return () => clearTimeout(timer);
  }, [b2bMode, deliveryAddress, deliveryCity, deliveryState, fetchCourierRates]);

  const getDeliveryFee = useCallback(() => {
    if (b2bMode) {
      const b2bMethod = B2B_DELIVERY_METHODS.find(m => m.id === b2bDeliveryMethodId);
      return b2bMethod ? b2bMethod.fee : 1500;
    }
    if (selectedCourier) return selectedCourier.total;
    if (couriers.length > 0) return couriers[0].total;
    return 1500;
  }, [b2bMode, b2bDeliveryMethodId, selectedCourier, couriers]);

  const deliveryFee = getDeliveryFee();
  const sfcPercentage = b2bMode ? 0 : 20; // B2B wholesale orders are exempted from consumer service charge
  const sfcAmount = b2bMode ? 0 : (subtotal * (sfcPercentage / 100));
  const { discountAmount, deliveryDiscount, sfcDiscount, finalTotal } = calculateDiscount(subtotal, deliveryFee, sfcAmount);
  const total = b2bMode ? Math.max(0, subtotal + deliveryFee - discountAmount) : finalTotal;

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

    const activePartnerSlug = searchParams?.get('partner') || searchParams?.get('slug') || (() => {
      try {
        const stored = typeof window !== 'undefined' ? localStorage.getItem('psx_active_partner') : null;
        return stored ? JSON.parse(stored).slug : undefined;
      } catch (e) { return undefined; }
    })();

    if (!user && !activePartnerSlug && !deliveryEmail && !b2bMode) {
      setPostPaymentStatus('error');
      setPostPaymentMessage('Error: User session expired. Please log in again.');
      return;
    }

    const currentPharmacy = DEMO_BENIN_PHARMACIES.find(p => p.id === selectedDemoPharmacyId) || DEMO_BENIN_PHARMACIES[0];
    const selectedB2BMethod = B2B_DELIVERY_METHODS.find(m => m.id === b2bDeliveryMethodId) || B2B_DELIVERY_METHODS[0];
    const generatedWaybill = `AIR-WB-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const itemsForBackend = items.map(item => ({
      isQuoteItem: true,
      name: item.name,
      price: item.price,
      qty: item.quantity,
      image: item.image,
      packForm: (item as any).packForm || 'Wholesale Pack · 10x10s',
      pharmacy: b2bMode ? 'demo.airen' : item.pharmacy,
    }));

    const orderData = {
      patientName: b2bMode ? currentPharmacy.name : patientName,
      patientAge: b2bMode ? '35' : patientAge,
      patientCondition: b2bMode ? 'B2B Wholesale Pharmacy Restocking Order' : patientCondition,
      deliveryEmail: b2bMode ? currentPharmacy.email : deliveryEmail,
      deliveryPhone: b2bMode ? currentPharmacy.phone : deliveryPhone,
      deliveryCity: b2bMode ? currentPharmacy.city : deliveryCity,
      deliveryState: b2bMode ? currentPharmacy.state : deliveryState,
      items: itemsForBackend,
      coupon: activePromo?.code,
      deliveryOption: b2bMode ? selectedB2BMethod.name : (selectedCourier ? selectedCourier.courierName : 'courier'),
      orderType: actualOrderType,
      businesses: b2bMode ? ['Airen Wholesale Depot'] : uniquePharmacies,
      requestId,
      quoteId,
      patientPhone: b2bMode ? currentPharmacy.phone : deliveryPhone,
      deliveryAddress: b2bMode ? currentPharmacy.address : deliveryAddress,
      partnerSlug: activePartnerSlug,
      courierName: b2bMode ? selectedB2BMethod.name : (selectedCourier ? selectedCourier.courierName : 'Standard Courier'),
      courierId: b2bMode ? selectedB2BMethod.id : selectedCourier?.courierId,
      courierLogo: selectedCourier?.courierImage,
      deliveryFee: deliveryFee,
      shipbubbleRequestToken: requestToken || undefined,
      isB2B: b2bMode,
      buyerPharmacyName: b2bMode ? currentPharmacy.name : undefined,
      buyerPcnLicense: b2bMode ? currentPharmacy.pcnLicense : undefined,
      sellerDepotName: b2bMode ? 'Airen Wholesale Depot' : undefined,
      distanceKm: b2bMode ? currentPharmacy.distanceKm : undefined,
      estimatedTransitTime: b2bMode ? currentPharmacy.transitTime : undefined,
      waybillNumber: b2bMode ? generatedWaybill : undefined,
      paymentMethod: b2bMode ? 'Paystack' : undefined
    };
    
    const result = await addOrder(orderData);

    if (result.success) {
      const createdOrder = (result as any).order;
      const createdOrderId = createdOrder?._id || createdOrder?.id;

      // Save order ID to localStorage for privacy-scoped guest device tracking
      if (typeof window !== 'undefined' && createdOrderId) {
        try {
          const key = activePartnerSlug ? `${activePartnerSlug}_orders` : 'psx_guest_orders';
          const existing = JSON.parse(localStorage.getItem(key) || '[]');
          if (!existing.includes(createdOrderId)) {
            existing.unshift(createdOrderId);
            localStorage.setItem(key, JSON.stringify(existing));
          }
          const genExisting = JSON.parse(localStorage.getItem('psx_guest_orders') || '[]');
          if (!genExisting.includes(createdOrderId)) {
            genExisting.unshift(createdOrderId);
            localStorage.setItem('psx_guest_orders', JSON.stringify(genExisting));
          }
        } catch (e) {
          console.error('Failed to save order ID to localStorage:', e);
        }
      }

      // Multi-recipient email dispatch (Customer, PSX Sales, Admin, Partner)
      fetch('/api/notify-purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: createdOrderId,
          patientName: b2bMode ? currentPharmacy.name : patientName,
          deliveryEmail: b2bMode ? currentPharmacy.email : deliveryEmail,
          deliveryPhone: b2bMode ? currentPharmacy.phone : deliveryPhone,
          deliveryAddress: b2bMode ? currentPharmacy.address : deliveryAddress,
          deliveryCity: b2bMode ? currentPharmacy.city : deliveryCity,
          deliveryState: b2bMode ? currentPharmacy.state : deliveryState,
          deliveryOption: b2bMode ? selectedB2BMethod.name : deliveryOption,
          courierName: b2bMode ? selectedB2BMethod.name : selectedCourier?.courierName,
          total,
          items: itemsForBackend,
          requestId,
          partnerSlug: activePartnerSlug,
        }),
      }).catch(err => console.error('Failed to dispatch notify-purchase:', err));

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

      if (b2bMode) {
        setConfirmedB2BOrder({
          waybillNumber: generatedWaybill,
          orderReference: createdOrderId || `PSX-B2B-${Math.floor(100000 + Math.random() * 900000)}`,
          orderDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
          buyerPharmacy: currentPharmacy,
          sellerDepot: {
            name: 'Airen Wholesale Pharmaceutical Depot',
            address: '18 Mission Road, Central Commercial District, Benin City, Edo State',
            phone: '+234 (0) 803 555 0192',
            email: 'dispatch@airenwholesale.com.ng',
            pcnLicense: 'PCN/W-ED/2019/8821',
            nafdacNumber: 'ED-WH-0922'
          },
          items: items.map(i => ({
            name: i.name,
            packForm: (i as any).packForm || 'Wholesale Pack · 10x10s',
            qty: i.quantity,
            price: i.price
          })),
          deliveryMethod: selectedB2BMethod.name,
          distanceKm: currentPharmacy.distanceKm,
          transitTime: currentPharmacy.transitTime,
          deliveryFee,
          subtotal,
          totalAmount: total,
          paymentMethod: 'Paystack Card / Transfer',
          paymentReference: createdOrderId
        });
        clearCart();
        removePromo();
        setPostPaymentStatus('idle');
        return;
      }

      clearCart();
      removePromo();

      if (activePartnerSlug) {
        // Drop straight into the tailored partner orders tab!
        setPostPaymentStatus('idle');
        setView('orders');
        return;
      }

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
  }, [user, items, b2bMode, selectedDemoPharmacyId, b2bDeliveryMethodId, patientName, patientAge, patientCondition, deliveryEmail, deliveryPhone, deliveryAddress, deliveryCity, deliveryState, activePromo, deliveryOption, actualOrderType, uniquePharmacies, requestId, quoteId, addOrder, clearCart, removePromo, router, selectedCourier, deliveryFee, requestToken, searchParams, total, setView]);

  const handleSimulateBankTransfer = async () => {
    setIsSimulatingTransfer(true);
    setError(null);
    try {
      const generatedWaybill = `AIR-WB-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const generatedPaymentRef = `AIR-TXN-${Math.floor(100000 + Math.random() * 900000)}`;
      const currentPharmacy = DEMO_BENIN_PHARMACIES.find(p => p.id === selectedDemoPharmacyId) || DEMO_BENIN_PHARMACIES[0];
      const selectedB2BMethod = B2B_DELIVERY_METHODS.find(m => m.id === b2bDeliveryMethodId) || B2B_DELIVERY_METHODS[0];

      const b2bItemsForBackend = items.map(item => ({
        isQuoteItem: false,
        name: item.name,
        price: item.price,
        qty: item.quantity,
        packForm: (item as any).packForm || 'Wholesale Pack · 10x10s',
        pharmacy: 'demo.airen'
      }));

      const orderData = {
        patientName: currentPharmacy.name,
        patientAge: '35',
        patientCondition: 'B2B Wholesale Pharmacy Restocking Order',
        deliveryEmail: currentPharmacy.email,
        deliveryPhone: currentPharmacy.phone,
        deliveryAddress: currentPharmacy.address,
        deliveryCity: currentPharmacy.city,
        deliveryState: currentPharmacy.state,
        items: b2bItemsForBackend,
        coupon: activePromo?.code,
        deliveryOption: selectedB2BMethod.name,
        orderType: 'S',
        businesses: ['Airen Wholesale Depot'],
        totalAmount: total,
        sfcAmount: 0,
        deliveryFee: deliveryFee,
        courierName: selectedB2BMethod.name,
        paymentMethod: 'Instant Wholesale Bank Transfer',
        paymentReference: generatedPaymentRef,
        isB2B: true,
        buyerPharmacyName: currentPharmacy.name,
        buyerPcnLicense: currentPharmacy.pcnLicense,
        sellerDepotName: 'Airen Wholesale Depot',
        distanceKm: currentPharmacy.distanceKm,
        estimatedTransitTime: currentPharmacy.transitTime,
        waybillNumber: generatedWaybill,
      };

      const result = await addOrder(orderData);
      const createdOrder = (result as any).order;
      const orderRef = createdOrder?._id || `PSX-B2B-${Math.floor(100000 + Math.random() * 900000)}`;

      setConfirmedB2BOrder({
        waybillNumber: generatedWaybill,
        orderReference: orderRef,
        orderDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        buyerPharmacy: currentPharmacy,
        sellerDepot: {
          name: 'Airen Wholesale Pharmaceutical Depot',
          address: '18 Mission Road, Central Commercial District, Benin City, Edo State',
          phone: '+234 (0) 803 555 0192',
          email: 'dispatch@airenwholesale.com.ng',
          pcnLicense: 'PCN/W-ED/2019/8821',
          nafdacNumber: 'ED-WH-0922'
        },
        items: items.map(i => ({
          name: i.name,
          packForm: (i as any).packForm || 'Wholesale Pack · 10x10s',
          qty: i.quantity,
          price: i.price
        })),
        deliveryMethod: selectedB2BMethod.name,
        distanceKm: currentPharmacy.distanceKm,
        transitTime: currentPharmacy.transitTime,
        deliveryFee: deliveryFee,
        subtotal: subtotal,
        totalAmount: total,
        paymentMethod: 'Instant Wholesale Bank Transfer (Simulated)',
        paymentReference: generatedPaymentRef
      });

      clearCart();
      removePromo();
    } catch (err: any) {
      console.error('B2B simulated settlement error:', err);
      setError('Simulation failed to process. Please retry.');
    } finally {
      setIsSimulatingTransfer(false);
    }
  };

  useEffect(() => {
    const status = searchParams?.get('redirect_status');
    if (status === 'success' && postPaymentStatus === 'idle' && items.length > 0) {
      createOrderFromCart();
    }
  }, [searchParams, postPaymentStatus, items.length, createOrderFromCart]);


  const isReturningFromPayment = searchParams?.get('redirect_status') === 'success';

  if (items.length === 0 && postPaymentStatus === 'idle' && !showPostPaymentFlow && !confirmedB2BOrder) {
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

  const currentB2BPharmacy = DEMO_BENIN_PHARMACIES.find(p => p.id === selectedDemoPharmacyId) || DEMO_BENIN_PHARMACIES[0];

  return (
    <div className={`co-container ${b2bMode ? 'b2b-active' : ''}`}>
      {/* WHOLESALE PACKING SLIP / WAYBILL MODAL */}
      {showPackingSlipModal && confirmedB2BOrder && (
        <WholesalePackingSlip
          waybillNumber={confirmedB2BOrder.waybillNumber}
          orderReference={confirmedB2BOrder.orderReference}
          orderDate={confirmedB2BOrder.orderDate}
          buyerPharmacy={confirmedB2BOrder.buyerPharmacy}
          sellerDepot={confirmedB2BOrder.sellerDepot}
          items={confirmedB2BOrder.items}
          deliveryMethod={confirmedB2BOrder.deliveryMethod}
          distanceKm={confirmedB2BOrder.distanceKm}
          transitTime={confirmedB2BOrder.transitTime}
          deliveryFee={confirmedB2BOrder.deliveryFee}
          subtotal={confirmedB2BOrder.subtotal}
          totalAmount={confirmedB2BOrder.totalAmount}
          paymentMethod={confirmedB2BOrder.paymentMethod}
          paymentReference={confirmedB2BOrder.paymentReference}
          onClose={() => setShowPackingSlipModal(false)}
        />
      )}

      {/* POST-PAYMENT FLOW (FOR CONSUMER ORDERS) */}
      {showPostPaymentFlow && !b2bMode && (
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

      {/* ========================================================================= */}
      {/* B2B ORDER CONFIRMATION SCREEN (WHEN B2B ORDER IS CONFIRMED) */}
      {/* ========================================================================= */}
      {confirmedB2BOrder ? (
        <div className="co-b2b-confirmation-screen co-reveal visible">
          <div className="co-b2b-conf-badge">✓</div>
          <h2 className="co-b2b-conf-title">Wholesale Consignment Confirmed!</h2>
          <p className="co-b2b-conf-sub">
            Payment verified &amp; cleared via dedicated B2B escrow. Your wholesale order is queued for packing &amp; dispatch at Airen Mission Road Depot.
          </p>

          <div className="co-b2b-conf-card">
            <div className="co-b2b-conf-row">
              <span>Waybill Number:</span>
              <span className="val highlight">{confirmedB2BOrder.waybillNumber}</span>
            </div>
            <div className="co-b2b-conf-row">
              <span>Order Reference:</span>
              <span className="val">{confirmedB2BOrder.orderReference}</span>
            </div>
            <div className="co-b2b-conf-row">
              <span>Consignee (Buyer Pharmacy):</span>
              <span className="val">{confirmedB2BOrder.buyerPharmacy.name}</span>
            </div>
            <div className="co-b2b-conf-row">
              <span>Buyer Premise PCN License:</span>
              <span className="val">{confirmedB2BOrder.buyerPharmacy.pcnLicense}</span>
            </div>
            <div className="co-b2b-conf-row">
              <span>Dispatch Corridor:</span>
              <span className="val">Mission Rd Depot ➔ {confirmedB2BOrder.buyerPharmacy.address} ({confirmedB2BOrder.distanceKm} km)</span>
            </div>
            <div className="co-b2b-conf-row">
              <span>Logistics Delivery Method:</span>
              <span className="val">{confirmedB2BOrder.deliveryMethod} ({confirmedB2BOrder.transitTime})</span>
            </div>
            <div className="co-b2b-conf-row">
              <span>Payment Settlement:</span>
              <span className="val" style={{ color: '#16a34a' }}>{confirmedB2BOrder.paymentMethod} (100% Cleared)</span>
            </div>
            <div className="co-b2b-conf-row" style={{ borderTop: '1.5px dashed #cbd5e1', paddingTop: 10, marginTop: 4 }}>
              <span style={{ fontWeight: 800, fontSize: 13 }}>Total Consignment Paid:</span>
              <span className="val highlight" style={{ fontSize: 17, color: '#0f6e56' }}>₦{confirmedB2BOrder.totalAmount.toLocaleString()}</span>
            </div>
          </div>

          {/* PRIMARY PRINT PACKING SLIP BUTTON */}
          <button 
            className="co-print-waybill-btn"
            onClick={() => setShowPackingSlipModal(true)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>
            Print Wholesale Packing Slip / Waybill
          </button>

          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button 
              className="co-proceed-btn" 
              style={{ flex: 1, background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1' }}
              onClick={() => {
                setConfirmedB2BOrder(null);
                setView('findMedicines');
              }}
            >
              Order More Supplies
            </button>
            <button 
              className="co-proceed-btn" 
              style={{ flex: 1 }}
              onClick={() => setView('orders')}
            >
              Go to Orders Dashboard
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* HEADER */}
          <div className="co-header co-reveal">
            <button className="co-back-btn" onClick={() => setView('findMedicines')}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <div className="co-header-title">
              {b2bMode ? 'B2B Wholesale Checkout' : 'Confirm order'}
            </div>
            <button
              onClick={() => setB2bMode(!b2bMode)}
              style={{
                background: b2bMode ? '#0f6e56' : 'rgba(0,0,0,0.05)',
                color: b2bMode ? '#ffffff' : '#334155',
                border: 'none',
                borderRadius: '20px',
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
              title="Switch between Retail Consumer and B2B Wholesale Depot Mode"
            >
              <span>{b2bMode ? '🏢 Wholesale Mode' : '👤 Retail Mode'}</span>
            </button>
          </div>

          {/* B2B WHOLESALE DEPOT BANNER */}
          {b2bMode && (
            <div className="co-b2b-banner co-reveal d1">
              <div className="co-b2b-banner-left">
                <div className="co-b2b-crest">🏢</div>
                <div>
                  <div className="co-b2b-banner-title">Airen Wholesale Pharmaceutical Depot</div>
                  <div className="co-b2b-banner-sub">
                    Central Distribution Depot: 18 Mission Road, Benin City · Wholesale PCN Lic: <strong>PCN/W-ED/2019/8821</strong>
                  </div>
                </div>
              </div>
              <span style={{ fontSize: 10, background: 'rgba(255,255,255,0.2)', padding: '3px 8px', borderRadius: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
                Verified Depot
              </span>
            </div>
          )}

          {/* MEDICINES & WHOLESALE PACK FORM SECTION */}
          <div className="co-section co-reveal d2">
            <div className="co-sec-label">
              {b2bMode ? 'Wholesale Consignment Items' : 'Medicines'}
            </div>
            <div className="co-med-list">
              {items.map(item => (
                <div className="co-med-item" key={item.id}>
                  <div className="co-med-item-left">
                    <div className="co-med-item-dot" style={b2bMode ? { background: '#0f6e56' } : {}}></div>
                    <div>
                      <div className="co-med-item-name">{item.name}</div>
                      <div className="co-med-item-meta">
                        {item.quantity} {b2bMode ? 'pack(s)' : 'units'} · {item.activeIngredients}
                      </div>
                      {b2bMode && (
                        <span className="co-pack-badge">
                          📦 {(item as any).packForm || 'Wholesale Master Pack · 10x10s'}
                        </span>
                      )}
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

          {/* ========================================================================= */}
          {/* B2B: QUICK SELECTION OF 4 DEMO BENIN RETAIL PHARMACIES & HAULAGE ROUTE */}
          {/* ========================================================================= */}
          {b2bMode ? (
            <div className="co-section co-reveal d3">
              <div className="co-sec-label">Destination Retail Pharmacy (Benin City)</div>
              <p style={{ fontSize: 11.5, color: '#64748b', margin: '0 0 10px 0' }}>
                Quick-select one of the 4 verified Benin retail pharmacies to auto-populate premise address, PCN license, and live haulage distance:
              </p>

              {/* 4 DEMO BENIN PHARMACIES GRID */}
              <div className="co-demo-pharmacies-grid">
                {DEMO_BENIN_PHARMACIES.map((pharm) => {
                  const isSelected = selectedDemoPharmacyId === pharm.id;
                  return (
                    <div
                      key={pharm.id}
                      className={`co-demo-pharmacy-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => {
                        setSelectedDemoPharmacyId(pharm.id);
                        setPatientName(pharm.name);
                        setDeliveryAddress(pharm.address);
                        setDeliveryCity(pharm.city);
                        setDeliveryState(pharm.state);
                        setDeliveryPhone(pharm.phone);
                        setDeliveryEmail(pharm.email);
                        setBuyerPcnLicense(pharm.pcnLicense);
                      }}
                    >
                      <div className="co-demo-pharmacy-top">
                        <span className="co-demo-pharmacy-name">{pharm.name}</span>
                        <span className="co-demo-pharmacy-dist">📍 {pharm.distanceKm} km</span>
                      </div>
                      <div className="co-demo-pharmacy-addr">{pharm.address}, {pharm.city}</div>
                      <div className="co-demo-pharmacy-pcn">PCN: {pharm.pcnLicense}</div>
                    </div>
                  );
                })}
              </div>

              {/* REAL-TIME HAULAGE CORRIDOR & DISTANCE METRICS */}
              <div className="co-b2b-corridor-card">
                <div className="co-corridor-header">
                  <div className="co-corridor-title">
                    <span>🛣️ Airen Depot Haulage Corridor</span>
                  </div>
                  <span className="co-corridor-badge">Live Route Computed</span>
                </div>
                <div className="co-corridor-points">
                  <strong>Airen Depot (18 Mission Rd)</strong>
                  <span>➔</span>
                  <strong>{currentB2BPharmacy.name} ({currentB2BPharmacy.landmark})</strong>
                </div>
                <div className="co-corridor-stats">
                  <div className="co-corridor-stat">
                    <span className="co-cstat-lbl">Road Distance</span>
                    <span className="co-cstat-val">{currentB2BPharmacy.distanceKm} km</span>
                  </div>
                  <div className="co-corridor-stat">
                    <span className="co-cstat-lbl">Transit Time</span>
                    <span className="co-cstat-val">~{currentB2BPharmacy.transitTime}</span>
                  </div>
                  <div className="co-corridor-stat">
                    <span className="co-cstat-lbl">Destination PCN</span>
                    <span className="co-cstat-val" style={{ fontSize: 11, fontFamily: 'monospace' }}>{currentB2BPharmacy.pcnLicense}</span>
                  </div>
                </div>
              </div>

              {/* B2B DELIVERY METHODS SELECTION */}
              <div style={{ marginTop: 18 }}>
                <div className="co-sec-label">Available B2B Delivery &amp; Haulage Methods</div>
                <div className="co-b2b-delivery-grid">
                  {B2B_DELIVERY_METHODS.map((method) => {
                    const isSelected = b2bDeliveryMethodId === method.id;
                    return (
                      <div
                        key={method.id}
                        className={`co-b2b-delivery-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => setB2bDeliveryMethodId(method.id)}
                      >
                        <div className="co-b2b-del-left">
                          <div className="co-b2b-del-icon">{method.icon}</div>
                          <div>
                            <div className="co-b2b-del-title">
                              <span>{method.name}</span>
                              <span className="co-b2b-del-eta">⏱️ {method.eta}</span>
                            </div>
                            <div className="co-b2b-del-desc">{method.description}</div>
                          </div>
                        </div>
                        <div className={`co-b2b-del-price ${method.fee === 0 ? 'free' : ''}`}>
                          {method.fee === 0 ? 'FREE' : `₦${method.fee.toLocaleString()}`}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* CONTACT & PHARMACY LICENSE DETAILS */}
              <div style={{ marginTop: 18 }}>
                <div className="co-sec-label">Consignee Pharmacy Details</div>
                <div className="co-patient-info-grid">
                  <input 
                    className="co-info-field" 
                    type="text" 
                    placeholder="Pharmacy Name" 
                    value={patientName} 
                    onChange={e => setPatientName(e.target.value)} 
                  />
                  <input 
                    className="co-info-field" 
                    type="text" 
                    placeholder="PCN Premise License" 
                    value={buyerPcnLicense} 
                    onChange={e => setBuyerPcnLicense(e.target.value)} 
                  />
                  <input 
                    className="co-info-field" 
                    type="tel" 
                    placeholder="Phone number" 
                    value={deliveryPhone} 
                    onChange={e => setDeliveryPhone(e.target.value)} 
                  />
                  <input 
                    className="co-info-field" 
                    type="email" 
                    placeholder="Email for packing slip" 
                    value={deliveryEmail} 
                    onChange={e => setDeliveryEmail(e.target.value)} 
                  />
                </div>
              </div>
            </div>
          ) : (
            /* ========================================================================= */
            /* CONSUMER: DOORSTEP DELIVERY DESTINATION & LIVE COURIER SELECTION */
            /* ========================================================================= */
            <div className="co-section co-reveal d3">
              <div className="co-sec-label">Doorstep Delivery Destination</div>
              <div id="addressSection" style={{display: 'flex', flexDirection: 'column', gap: 12}}>
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
            </div>
          )}

          {/* CONSUMER CONTACT & PATIENT INFO */}
          {!b2bMode && (
            <>
              <div className="co-section co-reveal d3">
                <div className="co-sec-label">Contact information</div>
                <div className="co-patient-info-grid">
                  <input className="co-info-field" type="tel" placeholder="Phone number" value={deliveryPhone} onChange={e => setDeliveryPhone(e.target.value)} />
                  <input className="co-info-field" type="email" placeholder="Email for receipt" value={deliveryEmail} onChange={e => setDeliveryEmail(e.target.value)} />
                </div>
              </div>

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
            </>
          )}

          {/* PROMO CODE (CONSUMER) */}
          {!b2bMode && (
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
          )}

          {/* PRE-ORDER SUMMARY */}
          <div className="co-section co-reveal d6">
            <div className="co-sec-label">
              {b2bMode ? 'Wholesale Consignment Summary' : 'Order summary'}
            </div>
            <div className="co-summary-rows">
              <div className="co-summary-row">
                <div className="co-summary-label">
                  {b2bMode ? 'Wholesale Packs Subtotal' : 'Items Subtotal'}
                </div>
                <div className="co-summary-value">₦{subtotal.toLocaleString()}</div>
              </div>

              {discountAmount > 0 && (
                <div className="co-summary-row">
                  <div className="co-summary-label">Promo Discount</div>
                  <div className="co-summary-value green">-₦{discountAmount.toLocaleString()}</div>
                </div>
              )}

              <div className="co-summary-row">
                <div className="co-summary-label">
                  {b2bMode ? 'Haulage / Logistics Fee' : 'Delivery Fee'}
                </div>
                <div className="co-summary-value">{deliveryFee === 0 ? 'Free' : `₦${deliveryFee.toLocaleString()}`}</div>
              </div>

              {deliveryDiscount > 0 && (
                <div className="co-summary-row">
                  <div className="co-summary-label">Delivery Discount</div>
                  <div className="co-summary-value green">-₦{deliveryDiscount.toLocaleString()}</div>
                </div>
              )}

              {b2bMode ? (
                <div className="co-summary-row">
                  <div className="co-summary-label">B2B Wholesale Regulatory Levy (GDP)</div>
                  <div className="co-summary-value green">₦0 (Exempted)</div>
                </div>
              ) : (
                <>
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
                </>
              )}
            </div>

            <div className="co-summary-total-row">
              <div className="co-summary-total-label">
                {b2bMode ? 'Total Consignment Cost' : 'Total'}
              </div>
              <div className="co-summary-total-value">₦{total.toLocaleString()}</div>
            </div>
          </div>

          {/* PAYMENT & PROCEED SECTION */}
          <div className="co-proceed-section co-reveal d7">
            {b2bMode ? (
              <div>
                {/* B2B PAYMENT METHOD TABS */}
                <div className="co-b2b-pay-tabs">
                  <div
                    className={`co-b2b-pay-tab ${b2bPaymentMethod === 'bank_transfer' ? 'active' : ''}`}
                    onClick={() => setB2bPaymentMethod('bank_transfer')}
                  >
                    ⚡ Instant Wholesale Bank Transfer
                  </div>
                  <div
                    className={`co-b2b-pay-tab ${b2bPaymentMethod === 'paystack' ? 'active' : ''}`}
                    onClick={() => setB2bPaymentMethod('paystack')}
                  >
                    💳 Paystack Online Checkout
                  </div>
                </div>

                {b2bPaymentMethod === 'bank_transfer' ? (
                  <div className="co-b2b-virtual-account-box">
                    <div className="co-va-header">
                      <span className="co-va-title">🏛️ Dedicated Depot Virtual Settlement Account</span>
                      <span className="co-va-badge">Instant Verification</span>
                    </div>
                    <div className="co-va-details-grid">
                      <div className="co-va-item">
                        <span className="co-va-label">Bank Name</span>
                        <span className="co-va-value">Moniepoint MFB / Providus</span>
                      </div>
                      <div className="co-va-item">
                        <span className="co-va-label">Account Name</span>
                        <span className="co-va-value">Airen Wholesale Depot / PSX Escrow</span>
                      </div>
                      <div className="co-va-item" style={{ gridColumn: 'span 2' }}>
                        <span className="co-va-label">Dedicated Virtual Account Number</span>
                        <span className="co-va-value number">8035550192</span>
                      </div>
                      <div className="co-va-item">
                        <span className="co-va-label">Amount to Transfer</span>
                        <span className="co-va-value highlight">₦{total.toLocaleString()}</span>
                      </div>
                      <div className="co-va-item">
                        <span className="co-va-label">Payment Ref</span>
                        <span className="co-va-value" style={{ fontFamily: 'monospace', fontSize: 11 }}>AIR-ESCROW-{(currentB2BPharmacy.id).toUpperCase()}</span>
                      </div>
                    </div>

                    <button
                      className="co-b2b-simulate-btn"
                      onClick={handleSimulateBankTransfer}
                      disabled={isSimulatingTransfer || !isFormValid}
                    >
                      {isSimulatingTransfer ? (
                        <>
                          <CircularProgress size={18} sx={{ color: 'white' }} />
                          <span>Verifying Depot Settlement...</span>
                        </>
                      ) : (
                        <>
                          <span>⚡ Complete Instant Transfer (Simulate Instant Settlement)</span>
                        </>
                      )}
                    </button>
                    <div style={{ textAlign: 'center', fontSize: 11, color: '#64748b', marginTop: 8 }}>
                      Instant settlement generates verified waybill reference and opens printable packing slip.
                    </div>
                  </div>
                ) : (
                  <div>
                    <PaystackButton
                      total={total}
                      deliveryOption={b2bDeliveryMethodId}
                      courierName={B2B_DELIVERY_METHODS.find(m => m.id === b2bDeliveryMethodId)?.name}
                      orderType={actualOrderType}
                      uniquePharmacies={['Airen Wholesale Depot']}
                      subtotal={subtotal}
                      deliveryFee={deliveryFee}
                      sfcAmount={0}
                      sfcDiscount={0}
                      discountAmount={discountAmount}
                      deliveryDiscount={deliveryDiscount}
                      promoCode={activePromo?.code}
                      patientName={patientName}
                      patientAge={'35'}
                      patientCondition={'B2B Wholesale Pharmacy Restocking Order'}
                      deliveryPhone={deliveryPhone}
                      deliveryEmail={deliveryEmail}
                      deliveryAddress={deliveryAddress}
                      deliveryCity={deliveryCity}
                      deliveryState={deliveryState}
                      isFormValid={isFormValid}
                      redirectPath={typeof window !== 'undefined' && activePartnerSlug ? `${window.location.pathname}?view=confirmOrder&slug=${activePartnerSlug}` : undefined}
                    />
                  </div>
                )}
                <div className="co-secure-note" style={{ marginTop: 10 }}>
                  🔒 Official B2B Wholesale Escrow · PCN &amp; NAFDAC GDP Monitored
                </div>
              </div>
            ) : (
              <div>
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
                  redirectPath={typeof window !== 'undefined' && activePartnerSlug ? `${window.location.pathname}?view=confirmOrder&slug=${activePartnerSlug}` : undefined}
                />
                <div className="co-secure-note">🔒 Secured by Paystack · Your payment is protected</div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

