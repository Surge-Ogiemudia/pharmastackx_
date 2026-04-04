
"use client";

import { useState, useEffect } from "react";
import dynamicImport from 'next/dynamic';

import { usePathname } from 'next/navigation';
import { useSearchParams } from 'next/navigation';

import { useRouter } from 'next/navigation';
import { Box, Typography, Paper, TextField, IconButton, Button, Grid, CircularProgress, Badge } from "@mui/material";
import { motion, AnimatePresence, Variants, LayoutGroup } from "framer-motion";
import SearchIcon from "@mui/icons-material/Search";
import { useSession } from "@/context/SessionProvider";
import { useCart } from "@/contexts/CartContext";
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DispatchForm from "@/components/DispatchForm";
import AboutContent from "@/components/AboutContent";
import ContactContent from "@/components/ContactContent";
import FindPharmacyContent from "@/components/FindPharmacyContent";
import OrderRequestsContent from "@/components/OrderRequestsContent";
import FindPharmacistContent from "@/components/FindPharmacistContent";
import FindMedicinesContent from "@/components/FindMedicinesContent";
import AccountContent from "@/components/AccountContent";
import Chat from "@/components/Chat";
import ConversationsContent from "@/components/ConversationsContent";
import ConfirmOrderContent from "@/components/ConfirmOrderContent";
import OrdersContent from "@/components/OrdersContent";
import ReviewRequestContent from "@/components/ReviewRequestContent";
import { Home as HomeIcon, Chat as ChatIcon, Person as PersonIcon, LocalPharmacy as PharmacyIcon, Medication as MedicationIcon } from '@mui/icons-material';
import { useTheme, useMediaQuery } from "@mui/material";
import PremiumLanding from "@/components/PremiumLanding";

interface UnifiedUser {
  _id: string;
  id?: string;
  username: string;
  email?: string;
  role: string;
  profilePicture?: string;
}

const MapBackground = dynamicImport(() => import('@/components/MapBackground'), {
  ssr: false,
  loading: () => <Box sx={{ height: '100%', width: '100%', bgcolor: '#002d24' }}/>
});

const MotionPaper = motion(Paper);

const animatedWords = ["pharmacies", "pharmacists", "medicines"];

export default function HomeClient({
  initialView,
}: {
  initialView?: string;
}) {
  const { user, isLoading } = useSession();
  const { getTotalItems } = useCart();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const router = useRouter();
  const [inputValue, setInputValue] = useState("");
  const [wordIndex, setWordIndex] = useState(0);
  const [view, setView] = useState(
    initialView === 'findMedicines' || initialView === 'orderMedicines'
      ? initialView
      : 'home'
  );
  const [otherUser, setOtherUser] = useState<UnifiedUser | null>(null);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

  const normalizedUser: UnifiedUser | null = user ? { ...user, _id: user.id } : null;

  const bottomPadding = view === 'home' ? { xs: '140px', sm: '150px' } : { xs: '70px', sm: '80px' };

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
    } else if (view === 'reviewRequest') {
      setView('orderMedicines');
    } else {
      setView('home');
    }
    setInputValue('');
  };

  const renderWelcomeView = () => (
    <Box
      key="welcome"
      component={motion.div}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      sx={{ width: '100%', mx: 'auto', p: { xs: 0, sm: 2 } }}
    >
      <PremiumLanding 
        onSearchClick={() => setView('orderMedicines')}
        onPharmacistClick={() => {
          if (normalizedUser && ['pharmacy', 'pharmacist'].includes(normalizedUser.role)) {
            setView('storeManagement');
          } else {
            setView('consult');
          }
        }}
      />
    </Box>
  );

  const mobileButtonAnimation = {
    initial: { x: -100, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    transition: { type: 'spring', stiffness: 120, damping: 14 } as const,
};


  const renderPageView = (title: string, layoutId: string, children?: React.ReactNode, fullWidthMobile: boolean = false, showHeader: boolean = true) => (

    <Box
      key={layoutId}
      component={motion.div}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      sx={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, display: 'flex', flexDirection: 'column', pt: showHeader ? { xs: 8, sm: 10 } : 0, pb: bottomPadding, color: 'white' }}
    >
        {showHeader && (
          <motion.div 
            layoutId={layoutId}
            transition={{ duration: 0.8, ease: "easeInOut" }}
          >
              <Paper
                  elevation={0}
                  sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      p: 2,
                      bgcolor: 'transparent',
                      color: 'white',
                      borderRadius: 0,
                      borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
                  }}
              >
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <IconButton onClick={handleBackNavigation} sx={{ color: 'white' }}>
                          <ArrowBackIcon />
                      </IconButton>
                      <Typography variant="h6" sx={{ ml: 2, fontWeight: 500 }}>
                          {title}
                      </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1, alignItems: { xs: 'flex-end', sm: 'center' } }}>
                      <Badge badgeContent={getTotalItems()} color="secondary">
                          <Button
                              variant="outlined"
                              onClick={() => setView('confirmOrder')}
                              sx={{
                                  borderRadius: '20px',
                                  borderColor: 'rgba(255, 255, 255, 0.8)',
                                  color: 'white',
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
                              borderColor: 'rgba(255, 255, 255, 0.8)',
                              color: 'white',
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
              </Paper>
          </motion.div>
        )}
        <Box sx={{ flexGrow: 1, overflowY: 'auto', p: fullWidthMobile ? { xs: 0, sm: 3 } : { xs: 2, sm: 3 } }}>
            {children}
        </Box>
    </Box>
  );

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
              <DispatchForm initialSearchValue={inputValue} setView={setView} setSelectedRequestId={setSelectedRequestId} />
            </Box>
          </Box>
        );
      case 'storeManagement':
        return renderPageView('Store Management', 'store-management-header');
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
            sx={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, display: 'flex', flexDirection: 'column', pt: { xs: 8, sm: 10 }, pb: bottomPadding, bgcolor: '#fafaf8' }}
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
        return renderPageView('Account', 'account-header', <AccountContent setView={setView} />);
      case 'confirmOrder':
        return (
          <Box
            key="confirm-order"
            component={motion.div}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            sx={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, display: 'flex', flexDirection: 'column', pt: { xs: 8, sm: 10 }, pb: bottomPadding, bgcolor: '#fafaf8' }}
          >
            <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
              <ConfirmOrderContent setView={setView} />
            </Box>
          </Box>
        );
 
      case 'orders':
        return renderPageView('Orders', 'orders-header', <OrdersContent />, true, false);
      case 'reviewRequest':
        if (!selectedRequestId) return null;
        return renderPageView('Review Request', 'review-request-header', <ReviewRequestContent requestId={selectedRequestId} setView={setView} />);
        case 'chat':
          if (otherUser) {
              return renderPageView('Chat', 'chat-header', <Chat user={otherUser} onBack={handleBackNavigation} />);
          }
          return <CircularProgress />;
  
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
      
    }}>
      <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: '60vh', zIndex: 0 }}>
          <MapBackground />
        </Box>

      <Box sx={{
          position: 'relative',
          flexGrow: 1,
          display: "flex",
          flexDirection: 'column',
          alignItems: "center",
          justifyContent: "center",
          p: { xs: 2, sm: 3 },
          overflow: 'hidden'
        }}>
            <style>
              {`
                @keyframes wavyGradient {
                  0% { background-position: 0% 50%; }
                  50% { background-position: 100% 50%; }
                  100% { background-position: 0% 50%; }
                }
              `}
            </style>
            <Box
              sx={{
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: (view === 'findPharmacy' || view === 'consult') ? 2 : 1,
  background: (view === 'findPharmacy' || view === 'consult')
    ? 'linear-gradient(120deg,rgb(3, 34, 14),rgb(82, 6, 59),rgb(6, 36, 51),rgb(5, 84, 65),rgb(115, 3, 127),rgb(3, 56, 83))'
    : 'linear-gradient(120deg, #e43a5a,rgb(134, 3, 112),rgb(16, 172, 157), rgb(61, 149, 249),rgb(170, 73, 244))', 
  backgroundSize: '300% 300%',
  animation: (view === 'findPharmacy' || view === 'consult') ? 'wavyGradient 15s ease infinite' : 'wavyGradient 8s ease infinite', 
  opacity: (view === 'findPharmacy' || view === 'consult') ? 0.8 : 0.7, 
}}
            />

        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '55%', 
            bgcolor: 'rgb(255, 255, 255)',
            zIndex: 1, 
            clipPath: `polygon(
               0% 10%, 2.5% 10.7%, 5% 11.5%, 7.5% 12.2%, 10% 13%, 12.5% 13.7%, 15% 14.4%, 17.5% 14.8%, 
                    20% 15%, 22.5% 14.9%, 25% 14.5%, 27.5% 14.1%, 30% 13%, 32.5% 12.3%, 35% 11.5%, 37.5% 10.7%, 
                    40% 10%, 42.5% 9.3%, 45% 8.5%, 47.5% 8.2%, 50% 8%, 52.5% 7.8%, 55% 7.5%, 57.5% 7.2%, 
                    60% 7%, 62.5% 7.2%, 65% 7.5%, 67.5% 7.8%, 70% 8%, 72.5% 8.7%, 75% 9.5%, 77.5% 10.3%, 
                    80% 11%, 82.5% 11.8%, 85% 12.5%, 87.5% 13.3%, 90% 14%, 92.5% 14.5%, 95% 14.8%, 97.5% 14.9%, 
                    100% 15%, 
                    100% 100%, 0 100%
            )`,
          }}
        />

        <Box sx={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', flex: 1 }}>
            <LayoutGroup>
              <AnimatePresence mode="wait">
                {renderActiveView()}
              </AnimatePresence>
            </LayoutGroup>
        </Box>
      </Box>

      <Box
        sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 1300,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 1,
            px: 2,
            pb: 2
        }}
      >
        <AnimatePresence>
        {view === 'home' && (
            <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 30, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 40 }}
                style={{ width: '100%', maxWidth: '800px' }}
            >
                <MotionPaper
    elevation={3}
    onClick={() => setView('orderMedicines')}
    sx={{
        p: '8px 16px',
        display: 'flex',
        alignItems: 'center',
        borderRadius: '12px',
        background: 'rgba(255, 255, 255, 0.98)',
        cursor: 'pointer', 
    }}
>

                    <SearchIcon sx={{ color: 'grey.500', mr: 1.5 }} />
                    <TextField
                        fullWidth
                        placeholder="Type to search for a drug"
                        variant="standard"
                        value={inputValue}
                        onChange={handleSearchInitiation}
                        InputProps={{ disableUnderline: true, sx: { fontSize: { xs: '1rem', sm: '1.1rem' } } }}
                    />
                </MotionPaper>
            </motion.div>
        )}
        </AnimatePresence>
        
        <Paper
            elevation={3}
            sx={{
                display: 'flex',
                justifyContent: 'space-around',
                alignItems: 'center',
                p: 1,
                width: '100%',
                maxWidth: '800px',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.98)',
                borderTop: '1px solid rgba(0,0,0,0.1)',
            }}
        >
            <Button onClick={() => setView('home')} sx={{ flexDirection: 'column', color: view === 'home' ? '#1B5E20 ' : 'grey.700', textTransform: 'none', fontSize: '0.75rem', minWidth: '60px' }}>
                <HomeIcon />
                Home
            </Button>
            <Button onClick={() => setView('orderMedicines')} sx={{ flexDirection: 'column', color: view === 'findMedicines' ? '#1B5E20 ' : 'grey.700', textTransform: 'none', fontSize: '0.75rem', minWidth: '60px' }}>
                <MedicationIcon  />
                Search Medicines
            </Button>
            <Button onClick={() => setView('findPharmacy')} sx={{ flexDirection: 'column', color: view === 'findPharmacy' ? '#1B5E20 ' : 'grey.700', textTransform: 'none', fontSize: '0.75rem', minWidth: '60px' }}>
                <PharmacyIcon />
                Pharmacies
            </Button>
            
            <Button onClick={() => setView('account')} sx={{ flexDirection: 'column', color: view === 'account' ? '#1B5E20 ' : 'grey.700', textTransform: 'none', fontSize: '0.75rem', minWidth: '60px' }}>
                <PersonIcon />
                Account
            </Button>
        </Paper>

      </Box>
    </Box>
  );
}
