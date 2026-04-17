
"use client";
import { useState, useEffect, useCallback, Suspense } from "react";

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { Box, Typography, Paper, TextField, IconButton, Button, Grid, CircularProgress, Badge, Snackbar, Alert } from "@mui/material";
import { motion, AnimatePresence, Variants, LayoutGroup } from "framer-motion";
import SearchIcon from "@mui/icons-material/Search";
import { useSession } from "@/context/SessionProvider";
import { useCart } from "@/contexts/CartContext";
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ActiveRequestOverlay from '@/components/ActiveRequestOverlay';
import WhatsAppButton from "@/components/WhatsAppButton";
import PremiumLanding from "@/components/PremiumLanding";
import BottomNav from "@/components/BottomNav";
import AskRxChat from "@/components/AskRxChat";
import Image from 'next/image';
import { Modal, Fade, Backdrop } from '@mui/material';
import { useTheme, useMediaQuery } from "@mui/material";

// Dynamic Imports for Code Splitting with Skeleton Fallbacks
const NavSkeleton = () => (
  <Box sx={{ p: 4, width: '100%', maxWidth: '900px', mx: 'auto' }}>
      <Box sx={{ width: '40%', height: 40, bgcolor: 'rgba(0,0,0,0.05)', borderRadius: 2, mb: 4 }} />
      <Box sx={{ width: '100%', height: 200, bgcolor: 'rgba(0,0,0,0.02)', borderRadius: 4, mb: 4 }} />
      <Grid container spacing={2}>
          {[1,2,3].map(i => <Grid item xs={12} key={i}><Box sx={{ width: '100%', height: 80, bgcolor: 'rgba(0,0,0,0.03)', borderRadius: 3 }} /></Grid>)}
      </Grid>
  </Box>
);

const DispatchForm = dynamic(() => import("@/components/DispatchForm"), { 
    loading: () => <Box sx={{ p: 10, display: 'flex', justifyContent: 'center' }}><CircularProgress sx={{ color: 'var(--green)' }} /></Box> 
});
const AboutContent = dynamic(() => import("@/components/AboutContent"), { loading: () => <NavSkeleton /> });
const ContactContent = dynamic(() => import("@/components/ContactContent"), { loading: () => <NavSkeleton /> });
const FindPharmacyContent = dynamic(() => import("@/components/FindPharmacyContent"), { loading: () => <NavSkeleton /> });
const OrderRequestsContent = dynamic(() => import("@/components/OrderRequestsContent"), { loading: () => <NavSkeleton /> });
const FindPharmacistContent = dynamic(() => import("@/components/FindPharmacistContent"), { loading: () => <NavSkeleton /> });
const FindMedicinesContent = dynamic(() => import("@/components/FindMedicinesContent"), { loading: () => <NavSkeleton /> });
const MedicineRestock = dynamic(() => import("@/components/MedicineRestock"), { loading: () => <NavSkeleton /> });
const AccountContent = dynamic(() => import("@/components/AccountContent"), { loading: () => <NavSkeleton /> });
const Chat = dynamic(() => import("@/components/Chat"), { loading: () => <CircularProgress /> });
const ConversationsContent = dynamic(() => import("@/components/ConversationsContent"), { loading: () => <NavSkeleton /> });
const OrdersContent = dynamic(() => import("@/components/OrdersContent"), { loading: () => <NavSkeleton /> });
const ConfirmOrderContent = dynamic(() => import("@/components/ConfirmOrderContent"), { loading: () => <NavSkeleton /> });
const StoreManagement = dynamic(() => import("./components/StoreManagement"), { loading: () => <NavSkeleton /> });
const PulseContent = dynamic(() => import("@/components/PulseContent"), { loading: () => <NavSkeleton /> });
const LearningContent = dynamic(() => import("@/components/LearningContent"), { loading: () => <NavSkeleton /> });
const ReviewRequestContent = dynamic(() => import("@/components/ReviewRequestContent"), { loading: () => <NavSkeleton /> });

import { messaging } from '../lib/firebase';
import { getToken } from 'firebase/messaging';
import { Home as HomeIcon, Chat as ChatIcon, Person as PersonIcon, LocalPharmacy as PharmacyIcon, Medication as MedicationIcon } from '@mui/icons-material';

interface UnifiedUser {
  _id: string;
  id?: string;
  username: string;
  email?: string;
  role: string;
  profilePicture?: string;
  canManageStore?: boolean;
  fcmTokens?: string[];
}

const MotionPaper = motion(Paper);

const animatedWords = ["pharmacies", "pharmacists", "medicines"];

export default function HomePage() {
  const { user, isLoading } = useSession();
  const { getTotalItems } = useCart();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const router = useRouter();
  const [inputValue, setInputValue] = useState("");
  const [wordIndex, setWordIndex] = useState(0);
  const [view, setView] = useState('home');
  const [otherUser, setOtherUser] = useState<UnifiedUser | null>(null);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [activeRequest, setActiveRequest] = useState<any>(null);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [showNotification, setShowNotification] = useState(false);
  const [permission, setPermission] = useState<'default' | 'granted' | 'denied'>('default');
  const [notificationSyncStatus, setNotificationSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);
  const [prevView, setPrevView] = useState('home');
  const [shouldTriggerScan, setShouldTriggerScan] = useState(false);

  const setViewWithPrev = (newView: string) => {
    setPrevView(view);
    setView(newView);
  };

  useEffect(() => {
    if (notificationSyncStatus === 'success') {
        const timer = setTimeout(() => setNotificationSyncStatus('idle'), 3000); // Revert to idle after 3 seconds
        return () => clearTimeout(timer);
    }
  }, [notificationSyncStatus]);

  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
const [showMiniPrompt, setShowMiniPrompt] = useState(false);
const [showContinueOnAppMessage, setShowContinueOnAppMessage] = useState(false);
const [showAskRxChat, setShowAskRxChat] = useState(false);

const [notificationError, setNotificationError] = useState<string | null>(null);

  useEffect(() => {
    // Don't do anything until the user's session is loaded.
    if (!user) return;
  
    // Check if the app is running as an installed PWA.
    const isPWA = typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches;
  
    // Determine if the user has a role that should be prompted.
    const isTargetRole = ['pharmacist', 'pharmacy', 'clinic', 'admin'].includes(user.role);
  
    if (isTargetRole && !isPWA) {
      // 1. Show the full modal only once per session, and only on the home view
      const modalShown = sessionStorage.getItem('pwa_modal_shown');
      if (!modalShown && view === 'home') {
        setShowInstallPrompt(true);
        sessionStorage.setItem('pwa_modal_shown', 'true');
      }

      // 2. Show the subtle mini-prompt in the nav on every view change
      setShowMiniPrompt(true);
      const timer = setTimeout(() => setShowMiniPrompt(false), 8000); // Disappear after 8 seconds
      return () => clearTimeout(timer);
    }
  }, [view, user]); // Re-run this logic every time the view or user data changes.





const [os, setOs] = useState<'Android' | 'iOS' | 'Windows' | 'Other'>('Other');

useEffect(() => {
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  if (/android/i.test(userAgent)) {
    setOs('Android');
  }

    // Windows detection
    else if (/Win/i.test(userAgent)) {
      setOs('Windows');
    }
  
  // Apple device detection
  else if (/iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream) {
    setOs('iOS');
  }
}, []);


const requestPermission = async () => {
  setNotificationSyncStatus('syncing');
  setNotificationError(null); // Clear previous errors

  try {
    const permissionResult = await Notification.requestPermission();
    setPermission(permissionResult);

    if (permissionResult === 'granted') {
      console.log('Notification permission granted.');
      const vapidKey = "BJRiF8tiN4l1QHCuKQ3ePrLsSMBlyDIJcKdnU5TWQK2bhjpmEckbqgUjsm3cYgYr4xMqRDAF1QOHyw7xJ8L3Gqc";
      const fcmToken = await getToken(messaging(), { vapidKey });
      
      if (fcmToken) {
        console.log('FCM Token:', fcmToken);
        try {
          const response = await fetch('/api/save-fcm-token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token: fcmToken }),
            credentials: 'include',
        });
        
        if (response.ok) {
          console.log('FCM token saved to server. Now re-fetching user data...');
          // This is the crucial change:
          // We WAIT for the user data to be fetched BEFORE setting success.
          await fetchDetailedUser(); 
          console.log('User data re-fetched. Sync complete.');
          setNotificationSyncStatus('success'); // NOW we show the success message.
        } else {
            const errorData = await response.json();
            console.error('Failed to save FCM token:', errorData.message);
            setNotificationError(errorData.message || 'Failed to save token.');
            setNotificationSyncStatus('error');
          }
        } catch (error: any) {
          console.error('Error saving FCM token:', error);
          setNotificationError(error.message || 'An unknown error occurred.');
          setNotificationSyncStatus('error');
        }
      } else {
        console.log('Could not get FCM token.');
        setNotificationError('Could not get notification token. Please check your browser settings.');
        setNotificationSyncStatus('error');
      }
    } else {
      console.log('Notification permission denied.');
      // If permission is denied, we don't treat it as an error.
      setNotificationSyncStatus('idle'); 
    }
  } catch (error: any) {
    console.error('An error occurred during the permission request process: ', error);
    setNotificationError(error.message || 'An unknown error occurred.');
    setNotificationSyncStatus('error');
  }
};


const [detailedUser, setDetailedUser] = useState<UnifiedUser | null>(null);
  // This defines the function to fetch user data
  const fetchDetailedUser = useCallback(async () => {
    if (user) {
        try {
            const response = await fetch('/api/account', { credentials: 'include' });
            if (response.ok) {
                const data = await response.json();
                setDetailedUser(data);
            } else {
                const errorData = await response.json().catch(() => ({}));
                console.error(`Failed to fetch detailed user data (Status ${response.status}):`, errorData.message || 'Unknown error');
                setDetailedUser(null);
            }
        } catch (error) {
            console.error("Error fetching detailed user data:", error);
            setDetailedUser(null);
        }
    } else {
        setDetailedUser(null);
    }
  }, [user]);

  // This hook calls the function when the component loads or the function changes
  useEffect(() => {
    fetchDetailedUser();
  }, [fetchDetailedUser]);



const normalizedUser: UnifiedUser | null = user ? { ...user, _id: (user as any)._id } : null;

  const isPremiumLanding = view === 'home';
  const isSimplifiedTheme = true;
  const bottomPadding = 
    isPremiumLanding ? { xs: '140px', sm: '150px' } : 
    view === 'account' ? { xs: '120px', sm: '140px' } :
    (isSimplifiedTheme && view !== 'orders') ? { xs: '20px', sm: '30px' } : 
    (view === 'home' ? { xs: '140px', sm: '150px' } : { xs: '70px', sm: '80px' });

  useEffect(() => {
    const timer = setTimeout(() => {
      setWordIndex((prevIndex) => (prevIndex + 1) % animatedWords.length);
    }, 2500);
    return () => clearTimeout(timer);
  }, [wordIndex]);

  const handleSearchInitiation = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = event.target.value;
    if (value) {
      setInputValue(value);
      setView('orderMedicines');
    }
  };

  const searchParams = useSearchParams();

useEffect(() => {
  if (!searchParams) return;

  const viewParam = searchParams.get('view');
  const verificationParam = searchParams.get('verification');
  const requestIdParam = searchParams.get('requestId');

  if (verificationParam === 'success') {
    setShowNotification(true);
  }

  if (requestIdParam) {
    setActiveRequestId(requestIdParam);
    setView('orderMedicines');
  } else if (viewParam === 'orderMedicines') {
    setView('orderMedicines');
  }

  if (viewParam === 'findMedicines') {
    setView('findMedicines');
  }
}, [searchParams]);

useEffect(() => {
  // Safely check for notification permission only on the client-side
  if (typeof window !== 'undefined' && 'Notification' in window) {
    setPermission(Notification.permission);
  }
}, []); // The empty array ensures this runs only once when the component mounts




  const containerVariants: Variants = {
    hidden: { opacity: 0, scale: 0.98 },
    visible: { opacity: 1, scale: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
    exit: { opacity: 0, scale: 0.98, transition: { duration: 0.2 } }
  };

  const itemVariants: Variants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 100 } },
    exit: { y: 20, opacity: 0 }
  };

  const handleUserSelect = (selectedUser: UnifiedUser) => {
    setOtherUser(selectedUser);
    setView('chat');
  };
  
  const handleBackNavigation = () => {
    if (view === 'chat') {
      setView(normalizedUser?.role === 'pharmacist' ? 'conversations' : 'consult');
    } 
      else if (view === 'about' || view === 'contact' || view === 'reviewRequest' || view === 'medicineRestock') {

      setView('orderMedicines');
    } else {
      setView('home');
    }
    setInputValue('');
    setShouldTriggerScan(false);
  };

  useEffect(() => {
    // This hook sends the PWA installation status to the backend.
    if (user && !isLoading) {
      const isPWA = window.matchMedia('(display-mode: standalone)').matches;

      fetch('/api/pwa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isPWA }),
        credentials: 'include',
      })
      .then(response => {
        if (response.ok) {
          console.log('PWA status successfully updated.');
        } else {
          console.error('Failed to update PWA status on the backend.');
        }
      })
      .catch(error => {
        console.error('Error sending PWA status:', error);
      });
    }
  }, [user, isLoading]);


  useEffect(() => {
    const isPWA = typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches;
    const hasNotificationSupport = 'Notification' in window;
  
    // We need detailedUser to check for fcmTokens, so we wait for it.
    if (isPWA && hasNotificationSupport && !isLoading && detailedUser) {
      const currentPermission = Notification.permission;
      setPermission(currentPermission);
  
      const hasFcmTokens = detailedUser.fcmTokens && detailedUser.fcmTokens.length > 0;
      const isTargetRole = ['pharmacist', 'pharmacy', 'clinic', 'admin'].includes(detailedUser.role);
  
      // Show the prompt if the user is a target role and either:
      // 1. They haven't set a notification permission yet ('default').
      // 2. They have granted permission, but we don't have a token for them on the backend.
      if (isTargetRole && currentPermission !== 'denied' && (currentPermission === 'default' || !hasFcmTokens)) {
        setShowNotificationPrompt(true);
      } else if (currentPermission === 'granted' && isTargetRole && !hasFcmTokens) {
        // If permission is granted but the token is missing, try to sync it.
        console.log('Permission granted, but token missing. Syncing token...');
        requestPermission();
      }
    }
  }, [isLoading, detailedUser]);

  // Polling for active requests
  useEffect(() => {
    if (!normalizedUser) {
        setActiveRequest(null);
        return;
    }

    const checkActiveRequest = async () => {
      try {
        // Optimized: only fetch the most recent active request for the overlay
        const res = await fetch('/api/requests?activeOnly=true&limit=1');
        if (!res.ok) return;
        const data = await res.json();
        
        // Backend now returns either a single object or an empty array/null
        const active = Array.isArray(data) ? data[0] : data;
        setActiveRequest(active || null);
      } catch (e) {
        // Silent fail for polling
      }
    };

    checkActiveRequest();
    const interval = setInterval(checkActiveRequest, 5000); // Poll every 5 seconds for active quotes
    return () => clearInterval(interval);
  }, [normalizedUser]);
  

  const handleViewLatestRequest = async () => {
    setIsNavigating(true);
    if (!normalizedUser) {
        setView('orders');
        return;
    }
    try {
      const res = await fetch('/api/requests?own=true', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to fetch requests');
      const requests = await res.json();

      // Filter for active requests (pending or quoted)
      const activeRequests = requests.filter((r: any) => r.status === 'pending' || r.status === 'quoted');

      if (activeRequests.length === 1) {
        setSelectedRequestId(activeRequests[0]._id);
        setView('reviewRequest');
      } else {
        setView('orders');
      }
    } catch (err) {
      console.error('Error fetching latest request:', err);
      // Fallback to orders list on error
      setView('orders');
    } finally {
      setIsNavigating(false);
    }
  };

  const handleOverlayClick = (id: string, status: string) => {
    setSelectedRequestId(id);
    setView('reviewRequest');
  };

  const renderWelcomeView = () => {
    return (
      <Box key="welcome" component={motion.div} initial="hidden" animate="visible" exit="exit" variants={containerVariants} sx={{ width: '100%', mx: 'auto', p: { xs: 0, sm: 2 }, position: 'relative' }}>
        <AnimatePresence>
            {showMiniPrompt && (
                <Box 
                    component={motion.div}
                    initial={{ opacity: 0, scale: 0.9, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    onClick={() => setShowInstallPrompt(true)}
                    sx={{ 
                        display: 'flex',
                        alignItems: 'center', 
                        gap: 1, 
                        cursor: 'pointer',
                        bgcolor: 'rgba(255, 193, 7, 0.1)',
                        px: 2,
                        py: 0.5,
                        borderRadius: '100px',
                        border: '1px solid rgba(255, 193, 7, 0.3)',
                        position: 'absolute',
                        top: 20,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 100
                    }}
                >
                    <Box 
                        component={motion.div}
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                        sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#ffc107' }} 
                    />
                    <Typography 
                        sx={{ fontSize: '10px', fontWeight: 800, color: '#b58d05', whiteSpace: 'nowrap', letterSpacing: '0.02em', mb: 0 }}
                    >
                        INSTALL APP FOR NOTIFICATIONS
                    </Typography>
                </Box>
            )}
        </AnimatePresence>
        <PremiumLanding 
          onSearchClick={(triggerScan) => {
            setShouldTriggerScan(!!triggerScan);
            setView('orderMedicines');
          }}
          onPharmacistClick={() => router.push('/auth')}
          user={normalizedUser}
          onMyRequestsClick={handleViewLatestRequest}
          onAskRxClick={() => setShowAskRxChat(true)}
        />
      </Box>
    );
  };

  const mobileButtonAnimation = {
    initial: { x: -100, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    transition: { type: 'spring', stiffness: 120, damping: 14 } as const,
};


const renderPageView = (title: string, layoutId: string, children?: React.ReactNode, fullWidthMobile: boolean = false, showHeader: boolean = true) => {
  
  const showButtons = view !== 'findPharmacy' && view !== 'account' && view !== 'about' && view !== 'contact' && view !== 'reviewRequest' && view !== 'orderRequests' && view !== 'dashboard';


  return (
    <Box
      key={layoutId}
      component={motion.div}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      sx={{ 
        width: '100%', 
        display: 'flex', 
        flexDirection: 'column', 
        pt: showHeader ? { xs: 8, sm: 10 } : 0, 
        pb: bottomPadding, 
        color: isSimplifiedTheme ? '#111' : 'white' 
      }}
    >
        <motion.div
          layoutId={layoutId}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
            {view !== 'account' && showHeader && (
                <Paper
                    elevation={0}
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 2,
                    bgcolor: 'transparent',
                    color: isSimplifiedTheme ? '#111' : 'white',
                    borderRadius: 0,
                    borderBottom: isSimplifiedTheme ? '1px solid rgba(0, 0, 0, 0.05)' : '1px solid rgba(255, 255, 255, 0.2)',
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <IconButton onClick={handleBackNavigation} sx={{ color: isSimplifiedTheme ? '#111' : 'white' }}>
                        <ArrowBackIcon />
                    </IconButton>
                    <Typography variant="h6" sx={{ ml: 2, fontWeight: 500 }}>
                        {title}
                    </Typography>
                </Box>

                <AnimatePresence>
                    {showMiniPrompt && (
                        <Box 
                            component={motion.div}
                            initial={{ opacity: 0, scale: 0.9, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            onClick={() => setShowInstallPrompt(true)}
                            sx={{ 
                                display: 'flex',
                                alignItems: 'center', 
                                gap: 1, 
                                cursor: 'pointer',
                                bgcolor: 'rgba(255, 193, 7, 0.1)',
                                px: 2,
                                py: 0.5,
                                borderRadius: '100px',
                                border: '1px solid rgba(255, 193, 7, 0.3)',
                                position: 'absolute',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                zIndex: 1
                            }}
                        >
                            <Box 
                                component={motion.div}
                                animate={{ opacity: [0.4, 1, 0.4] }}
                                transition={{ repeat: Infinity, duration: 1.5 }}
                                sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#ffc107' }} 
                            />
                            <Typography 
                                component={motion.p}
                                animate={{ opacity: [0.8, 1, 0.8] }}
                                transition={{ repeat: Infinity, duration: 1.5 }}
                                sx={{ fontSize: '10px', fontWeight: 800, color: '#b58d05', whiteSpace: 'nowrap', letterSpacing: '0.02em' }}
                            >
                                INSTALL APP FOR NOTIFICATIONS
                            </Typography>
                        </Box>
                    )}
                </AnimatePresence>

                {showButtons && (
                        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1, alignItems: { xs: 'flex-end', sm: 'center' } }}>
                            <Badge badgeContent={getTotalItems()} color="secondary">
                                <Button
                                    variant="outlined"
                                    onClick={() => setView('confirmOrder')}
                                    sx={{
                                        borderRadius: '20px',
                                        borderColor: isSimplifiedTheme ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.8)',
                                        color: isSimplifiedTheme ? '#111' : 'white',
                                        textTransform: 'uppercase',
                                        fontWeight: 'bold',
                                        '&:hover': {
                                          borderColor: 'white',
                                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                        },
                                    }}
                                >
                                    Order
                                </Button>
                            </Badge>
                            <Button
                                variant="outlined"
                                onClick={() => setView('orders')}
                                sx={{
                                    borderRadius: '20px',
                                    borderColor: isSimplifiedTheme ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.8)',
                                    color: isSimplifiedTheme ? '#111' : 'white',
                                    textTransform: 'uppercase',
                                    fontWeight: 'bold',
                                    '&:hover': {
                                      borderColor: 'white',
                                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                    },
                                }}
                            >
                                Orders
                            </Button>
                        </Box>
                    )}

{view === 'orderRequests' && (
    <Button
        variant="outlined"
        onClick={requestPermission}
        disabled={notificationSyncStatus === 'syncing'}
        sx={{
            borderRadius: '20px',
            borderColor: notificationSyncStatus === 'success' ? 'lightgreen' : 'rgba(255, 255, 255, 0.8)',
            color: notificationSyncStatus === 'success' ? 'lightgreen' : 'white',
            textTransform: 'uppercase',
            fontWeight: 'bold',
            '&:hover': {
              borderColor: 'white',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
            },
            transition: 'border-color 0.3s, color 0.3s',
            '&.Mui-disabled': {
                color: 'rgba(255, 255, 255, 0.5)',
                borderColor: 'rgba(255, 255, 255, 0.5)'
            }
        }}
    >
        {notificationSyncStatus === 'syncing' ? 'Syncing...' : 
         notificationSyncStatus === 'success' ? 'Sync Successful' :
         notificationSyncStatus === 'error' ? 'Sync Error - Retry?' :
         (permission === 'granted' ? 'Resync Notifications' : 'Enable Notifications')}
    </Button>
)}





                </Paper>
            )}
        </motion.div>
          {children}
        </Box>
  );
}

  const renderActiveView = () => {
    switch (view) {
      case 'orderMedicines':
        return (
          <Box
            key="order-medicines"
            component={motion.div}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            sx={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, display: 'flex', flexDirection: 'column', pt: { xs: 8, sm: 10 }, pb: bottomPadding, bgcolor: '#fafaf8' }}
          >
            <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
              <DispatchForm initialSearchValue={inputValue} 
                setView={setView} 
                setSelectedRequestId={setSelectedRequestId}
                onViewResponses={handleViewLatestRequest}
                isNavigating={isNavigating}
                initialRequestId={activeRequestId || undefined}
                initialScanRx={shouldTriggerScan}
                onInstallPWA={() => setShowInstallPrompt(true)}
              />
            </Box>
          </Box>
        );
        case 'storeManagement':
          return renderPageView('Store Management', 'store-management-header', <StoreManagement />);
  case 'orderRequests':
        return renderPageView('Order Requests', 'order-requests-header', <OrderRequestsContent />);
        case 'findPharmacy':
          return renderPageView('Find a Pharmacy', 'find-pharmacy-header', <FindPharmacyContent />);
        case 'findMedicines':
        return (
          <Box
            key="find-medicines"
            component={motion.div}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            sx={{ width: '100%', display: 'flex', flexDirection: 'column', pt: { xs: 8, sm: 10 }, pb: bottomPadding, bgcolor: '#fafaf8' }}
          >
            <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
              <FindMedicinesContent setView={setView} />
            </Box>
          </Box>
        );

          case 'about':
        return renderPageView('About Us', 'about-us-header', <AboutContent />);
      case 'contact':
        return renderPageView('Contact Us', 'contact-us-header', <ContactContent />);
      case 'consult':
        return renderPageView('Consult a Pharmacist', 'consult-header', <FindPharmacistContent onPharmacistSelect={handleUserSelect} />);
      case 'conversations':
        return renderPageView('Conversations', 'consult-header', <ConversationsContent onUserSelect={handleUserSelect} />);
      case 'account':
        return renderPageView('Account', 'account-header', <AccountContent setView={setView} onBack={() => setViewWithPrev(prevView)} />);
      case 'confirmOrder':
        return (
          <Box
            key="confirm-order"
            component={motion.div}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            sx={{ width: '100%', display: 'flex', flexDirection: 'column', pt: { xs: 8, sm: 10 }, pb: bottomPadding, bgcolor: '#fafaf8' }}
          >
            <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
              <Suspense fallback={<Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>}>
                <ConfirmOrderContent setView={setView} />
              </Suspense>
            </Box>
          </Box>
        );
      
      case 'orders':
        return renderPageView('Orders', 'orders-header', <OrdersContent setView={setView} setSelectedRequestId={setSelectedRequestId} />, true, false);
      case 'reviewRequest':
        if (selectedRequestId) {
            return (
              <Box
                key="review-request"
                component={motion.div}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                sx={{ width: '100%', display: 'flex', flexDirection: 'column', pt: { xs: 8, sm: 10 }, pb: bottomPadding, bgcolor: '#fafaf8' }}
              >
                <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
                  <ReviewRequestContent requestId={selectedRequestId} setView={setView} />
                </Box>
              </Box>
            );
        }
        return <CircularProgress />;
      case 'readPulse':
        return renderPageView('PSX Pulse', 'read-pulse-header', <Box sx={{ width: '100%', maxWidth: '1200px', mx: 'auto', px: { xs: 2, sm: 4 }, pt: '80px', pb: { xs: '120px', sm: '140px' } }}><PulseContent onBack={() => setView('orders')} onFindMeds={() => setView('orderMedicines')} /></Box>, true, false);
      case 'learning':
        return renderPageView('Activity Centre', 'learning-header', <Box sx={{ width: '100%', maxWidth: '1200px', mx: 'auto', px: { xs: 0, sm: 2 }, pt: { xs: '40px', sm: '60px' }, pb: { xs: '120px', sm: '140px' } }}><LearningContent onBack={() => setView('orders')} /></Box>, true, false);
      case 'medicineRestock':
          if (normalizedUser) {
              return renderPageView('Medicine Restock', 'medicine-restock-header', <MedicineRestock onBack={() => setView('default')} userId={normalizedUser._id} />);
          }
          return <CircularProgress />;
  
      case 'chat':
        if (otherUser) {
            return renderPageView('Chat', 'chat-header', <Chat user={otherUser} onBack={handleBackNavigation} />);
        }
        return <CircularProgress />;
  
      case 'dashboard':
        return (
          <Box key="welcome-dashboard" component={motion.div} initial={{opacity:0}} animate={{opacity:1}} sx={{ width: '100%', p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 10 }}>
            <Box sx={{ width: '100%', display: 'flex', justifyContent: 'flex-start', mb: 2 }}>
                <Button 
                    startIcon={<ArrowBackIcon />} 
                    onClick={() => setView('home')}
                    sx={{ color: 'white', textTransform: 'none' }}
                >
                    Back to Home
                </Button>
            </Box>
            <Typography variant="h4" sx={{ color: 'white', mb: 4, fontWeight: 'bold' }}>Dashboard</Typography>
            <Grid container spacing={2} sx={{ flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'center', justifyContent: 'center' }}>
              {detailedUser && (detailedUser.role === 'pharmacy' || (detailedUser.role === 'pharmacist' && detailedUser.canManageStore) || detailedUser.role === 'admin') && (
                <Grid item xs="auto">
                    <Button variant="contained" onClick={() => setView('storeManagement')}
                        sx={{ borderRadius: '20px', px: 4, py: 1.5, fontWeight: 600, bgcolor: 'secondary.main', color: 'white', '&:hover': { transform: 'scale(1.05)', bgcolor: 'secondary.dark' } }}>
                        Store Management
                    </Button>
                </Grid>
              )}
              {normalizedUser && ['pharmacy', 'pharmacist', 'admin'].includes(normalizedUser.role) && (
                <Grid item xs="auto">
                    <Button variant="contained" onClick={() => setView('orderRequests')}
                        sx={{ borderRadius: '20px', px: 4, py: 1.5, bgcolor: '#002d24', color: '#fff', '&:hover': { transform: 'scale(1.05)' } }}>
                        Order Requests
                    </Button>
                </Grid>
              )}
              {normalizedUser && ['pharmacy', 'pharmacist', 'clinic', 'admin'].includes(normalizedUser.role) && (
                <Grid item xs="auto">
                    <Button variant="contained" onClick={() => setView('medicineRestock')}
                          sx={{ borderRadius: '20px', px: 4, py: 1.5, fontWeight: 600, bgcolor: 'secondary.main', color: 'white', '&:hover': { transform: 'scale(1.05)', bgcolor: 'secondary.dark' } }}>
                        Medicine Restock
                    </Button>
                </Grid>
              )}
              {detailedUser && detailedUser.role === 'admin' && (
                <Grid item xs="auto">
                    <Button variant="contained" onClick={() => router.push('/admin/god-mode')}
                        sx={{ borderRadius: '20px', px: 4, py: 1.5, bgcolor: '#e74c3c', color: 'white', '&:hover': { transform: 'scale(1.05)', bgcolor: '#c0392b' } }}>
                        God Mode
                    </Button>
                </Grid>
              )}
            </Grid>
          </Box>
        );

      default:
        return renderWelcomeView();
    }
  };

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      pb: bottomPadding,
      bgcolor: isSimplifiedTheme ? '#fafaf8' : 'transparent',
    }}>
       <Snackbar
        open={showNotification}
        autoHideDuration={6000}
        onClose={() => setShowNotification(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={() => setShowNotification(false)} severity="success" sx={{ width: '100%', borderRadius: '12px', fontWeight: 600 }}>
          Email Verification Successful! Your account is now fully verified.
        </Alert>
      </Snackbar>

      <Snackbar
  open={showContinueOnAppMessage}
  autoHideDuration={4000}
  onClose={() => setShowContinueOnAppMessage(false)}
  anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
  sx={{ mt: 30 }}
>
  <Alert
    onClose={() => setShowContinueOnAppMessage(false)}
    severity="info"
    elevation={6}
    variant="filled"
    sx={{ width: '100%', bgcolor: 'rgb(1, 61, 63)' }}
  >
    You should now continue on the app.
  </Alert>
</Snackbar>



      <Box sx={{
          position: 'relative',
          flexGrow: 1,
          display: "flex",
          flexDirection: 'column',
          alignItems: "center",
          justifyContent: "flex-start",
          p: 0,
          width: '100%'
        }}>
        <Box sx={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', width: '100%', flex: 1 }}>
            <LayoutGroup>
              <AnimatePresence mode="wait" initial={false}>
                {renderActiveView()}
              </AnimatePresence>
            </LayoutGroup>
        </Box>
      </Box>

      <Modal
        open={showInstallPrompt}
        onClose={() => setShowInstallPrompt(false)}
        closeAfterTransition
        slots={{
          backdrop: (props) => (
            <Box 
              {...props} 
              sx={{ 
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
                bgcolor: 'rgba(10,15,12,0.4)', backdropFilter: 'blur(12px)', zIndex: -1 
              }} 
            />
          )
        }}
      >
        <Fade in={showInstallPrompt}>
          <Box sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: { xs: '88%', sm: 380 },
            maxHeight: { xs: '85vh', sm: '55vh' },
            overflowY: 'auto',
            bgcolor: 'rgba(255,255,255,0.98)',
            borderRadius: '28px',
            boxShadow: '0 32px 100px rgba(0,0,0,0.18)',
            border: '1px solid rgba(255,255,255,0.5)',
            p: { xs: 3, sm: 4 },
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            outline: 'none'
          }}>
      <Typography variant="h6" component="h2" sx={{ mb: 1, textAlign: 'center' }}>
      <strong>To Receive Drug Search Notifications</strong>
</Typography>

{os === 'Android' ? (
        <Typography variant="body2" sx={{ mb: 2, textAlign: 'center' }}>
          For order alerts, add this app to your home screen. Tap the <strong>three dots</strong> in the corner, then select '<strong>Install app</strong>' or '<strong>Add to Home Screen</strong>'.
        </Typography>
      ) : ( // Default to iOS/Other
        <Typography variant="body2" sx={{ mb: 2, textAlign: 'center' }}>
          For order alerts, add the app to your home screen. Tap the <strong>Share</strong> icon, then '<strong>Add to Home Screen</strong>'.
        </Typography>
      )}

<Image
        src={(os === 'Android' || os === 'Windows') ? "/install-guide-android.png" : "/install-guide.png"}
        alt="How to add to home screen"
        width={180}
        height={300}
        style={{ maxWidth: '100%', height: 'auto', borderRadius: '4px' }}
      />


      <Button onClick={() => {
  setShowInstallPrompt(false);
  setShowContinueOnAppMessage(true);
}} sx={{ mt: 2 }} variant="contained">
        Close
      </Button>
    </Box>
  </Fade>
</Modal>

      <Modal
        open={showNotificationPrompt}
        onClose={() => {
          if (notificationSyncStatus !== 'syncing') {
            setShowNotificationPrompt(false);
          }
        }}
        closeAfterTransition
        slots={{
          backdrop: (props) => (
            <Box 
              {...props} 
              sx={{ 
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
                bgcolor: 'rgba(10,15,12,0.4)', backdropFilter: 'blur(12px)', zIndex: -1 
              }} 
            />
          )
        }}
      >
        <Fade in={showNotificationPrompt}>
          <Box sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: { xs: '88%', sm: 400 },
            maxHeight: { xs: '85vh', sm: '55vh' },
            overflowY: 'auto',
            bgcolor: 'rgba(255,255,255,0.98)',
            borderRadius: '28px',
            boxShadow: '0 32px 100px rgba(0,0,0,0.18)',
            border: '1px solid rgba(255,255,255,0.5)',
            p: { xs: 3, sm: 5 },
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            outline: 'none'
          }}>
            <Typography variant="h6" component="h2" sx={{ mb: 2, fontWeight: 'bold' }}>
              {notificationSyncStatus === 'success' ? 'Notifications Enabled' : 
               notificationSyncStatus === 'error' ? 'Something Went Wrong' : 
               'Enable Notifications'}
            </Typography>

            {notificationSyncStatus === 'syncing' && <CircularProgress sx={{ mb: 2 }} />}

            {notificationSyncStatus === 'success' && (
              <Box>
                <Typography sx={{ mb: 2 }}>
                  You will now receive notifications for drug searches.
                </Typography>
                <Button onClick={() => setShowNotificationPrompt(false)} variant="contained">
                  Close
                </Button>
              </Box>
            )}


            {notificationSyncStatus === 'error' && (
              <Box>
                <Typography color="error" sx={{ mb: 2 }}>
                  {notificationError}
                </Typography>
                <Button onClick={requestPermission} variant="contained">
                  Close the app, come back and Retry
                </Button>
              </Box>
            )}
            
            {notificationSyncStatus === 'idle' && (
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', width: '100%' }}>
                <Button
                  onClick={() => {
                    requestPermission();
                  }}
                  variant="contained"
                >
                  Enable
                </Button>
              </Box>
            )}
          </Box>
        </Fade>
      </Modal>




       <BottomNav currentView={view} onTabClick={(v) => {
         if (v === 'orderMedicines') setActiveRequestId(null);
         setViewWithPrev(v);
       }} />

      {activeRequest && view !== 'reviewRequest' && view !== 'readPulse' && !showAskRxChat && !(view === 'orderMedicines' && activeRequestId === activeRequest._id) && (
          <ActiveRequestOverlay 
              request={activeRequest} 
              onClick={handleOverlayClick} 
          />
      )}

      <AskRxChat 
        open={showAskRxChat} 
        onClose={() => setShowAskRxChat(false)} 
      />
    </Box>
  );
}
