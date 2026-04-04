
"use client";

import { Box, Typography } from '@mui/material';
import Link from 'next/link';

// Base64 encoded SVG for the WhatsApp doodle pattern
const doodlePattern = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0icCIgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiPjxwYXRoIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLW9wYWNpdHk9IjAuMDUiIHN0cm9rZS13aWR0aD0iMSIgZD0iTS0yNSAyNUw3NSAxMjUgTS0yNSAxMjVMODUgMjUiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjcCkiLz48L3N2Zz4=';

export default function WhatsAppButton() {
  return (
    <Link href="https://wa.me/2349134589572" passHref>
      <Box
        id="whatsapp-live-support-btn"
        component="a"
        target="_blank"
        rel="noopener noreferrer"
        sx={{
          position: 'fixed',
          bottom: { xs: 105, md: 115 },
          right: { xs: 40, md: 70 },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: '#075E54', // WhatsApp dark green
          borderRadius: '30px',
          px: 2,
          height: 40,
          color: 'white',
          textDecoration: 'none',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
          zIndex: 1000,
          transition: 'all 0.3s ease',
          overflow: 'hidden', // Hide overflow from pseudo-element
          
          // Pseudo-element for the watermark overlay
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundImage: `url("${doodlePattern}")`,
            backgroundRepeat: 'repeat',
            zIndex: 0, // Behind the content
          },
          
          '@keyframes pulse': {
            '0%': { transform: 'scale(1)', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)' },
            '50%': { transform: 'scale(1.05)', boxShadow: '0 6px 20px rgba(0, 0, 0, 0.5)' },
            '100%': { transform: 'scale(1)', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)' },
          },
          animation: 'pulse 2s infinite ease-in-out',
          
          '&:hover': {
            transform: 'scale(1.05)',
            boxShadow: '0 6px 20px rgba(0, 0, 0, 0.5)',
            animation: 'none',
          },
          '&:active': {
            transform: 'scale(0.98)',
          }
        }}
      >
        <Box sx={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center' }}>
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="white"
            xmlns="http://www.w3.org/2000/svg"
            style={{ marginRight: 8 }}
          >
            <path
                            d="M12 2.04C6.5 2.04 2.04 6.5 2.04 12c0 1.8 0.5 3.5 1.4 5l-1.4 5.1 5.2-1.4c1.5 0.8 3.2 1.3 5 1.3h0c5.5 0 9.96-4.46 9.96-9.96S17.5 2.04 12 2.04zM16.5 13.9c-0.2-0.1-1.2-0.6-1.4-0.7-0.2-0.1-0.3-0.1-0.5 0.1s-0.5 0.7-0.7 0.8c-0.1 0.1-0.2 0.2-0.4 0.1-0.2-0.1-0.9-0.3-1.6-1s-1.2-1.1-1.4-1.5c-0.1-0.2 0-0.4 0.1-0.5s0.2-0.3 0.3-0.4c0.1-0.1 0.2-0.2 0.2-0.3 0.1-0.1 0-0.3-0.1-0.4s-0.5-1.1-0.7-1.5c-0.2-0.4-0.3-0.3-0.5-0.3h-0.4c-0.2 0-0.4 0.1-0.6 0.3-0.2 0.2-0.8 0.8-0.8 1.9s0.8 2.2 0.9 2.3c0.1 0.1 1.6 2.5 4 3.5 0.6 0.2 1 0.4 1.3 0.5 0.5 0.1 1-0.1 1.2-0.3 0.2-0.2 0.5-0.8 0.6-1.5s0.1-1.3-0.1-1.5z"
                            fill="rgb(125, 224, 145)"
            />
          </svg>
          <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'rgb(123, 230, 145)' }}>
            Live Support
          </Typography>
        </Box>
      </Box>
    </Link>
  );
}
