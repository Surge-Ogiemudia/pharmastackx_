'use client';

import React from 'react';
import { usePaystackPayment } from 'react-paystack';
import { Button } from '@mui/material';
import { useSession } from '../context/SessionProvider';
import { useCart } from '../contexts/CartContext';
import { useOrders } from '../contexts/OrderContext';
import { useRouter } from 'next/navigation';
import { event } from '../lib/gtag';


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
}

const PaystackButton: React.FC<PaystackButtonProps> = (props) => {
  const { user } = useSession();
  const { items } = useCart(); // Removed clearCart as it's no longer called here
  const router = useRouter();

  const config = {
    reference: new Date().getTime().toString(),
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
    // We don't create the order here anymore.
    // Instead, we redirect to the same page with a success flag.
    console.log('Payment successful. Reference:', reference.reference);
    
    // Construct the new URL. This assumes we are already on the page that shows the cart.
    const currentPath = window.location.pathname;
    const newUrl = `${currentPath}?redirect_status=success`;
    
    // We don't clear the cart here. The cart page will do it after creating the order.
    router.push(newUrl);
  };

  const onClose = () => {
    console.log('Payment modal closed');
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
    initializePayment({ onSuccess, onClose });
  };

  const getButtonText = () => {
    if (!user) return 'Please log in to check out';
    if (!props.isFormValid) return 'Please fill in delivery info';
    return 'Proceed to Checkout';
  }

  return (
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
  );
};

export default PaystackButton;
