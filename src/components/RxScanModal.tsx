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
  const [scanPhase, setScanPhase] = useState<'idle' | 'uploading' | 'capture' | 'identify' | 'match' | 'results' | 'failed'>('idle');
  const [timeLeft, setTimeLeft] = useState(3);
  const [statusText, setStatusText] = useState('Extracting Visual Data');
  const [progressWidth, setProgressWidth] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isRx = mode === 'rx';

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          let width = img.width;
          let height = img.height;

          if (width > height && width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          } else if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          resolve(canvas.toDataURL('image/jpeg', 0.6));
        };
        img.onerror = reject;
        img.src = event.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setScanPhase('uploading');
        const tempReader = new FileReader();
        tempReader.onloadend = () => setImage(tempReader.result as string);
        tempReader.readAsDataURL(file);

        const compressedBase64 = await compressImage(file);
        performScan(compressedBase64);
      } catch (err) {
        console.error("Compression skipped", err);
        const reader = new FileReader();
        reader.onloadend = () => performScan(reader.result as string);
        reader.readAsDataURL(file);
      }
    }
  };

  const performScan = async (base64Image: string) => {
    setScanPhase('capture');
    setProgressWidth(15);
    setStatusText('Mapping image coordinates');
    setTimeLeft(3);

    const matchTimer = setTimeout(() => {
      setScanPhase('identify');
      setProgressWidth(40);
      setStatusText('Extracting critical keywords');
      setTimeLeft(2);
    }, 800);

    const broadcastTimer = setTimeout(() => {
      setScanPhase('match');
      setProgressWidth(70);
      setStatusText('Broadcasting search');
      setTimeLeft(1);
    }, 1800);

    try {
      const endpoint = isRx ? '/api/ai/scan-rx' : '/api/ai/scan-med';
      const res = await axios.post(endpoint, { image: base64Image });
      
      clearTimeout(matchTimer);
      clearTimeout(broadcastTimer);

      if (res.data.medicines && res.data.medicines.length > 0) {
        setScanPhase('results');
        setProgressWidth(100);
        setStatusText('Match successful');
        setTimeLeft(0);
        setTimeout(() => {
          onScanResult(res.data.medicines, base64Image);
          handleClose();
        }, 800);
      } else {
        throw new Error("No medicines extracted");
      }
    } catch (err: any) {
      clearTimeout(matchTimer);
      clearTimeout(broadcastTimer);
      console.error('Scan error:', err);
      // Initiate fallback UX
      setScanPhase('failed');
      setProgressWidth(100);
      setTimeLeft(0);
      setStatusText('Extraction Failed');
    }
  };

  const handleFallbackContinue = () => {
    if (image) {
      onScanResult([], image);
    }
    handleClose();
  };

  const handleClose = () => {
    setImage(null);
    setScanPhase('idle');
    setProgressWidth(0);
    onClose();
  };

  const isDark = image !== null; // Use dark mode when image is selected

  const getStepColor = (targetPhase: string | string[]) => {
    const activePhases = Array.isArray(targetPhase) ? targetPhase : [targetPhase];
    if (scanPhase === 'failed') return '#d32f2f'; // Error red
    if (scanPhase === 'results' || activePhases.includes(scanPhase)) return '#0F6E56'; // Active/Done
    // Logic for past phases
    const phaseOrder = ['uploading', 'capture', 'identify', 'match', 'results'];
    const currentIdx = phaseOrder.indexOf(scanPhase);
    const targetIdx = phaseOrder.indexOf(activePhases[0]);
    if (currentIdx > targetIdx) return '#0F6E56';
    return '#444'; // Pending
  };

  return (
    <Modal open={open} onClose={handleClose} closeAfterTransition slots={{ backdrop: (p: any) => { const { ownerState, ...other } = p; return <Box {...other} sx={{ position: 'fixed', inset: 0, bgcolor: 'rgba(10,15,12,0.7)', backdropFilter: 'blur(10px)', zIndex: -1 }} />; } }}>
      <Fade in={open}>
        <Box sx={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: { xs: '90%', sm: 460 }, 
          bgcolor: isDark ? '#121212' : 'rgba(255,255,255,0.95)', 
          color: isDark ? '#fff' : '#111',
          borderRadius: '32px', p: { xs: 3, sm: 4 }, 
          boxShadow: '0 32px 80px rgba(0,0,0,0.2)', 
          border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.5)',
          outline: 'none', textAlign: 'center', overflow: 'hidden',
          transition: 'background-color 0.4s ease'
        }}>
          {!isDark && <Box sx={{ position: 'absolute', top: -100, right: -100, width: 200, height: 200, borderRadius: '50%', bgcolor: 'rgba(15,110,86,0.05)', filter: 'blur(40px)', zIndex: 0 }} />}
          
          <IconButton onClick={handleClose} sx={{ position: 'absolute', right: 16, top: 16, color: isDark ? '#fff' : '#aaa', zIndex: 2 }}>
            <CloseIcon />
          </IconButton>
          
          <Box sx={{ position: 'relative', zIndex: 1, height: '100%' }}>
            {!isDark ? (
              <Box>
                <Typography sx={{ fontFamily: 'var(--font-fraunces), serif', fontSize: '24px', fontWeight: 900, mb: 1, letterSpacing: '-0.5px' }}>
                  Scan your <em style={{ color: 'var(--green)', fontStyle: 'italic' }}>{isRx ? 'Rx' : 'Medicine'}</em>
                </Typography>
                <Typography sx={{ fontSize: '14px', color: '#777', mb: 3, lineHeight: 1.6, fontWeight: 400, px: 2 }}>
                  {isRx ? "Snap or upload your prescription. Our AI reads everything and finds it for you in minutes." : "Snap a clear photo of your medicine box or bottle. We'll identify it and add it for you."}
                </Typography>
                {!isRx && (
                  <Box sx={{ mb: 3, p: 2, borderRadius: '16px', bgcolor: 'rgba(15,110,86,0.05)', border: '1px solid rgba(15,110,86,0.1)', textAlign: 'left' }}>
                    <Typography sx={{ fontSize: '12px', color: 'var(--green)', fontWeight: 800, mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>💡 Quick Guide</Typography>
                    <Typography sx={{ fontSize: '13px', color: '#444', lineHeight: 1.4 }}>Snap the side where the <strong>Full Name</strong> and <strong>Strength</strong> are written clearly.</Typography>
                  </Box>
                )}

                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" style={{ display: 'none' }} />
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box onClick={() => fileInputRef.current?.click()} sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2.5, borderRadius: '20px', bgcolor: 'var(--green-pale)', border: '1.5px dashed rgba(15,110,86,0.3)', cursor: 'pointer', transition: 'all 0.2s', '&:hover': { bgcolor: '#fff', borderColor: 'var(--green)', transform: 'translateY(-2px)' } }}>
                    <Box sx={{ width: 48, height: 48, borderRadius: '14px', bgcolor: 'var(--green)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <CameraAltIcon fontSize="small" />
                    </Box>
                    <Box sx={{ textAlign: 'left' }}>
                      <Typography sx={{ fontWeight: 700, fontSize: '15px', color: '#111', fontFamily: 'var(--font-sora)' }}>Camera & Gallery</Typography>
                      <Typography sx={{ fontSize: '11px', color: '#666' }}>Snap a fresh photo or pick from gallery</Typography>
                    </Box>
                  </Box>
                  <Box onClick={() => fileInputRef.current?.click()} sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2.5, borderRadius: '20px', bgcolor: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.05)', cursor: 'pointer', transition: 'all 0.2s', '&:hover': { bgcolor: '#fff', transform: 'translateY(-2px)' } }}>
                    <Box sx={{ width: 48, height: 48, borderRadius: '14px', bgcolor: '#f0f0f0', color: '#555', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <AttachmentIcon fontSize="small" />
                    </Box>
                    <Box sx={{ textAlign: 'left' }}>
                      <Typography sx={{ fontWeight: 700, fontSize: '15px', color: '#111', fontFamily: 'var(--font-sora)' }}>Files & Documents</Typography>
                      <Typography sx={{ fontSize: '11px', color: '#666' }}>Upload a PDF or stored image file</Typography>
                    </Box>
                  </Box>
                </Box>
                <Box sx={{ mt: 3, opacity: 0.5, fontSize: '10px', color: '#aaa', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Paperless · Pharmacist-Verified · Secure
                </Box>
              </Box>
            ) : scanPhase === 'failed' ? (
              <Box sx={{ textAlign: 'left', mt: 3 }}>
                <Typography sx={{ color: '#ffaaaa', fontSize: '14px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', mb: 1 }}>Analysis Failed</Typography>
                <Typography sx={{ fontSize: '18px', fontWeight: 700, lineHeight: 1.4, mb: 2 }}>We couldn't automatically read this {isRx ? 'prescription' : 'medicine'}.</Typography>
                <Typography sx={{ fontSize: '14px', color: '#aaa', mb: 4, lineHeight: 1.6 }}>
                  {isRx 
                    ? "Your image or prescription wasn't clear enough for the AI. However, I have attached your image. Our pharmacist will be able to identify the medicine and state its availability for you."
                    : "The lighting or angle wasn't clear enough for the AI. Don't worry! I have attached it below so the pharmacist can identify it for you."
                  }
                </Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                   <Box 
                     onClick={() => { setImage(null); setScanPhase('idle'); }} 
                     sx={{ flex: 1, py: 1.5, borderRadius: '12px', border: '1px solid rgba(255,255,255,0.2)', textAlign: 'center', cursor: 'pointer', '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}
                   >
                     <Typography sx={{ fontSize: '14px', fontWeight: 700 }}>Retake Photo</Typography>
                   </Box>
                   <Box 
                     onClick={handleFallbackContinue} 
                     sx={{ flex: 1, py: 1.5, borderRadius: '12px', bgcolor: 'var(--primary-green)', textAlign: 'center', cursor: 'pointer', '&:hover': { bgcolor: '#0B5E4A' } }}
                   >
                     <Typography sx={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>Continue</Typography>
                   </Box>
                </Box>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {/* HUD Camera Feed Area */}
                <Box sx={{ position: 'relative', width: '100%', height: '260px', borderRadius: '16px', overflow: 'hidden', bgcolor: '#0a0a0a', boxShadow: 'inset 0 0 50px rgba(0,0,0,0.8)' }}>
                  <img src={image} alt="Prescription" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.4 }} />
                  
                  {/* Viewfinder Corners */}
                  <Box sx={{ position: 'absolute', top: 20, left: 20, width: 30, height: 30, borderTop: '3px solid #0F6E56', borderLeft: '3px solid #0F6E56', borderRadius: '4px 0 0 0' }} />
                  <Box sx={{ position: 'absolute', top: 20, right: 20, width: 30, height: 30, borderTop: '3px solid #0F6E56', borderRight: '3px solid #0F6E56', borderRadius: '0 4px 0 0' }} />
                  <Box sx={{ position: 'absolute', bottom: 20, left: 20, width: 30, height: 30, borderBottom: '3px solid #0F6E56', borderLeft: '3px solid #0F6E56', borderRadius: '0 0 0 4px' }} />
                  <Box sx={{ position: 'absolute', bottom: 20, right: 20, width: 30, height: 30, borderBottom: '3px solid #0F6E56', borderRight: '3px solid #0F6E56', borderRadius: '0 0 4px 0' }} />

                  {/* Laser Sweeps */}
                  <motion.div
                    initial={{ y: 0 }} 
                    animate={{ y: 260 }} 
                    transition={{ duration: 1.8, repeat: Infinity, ease: 'linear', repeatType: 'reverse' }}
                    style={{
                      position: 'absolute', left: 40, right: 40, height: '2px',
                      background: '#0F6E56',
                      boxShadow: '0 0 10px #0F6E56, 0 0 20px #0F6E56',
                      zIndex: 3
                    }}
                  />

                  {/* Scan Chip */}
                  <Box sx={{ 
                    position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', 
                    bgcolor: 'rgba(15,110,86,0.9)', backdropFilter: 'blur(8px)', px: 2, py: 0.5, 
                    borderRadius: '20px', zIndex: 4, display: 'flex', alignItems: 'center', gap: 1
                  }}>
                     {scanPhase === 'results' ? '✅' : '🔍'}
                     <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#fff' }}>
                       {scanPhase === 'results' ? 'Medicine Detected' : 'Analyzing Matrix'}
                     </Typography>
                  </Box>
                </Box>

                {/* Progress Status Area */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3, mb: 1 }}>
                   <Typography sx={{ fontSize: '15px', fontWeight: 800, color: '#fff' }}>
                     {statusText}
                   </Typography>
                   <Typography sx={{ fontSize: '13px', fontWeight: 600, color: 'var(--primary-green)' }}>
                     {timeLeft > 0 ? `~${timeLeft}s remaining` : 'Done'}
                   </Typography>
                </Box>
                
                {/* Slim Progress Bar */}
                <Box sx={{ width: '100%', height: '4px', bgcolor: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden', mb: 3 }}>
                   <Box sx={{ width: `${progressWidth}%`, height: '100%', bgcolor: 'var(--primary-green)', transition: 'width 0.4s easeOut' }} />
                </Box>

                {/* Steps */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 1 }}>
                   {['Capture', 'Identify', 'Match', 'Results'].map((stepStr, i) => {
                      const isActive = getStepColor(stepStr.toLowerCase()) === '#0F6E56';
                      return (
                        <Box key={stepStr} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                           <Box sx={{ 
                             width: '8px', height: '8px', borderRadius: '50%', 
                             bgcolor: isActive ? '#0F6E56' : '#444',
                             boxShadow: isActive ? '0 0 10px #0F6E56' : 'none',
                             transition: 'all 0.3s ease'
                           }} />
                           <Typography sx={{ fontSize: '10px', color: isActive ? '#fff' : '#666', fontWeight: isActive ? 600 : 400, transition: 'color 0.3s' }}>
                             {stepStr}
                           </Typography>
                        </Box>
                      )
                   })}
                </Box>
              </Box>
            )}
          </Box>
        </Box>
      </Fade>
    </Modal>
  );
};

export default RxScanModal;
