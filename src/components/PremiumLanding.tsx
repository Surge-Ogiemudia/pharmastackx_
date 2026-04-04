'use client';

import React, { useState, useEffect } from 'react';
import { Box, Typography, Container, Grid } from '@mui/material';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import DotCanvas from './DotCanvas';
import SearchIcon from '@mui/icons-material/Search';

const animatedWords = ['unavailable.', 'unfindable.', 'inaccessible.'];

const textRevealVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
};

const scaleRevealVariants: Variants = {
  hidden: { opacity: 0, scale: 0.93 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.7, ease: "easeOut" } }
};

interface PremiumLandingProps {
  onSearchClick: (triggerScan?: boolean) => void;
  onPharmacistClick: () => void;
  user?: any; // To check if logged in
  onMyRequestsClick?: () => void;
  onAskRxClick?: () => void;
}

export default function PremiumLanding({ onSearchClick, onPharmacistClick, user, onMyRequestsClick, onAskRxClick }: PremiumLandingProps) {
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % animatedWords.length);
    }, 4000); 
    return () => clearInterval(timer);
  }, []);

  return (
    <>
      <Box sx={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0, pointerEvents: 'none' }}>
        <DotCanvas />
      </Box>

      {/* Responsive Transparent Full-Screen Container */}
      <Container 
        maxWidth="lg" 
        sx={{ 
          position: 'relative', 
          zIndex: 1, 
          minHeight: '100vh', 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'flex-start', 
          pt: { xs: 9, sm: 11, md: 14 }, // Balanced padding to clear header without excessive gap
          pb: { xs: 16, sm: 18, md: 20 }, // Increased bottom padding everywhere to clear the universal floating bottom nav
          fontFamily: 'var(--font-dm-sans), sans-serif',
        }}
      >
        <Grid container spacing={{ xs: 6, md: 10 }} alignItems="flex-start">
          
          {/* LEFT COLUMN: HERO */}
          <Grid item xs={12} md={6}>
            <motion.div initial="hidden" animate="visible" variants={textRevealVariants}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#C84B8F', animation: 'pulseDot 2s infinite' }} />
                <Typography sx={{ fontSize: '12px', color: '#C84B8F', letterSpacing: '0.5px', fontWeight: 500, textTransform: 'uppercase' }}>
                  Live Pharmacist Network
                </Typography>
              </Box>
              
              <Box component="h1" sx={{ fontFamily: 'var(--font-fraunces), serif', fontSize: { xs: '42px', md: '72px' }, fontWeight: 900, color: '#111', lineHeight: 1.05, letterSpacing: '-2px', mb: { xs: 3, md: 5 } }}>
                <Box component="span" sx={{ display: 'block' }}>No patient left</Box>
                <Box component="span" sx={{ display: 'inline-block', color: '#C84B8F', fontStyle: 'italic', position: 'relative' }}>
                  untreated.
                  <Box component="span" sx={{ position: 'absolute', bottom: { xs: '6px', md: '12px' }, left: 0, width: '100%', height: { xs: '12px', md: '20px' }, bgcolor: 'rgba(200,75,143,0.15)', zIndex: -1, transform: 'rotate(-1deg)' }} />
                </Box>
                <Box component="span" sx={{ display: 'block', mt: { xs: 1, md: 2 } }}>No medicine</Box>
                
                <Box component="span" sx={{ display: 'block', height: { xs: '50px', md: '80px' }, overflow: 'hidden' }}>
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={wordIndex}
                      initial={{ y: 30, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -30, opacity: 0 }}
                      transition={{ duration: 0.5, ease: "easeInOut" }}
                      style={{ color: "#0F6E56", fontStyle: "italic", display: 'block' }}
                    >
                      {animatedWords[wordIndex]}
                    </motion.span>
                  </AnimatePresence>
                </Box>
              </Box>

              <Typography sx={{ fontSize: { xs: '15px', md: '18px' }, color: '#555', lineHeight: 1.7, mb: { xs: 4, md: 6 }, fontWeight: 400, maxWidth: '480px' }}>
                Search by name or scan your prescription. Pharmacists nearby respond with availability and price in minutes.
              </Typography>

              {/* FAKE SEARCH PILL -> Triggers App Search */}
              <Box 
                onClick={() => onSearchClick(false)}
                sx={{ 
                  bgcolor: '#ffffff', 
                  border: '1px solid rgba(0,0,0,0.08)', 
                  borderRadius: '24px', 
                  p: { xs: '16px 20px', md: '20px 24px' }, 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 2, 
                  mb: 2, 
                  boxShadow: '0 12px 40px rgba(0,0,0,0.06)', 
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': { transform: 'scale(1.02)', boxShadow: '0 16px 56px rgba(0,0,0,0.08)' }
                }}
              >
                <SearchIcon sx={{ color: '#0F6E56', fontSize: '24px' }} />
                <Typography sx={{ fontSize: { xs: '15px', md: '17px' }, color: '#888', flex: 1, fontWeight: 400 }}>Type to search any medicine...</Typography>
                <Box 
                  onClick={(e) => { e.stopPropagation(); onSearchClick(true); }}
                  sx={{ bgcolor: '#C84B8F', color: '#fff', fontSize: { xs: '11px', md: '13px' }, borderRadius: '100px', px: 2, py: 1, fontWeight: 600, letterSpacing: '0.2px', boxShadow: '0 4px 12px rgba(200,75,143,0.3)', cursor: 'pointer', '&:hover': { transform: 'scale(1.05)', bgcolor: '#b03d7a' } }}
                >
                  Scan Rx
                </Box>
              </Box>

              <Typography sx={{ fontSize: '12px', color: '#888', mb: 5, fontWeight: 400 }}>
                AI reads prescriptions — <span style={{ color: '#0F6E56', fontWeight: 600 }}>snap, extract, find</span>
              </Typography>

              <Box sx={{ display: 'flex', gap: 2 }}>
                <Box onClick={() => onSearchClick(false)} sx={{ flex: 2, bgcolor: '#111', color: '#fff', borderRadius: '16px', p: { xs: 2, md: 2.5 }, fontSize: { xs: '14px', md: '16px' }, fontWeight: 600, textAlign: 'center', fontFamily: 'var(--font-sora), sans-serif', letterSpacing: '-0.2px', cursor: 'pointer', transition: 'background 0.2s', '&:hover': { bgcolor: '#222' } }}>
                  Find a medicine
                </Box>
                <Box 
                    onClick={onAskRxClick} 
                    sx={{ 
                        flex: 1, 
                        bgcolor: '#0F6E56', 
                        color: '#fff', 
                        borderRadius: '16px', 
                        p: { xs: 1.5, md: 2 }, 
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 0.5,
                        lineHeight: 1,
                        cursor: 'pointer',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        '&:hover': { 
                            bgcolor: '#0B5E4A',
                            transform: 'scale(1.02) translateY(-2px)',
                            boxShadow: '0 8px 24px rgba(15,110,86,0.2)'
                        },
                    }}
                >
                    <Typography sx={{ fontSize: '15px', fontWeight: 700, fontFamily: 'var(--font-sora), sans-serif' }}>
                        Ask Rx
                    </Typography>
                    <Typography sx={{ fontSize: '10px', opacity: 0.8, fontWeight: 400 }}>Ask about your meds</Typography>
                </Box>
              </Box>
            </motion.div>
          </Grid>

          {/* RIGHT COLUMN: Info elements */}
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 4, md: 6 } }}>
              
              {/* STATS */}
              <Box sx={{ display: 'flex', bgcolor: '#ffffff', borderRadius: '24px', p: 3, border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 12px 48px rgba(0,0,0,0.05)' }}>
                {[
                  { n: '180+', l: 'Daily searches' },
                  { n: '30+', l: 'Pharmacists' },
                  { n: '4min', l: 'Avg response' }
                ].map((stat, i) => (
                  <Box key={stat.l} component={motion.div} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={scaleRevealVariants} sx={{ flex: 1, textAlign: 'center', borderRight: i < 2 ? '1px solid rgba(0,0,0,0.06)' : 'none' }}>
                    <Typography sx={{ fontFamily: 'var(--font-fraunces), serif', fontSize: { xs: '28px', md: '36px' }, fontWeight: 900, color: '#0F6E56', letterSpacing: '-1px' }}>{stat.n}</Typography>
                    <Typography sx={{ fontSize: '11px', color: '#777', mt: 0.5, letterSpacing: '0.8px', textTransform: 'uppercase', fontWeight: 600 }}>{stat.l}</Typography>
                  </Box>
                ))}
              </Box>

              {/* HOW IT WORKS */}
              <Box>
                <Typography sx={{ fontSize: '11px', color: '#999', letterSpacing: '2px', textTransform: 'uppercase', mb: 3, fontWeight: 600 }}>How it works</Typography>
                {[
                  { n: '01', t: 'Search any medicine', s: 'Type freely or scan your prescription. AI extracts all medicines automatically.' },
                  { n: '02', t: 'Pharmacists respond', s: 'Nearby pharmacists see your request and reply with price, distance and availability.' },
                  { n: '03', t: 'Connect and get it', s: 'Pick the best offer. Pickup or delivery based on your region.' }
                ].map((step, i) => (
                  <Box key={step.n} component={motion.div} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={{ hidden: { opacity: 0, x: -20 }, visible: { opacity: 1, x: 0, transition: { duration: 0.5, delay: i * 0.1 }}}} sx={{ display: 'flex', gap: 3, mb: i < 2 ? 3 : 0, alignItems: 'flex-start' }}>
                    <Typography sx={{ fontFamily: 'var(--font-fraunces), serif', fontSize: '32px', fontWeight: 900, color: 'rgba(0,0,0,0.06)', lineHeight: 1, flexShrink: 0 }}>{step.n}</Typography>
                    <Box>
                      <Typography sx={{ fontSize: '18px', fontWeight: 600, color: '#111', mb: 0.5, letterSpacing: '-0.3px', fontFamily: 'var(--font-sora), sans-serif' }}>{step.t}</Typography>
                      <Typography sx={{ fontSize: '14px', color: '#666', lineHeight: 1.6 }}>{step.s}</Typography>
                    </Box>
                  </Box>
                ))}
              </Box>

              {/* FEATURES */}
              <Box>
                <Typography sx={{ fontSize: '11px', color: '#999', letterSpacing: '2px', textTransform: 'uppercase', mb: 3, fontWeight: 600 }}>Why PharmaStackX</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                  {[
                    { t: 'Any medicine', s: 'Not limited to one pharmacy\'s stock', c: '#C84B8F' },
                    { t: 'Live availability', s: 'Real responses from real pharmacists', c: '#0F6E56' },
                    { t: 'AI prescription', s: 'Snap and search instantly', c: '#C84B8F' },
                    { t: 'Delivery option', s: 'Stay home, get your medicine', c: '#0F6E56' }
                  ].map((feat, i) => (
                    <Box key={feat.t} component={motion.div} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={{ hidden: { opacity: 0, scale: 0.95 }, visible: { opacity: 1, scale: 1, transition: { duration: 0.4, delay: i * 0.1 }}}} sx={{ bgcolor: '#ffffff', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '20px', p: 2.5, boxShadow: '0 10px 36px rgba(0,0,0,0.04)', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 14px 44px rgba(0,0,0,0.06)' } }}>
                      <Box sx={{ width: 28, height: 4, borderRadius: 2, mb: 2, bgcolor: feat.c }} />
                      <Typography sx={{ fontSize: '15px', fontWeight: 700, color: '#111', mb: 0.5, letterSpacing: '-0.2px', fontFamily: 'var(--font-sora), sans-serif' }}>{feat.t}</Typography>
                      <Typography sx={{ fontSize: '13px', color: '#666', lineHeight: 1.5 }}>{feat.s}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>

              {/* PHARMACIST CTA */}
              <Box component={motion.div} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: 'easeOut' }}}} sx={{ mt: 2 }}>
                <Box sx={{ bgcolor: '#0F6E56', borderRadius: '28px', p: { xs: 4, md: 5 }, position: 'relative', overflow: 'hidden', boxShadow: '0 20px 40px rgba(15,110,86,0.2)' }}>
                  <Box sx={{ content: '""', position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.04)' }} />
                  <Box sx={{ content: '""', position: 'absolute', bottom: -40, left: -40, width: 140, height: 140, borderRadius: '50%', bgcolor: 'rgba(0,0,0,0.08)' }} />
                  
                  <Typography sx={{ fontSize: '11px', color: 'rgba(159,225,203,0.8)', letterSpacing: '2.5px', textTransform: 'uppercase', mb: 2, fontWeight: 600 }}>For pharmacists</Typography>
                  <Typography sx={{ fontFamily: 'var(--font-fraunces), serif', fontSize: { xs: '28px', md: '36px' }, fontWeight: 900, color: '#fff', letterSpacing: '-1px', lineHeight: 1.1, mb: 2 }}>
                    Grow beyond<br/><em style={{fontStyle: 'italic', color: '#9FE1CB'}}>your four walls.</em>
                  </Typography>
                  <Typography sx={{ fontSize: '15px', color: 'rgba(159,225,203,0.9)', lineHeight: 1.6, mb: 4, fontWeight: 400 }}>
                    Get real-time medicine requests near you. Build your professional reputation and earn more — without leaving your pharmacy.
                  </Typography>
                  <Box onClick={onPharmacistClick} sx={{ bgcolor: '#fff', color: '#0F6E56', borderRadius: '16px', p: 2, fontSize: '15px', fontWeight: 700, textAlign: 'center', fontFamily: 'var(--font-sora), sans-serif', letterSpacing: '-0.2px', position: 'relative', zIndex: 1, cursor: 'pointer', transition: 'transform 0.2s', '&:hover': { transform: 'scale(1.03)', boxShadow: '0 8px 20px rgba(0,0,0,0.2)' } }}>
                    Join as a pharmacist
                  </Box>
                </Box>
              </Box>

            </Box>
          </Grid>
        </Grid>

        {/* TRUST */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: { xs: 8, md: 10 } }}>
          <Box component={motion.div} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={textRevealVariants} sx={{ p: '24px 32px', borderRadius: '24px', display: 'flex', gap: 2, bgcolor: '#ffffff', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 8px 32px rgba(0,0,0,0.03)', maxWidth: '600px', alignItems: 'center' }}>
            <Box sx={{ width: 4, height: 40, bgcolor: '#0F6E56', borderRadius: 4, flexShrink: 0, opacity: 0.5 }} />
            <Typography sx={{ fontSize: '13px', color: '#777', lineHeight: 1.6, fontWeight: 400 }}>
              PharmaStackX is a <strong style={{color: '#0F6E56', fontWeight: 600, opacity: 0.9}}>medicine discovery platform.</strong> We connect patients to licensed pharmacists. All interactions comply with local pharmacy regulations in every market.
            </Typography>
          </Box>
        </Box>

      </Container>

      <style>
        {`
          @keyframes pulseDot {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.4; transform: scale(0.8); }
          }
        `}
      </style>
    </>
  );
}
