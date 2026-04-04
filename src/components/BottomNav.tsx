"use client";
import { Box, Typography } from "@mui/material";
import { motion } from "framer-motion";

interface BottomNavProps {
  currentView: string;
  onTabClick: (id: string) => void;
}

const BottomNav = ({ currentView, onTabClick }: BottomNavProps) => {
  const tabs = [
    { id: 'home', label: 'HOME' },
    { id: 'orderMedicines', label: 'SEARCH' },
    { id: 'orders', label: 'ACTIVITY' },
    { id: 'account', label: 'ACCOUNT' }
  ];

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: { xs: 20, md: 32 },
        left: '50%',
        transform: 'translateX(-50%)',
        width: { xs: 'calc(100% - 32px)', md: 'fit-content' },
        minWidth: { md: '600px' },
        maxWidth: { xs: '450px', md: '800px' },
        zIndex: 9999,
        display: 'flex',
        justifyContent: 'center',
        bgcolor: 'rgba(255, 255, 255, 0.98)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(0,0,0,0.08)',
        borderRadius: { xs: '32px', md: '48px' },
        boxShadow: '0 20px 40px rgba(0,0,0,0.12)',
        pb: 'env(safe-area-inset-bottom)',
        margin: '0 auto',
      }}
    >
      <Box sx={{ display: 'flex', width: '100%', justifyContent: 'space-around', p: { xs: '12px 8px 10px 8px', md: '18px 24px 14px 24px' } }}>
        {tabs.map((tab) => {
          const isStrictActive = currentView === tab.id || (tab.id === 'orders' && currentView === 'orderRequests');
          
          return (
            <Box 
              key={tab.id}
              onClick={() => onTabClick(tab.id)}
              sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                gap: { xs: '6px', md: '10px' },
                cursor: 'pointer',
                flex: 1,
                WebkitTapHighlightColor: 'transparent'
              }}
            >
              <Box sx={{ width: { xs: 6, md: 8 }, height: { xs: 6, md: 8 }, borderRadius: '50%', bgcolor: isStrictActive ? '#0F6E56' : '#e0e0e0', transition: 'background-color 0.3s' }} />
              <Typography sx={{ fontSize: { xs: '10px', md: '13px' }, fontWeight: 700, letterSpacing: { xs: '0.8px', md: '1.5px' }, color: isStrictActive ? '#0F6E56' : '#b0b0b0', fontFamily: 'var(--font-sora), sans-serif', transition: 'color 0.3s' }}>
                {tab.label}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

export default BottomNav;
