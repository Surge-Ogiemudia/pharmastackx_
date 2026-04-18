import React, { useState, useEffect, Suspense } from 'react';
import {
  Box,
  CircularProgress,
  Typography,
  Alert,
  Container,
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { useOrders, Order } from '../contexts/OrderContext';
import { useSession } from '@/context/SessionProvider';
import dynamic from 'next/dynamic';
import DotCanvas from './DotCanvas';
import { useRouter } from 'next/navigation';
import './Orders.css';

// Dynamic Imports for Code Splitting
const OrderRequestsContent = dynamic(() => import('./OrderRequestsContent'), {
  loading: () => <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress sx={{ color: 'var(--green)' }} /></Box>
});
const BlogCenter = dynamic(() => import('./BlogCenter'), {
  loading: () => <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress sx={{ color: 'var(--green)' }} /></Box>
});

interface OrdersContentProps {
  setView?: (view: string) => void;
  setSelectedRequestId?: (id: string) => void;
  initialViewMode?: 'dashboard' | 'list' | 'detail' | 'pharmacist' | 'store' | 'restock' | 'pulse-admin' | 'orders-list' | 'requests-list';
  backToView?: string;
}

const ActivityDashboardView = ({ 
  onSelectOrdersManagement,
  onSelectProfessional, 
  onSelectStore,
  onSelectRestock,
  onSelectGodMode,
  onSelectPulseAdmin,
  onSelectReadPulse,
  onSelectLearning,
  isPharmacist, 
  isClinic,
  isAdmin,
  pendingQuotesCount, 
  onBack,
  isActivityCentreEnabled,
  isPulseEnabled,
}: { 
  onSelectOrdersManagement: () => void,
  onSelectProfessional: () => void, 
  onSelectStore: () => void,
  onSelectRestock: () => void,
  onSelectGodMode: () => void,
  onSelectPulseAdmin: () => void,
  onSelectReadPulse: () => void,
  onSelectLearning: () => void,
  isPharmacist: boolean, 
  isClinic: boolean,
  isAdmin: boolean,
  pendingQuotesCount: number, 
  onBack: () => void,
  isActivityCentreEnabled: boolean,
  isPulseEnabled: boolean,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="activity-dashboard sora"
    >
      <div className="activity-header" style={{ marginBottom: '40px', border: 'none' }}>
        <div 
          onClick={onBack} 
          style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '10px', 
            cursor: 'pointer', 
            transition: 'all 0.2s ease',
            marginBottom: '16px',
            fontSize: '13px',
            fontWeight: 800,
            color: 'var(--black)',
            textTransform: 'uppercase',
            letterSpacing: '1.5px'
          }}
          className="hover-scale"
        >
          <div style={{ background: 'var(--green)', borderRadius: '50%', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 2px 8px rgba(15, 110, 86, 0.3)' }}>
            <div style={{ fontSize: '16px', fontWeight: 'bold' }}>←</div>
          </div>
          <span>BACK</span>
        </div>
        
        <Typography className="fraunces" style={{ fontSize: '48px', fontWeight: 900, color: 'var(--black)', letterSpacing: '-2.5px', lineHeight: 0.9 }}>
          Activity <em style={{ color: 'var(--green)', fontStyle: 'italic' }}>Hub</em>
        </Typography>
      </div>

      <div className="activity-widget" onClick={onSelectOrdersManagement}>
        <div className="widget-icon-box">📦</div>
        <div className="widget-content">
          <div className="widget-title">Order Management</div>
          <div className="widget-desc">Track your paid orders, deliveries, and payment history.</div>
        </div>
        <div className="widget-arrow">→</div>
      </div>

      {isPharmacist && (
        <div className="activity-widget professional" onClick={onSelectProfessional}>
          <div className="widget-icon-box">🏥</div>
          <div className="widget-content">
            <div className="widget-title">Professional Portal</div>
            <div className="widget-desc">Respond to incoming medicine requests from patients.</div>
          </div>
          {pendingQuotesCount > 0 && <div className="widget-badge">{pendingQuotesCount} New</div>}
          <div className="widget-arrow">→</div>
        </div>
      )}

      {(isAdmin) && (
        <div className="activity-widget god-mode-card" onClick={onSelectGodMode} style={{ background: '#1a1a1a', border: '1px solid #333' }}>
          <div className="widget-icon-box" style={{ background: '#333', color: '#fff' }}>⚡</div>
          <div className="widget-content">
            <div className="widget-title" style={{ color: '#fff' }}>God Mode</div>
            <div className="widget-desc" style={{ color: '#aaa' }}>Access high-level system controls, user management, and global overrides.</div>
          </div>
          <div className="widget-arrow" style={{ color: '#fff' }}>→</div>
        </div>
      )}

      {isPulseEnabled && (
        <div className="activity-widget" onClick={onSelectReadPulse}>
          <div className="widget-icon-box">📰</div>
          <div className="widget-content">
            <div className="widget-title">PSX Pulse</div>
            <div className="widget-desc">Read the latest medical trends, articles, and vlogs.</div>
          </div>
          <div className="widget-arrow">→</div>
        </div>
      )}

      {isAdmin && (
        <div className="activity-widget pulse-card" onClick={onSelectPulseAdmin}>
          <div className="widget-icon-box">✍️</div>
          <div className="widget-content">
            <div className="widget-title">Blog CMS</div>
            <div className="widget-desc">Manage data-driven blog posts, regional trends, and vlogs.</div>
          </div>
          <div className="widget-arrow">→</div>
        </div>
      )}

      {isActivityCentreEnabled && (
        <div className="activity-widget dashboard-card" onClick={onSelectLearning} style={{ background: '#FAEEDA', border: '1px solid rgba(186,117,23,0.1)' }}>
          <div className="widget-icon-box" style={{ background: 'var(--amber)', color: '#fff' }}>🎮</div>
          <div className="widget-content">
            <div className="widget-title" style={{ color: 'var(--amber)' }}>Activity Centre</div>
            <div className="widget-desc">Play medical games, take quizzes, and earn XP.</div>
          </div>
          <div className="widget-arrow" style={{ color: 'var(--amber)' }}>→</div>
        </div>
      )}

      {/* SPACE FOR MORE WIDGETS */}
      <div className="activity-widget" style={{ opacity: 0.5, cursor: 'default', borderStyle: 'dashed' }}>
        <div className="widget-icon-box" style={{ background: '#f5f5f5', color: '#ccc' }}>✨</div>
        <div className="widget-content">
          <div className="widget-title" style={{ color: '#ccc' }}>More insights...</div>
          <div className="widget-desc">Health statistics and smart reminders coming soon.</div>
        </div>
      </div>
    </motion.div>
  );
};

const OrderHistoryView = ({ orders, requests, onSelectOrder, onSelectRequest, filterType = 'all' }: { orders: Order[], requests: any[], onSelectOrder: (order: Order) => void, onSelectRequest: (request: any) => void, filterType?: 'all' | 'orders' | 'requests' }) => {
  const allActivity = [
    ...orders.map(o => ({ ...o, type: 'order' })),
    ...requests.map(r => ({ ...r, type: 'request' }))
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const filteredActivity = allActivity.filter(item => {
    if (filterType === 'orders') return item.type === 'order';
    if (filterType === 'requests') return item.type === 'request';
    return true;
  });

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="sora"
    >
      <div className="activity-header">
        <Typography className="activity-title">
          {filterType === 'orders' ? 'Order Management' : filterType === 'requests' ? 'Medicine Tracker' : 'My activity'}
        </Typography>
      </div>

      <div className="sec-tag">{filterType === 'orders' ? 'Recent Orders' : 'Recent activity'}</div>
      {filteredActivity.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filteredActivity.map((item: any) => (
            <div 
              key={item._id} 
              className="glass-card"
              onClick={() => item.type === 'order' ? onSelectOrder(item) : onSelectRequest(item)}
            >
              <div className="order-history-item">
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--black)' }}>
                    {item.type === 'order' ? (item.items[0]?.name || 'Medicine Order') : (item.items[0]?.name || 'Medicine Request')}
                  </div>
                  <div style={{ fontSize: '10px', color: '#bbb', marginTop: '2px' }}>
                    {item.type === 'order' ? (item.businesses[0]?.name || 'Pharmacy') : 'Pharmacy search'} · {new Date(item.createdAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                  </div>
                </div>
                <div className={`badge-pill ${item.status === 'Completed' ? 'badge-green' : 'badge-pink'}`}>
                  {item.status || 'Active'}
                </div>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                <div className="fraunces" style={{ fontSize: '16px', fontWeight: 900, color: 'var(--green)', letterSpacing: '-0.5px' }}>
                  {item.type === 'order' ? `₦${item.totalAmount?.toLocaleString()}` : (item.quoteCount > 0 ? `${item.quoteCount} Quotes` : 'Pending')}
                </div>
                <div className={`reorder-link ${item.status === 'Completed' ? '' : 'pink'}`}>
                  {item.status === 'Completed' ? 'Reorder' : (item.type === 'request' ? 'View Quotes' : 'Track Order')}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="orders-empty-state">
          <div className="orders-empty-icon">📁</div>
          <div className="orders-empty-text">No recent activity found.</div>
        </div>
      )}

      <div className="sec-tag">Recent searches</div>
      <div className="recent-searches-container">
        <div className="search-pill">Augmentin 625mg</div>
        <div className="search-pill">Metformin 500mg</div>
        <div className="search-pill dim">Epilim syrup</div>
        <div className="search-pill badge-pink">Ketorolac inj.</div>
      </div>
    </motion.div>
  );
};

const OrderTrackingView = ({ order, onBack }: { order: Order, onBack: () => void }) => {
  const orderTime = new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const status = order.status;

  const steps = [
    { 
      label: 'Order placed', 
      desc: 'Payment confirmed', 
      time: orderTime, 
      status: 'completed' 
    },
    { 
      label: 'Pharmacist confirmed', 
      desc: status === 'Pending' ? 'Waiting for confirmation' : 'Preparing your order', 
      time: status === 'Pending' ? '-' : orderTime, 
      status: status === 'Pending' ? 'active' : 'completed' 
    },
    { 
      label: 'Ready for pickup', 
      desc: (status === 'Accepted' || status === 'Dispatched' || status === 'In Transit') ? 'Head to ' + (order.businesses[0]?.name || 'Pharmacy') : 'Pending', 
      time: (status === 'Accepted' || status === 'Dispatched' || status === 'In Transit') ? 'Now' : '-', 
      status: (status === 'Accepted' || status === 'Dispatched' || status === 'In Transit') ? 'active' : (status === 'Completed' ? 'completed' : 'pending')
    },
    { 
      label: 'Completed', 
      desc: status === 'Completed' ? 'Thank you for your order' : 'Pending', 
      time: status === 'Completed' ? orderTime : '-', 
      status: status === 'Completed' ? 'completed' : 'pending' 
    }
  ];
  
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="sora"
    >
      <div className="back-btn" onClick={onBack}>
        <div className="back-arrow">←</div>
        <span>My activity</span>
      </div>

      <div className="fraunces" style={{ fontSize: '24px', fontWeight: 900, color: 'var(--black)', letterSpacing: '-1px', marginBottom: '6px' }}>
        Order <em style={{ color: 'var(--green)', fontStyle: 'italic' }}>#{order._id.slice(-6).toUpperCase()}</em>
      </div>
      <div style={{ fontSize: '13px', color: 'var(--gray)', marginBottom: '24px', fontWeight: 300 }}>
        {order.items.map(i => i.name).join(', ')} · {order.businesses[0]?.name || 'Pharmacy'}
      </div>

      <div className="glass-card" style={{ marginBottom: '20px' }}>
        <div className="timeline-container">
          {steps.map((step, idx) => (
            <div key={idx} className="timeline-item">
              <div 
                className={`timeline-dot ${step.status === 'completed' ? 'badge-green' : (step.status === 'active' ? 'badge-pink timeline-pulse' : '')}`}
                style={{ background: step.status === 'pending' ? '#eee' : undefined }}
              >
                <div 
                  className="timeline-dot-inner" 
                  style={{ background: step.status === 'pending' ? '#ccc' : '#fff' }} 
                />
              </div>
              {idx < steps.length - 1 && (
                <div 
                  className="timeline-line" 
                  style={{ background: step.status === 'completed' ? 'var(--green-pale)' : '#eee' }}
                />
              )}
              <div>
                <div className="timeline-content-title" style={{ color: step.status === 'pending' ? '#bbb' : 'var(--black)' }}>
                  {step.label}
                </div>
                <div className="timeline-content-desc" style={{ color: step.status === 'active' ? 'var(--pink)' : undefined, opacity: step.status === 'active' ? 0.8 : 1 }}>
                  {step.time} · {step.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-card" style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--black)', marginBottom: '6px' }}>
          {order.businesses[0]?.name || 'Pharmacy'}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--gray)', lineHeight: 1.5 }}>
          📍 {order.businesses[0]?.address || '12 GRA Road, Benin City'} · 0.4km
        </div>
        <div style={{ fontSize: '12px', color: 'var(--green)', fontWeight: 600, marginTop: '8px', cursor: 'pointer' }}>
          📞 Call pharmacist
        </div>
      </div>

      <button className="btn-outline">Report an issue</button>
    </motion.div>
  );
};

export default function OrdersContent({ setView, setSelectedRequestId, initialViewMode, backToView }: OrdersContentProps) {
  const { user } = useSession();
  const { orders, loading: ordersLoading } = useOrders();
  const [requests, setRequests] = useState<any[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'dashboard' | 'list' | 'detail' | 'pharmacist' | 'store' | 'restock' | 'pulse-admin' | 'orders-list' | 'requests-list'>(initialViewMode || 'dashboard');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isActivityCentreEnabled, setIsActivityCenterEnabled] = useState(true);
  const [isPulseEnabled, setIsPulseEnabled] = useState(true);

  const isPharmacist = !!(user?.role && ['admin', 'pharmacist', 'pharmacists', 'pharmacy', 'vendor'].includes(user.role));
  const isClinic = !!(user?.role && ['clinic'].includes(user.role));
  const isAdmin = !!(user?.role && user.role === 'admin');
  const router = useRouter();
  const pendingRequestsCount = requests.filter(r => r.status === 'pending').length;

  useEffect(() => {
    // Phase 1: Instant Hydration from localStorage
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('psx_cached_requests');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            setRequests(parsed);
            setRequestsLoading(false); // Enable instant UI!
          }
        } catch (e) {
          console.error("Requests Cache Error:", e);
        }
      }
    }

    const fetchRequests = async () => {
      try {
        const response = await fetch('/api/requests');
        if (response.ok) {
          const data = await response.json();
          const cleanData = Array.isArray(data) ? data : [];
          setRequests(cleanData);
          
          // Phase 2: Update Cache
          if (typeof window !== 'undefined') {
            localStorage.setItem('psx_cached_requests', JSON.stringify(cleanData));
          }
        }
      } catch (error) {
        console.error('Failed to fetch medicine requests:', error);
      } finally {
        setRequestsLoading(false);
      }
    };
    fetchRequests();

    const fetchGlobalSettings = async () => {
      try {
        const response = await fetch('/api/admin/settings');
        if (response.ok) {
          const data = await response.json();
          setIsActivityCenterEnabled(data.isActivityCentreEnabled !== false);
          setIsPulseEnabled(data.isPulseModuleEnabled !== false);
        }
      } catch (err) {
        console.error("Error fetching global settings:", err);
      }
    };
    fetchGlobalSettings();
  }, []);

  if (ordersLoading || requestsLoading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress sx={{ color: '#0F6E56' }} />
        <Typography sx={{ mt: 2, fontFamily: 'Sora', fontWeight: 600 }}>Loading Activity...</Typography>
      </Box>
    );
  }

  const handleSelectOrder = (order: Order) => {
    setSelectedOrder(order);
    setViewMode('detail');
  };

  const handleSelectRequest = (request: any) => {
    if (setSelectedRequestId && setView) {
      setSelectedRequestId(request._id);
      setView('reviewRequest');
    }
  };

  return (
    <>
      <Container maxWidth="sm" className="sora" sx={{ position: 'relative', zIndex: 1, pt: 0, pb: '40px' }}>
        <AnimatePresence mode="wait">
          {viewMode === 'dashboard' ? (
            <ActivityDashboardView 
              isPharmacist={isPharmacist}
              isClinic={isClinic}
              isAdmin={isAdmin}
              pendingQuotesCount={pendingRequestsCount}
              onSelectOrdersManagement={() => setViewMode('orders-list')}
              onSelectProfessional={() => setViewMode('pharmacist')}
              onSelectStore={() => setViewMode('store')}
              onSelectRestock={() => setViewMode('restock')}
              onSelectGodMode={() => router.push('/admin/god-mode')}
              onSelectPulseAdmin={() => setViewMode('pulse-admin')}
              onSelectReadPulse={() => setView ? setView('readPulse') : window.history.back()}
              onSelectLearning={() => setView ? setView('learning') : console.error('No setView')}
              onBack={() => setView ? setView('home') : window.history.back()}
              isActivityCentreEnabled={isActivityCentreEnabled}
              isPulseEnabled={isPulseEnabled}
            />
          ) : (viewMode === 'list' || viewMode === 'requests-list') ? (
            <div key="medicine-tracker">
              <div className="back-btn" onClick={() => (backToView && setView) ? setView(backToView) : setViewMode('dashboard')} style={{ marginBottom: '16px' }}>
                <div className="back-arrow">←</div>
                <span>{backToView ? 'Back' : 'Dashboard'}</span>
              </div>
               <OrderHistoryView 
                orders={orders} 
                requests={requests} 
                onSelectOrder={handleSelectOrder}
                onSelectRequest={handleSelectRequest}
                filterType={viewMode === 'requests-list' ? 'requests' : 'all'}
              />
            </div>
          ) : viewMode === 'orders-list' ? (
            <div key="order-management">
              <div className="back-btn" onClick={() => (backToView && setView) ? setView(backToView) : setViewMode('dashboard')} style={{ marginBottom: '16px' }}>
                <div className="back-arrow">←</div>
                <span>{backToView ? 'Back' : 'Dashboard'}</span>
              </div>
              <OrderHistoryView 
                orders={orders} 
                requests={requests} 
                onSelectOrder={handleSelectOrder}
                onSelectRequest={handleSelectRequest}
                filterType="orders"
              />
            </div>
          ) : viewMode === 'pharmacist' ? (
            <div key="professional-portal">
              <div className="back-btn" onClick={() => setViewMode('dashboard')} style={{ marginBottom: '16px' }}>
                <div className="back-arrow">←</div>
                <span>Dashboard</span>
              </div>
              <OrderRequestsContent onRespond={() => setViewMode('dashboard')} />
            </div>
          ) : viewMode === 'pulse-admin' ? (
            <div key="pulse-admin">
               <div className="back-btn" onClick={() => setViewMode('dashboard')} style={{ marginBottom: '16px' }}>
                <div className="back-arrow">←</div>
                <span>Dashboard</span>
              </div>
              <BlogCenter />
            </div>
          ) : (
            selectedOrder && (
              <OrderTrackingView 
                order={selectedOrder} 
                onBack={() => setViewMode('list')} 
              />
            )
          )}
        </AnimatePresence>
      </Container>
    </>
  );
}