'use client';

import React from 'react';
import { usePaystackPayment } from 'react-paystack';
import { Button } from '@mui/material';
import { useSession } from '../context/SessionProvider';
import { useCart } from '../contexts/CartContext';
import { useOrders } from '../contexts/OrderContext';
import { useRouter } from 'next/navigation';
import { event } from '../lib/gtag';
import { useTrack } from '../hooks/useTrack';


interface PaystackButtonProps {
  total: number;
  deliveryOption: 'standard' | 'express' | 'pickup';
  orderType: 'S' | 'MN' | 'MP';
  uniquePharmacies: string[];
  subtotal: number;
  deliveryFee: number;
  sfcAmount: number;
  sfcDiscount: number;
  discountAmount: number;
  deliveryDiscount: number;
  promoCode?: string;
  patientName: string;
  patientAge: string;
  patientCondition: string;
  deliveryPhone: string;
  deliveryEmail: string;
  deliveryAddress: string;
  deliveryCity: string;
  deliveryState: string;
  isFormValid: boolean;
  redirectPath?: string; // where to go after successful payment, defaults to /?view=confirmOrder
}

const PaystackButton: React.FC<PaystackButtonProps> = (props) => {
  const { user } = useSession();
  const { items } = useCart();
  const router = useRouter();
  const { track } = useTrack();
  const [closedWithoutPaying, setClosedWithoutPaying] = React.useState(false);

  const config = {
    reference: `psx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    email: props.deliveryEmail,
    amount: props.total * 100,
    publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '',
    metadata: {
      custom_fields: [
        { display_name: "Patient Name", variable_name: "patient_name", value: props.patientName },
        { display_name: "Patient Age", variable_name: "patient_age", value: props.patientAge },
        { display_name: "Delivery Option", variable_name: "delivery_option", value: props.deliveryOption },
        { display_name: "Order Type", variable_name: "order_type", value: props.orderType },
        { display_name: "Promo Code", variable_name: "promo_code", value: props.promoCode || 'N/A' },
        { display_name: "Subtotal", variable_name: "subtotal", value: `₦${props.subtotal.toLocaleString()}` },
        { display_name: "Delivery Fee", variable_name: "delivery_fee", value: `₦${props.deliveryFee.toLocaleString()}` },
        { display_name: "Service Fee", variable_name: "sfc_amount", value: `₦${props.sfcAmount.toLocaleString()}` },
        { display_name: "Discount", variable_name: "discount", value: `₦${props.discountAmount.toLocaleString()}` },
        { display_name: "Delivery Discount", variable_name: "delivery_discount", value: `₦${props.deliveryDiscount.toLocaleString()}` },
        { display_name: "SFC Discount", variable_name: "sfc_discount", value: `₦${props.sfcDiscount.toLocaleString()}` },
        { display_name: "Total Paid", variable_name: "total_paid", value: `₦${props.total.toLocaleString()}` },
        ...items.map((item, index) => ({
          display_name: `Item ${index + 1}`,
          variable_name: `item_${index + 1}`,
          value: `${item.name} (x${item.quantity}) - ${item.pharmacy}`
        }))
      ]
    }
  };

  const initializePayment = usePaystackPayment(config);

  const onSuccess = (reference: any) => {
    console.log('Payment successful. Reference:', reference.reference);
    const dest = props.redirectPath || '/?view=confirmOrder';
    router.push(`${dest}${dest.includes('?') ? '&' : '?'}redirect_status=success`);
  };

  const onClose = () => {
    setClosedWithoutPaying(true);
    setTimeout(() => setClosedWithoutPaying(false), 4000);
  };

  const handleCheckout = () => {
    console.log('Initiating Paystack checkout...', { 
      amount: props.total, 
      email: props.deliveryEmail,
      keyUsed: config.publicKey.substring(0, 10) + '...'
    });
    
    event({
      action: 'begin_checkout',
      category: 'ecommerce',
      label: 'Paid Checkout',
      value: props.total,
    });
    track('payment_initiated', 'PaystackButton', props.deliveryOption, { total: props.total, state: props.deliveryState });
    initializePayment({ onSuccess, onClose });
  };

  const getButtonText = () => {
    if (!user) return 'Please log in to check out';
    if (!props.isFormValid) return 'Please fill in delivery info';
    return 'Proceed to Checkout';
  }

  return (
    <>
    {closedWithoutPaying && (
      <div style={{ marginBottom: 12, padding: '10px 16px', background: '#fff8e1', border: '1px solid #ffe082', borderRadius: 10, fontSize: 13, color: '#7a5c00', textAlign: 'center' }}>
        Payment was not completed. Your cart is still saved — try again when ready.
      </div>
    )}
    <Button
      fullWidth
      variant="contained"
      size="large"
      onClick={handleCheckout}
      disabled={!user || !props.isFormValid}
      sx={{
        background: 'linear-gradient(135deg, #006D5B 0%, #004D40 100%)',
        borderRadius: '12px',
        py: 1.5,
        textTransform: 'none',
        fontWeight: 600,
        fontSize: '1.1rem',
        boxShadow: '0 4px 16px rgba(0, 109, 91, 0.3)',
        '&:hover': {
          background: 'linear-gradient(135deg, #004D40 0%, #00332B 100%)',
          boxShadow: '0 6px 20px rgba(0, 109, 91, 0.4)',
        },
        '&.Mui-disabled': {
          background: '#d0d0d0',
          boxShadow: 'none',
          color: '#888'
        }
      }}
    >
      {getButtonText()}
    </Button>
    </>
  );
};

export default PaystackButton;
