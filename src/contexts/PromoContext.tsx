'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface Promo {
  id: number;
  code: string;
  type: 'percentage' | 'fixed_amount' | 'delivery_free' | 'all_discount' | 'all_free';
  discount: number;
  description: string;
  isActive: boolean;
  usageCount: number;
  maxUses: number;
  expiryDate: string;
  minOrderAmount?: number;
}

interface PromoContextType {
  promos: Promo[];
  activePromo: Promo | null;
  addPromo: (promo: Omit<Promo, 'id' | 'usageCount'>) => void;
  updatePromo: (id: number, updates: Partial<Promo>) => void;
  deletePromo: (id: number) => void;
  togglePromoStatus: (id: number) => void;
  applyPromo: (code: string) => { success: boolean; message: string };
  removePromo: () => void;
  validatePromo: (code: string, orderAmount: number) => { valid: boolean; message: string };
  calculateDiscount: (orderAmount: number, deliveryFee: number, sfcAmount: number) => { 
    discountAmount: number; 
    deliveryDiscount: number; 
    sfcDiscount: number;
    finalTotal: number; 
  };
}

const PromoContext = createContext<PromoContextType | undefined>(undefined);

export const usePromo = () => {
  const context = useContext(PromoContext);
  if (!context) {
    throw new Error('usePromo must be used within a PromoProvider');
  }
  return context;
};

interface PromoProviderProps {
  children: ReactNode;
}

export const PromoProvider: React.FC<PromoProviderProps> = ({ children }) => {
  const [promos, setPromos] = useState<Promo[]>([
    {
      id: 1,
      code: 'DELIVERYOFF',
      type: 'delivery_free',
      discount: 0,
      description: 'Free delivery on all orders',
      isActive: true,
      usageCount: 45,
      maxUses: 100,
      expiryDate: '2025-12-31',
      minOrderAmount: 100
    },
    {
      id: 2,
      code: 'SAVE20',
      type: 'percentage',
      discount: 20,
      description: '20% off on all medicines',
      isActive: true,
      usageCount: 28,
      maxUses: 50,
      expiryDate: '2025-11-30',
      minOrderAmount: 500
    },
    {
      id: 3,
      code: 'FLAT500',
      type: 'fixed_amount',
      discount: 500,
      description: '₦500 off on orders above ₦3000',
      isActive: true,
      usageCount: 15,
      maxUses: 30,
      expiryDate: '2025-11-15',
      minOrderAmount: 3000
    },
    {
      id: 4,
      code: 'ALLFREE',
      type: 'all_free',
      discount: 0,
      description: 'Everything is free - Premium promo',
      isActive: true,
      usageCount: 0,
      maxUses: 5,
      expiryDate: '2025-12-31',
      minOrderAmount: 100
    }
  ]);
  
  const [activePromo, setActivePromo] = useState<Promo | null>(null);

  const addPromo = (newPromo: Omit<Promo, 'id' | 'usageCount'>) => {
    const promo: Promo = {
      ...newPromo,
      id: Date.now(),
      usageCount: 0,
    };
    setPromos(prev => [...prev, promo]);
  };

  const validatePromo = (code: string, orderAmount: number) => {
    const promo = promos.find(p => p.code.toUpperCase() === code.toUpperCase());
    
    if (!promo) {
      return { valid: false, message: 'Invalid promo code' };
    }
    
    if (!promo.isActive) {
      return { valid: false, message: 'This promo code is no longer active' };
    }
    
    if (promo.usageCount >= promo.maxUses) {
      return { valid: false, message: 'This promo code has reached its usage limit' };
    }
    
    const expiryDate = new Date(promo.expiryDate);
    if (expiryDate < new Date()) {
      return { valid: false, message: 'This promo code has expired' };
    }
    
    if (promo.minOrderAmount && orderAmount < promo.minOrderAmount) {
      return { 
        valid: false, 
        message: `Minimum order amount of ₦${promo.minOrderAmount.toLocaleString()} required` 
      };
    }
    
    return { valid: true, message: 'Promo code is valid' };
  };

  const applyPromo = (code: string) => {
    const promo = promos.find(p => p.code.toUpperCase() === code.toUpperCase());
    
    if (!promo) {
      return { success: false, message: 'Invalid promo code' };
    }

    setActivePromo(promo);
    
    setPromos(prev => 
      prev.map(p => 
        p.id === promo.id 
          ? { ...p, usageCount: p.usageCount + 1 }
          : p
      )
    );
    
    return { success: true, message: `Promo "${promo.description}" applied successfully!` };
  };

  const removePromo = () => {
    if (activePromo) {
      setPromos(prev => 
        prev.map(p => 
          p.id === activePromo.id 
            ? { ...p, usageCount: Math.max(0, p.usageCount - 1) }
            : p
        )
      );
    }
    setActivePromo(null);
  };

  const updatePromo = (id: number, updates: Partial<Promo>) => {
    setPromos(prev => 
      prev.map(p => 
        p.id === id 
          ? { ...p, ...updates }
          : p
      )
    );
  };

  const deletePromo = (id: number) => {
    if (activePromo && activePromo.id === id) {
      setActivePromo(null);
    }
    setPromos(prev => prev.filter(p => p.id !== id));
  };

  const togglePromoStatus = (id: number) => {
    setPromos(prev => 
      prev.map(p => 
        p.id === id 
          ? { ...p, isActive: !p.isActive }
          : p
      )
    );
    
    if (activePromo && activePromo.id === id) {
      setActivePromo(null);
    }
  };

  const calculateDiscount = (orderAmount: number, deliveryFee: number, sfcAmount: number) => {
    if (!activePromo) {
      return { discountAmount: 0, deliveryDiscount: 0, sfcDiscount: 0, finalTotal: orderAmount + deliveryFee + sfcAmount };
    }

    let discountAmount = 0;
    let deliveryDiscount = 0;
    let sfcDiscount = 0;

    switch (activePromo.type) {
      case 'percentage':
        discountAmount = (orderAmount * activePromo.discount) / 100;
        break;
      case 'fixed_amount':
        discountAmount = Math.min(activePromo.discount, orderAmount);
        break;
      case 'delivery_free':
        deliveryDiscount = deliveryFee;
        break;
      case 'all_discount':
        discountAmount = (orderAmount * activePromo.discount) / 100;
        deliveryDiscount = deliveryFee;
        break;
      case 'all_free':
        discountAmount = orderAmount;
        deliveryDiscount = deliveryFee;
        sfcDiscount = sfcAmount;
        break;
    }

    const finalTotal = orderAmount - discountAmount + deliveryFee - deliveryDiscount + sfcAmount - sfcDiscount;

    return { 
      discountAmount, 
      deliveryDiscount, 
      sfcDiscount,
      finalTotal: Math.max(0, finalTotal)
    };
  };

  const value: PromoContextType = {
    promos,
    activePromo,
    addPromo,
    updatePromo,
    deletePromo,
    togglePromoStatus,
    applyPromo,
    removePromo,
    validatePromo,
    calculateDiscount,
  };

  return (
    <PromoContext.Provider value={value}>
      {children}
    </PromoContext.Provider>
  );
};