'use client'

import {
  Typography,
  Box,
  Paper,
} from '@mui/material';

export default function AboutContent() {
  return (
    <Box sx={{ p: { xs: 2, sm: 4 }, bgcolor: 'white', color: 'black', borderRadius: '16px', width: '100%', maxWidth: '800px', margin: '0 auto' }}>
      {/* Hero Section */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 500, mb: 1, color: '#004d40', fontFamily: 'Fraunces, serif' }}>
          About PharmaStackX
        </Typography>
        <Typography variant="h6" sx={{ color: 'grey.700', maxWidth: '800px', mx: 'auto', fontFamily: 'Sora, sans-serif', fontSize: '1rem' }}>
          Our Mission: Closing Africa's Access Gap
        </Typography>
      </Box>

      {/* Mission Statement */}
      <Box sx={{ p: { xs: 2, sm: 3 }, mb: 3, borderRadius: '20px', background: '#f1f8e9', border: '1px solid rgba(0,0,0,0.03)' }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 2, color: '#33691e', fontSize: '1.2rem' }}>
          Our Mission
        </Typography>
        <Typography variant="body1" sx={{ fontSize: '0.95rem', lineHeight: 1.6, color: 'grey.800' }}>
          PharmaStackX is building the essential digital infrastructure required for modern healthcare in Africa. 
          Our core mission is to end the devastating public health problem caused by inventory invisibility. 
          When a patient needs life-saving medication, they should never be turned away. We achieve this by 
          transforming every local community pharmacy into a node of a real-time fulfillment network.
        </Typography>
      </Box>

      {/* The Problem We Solve */}
      <Box sx={{ p: { xs: 2, sm: 3 }, mb: 3, borderRadius: '20px', background: '#fbe9e7', border: '1px solid rgba(0,0,0,0.03)' }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 2, color: '#bf360c', fontSize: '1.2rem' }}>
          The Problem We Solve
        </Typography>
        <Typography variant="body1" sx={{ fontSize: '0.95rem', lineHeight: 1.6, color: 'grey.800' }}>
          The challenge is not a lack of medicine; it is a lack of information. Patients, doctors, and hospitals 
          suffer devastating delays when they cannot confirm stock levels, who has the medication? How far is it 
          from me? This stock-out gap is a logistical crisis that leads to wasted time, lost revenue for pharmacists, 
          and poor patient outcomes.
        </Typography>
      </Box>

      {/* Our Solution */}
      <Box sx={{ p: { xs: 2, sm: 3 }, mb: 3, borderRadius: '20px', background: '#e8f5e9', border: '1px solid rgba(0,0,0,0.03)' }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 2, color: '#1b5e20', fontSize: '1.2rem' }}>
          Our Solution: The Intelligent Fulfillment Stack
        </Typography>
        <Typography variant="body1" sx={{ fontSize: '0.95rem', lineHeight: 1.6, mb: 2, color: 'grey.800' }}>
        PharmaStackX is not just a delivery app; we are an Intelligent Fulfillment Network built around the Pharmacist-as-a-Service model.
        </Typography>
        <Typography variant="body1" sx={{ fontSize: '0.95rem', lineHeight: 1.6, color: 'grey.800' }}>
        We transform every community pharmacy into an urgent fulfillment node, accessible through a simple, conversational platform.
        </Typography>
      </Box>

      {/* Our Vision */}
      <Box sx={{ p: { xs: 2, sm: 3 }, mb: 3, borderRadius: '20px', background: '#f1f8e9', border: '1px solid rgba(0,0,0,0.03)' }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 2, color: '#33691e', fontSize: '1.2rem' }}>
          Our Vision
        </Typography>
        <Typography variant="body1" sx={{ fontSize: '0.95rem', lineHeight: 1.6, color: 'grey.800' }}>
          We are committed to building the most reliable and data-rich platform for medicine fulfillment, 
          turning every pharmacy in Africa into a digitally empowered, reliable access point. We are building 
          the future of African health, one fulfilled prescription at a time.
        </Typography>
      </Box>

      {/* Call to Action */}
      <Box sx={{ p: { xs: 2, sm: 3 }, textAlign: 'center', borderRadius: '20px', background: 'rgba(15, 110, 86, 0.05)', border: '1px solid rgba(15, 110, 86, 0.1)' }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 2, color: '#0F6E56', fontSize: '1.2rem' }}>
          Join Us in Transforming Healthcare Access
        </Typography>
        <Typography variant="body1" sx={{ fontSize: '0.95rem', lineHeight: 1.6, color: 'grey.800' }}>
          Together, we can ensure that no patient in Africa is left without access to the medications they need.
        </Typography>
      </Box>
    </Box>
  );
}
