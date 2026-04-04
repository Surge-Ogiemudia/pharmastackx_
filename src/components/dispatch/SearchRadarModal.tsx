'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Modal, Box, Typography, keyframes, Grid, Chip, Avatar, Button, Slide, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import Image from 'next/image';
import { useSession } from '@/context/SessionProvider';

// Define the shape of the drug request for the props
interface DrugRequest {
  id: number;
  name: string;
  form: string;
  strength: string;
  quantity: number;
  image: string | null;
}

// Keyframes for the animations
const rotate = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const pulse = keyframes`
  0%, 100% { transform: scale(0.5); opacity: 0.5; }
  50% { transform: scale(1.2); opacity: 1; }
`;

const modalStyle = {
  position: 'absolute' as 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '90vw',
  maxWidth: 800,
  bgcolor: '#001a14',
  border: '2px solid #004d40',
  boxShadow: '0 0 30px rgba(0, 255, 200, 0.5)',
  p: 2,
  borderRadius: '16px',
  color: '#e0f2f1',
  outline: 'none',
  overflow: 'hidden', // To contain the slide animation
};

const radarContainerStyle = {
  height: 250,
  width: 250,
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: `
    radial-gradient(circle, rgba(0, 51, 43, 0.8) 1px, transparent 1px),
    linear-gradient(to right, #00332b 1px, transparent 1px),
    linear-gradient(to bottom, #00332b 1px, transparent 1px)
  `,
  backgroundSize: '20px 20px, 20px 20px, 20px 20px',
  borderRadius: '50%',
  border: '2px solid #006d5b',
  mb: 2,
  mx: 'auto',
  boxShadow: 'inset 0 0 20px rgba(0,0,0,0.7)',
};

const scannerBeamStyle = {
    width: '50%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: '50%',
    transformOrigin: 'left center',
    background: 'linear-gradient(90deg, transparent, rgba(0, 255, 200, 0.3), transparent)',
    animation: `${rotate} 4s linear infinite`,
};

const detectionDotStyle = (top: string, left: string, delay: string) => ({
    width: 10,
    height: 10,
    backgroundColor: '#66ff99',
    borderRadius: '50%',
    position: 'absolute',
    top,
    left,
    boxShadow: '0 0 10px #66ff99',
    animation: `${pulse} 2s infinite`,
    animationDelay: delay,
});

interface SearchRadarModalProps {
  open: boolean;
  onClose: () => void;
  requests: DrugRequest[];
  requestId: string | null;
  isQuoteReady: boolean;
  onReview: () => void;
}

const SearchRadarModal: React.FC<SearchRadarModalProps> = ({ open, onClose, requests, isQuoteReady, onReview }) => {
  const [os, setOs] = useState<'iOS' | 'Android' | 'Other'>('Other');
  const [isStandalone, setIsStandalone] = useState(false);
  const [installGuideOpen, setInstallGuideOpen] = useState(false);
  const { user } = useSession();
  const router = useRouter();
  const [showLoginOverlay, setShowLoginOverlay] = useState(false);

  useEffect(() => {
    if (open) {
      if (window.matchMedia('(display-mode: standalone)').matches) {
        setIsStandalone(true);
      }

      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      if (/android/i.test(userAgent)) {
        setOs('Android');
      } else if (/iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream) {
        setOs('iOS');
      }

      if (!user) {
        const timer = setTimeout(() => {
          setShowLoginOverlay(true);
        }, 2500);
        return () => clearTimeout(timer);
      }
    } else {
      setShowLoginOverlay(false);
    }
  }, [open, user]);

  const handleReviewClick = () => {
    onReview();
  };

  const handleInstallGuideOpen = () => {
    setInstallGuideOpen(true);
  };

  const handleInstallGuideClose = () => {
    setInstallGuideOpen(false);
  };

  const handleLoginRedirect = () => {
    router.push('/auth');
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        aria-labelledby="searching-modal-title"
      >
        <Box sx={modalStyle}>
          {showLoginOverlay && (
            <Box sx={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                bgcolor: 'rgba(0, 20, 15, 0.95)',
                zIndex: 100,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                p: 4,
                textAlign: 'center'
            }}>
                <Typography variant="h5" component="h2" sx={{ fontWeight: 700, mb: 2, color: '#66ff99' }}>
                    Login to View Quotes
                </Typography>
                <Typography sx={{ color: '#e0f2f1', mb: 4, maxWidth: 350 }}>
                    When a pharmacist sends a quote for your request, you'll need to be logged in to view and accept it.
                </Typography>
                <Button
                    variant="contained"
                    onClick={handleLoginRedirect}
                    sx={{
                        bgcolor: '#00c853',
                        color: 'white',
                        fontWeight: 'bold',
                        px: 5,
                        py: 1.5,
                        '&:hover': { bgcolor: '#009624' },
                    }}
                >
                    Login to Continue
                </Button>
            </Box>
          )}

          <Slide direction="down" in={isQuoteReady} mountOnEnter unmountOnExit>
            <Box
                  sx={{
                      position: 'absolute',
                      top: '16px',
                      left: '16px',
                      right: '16px',
                      zIndex: 10,
                      bgcolor: 'white',
                      color: '#004D40',
                      p: '12px 20px',
                      borderRadius: '12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                  }}
              >
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <CheckCircleIcon sx={{ mr: 1.5 }} />
                      <Box>
                          <Typography sx={{ fontWeight: 'bold', color: '#004D40' }}>Quote Ready!</Typography>
                          <Typography variant="body2" sx={{ color: '#004D40', opacity: 0.8 }}>A pharmacist has sent a quote.</Typography>
                      </Box>
                  </Box>
                  <Button 
                      variant="contained" 
                      size="small" 
                      onClick={handleReviewClick}
                      sx={{ 
                          bgcolor: '#00c853',
                          color: 'white',
                          boxShadow: 'none',
                          fontWeight: 'bold',
                          '&:hover': { bgcolor: '#009624' },
                          ml: 2,
                      }}
                  >
                      Review
                  </Button>
              </Box>
          </Slide>

          <Grid container spacing={3} alignItems="center">
              <Grid item xs={12} md={6}>
                  <Typography id="searching-modal-title" variant="h6" component="h2" sx={{ fontWeight: 700, mb: 1, color: '#4CAF50', textAlign: 'center' }}>
                      Searching for items...
                  </Typography>
                  <Box sx={radarContainerStyle}>
                      <Box sx={scannerBeamStyle} />
                      <Box sx={detectionDotStyle('20%', '30%', '0s')} />
                      <Box sx={detectionDotStyle('50%', '70%', '0.5s')} />
                      <Box sx={detectionDotStyle('75%', '40%', '1s')} />
                      <Box sx={detectionDotStyle('30%', '80%', '1.5s')} />
                      <Box sx={detectionDotStyle('60%', '15%', '2s')} />
                  </Box>
                  <Typography variant="body2" sx={{ color: '#b2dfdb', textAlign: 'center' }}>
                      You can close this window. We'll notify you on this page when a quote is ready.
                  </Typography>
                   {!isStandalone && (os === 'iOS' || os === 'Android') && (
                    <Box sx={{ mt: 2, p: 1.5, backgroundColor: 'rgba(0, 61, 51, 0.5)', borderRadius: '8px', textAlign: 'center' }}>
                      <Typography variant="body2" sx={{ mb: 1, color: '#b2dfdb' }}>
                        To receive instant push notifications:
                      </Typography>
                      <Button onClick={handleInstallGuideOpen} variant="outlined" size="small" sx={{color: '#b2dfdb', borderColor: '#004d40'}}>
                        Add App to Home Screen
                      </Button>
                    </Box>
                  )}
              </Grid>
              
              <Grid item xs={12} md={6}>
                  <Typography variant="h6" sx={{ color: '#80cbc4', borderBottom: '1px solid #004d40', pb: 1, mb: 2, fontWeight: 600 }}>
                      Dispatch Request
                  </Typography>
                  <Box sx={{ maxHeight: 300, overflowY: 'auto', pr: 1 }}>
                      {requests.map((drug) => {
                          const isImageBased = drug.name.startsWith('Prescription') || drug.name.startsWith('Image');
                          return (
                              <Box key={drug.id} sx={{ display: 'flex', alignItems: 'center', mb: 2, p: 1.5, bgcolor: 'rgba(0, 61, 51, 0.5)', borderRadius: '8px' }}>
                                  {drug.image && <Avatar src={drug.image} sx={{ width: 40, height: 40, mr: 2 }} />}
                                  <Box>
                                      <Typography sx={{ fontWeight: 600, color: 'white' }}>{drug.name}</Typography>
                                      {!isImageBased && (
                                          <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                                              <Chip label={`Qty: ${drug.quantity}`} size="small" variant="outlined" sx={{ color: '#b2dfdb', borderColor: '#004d40' }} />
                                              {drug.strength && <Chip label={drug.strength} size="small" variant="outlined" sx={{ color: '#b2dfdb', borderColor: '#004d40' }} /> }
                                              {drug.form && <Chip label={drug.form} size="small" variant="outlined" sx={{ color: '#b2dfdb', borderColor: '#004d40' }} /> }
                                          </Box>
                                      )}
                                  </Box>
                              </Box>
                          )
                      })}
                  </Box>
              </Grid>
          </Grid>
        </Box>
      </Modal>

       <Dialog open={installGuideOpen} onClose={handleInstallGuideClose} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ textAlign: 'center', fontWeight: 'bold' }}>Install App Guide</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {os === 'Android' ? (
            <Typography variant="body2" sx={{ mb: 2, textAlign: 'center' }}>
              Tap the <strong>three dots</strong> in the corner, then select '<strong>Install app</strong>' or '<strong>Add to Home Screen</strong>'.
            </Typography>
          ) : ( // iOS
            <Typography variant="body2" sx={{ mb: 2, textAlign: 'center' }}>
              Tap the <strong>Share</strong> icon at the bottom, then scroll down and tap '<strong>Add to Home Screen</strong>'.
            </Typography>
          )}
          <Image
            src={os === 'Android' ? "/install-guide-android.png" : "/install-guide.png"}
            alt="How to add to home screen guide"
            width={os === 'Android' ? 180 : 200}
            height={300}
            style={{ maxWidth: '100%', height: 'auto', borderRadius: '8px' }}
          />
        </DialogContent>
        <DialogActions sx={{justifyContent: 'center', pb: 2}}>
            <Button onClick={handleInstallGuideClose} variant="contained">Got It</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default SearchRadarModal;
