'use client'

import React, { createContext, useContext, useState, ReactNode, useEffect, useRef, useCallback } from 'react';
import { useSession } from '@/context/SessionProvider';

export interface CartItem {
  id: string; 
  name: string;
  image: string;
  activeIngredients: string;
  drugClass: string;
  price: number;
  pharmacy: string;
  quantity: number;
  isQuoteItem?: boolean;
  quoteId?: string;
}

interface CartContextType {
  items: CartItem[];
  requestId: string | null;
  quoteId: string | null;
  addToCart: (item: Omit<CartItem, 'quantity'>) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  setRequestInfo: (requestId: string, quoteId: string) => void;
  initializeCart: (items: CartItem[], requestId: string, quoteId: string, skipSync?: boolean) => void;
  fetchCartFromDB: () => Promise<void>;
  getTotalItems: () => number;
  getTotalPrice: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, isLoading: isSessionLoading } = useSession();
  const [items, setItems] = useState<CartItem[]>([]);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [quoteId, setQuoteId] = useState<string | null>(null);
  const prevUserIdRef = useRef<string | null>(null);
  const isInitializedRef = useRef(false);

  const clearCart = useCallback(() => {
    setItems([]);
    setRequestId(null);
    setQuoteId(null);
    localStorage.removeItem('cart');
    localStorage.removeItem('requestId');
    localStorage.removeItem('quoteId');
    localStorage.removeItem('cartOwnerId');
  }, []);

  const setRequestInfo = useCallback((reqId: string, qId: string) => {
    setRequestId(reqId);
    setQuoteId(qId);
  }, []);

  const syncDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const syncWithDB = useCallback(async (newItems: CartItem[], currentReqId?: string, currentQuoteId?: string) => {
    const rId = currentReqId || requestId;
    const qId = currentQuoteId || quoteId;
    
    if (!user?._id || !rId || !qId) return;
    
    if (syncDebounceRef.current) clearTimeout(syncDebounceRef.current);
    
    syncDebounceRef.current = setTimeout(async () => {
      try {
        console.log(`[Sync] Sending ${newItems.length} items to DB for request ${rId}`);
        await fetch(`/api/requests/${rId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            action: 'update-quote-items', 
            items: newItems.map(item => ({
              name: item.name,
              price: item.price,
              pharmacyQuantity: item.quantity,
              isAvailable: true
            }))
          }),
        });
      } catch (err) {
        console.error('Failed to sync cart with DB:', err);
      }
    }, 500);
  }, [user?._id, requestId, quoteId]);

  const initializeCart = useCallback((newItems: CartItem[], newRequestId: string, newQuoteId: string, skipSync: boolean = false) => {
     setItems(newItems);
     setRequestId(newRequestId);
     setQuoteId(newQuoteId);
     
     localStorage.setItem('cart', JSON.stringify(newItems));
     localStorage.setItem('requestId', newRequestId);
     localStorage.setItem('quoteId', newQuoteId);
     if (user?._id) {
       localStorage.setItem('cartOwnerId', user._id);
     }

     if (!skipSync) {
       syncWithDB(newItems, newRequestId, newQuoteId);
     }
  }, [user?._id, syncWithDB]);

  const fetchCartFromDB = useCallback(async () => {
    if (!user?._id) return;
    
    try {
      console.log("[Cart] Fetching cart from DB for user:", user._id);
      const res = await fetch(`/api/requests?userId=${user._id}`, { cache: 'no-store' });
      if (res.ok) {
        const requests = await res.json();
        const activeRequest = requests.find((r: any) => r.status === 'awaiting-confirmation');
        
        if (activeRequest) {
          const acceptedQuote = activeRequest.quotes.find((q: any) => q.status === 'accepted');
          if (acceptedQuote) {
            console.log("[Cart] Found awaiting-confirmation request with accepted quote. Loading items...");
            const dbItems = acceptedQuote.items.map((item: any) => ({
              id: `${item.productId || item.name}-${acceptedQuote._id}`,
              name: item.name,
              price: item.price,
              quantity: item.pharmacyQuantity || 1,
              image: '', 
              activeIngredients: item.strength || '',
              pharmacy: acceptedQuote.pharmacy.name || 'Pharmacy',
              drugClass: 'From Quote',
              isQuoteItem: true,
              quoteId: acceptedQuote._id
            }));
            
            initializeCart(dbItems, activeRequest._id, acceptedQuote._id, true);
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch cart from DB:', err);
    }
  }, [user?._id, initializeCart]);

  useEffect(() => {
    if (!isSessionLoading) {
      const currentUserId = user?._id || null;
      if (!isInitializedRef.current) {
        if (currentUserId) {
          fetchCartFromDB();
        } else {
          const savedCart = localStorage.getItem('cart');
          if (savedCart) {
            try {
              setItems(JSON.parse(savedCart));
              const savedRequestId = localStorage.getItem('requestId');
              const savedQuoteId = localStorage.getItem('quoteId');
              if (savedRequestId) setRequestId(savedRequestId);
              if (savedQuoteId) setQuoteId(savedQuoteId);
            } catch (e) {
              clearCart();
            }
          }
        }
        isInitializedRef.current = true;
      } else {
        if (prevUserIdRef.current && !currentUserId) {
          setItems([]);
          setRequestId(null);
          setQuoteId(null);
        }
        else if (prevUserIdRef.current && currentUserId && prevUserIdRef.current !== currentUserId) {
          clearCart();
          fetchCartFromDB();
        }
        else if (!prevUserIdRef.current && currentUserId) {
          fetchCartFromDB();
        }
      }
      prevUserIdRef.current = currentUserId;
    }
  }, [user?._id, isSessionLoading, clearCart, fetchCartFromDB]);

  useEffect(() => {
    if (isInitializedRef.current && items.length > 0) {
      localStorage.setItem('cart', JSON.stringify(items));
      if (user?._id) {
        localStorage.setItem('cartOwnerId', user._id);
      }
    }
  }, [items, user?._id]);

  useEffect(() => {
    if (isInitializedRef.current) {
      if (requestId) localStorage.setItem('requestId', requestId);
      if (quoteId) localStorage.setItem('quoteId', quoteId);
    }
  }, [requestId, quoteId]);

  const addToCart = (item: Omit<CartItem, 'quantity'>) => {
    setItems(prevItems => {
      const existingItem = prevItems.find(i => i.id === item.id);
      let updated;
      if (existingItem) {
        updated = prevItems.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      } else {
        updated = [...prevItems, { ...item, quantity: 1 }];
      }
      syncWithDB(updated);
      return updated;
    });
    
    if (item.isQuoteItem && item.quoteId) {
        const associatedRequestId = localStorage.getItem('currentRequestId');
        if (associatedRequestId) setRequestInfo(associatedRequestId, item.quoteId);
    }
  };

  const removeFromCart = (id: string) => {
    setItems(prevItems => {
      const updated = prevItems.filter(item => item.id !== id);
      syncWithDB(updated);
      return updated;
    });
  };

  const updateQuantity = (id: string, quantity: number) => {
    setItems(prevItems => {
      const updated = prevItems.map(item => item.id === id ? { ...item, quantity: Math.max(0, quantity) } : item)
        .filter(i => i.quantity > 0);
      syncWithDB(updated);
      return updated;
    });
  };

  const getTotalItems = () => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  };
  
  const getTotalPrice = () => {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  return (
    <CartContext.Provider value={{ items, requestId, quoteId, addToCart, removeFromCart, updateQuantity, clearCart, setRequestInfo, initializeCart, fetchCartFromDB, getTotalItems, getTotalPrice }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
