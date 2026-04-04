'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Define the shape of an Order object
// This should match the data coming from your API
export interface Order {
  _id: string; // MongoDB typically uses _id
  id: string; // You might have a separate friendly ID
  date: string;
  status: 'Pending' | 'Accepted' | 'Dispatched' | 'In Transit' | 'Completed' | 'Cancelled';
  
  // User & Patient Information
  user: { name: string; phone: string; email: string };
  
  // Delivery Information (assuming it comes with the order object)
  deliveryAddress?: string;

  // Order Contents
  items: { name: string; qty: number }[];
  businesses: { name: string; address?: string; phone?: string }[];
  orderType: string;
  deliveryOption: string;
  
  // Financials
  totalAmount: number;

  // Timestamps from the backend
  createdAt: string;
  acceptedAt?: string;
  dispatchedAt?: string;
  pickedUpAt?: string;
  completedAt?: string;
}

interface OrderContextType {
  orders: Order[];
  loading: boolean;
  addOrder: (orderData: any) => Promise<{ success: boolean; order?: Order; message: string; }>;
  updateOrderStatus: (orderId: string, status: Order['status']) => Promise<void>;
  getOrderById: (orderId: string) => Order | undefined;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const useOrders = () => {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrders must be used within an OrderProvider');
  }
  return context;
};

interface OrderProviderProps {
  children: ReactNode;
}

export const OrderProvider: React.FC<OrderProviderProps> = ({ children }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch initial orders from the database when the provider mounts
  useEffect(() => {
    // Phase 1: Instant Hydration from localStorage
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('psx_cached_orders');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            setOrders(parsed);
            setLoading(false); // Enable instant UI!
          }
        } catch (e) {
          console.error("Order Cache Error:", e);
        }
      }
    }

    const fetchOrders = async () => {
      try {
        // If we don't have orders from cache, show loading.
        // If we have cached orders, revalidate in background.
        setLoading(prev => prev && orders.length === 0);
        
        const response = await fetch('/api/orders');
        if (!response.ok) {
          throw new Error('Failed to fetch orders');
        }
        const data = await response.json();
        setOrders(data);
        
        // Phase 2: Update Cache
        if (typeof window !== 'undefined') {
          localStorage.setItem('psx_cached_orders', JSON.stringify(data));
        }
      } catch (error) {
        console.error('Error fetching orders:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const addOrder = async (orderData: any): Promise<{ success: boolean; order?: Order; message: string; }> => {
    try {
      // The orderData object now contains everything, including optional requestId and quoteId
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        const errorBody = await response.json();
        // Provide a more specific error message if available
        throw new Error(errorBody.message || 'Failed to save order to the database. The server returned an error.');
      }

      const newOrder = await response.json();
      
      // Add the newly created order to the local state and sync cache
      setOrders(prev => {
        const updated = [newOrder, ...prev];
        if (typeof window !== 'undefined') {
          localStorage.setItem('psx_cached_orders', JSON.stringify(updated));
        }
        return updated;
      }); 
      
      // Return the full new order object on success
      return { success: true, order: newOrder, message: 'Order created successfully.' };

    } catch (error) {
      console.error('Error in addOrder:', error);

      // Ensure a consistent error object is returned
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred while creating the order.';
      return { success: false, message: errorMessage };
    }
  };

  // This function now saves status changes to the backend
  const updateOrderStatus = async (orderId: string, status: Order['status']) => {
    try {
      const response = await fetch('/api/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status }),
      });

      if (!response.ok) {
        throw new Error('Failed to update order status');
      }

      const updatedOrder = await response.json();

      // Update the local state and sync cache
      setOrders(prev => {
        const updated = prev.map(order =>
          order._id === orderId ? { ...order, ...updatedOrder } : order
        );
        if (typeof window !== 'undefined') {
          localStorage.setItem('psx_cached_orders', JSON.stringify(updated));
        }
        return updated;
      });
    } catch (error) {
      console.error('Error updating order status:', error);
      // Optionally, you could add state to show an error in the UI
    }
  };

  const getOrderById = (orderId: string) => {
    return orders.find(order => order._id === orderId);
  };

  const value: OrderContextType = {
    orders,
    loading,
    addOrder,
    updateOrderStatus,
    getOrderById,
  };

  return (
    <OrderContext.Provider value={value}>
      {children}
    </OrderContext.Provider>
  );
};
