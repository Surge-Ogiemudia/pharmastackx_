'use client';

import React, { useState, useRef } from 'react';
import { Box, Typography, Modal, IconButton, Fade, CircularProgress } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import CloseIcon from '@mui/icons-material/Close';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import AttachmentIcon from '@mui/icons-material/Attachment';
import axios from 'axios';

interface RxScanModalProps {
  open: boolean;
  onClose: () => void;
  onScanResult: (medicines: any[], image: string) => void;
  mode?: 'rx' | 'med';
}

const RxScanModal: React.FC<RxScanModalProps> = ({ open, onClose, onScanResult, mode = 'rx' }) => {
  const [image, setImage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isRx = mode === 'rx';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setImage(base64);
        setIsScanning(true);
        performScan(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const performScan = async (base64Image: string) => {
    try {
      const endpoint = isRx ? '/api/ai/scan-rx' : '/api/ai/scan-med';
      const res = await axios.post(endpoint, { image: base64Image });
      if (res.data.medicines) {
        // Subtle delay for the cute scanning animation effect
        setTimeout(() => {
          onScanResult(res.data.medicines, base64Image);
          handleClose();
        }, 2200);
      }
    } catch (err: any) {
      console.error('Scan error:', err);
      const errMsg = err.response?.data?.error || `Failed to read ${isRx ? 'prescription' : 'medicine'}.`;
      const errDetails = err.response?.data?.details ? `\n\nDetails: ${err.response.data.details}` : '';
      alert(`${errMsg}${errDetails}\n\nPlease try a clearer image or manually add the items.`);
      setIsScanning(false);
      setImage(null);
    }
  };

  const handleClose = () => {
    setImage(null);
    setIsScanning(false);
    onClose();
  };

  return (
    <Modal 
      open={open} 
      onClose={handleClose} 
      closeAfterTransition 
      slots={{ 
        backdrop: (props: any) => {
          const { ownerState, ...other } = props;
          return <Box {...other} sx={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, bgcolor: 'rgba(10,15,12,0.6)', backdropFilter: 'blur(10px)', zIndex: -1 }} />;
        }
      }}
    >
      <Fade in={open}>
        <Box sx={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: { xs: '90%', sm: 420 }, bgcolor: 'rgba(255,255,255,0.95)', borderRadius: '32px',
          p: 4, boxShadow: '0 32px 80px rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.5)',
          outline: 'none', textAlign: 'center', overflow: 'hidden'
        }}>
          {/* Decorative Corner Glow */}
          <Box sx={{ position: 'absolute', top: -100, right: -100, width: 200, height: 200, borderRadius: '50%', bgcolor: 'rgba(15,110,86,0.05)', filter: 'blur(40px)', zIndex: 0 }} />
          
          <IconButton onClick={handleClose} sx={{ position: 'absolute', right: 16, top: 16, color: '#aaa', zIndex: 2 }}>
            <CloseIcon />
          </IconButton>
          
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Typography sx={{ fontFamily: 'var(--font-fraunces), serif', fontSize: '24px', fontWeight: 900, mb: 1, color: '#111', letterSpacing: '-0.5px' }}>
              Scan your <em style={{ color: 'var(--green)', fontStyle: 'italic' }}>{isRx ? 'Rx' : 'Medicine'}</em>
            </Typography>
            <Typography sx={{ fontSize: '14px', color: '#777', mb: 3, lineHeight: 1.6, fontWeight: 400, px: 2 }}>
              {isRx 
                ? "Snap or upload your prescription. Our AI reads everything and finds it for you in minutes."
                : "Snap a clear photo of your medicine box or bottle. We'll identify it and add it for you."}
            </Typography>

            {!isRx && (
              <Box sx={{ 
                mb: 3, p: 2, borderRadius: '16px', bgcolor: 'rgba(15,110,86,0.05)', 
                border: '1px solid rgba(15,110,86,0.1)', textAlign: 'left'
              }}>
                <Typography sx={{ fontSize: '12px', color: 'var(--green)', fontWeight: 800, mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  💡 Quick Guide
                </Typography>
                <Typography sx={{ fontSize: '13px', color: '#444', lineHeight: 1.4 }}>
                  Snap the side where the <strong>Full Name</strong> and <strong>Strength</strong> (like 500mg, 1g, or 10ml) are written clearly.
                </Typography>
              </Box>
            )}

            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" style={{ display: 'none' }} />

            {!image ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box onClick={() => fileInputRef.current?.click()} sx={{
                  display: 'flex', alignItems: 'center', gap: 2, p: 2.5, borderRadius: '20px',
                  bgcolor: 'var(--green-pale)', border: '1.5px dashed rgba(15,110,86,0.3)',
                  cursor: 'pointer', transition: 'all 0.2s', '&:hover': { bgcolor: '#fff', borderColor: 'var(--green)', transform: 'translateY(-2px)' }
                }}>
                  <Box sx={{ width: 48, height: 48, borderRadius: '14px', bgcolor: 'var(--green)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <CameraAltIcon fontSize="small" />
                  </Box>
                  <Box sx={{ textAlign: 'left' }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '15px', color: '#111', fontFamily: 'var(--font-sora)' }}>Camera & Gallery</Typography>
                    <Typography sx={{ fontSize: '11px', color: '#666' }}>Snap a fresh photo or pick from gallery</Typography>
                  </Box>
                </Box>

                <Box onClick={() => fileInputRef.current?.click()} sx={{
                  display: 'flex', alignItems: 'center', gap: 2, p: 2.5, borderRadius: '20px',
                  bgcolor: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.05)',
                  cursor: 'pointer', transition: 'all 0.2s', '&:hover': { bgcolor: '#fff', transform: 'translateY(-2px)' }
                }}>
                  <Box sx={{ width: 48, height: 48, borderRadius: '14px', bgcolor: '#f0f0f0', color: '#555', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <AttachmentIcon fontSize="small" />
                  </Box>
                  <Box sx={{ textAlign: 'left' }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '15px', color: '#111', fontFamily: 'var(--font-sora)' }}>Files & Documents</Typography>
                    <Typography sx={{ fontSize: '11px', color: '#666' }}>Upload a PDF or stored image file</Typography>
                  </Box>
                </Box>
              </Box>
            ) : (
              <Box sx={{ position: 'relative', width: '100%', borderRadius: '20px', overflow: 'hidden', mb: 1, boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
                <img src={image} alt="Prescription" style={{ width: '100%', height: '240px', objectFit: 'cover', display: 'block', filter: isScanning ? 'brightness(0.7)' : 'none' }} />
                
                <AnimatePresence>
                  {isScanning && (
                    <>
                      <motion.div
                        initial={{ top: '0%' }} 
                        animate={{ top: '100%' }} 
                        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                        style={{
                          position: 'absolute', left: 0, right: 0, height: '3px',
                          background: 'linear-gradient(90deg, transparent, var(--green), transparent)',
                          boxShadow: '0 0 20px var(--green), 0 0 40px var(--green)', zIndex: 3
                        }}
                      />
                      <Box sx={{
                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        justifyContent: 'center', zIndex: 2, gap: 2
                      }}>
                         <CircularProgress size={44} thickness={4} sx={{ color: '#fff' }} />
                         <Typography sx={{ color: '#fff', fontSize: '12px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                            Scanning...
                         </Typography>
                      </Box>
                    </>
                  )}
                </AnimatePresence>
              </Box>
            )}

            {!isScanning && image && (
               <Typography sx={{ fontSize: '11px', color: '#888', mt: 2 }}>
                  Wait while we process your image...
               </Typography>
            )}
            
            <Box sx={{ mt: 3, opacity: 0.5, fontSize: '10px', color: '#aaa', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Paperless · Pharmacist-Verified · Secure
            </Box>
          </Box>
        </Box>
      </Fade>
    </Modal>
  );
};

export default RxScanModal;
