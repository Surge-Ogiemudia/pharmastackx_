'use client';

import React, { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  CircularProgress,
  Alert,
  List,
  Button,
  Paper,
  Chip,
  Divider,
  Avatar,
  IconButton,
  Container,
} from '@mui/material';
import { 
  ArrowForwardIos, 
  ArrowBack,
  Close, 
  Verified, 
  EmojiEvents, 
  TrendingUp, 
  Payments 
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import ManageRequest from './ManageRequest'; 
import NotificationPermission from './NotificationPermission'; // Import the notification component
import { useSession } from '@/context/SessionProvider';

// Interfaces
interface ItemDetail {
  name: string;
  quantity: number;
  image?: string | null;
}

interface RequestItem {
  _id: string;
  createdAt: string;
  status: string;
  requestType: 'drug-list' | 'image-upload';
  items: ItemDetail[] | string[];
  coordinates?: [number, number]; // [lon, lat]
  quotes?: any[];
}

interface OrderRequestsContentProps {
  onRespond?: () => void;
}

// Fullscreen Reputation Overlay Component
const ReputationOverlay: React.FC<{ isOpen: boolean; onClose: () => void; user: any }> = ({ isOpen, onClose, user }) => {
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawMsg, setWithdrawMsg] = useState<string | null>(null);

  const handleWithdraw = async () => {
    setWithdrawLoading(true);
    setWithdrawMsg(null);
    try {
      const resp = await fetch('/api/withdraw', { method: 'POST' });
      const data = await resp.json();
      if (resp.ok) {
        setWithdrawMsg(data.message || 'Withdrawal request sent successfully!');
      } else {
        setWithdrawMsg(data.message || 'Failed to send withdrawal request.');
      }
    } catch (err) {
      setWithdrawMsg('An error occurred. Please try again later.');
    } finally {
      setWithdrawLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <Box
          component={motion.div}
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: '#F8FAFC',
            zIndex: 100000,
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            '&::-webkit-scrollbar': {
              width: '5px',
            },
            '&::-webkit-scrollbar-track': {
              background: 'transparent',
            },
            '&::-webkit-scrollbar-thumb': {
              background: 'rgba(0,0,0,0.08)',
              borderRadius: '10px',
            },
            '&::-webkit-scrollbar-thumb:hover': {
              background: 'rgba(0,0,0,0.15)',
            }
          }}
        >
          <Container maxWidth="sm" sx={{ pt: 12, pb: 20 }}>
            {/* Standard Back Button (Fixed & Consistent) */}
            <div 
              onClick={onClose}
              style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '8px', 
                cursor: 'pointer', 
                padding: '6px 14px', 
                borderRadius: '100px', 
                background: 'white',
                border: '1.5px solid #F0F0F0',
                marginBottom: '28px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
              }}
              className="hover-lift"
            >
              <ArrowBack sx={{ fontSize: 16, color: 'var(--black)' }} />
              <span style={{ fontSize: '11px', fontWeight: 900, color: 'var(--black)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Back</span>
            </div>
            {/* Identity Card */}
            <div className="glass-card" style={{ padding: '24px', borderRadius: '28px', background: 'white', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                <Avatar 
                  src={user?.profilePicture} 
                  sx={{ width: 64, height: 64, border: '4px solid #F0F9F6', bgcolor: 'var(--green-pale)', color: 'var(--green)', fontSize: '22px', fontWeight: 900 }}
                  className="fraunces"
                >
                  {user?.username?.charAt(0)}
                </Avatar>
                <div>
                  <Typography className="fraunces" sx={{ fontSize: '18px', fontWeight: 900 }}>{user?.username || 'Pharmacist'}</Typography>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                    <Verified sx={{ fontSize: 14, color: 'var(--green)' }} />
                    <Typography sx={{ fontSize: '11px', fontWeight: 800, color: 'var(--green)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {user?.professionalVerificationStatus === 'approved' ? 'Verified Partner' : 'Identity Verification Pending'}
                    </Typography>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ padding: '16px', borderRadius: '20px', background: '#F8FAFC' }}>
                  <Typography sx={{ fontSize: '10px', fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', mb: 0.5 }}>Rating</Typography>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <EmojiEvents sx={{ fontSize: 16, color: '#FBBF24' }} />
                    <Typography className="fraunces" sx={{ fontSize: '18px', fontWeight: 900 }}>4.9/5</Typography>
                  </div>
                </div>
                <div style={{ padding: '16px', borderRadius: '20px', background: '#F8FAFC' }}>
                  <Typography sx={{ fontSize: '10px', fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', mb: 0.5 }}>Response</Typography>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <TrendingUp sx={{ fontSize: 16, color: 'var(--green)' }} />
                    <Typography className="fraunces" sx={{ fontSize: '18px', fontWeight: 900 }}>~4 min</Typography>
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Deep Dive */}
            <Typography className="fraunces" sx={{ fontSize: '16px', fontWeight: 900, mt: 4, mb: 2 }}>Business Performance</Typography>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderRadius: '20px', border: '1px solid #F0F0F0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: 40, height: 40, borderRadius: '12px', background: 'var(--green-pale)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <EmojiEvents sx={{ color: 'var(--green)', fontSize: 20 }} />
                  </div>
                  <div>
                    <Typography sx={{ fontSize: '13px', fontWeight: 700 }}>Successful Deliveries</Typography>
                    <Typography sx={{ fontSize: '10px', color: 'var(--gray)' }}>Orders fulfilled till completion.</Typography>
                  </div>
                </div>
                <Typography className="fraunces" sx={{ fontSize: '20px', fontWeight: 900 }}>{user?.orderCount || 0}</Typography>
              </div>

              <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderRadius: '20px', border: '1px solid #F0F0F0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: 40, height: 40, borderRadius: '12px', background: 'var(--pink-pale)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Payments sx={{ color: 'var(--pink)', fontSize: 20 }} />
                  </div>
                  <div>
                    <Typography sx={{ fontSize: '13px', fontWeight: 700 }}>Total Revenue</Typography>
                    <Typography sx={{ fontSize: '10px', color: 'var(--gray)' }}>Earnings across all quotes.</Typography>
                  </div>
                </div>
                <Typography className="fraunces" sx={{ fontSize: '18px', fontWeight: 900 }}>
                  ₦ {((user as any)?.earnings || 0).toLocaleString()}
                </Typography>
              </div>
            </div>

            {/* Reputation Score Progress */}
            <div className="glass-card" style={{ padding: '24px', borderRadius: '24px', background: 'linear-gradient(135deg, var(--green) 0%, #0D523E 100%)', color: 'white', border: 'none', marginTop: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <Typography sx={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>Reputation Score</Typography>
                <Typography className="fraunces" sx={{ fontSize: '24px', fontWeight: 900 }}>{(user as any)?.reputationScore || 0}%</Typography>
              </div>
              <div style={{ height: '8px', width: '100%', background: 'rgba(255,255,255,0.2)', borderRadius: '10px', overflow: 'hidden' }}>
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${(user as any)?.reputationScore || 0}%` }}
                  transition={{ delay: 0.5, duration: 1 }}
                  style={{ height: '100%', background: 'white', borderRadius: '10px' }}
                />
              </div>
              <Typography sx={{ fontSize: '10px', mt: 2, opacity: 0.8, fontWeight: 500 }}>
                Maintain high response rates and successful fulfillment to improve your professional standing.
              </Typography>
            </div>

            {/* Withdrawal Action */}
            {(user as any)?.earnings > 0 && (
              <div style={{ marginTop: '24px' }}>
                <Button
                  fullWidth
                  onClick={() => !withdrawLoading && handleWithdraw()}
                  disabled={withdrawLoading}
                  style={{
                    padding: '20px',
                    borderRadius: '24px',
                    background: 'var(--black)',
                    color: 'white',
                    fontWeight: 900,
                    fontSize: '13px',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px'
                  }}
                  className="hover-lift"
                >
                  {withdrawLoading ? (
                    <CircularProgress size={16} sx={{ color: 'white' }} />
                  ) : (
                    <>
                      <Payments sx={{ fontSize: 18 }} />
                      Withdraw Earnings (₦ {((user as any)?.earnings || 0).toLocaleString()})
                    </>
                  )}
                </Button>
                
                {withdrawMsg && (
                  <Alert 
                    severity={withdrawMsg.includes('success') ? 'success' : 'error'} 
                    sx={{ mt: 2, borderRadius: '16px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}
                    onClose={() => setWithdrawMsg(null)}
                  >
                    {withdrawMsg}
                  </Alert>
                )}
              </div>
            )}
          </Container>
        </Box>
      )}
    </AnimatePresence>
  );
};

const OrderRequestsContent: React.FC<OrderRequestsContentProps> = ({ onRespond }) => {
  const { user } = useSession();
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<RequestItem | null>(null);
  const [visibleCount, setVisibleCount] = useState(5);
  const [showReputationOverlay, setShowReputationOverlay] = useState(false);

  const [activeTab, setActiveTab] = useState<'nearby' | 'all' | 'responses' | 'passed'>('nearby');
  const [passedIds, setPassedIds] = useState<Set<string>>(new Set());
  const [pharmacistCoords, setPharmacistCoords] = useState<[number, number] | null>(null);

  // Initialize passedIds from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('psx_passed_requests');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setPassedIds(new Set(parsed));
      } catch (e) {
        console.error("Failed to parse passed requests:", e);
      }
    }
  }, []);

  // Capture Pharmacist Location
  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setPharmacistCoords([pos.coords.longitude, pos.coords.latitude]),
        () => console.log('Location denied'),
        { enableHighAccuracy: true }
      );
    }
  }, []);

  useEffect(() => {
    if (!selectedRequestId) {
      const fetchRequests = async () => {
        try {
          const response = await fetch('/api/requests');
          if (!response.ok) throw new Error('Failed to fetch requests');
          const data = await response.json();
          setRequests(data);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'An unknown error occurred');
        } finally {
          setLoading(false);
        }
      };
      fetchRequests();
      const interval = setInterval(fetchRequests, 10000);
      return () => clearInterval(interval);
    }
  }, [selectedRequestId]);

  const calculateDistance = (patientCoords?: [number, number]) => {
    if (!pharmacistCoords || !patientCoords) return null;
    const [lon1, lat1] = pharmacistCoords;
    const [lon2, lat2] = patientCoords;
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return (R * c).toFixed(1);
  };

  const getTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return new Date(dateStr).toLocaleDateString();
  };

  const handlePass = (id: string) => {
    const newPassed = new Set(passedIds).add(id);
    setPassedIds(newPassed);
    localStorage.setItem('psx_passed_requests', JSON.stringify(Array.from(newPassed)));
  };

  const handleUnpass = (id: string) => {
    const newPassed = new Set(passedIds);
    newPassed.delete(id);
    setPassedIds(newPassed);
    localStorage.setItem('psx_passed_requests', JSON.stringify(Array.from(newPassed)));
  };

  const filteredRequests = requests.filter(request => {
    if (activeTab === 'passed') return passedIds.has(request._id);
    if (passedIds.has(request._id)) return false;
    if (activeTab === 'responses') {
       return request.quotes?.some(q => q.pharmacy === (user as any)?._id || q.pharmacy?._id === (user as any)?._id);
    }
    return request.status === 'pending' || request.status === 'quoted';
  });

  const sortedRequests = [...filteredRequests].sort((a, b) => {
    if (activeTab === 'nearby') {
      const distA = parseFloat(calculateDistance(a.coordinates) || '999');
      const distB = parseFloat(calculateDistance(b.coordinates) || '999');
      return distA - distB;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const handleManageRequest = (request: RequestItem) => {
    setSelectedRequestId(request._id);
    setSelectedRequest(request);
  };

  if (selectedRequestId) {
    return <ManageRequest initialData={selectedRequest as any} requestId={selectedRequestId} onBack={() => { setSelectedRequestId(null); setSelectedRequest(null); }} onSuccess={onRespond} />;
  }

  return (
    <div className="sora">
      <ReputationOverlay isOpen={showReputationOverlay} onClose={() => setShowReputationOverlay(false)} user={user} />

      {/* Professional Performance Widget (Minimized for space) */}
      <div 
        onClick={() => setShowReputationOverlay(true)}
        style={{ 
          cursor: 'pointer', 
          padding: '16px 20px', 
          borderRadius: '24px', 
          background: 'white', 
          border: '1px solid var(--border)', 
          marginBottom: '20px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
        className="hover-lift"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div>
            <div className="fraunces" style={{ fontSize: '18px', fontWeight: 900, color: 'var(--green)' }}>{(user as any)?.orderCount || 0}</div>
            <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase' }}>Orders</div>
          </div>
          <Divider orientation="vertical" flexItem sx={{ opacity: 0.1, height: '24px', alignSelf: 'center' }} />
          <div>
            <div className="fraunces" style={{ fontSize: '18px', fontWeight: 900, color: 'var(--black)' }}>₦ {((user as any)?.earnings || 0).toLocaleString()}</div>
            <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase' }}>Earnings</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--green-pale)', padding: '4px 10px', borderRadius: '100px' }}>
          <Verified sx={{ fontSize: 12, color: 'var(--green)' }} />
          <span style={{ fontSize: '9px', fontWeight: 800, color: 'var(--green)' }}>PRO PORTAL</span>
        </div>
      </div>


      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', overflowX: 'auto', paddingBottom: '8px', WebkitOverflowScrolling: 'touch' }}>
        {['nearby', 'all', 'responses', 'passed'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            style={{
              flexShrink: 0,
              padding: '10px 16px',
              borderRadius: '14px',
              border: '1px solid',
              borderColor: activeTab === tab ? 'var(--green-pale)' : 'rgba(0,0,0,0.05)',
              background: activeTab === tab ? 'var(--green-pale)' : '#F8F9FA',
              color: activeTab === tab ? 'var(--green)' : 'var(--gray)',
              fontSize: '11px',
              fontWeight: 800,
              textTransform: 'capitalize',
              transition: 'all 0.2s',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            {tab === 'responses' ? 'My responses' : tab === 'all' ? 'All requests' : tab === 'passed' ? 'Hidden' : 'Nearby'}
          </button>
        ))}
      </div>

      <ReputationOverlay isOpen={showReputationOverlay} onClose={() => setShowReputationOverlay(false)} user={user} />

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 8 }}>
          <CircularProgress size={30} sx={{ color: 'var(--green)' }} />
        </Box>
      )}
      
      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: '12px' }}>{error}</Alert>}
      
      {!loading && !error && sortedRequests.length === 0 && (
        <div className="orders-empty-state" style={{ padding: '60px 0' }}>
          <div style={{ fontSize: '32px', marginBottom: '16px' }}>{activeTab === 'passed' ? '🧹' : '📡'}</div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--gray)' }}>
            {activeTab === 'passed' ? 'No hidden requests.' : 'Scanning area for missions...'}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {sortedRequests.slice(0, visibleCount).map((request, idx) => {
          const distance = calculateDistance(request.coordinates);
          const responseCount = request.quotes?.length || 0;
          const isPassed = passedIds.has(request._id);
          
          return (
            <motion.div 
              key={request._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              style={{ 
                background: 'white',
                borderRadius: '24px',
                padding: '20px',
                border: idx === 0 && activeTab === 'nearby' ? '2px solid var(--green)' : '1.5px solid #F1F3F5',
                boxShadow: idx === 0 && activeTab === 'nearby' ? '0 12px 40px rgba(15,110,86,0.1)' : 'none',
                position: 'relative',
                opacity: isPassed ? 0.7 : 1
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', flex: 1 }}>
                  {request.requestType === 'image-upload' ? (
                    <div className="fraunces" style={{ fontSize: '15px', fontWeight: 900 }}>Prescription Image 📄</div>
                  ) : (
                    (request.items as any[]).map((it, i) => (
                      <div key={i} style={{ 
                        background: '#F8F9FA', 
                        padding: '6px 14px', 
                        borderRadius: '10px', 
                        fontSize: '11px', 
                        fontWeight: 900, 
                        color: 'var(--black)',
                        border: '1px solid #E9ECEF'
                      }}>
                        {it.name || it}
                      </div>
                    ))
                  )}
                </div>
                {distance && (
                  <div style={{ fontSize: '12px', fontWeight: 900, color: 'var(--green)', marginLeft: '12px' }}>
                    {distance}km
                  </div>
                )}
              </div>

              <div style={{ fontSize: '11px', color: 'var(--gray)', fontWeight: 400, marginBottom: '20px', opacity: 0.8 }}>
                {request.requestType === 'drug-list' && (
                  <>Qty: {request.items.length} {request.items.length === 1 ? 'item' : 'items'} · </>
                )}
                {getTimeAgo(request.createdAt)} · {responseCount} {responseCount === 1 ? 'response' : 'responses'}
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={() => handleManageRequest(request)}
                  className="hover-lift"
                  style={{ 
                    flex: 2, 
                    background: 'var(--green)', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '12px', 
                    height: '42px',
                    fontSize: '12px', 
                    fontWeight: 900,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  Respond
                </button>
                <button 
                  onClick={() => isPassed ? handleUnpass(request._id) : handlePass(request._id)}
                  className="hover-lift"
                  style={{ 
                    flex: 1, 
                    background: 'transparent', 
                    color: isPassed ? 'var(--green)' : '#ADB5BD', 
                    border: '1.5px solid',
                    borderColor: isPassed ? 'var(--green)' : '#DEE2E6', 
                    borderRadius: '12px', 
                    height: '42px',
                    fontSize: '12px', 
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {isPassed ? 'Restore' : 'Pass'}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {visibleCount < sortedRequests.length && (
        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <Button
            onClick={() => setVisibleCount(c => c + 5)}
            sx={{ borderRadius: '100px', px: 4, py: 1.5, color: 'var(--gray)', fontWeight: 800, fontSize: '11px', textTransform: 'uppercase' }}
          >
            Show more missions ({sortedRequests.length - visibleCount})
          </Button>
        </div>
      )}
    </div>
  );
};

export default OrderRequestsContent;