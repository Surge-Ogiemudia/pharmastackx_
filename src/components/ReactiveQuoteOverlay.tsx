'use client';

import React from 'react';
import { Box, Typography } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import RadarIcon from '@mui/icons-material/Radar';
import CloseIcon from '@mui/icons-material/Close';

export interface ReactiveQuoteOverlayProps {
  request: {
    _id: string;
    status: string;
    quotes: any[];
    items: any[];
    quoteCount?: number;
  };
  onClick: (id: string, status: string) => void;
  onDismiss: (e?: React.MouseEvent) => void;
}

const ReactiveQuoteOverlay = ({ request, onClick, onDismiss }: ReactiveQuoteOverlayProps) => {
  const quoteCount = request.quotes?.length || 0;
  const isPending = request.status === 'pending';

  return (
    <AnimatePresence>
      <Box
        component={motion.div}
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        onClick={() => onClick(request._id, request.status)}
        sx={{
          position: 'fixed',
          bottom: { xs: 80, sm: 30, md: 160 }, // Stay well above bottom nav on desktop
          right: { xs: 16, sm: 30, lg: 'calc(50% - 570px)' },
          zIndex: 9999,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          bgcolor: 'white',
          p: '8px 16px',
          borderRadius: '100px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          border: '1px solid rgba(200,75,143,0.1)',
          maxWidth: 'fit-content'
        }}
      >
        <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* Radar Waves */}
          <Box
            component={motion.div}
            animate={{ scale: [1, 2], opacity: [0.5, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeOut" }}
            sx={{
              position: 'absolute',
              width: 32,
              height: 32,
              borderRadius: '50%',
              bgcolor: 'var(--pink-pale)',
              zIndex: 0
            }}
          />
          <Box
            component={motion.div}
            animate={{ scale: [1, 2], opacity: [0.3, 0] }}
            transition={{ repeat: Infinity, duration: 2, delay: 0.8, ease: "easeOut" }}
            sx={{
              position: 'absolute',
              width: 32,
              height: 32,
              borderRadius: '50%',
              bgcolor: 'var(--green-pale)',
              zIndex: 0
            }}
          />
          
          <Box sx={{ 
            bgcolor: quoteCount > 0 ? 'var(--green)' : 'var(--pink)', 
            color: 'white', 
            borderRadius: '50%', 
            width: 36, 
            height: 36, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            zIndex: 1
          }}>
            <RadarIcon sx={{ fontSize: 20 }} />
          </Box>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          <Typography sx={{ 
            fontSize: '12px', 
            fontWeight: 700, 
            color: '#111', 
            lineHeight: 1.2,
            fontFamily: "'Sora', sans-serif"
          }}>
            {quoteCount || request.quoteCount || 0} {(quoteCount || request.quoteCount) === 1 ? 'quote' : 'quotes'} received for '{request.items?.[0]?.name || 'Medicine'}'
          </Typography>
          <Typography sx={{ 
            fontSize: '10px', 
            color: 'var(--gray)', 
            fontWeight: 400,
            fontFamily: "'Sora', sans-serif"
          }}>
            Searching...
          </Typography>
        </Box>

        <Box 
          onClick={(e) => {
            e.stopPropagation();
            onDismiss(e);
          }}
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            ml: 1,
            color: '#ef4444',
            bgcolor: 'rgba(239, 68, 68, 0.05)',
            borderRadius: '50%',
            p: 0.5,
            transition: 'all 0.2s',
            '&:hover': {
              bgcolor: 'rgba(239, 68, 68, 0.1)',
              transform: 'scale(1.1)'
            }
          }}
        >
          <CloseIcon sx={{ fontSize: 16 }} />
        </Box>
      </Box>
    </AnimatePresence>
  );
};

export default ReactiveQuoteOverlay;
