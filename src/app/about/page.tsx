'use client'

import {
  Typography,
  Container,
  Box,
  Paper,
  Card,
} from '@mui/material';
import Navbar from '../../components/Navbar';

export default function About() {
  return (
    <Box>
      <Navbar />

      {/* About Content */}
      <Container maxWidth="lg" sx={{ py: 6 }}>
        {/* Hero Section */}
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography variant="h3" sx={{ fontWeight: 500, mb: 2, color: '#006D5B' }}>
            About PharmaStackX
          </Typography>
          <Typography variant="h5" sx={{ color: '#555', maxWidth: '800px', mx: 'auto' }}>
            Our Mission: Closing Africa's Access Gap
          </Typography>
        </Box>

        {/* Mission Statement */}
        <Paper elevation={3} sx={{ p: 4, mb: 4, borderRadius: '16px', bgcolor: '#f8f9fa' }}>
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 2, color: '#1a1a1a' }}>
            Our Mission
          </Typography>
          <Typography variant="body1" sx={{ fontSize: '1.1rem', lineHeight: 1.6, color: '#444' }}>
            PharmaStackX is building the essential digital infrastructure required for modern healthcare in Africa. 
            Our core mission is to end the devastating public health problem caused by inventory invisibility. 
            When a patient needs life-saving medication, they should never be turned away. We achieve this by 
            transforming every local community pharmacy into a node of a real-time fulfillment network.
          </Typography>
        </Paper>

        {/* The Problem We Solve */}
        <Paper elevation={3} sx={{ p: 4, mb: 4, borderRadius: '16px', bgcolor: 'white', border: '1px solid #e0e0e0' }}>
          <Typography variant="h4" sx={{ fontWeight: 600, mb: 3, color: '#D32F2F' }}>
            The Problem We Solve
          </Typography>
          <Typography variant="body1" sx={{ fontSize: '1.1rem', lineHeight: 1.6, color: '#333' }}>
            The challenge is not a lack of medicine; it is a lack of information. Patients, doctors, and hospitals 
            suffer devastating delays when they cannot confirm stock levels, who has the medication? How far is it 
            from me? This stock-out gap is a logistical crisis that leads to wasted time, lost revenue for pharmacists, 
            and poor patient outcomes.
          </Typography>
        </Paper>

        {/* Our Solution */}
        <Paper elevation={3} sx={{ p: 4, mb: 4, borderRadius: '16px', bgcolor: '#006D5B', color: 'white' }}>
          <Typography variant="h4" sx={{ fontWeight: 600, mb: 3, color: 'black' }}>
            Our Solution: The Intelligent Fulfillment Stack
          </Typography>
          <Typography variant="body1" sx={{ fontSize: '1.1rem', lineHeight: 1.6, mb: 3 }}>
            PharmaStackX is not just a directory, we are a technology stack that guarantees reliability through 
            data and automation.
          </Typography>
          <Typography variant="body1" sx={{ fontSize: '1.1rem', lineHeight: 1.6 }}>
            We provide guaranteed, real-time access to essential and scarce medicines with urgent fulfillment, 
            ensuring critical drugs reach the last mile when they are needed most. This directly improves patient 
            outcomes and reduces mortality risk.
          </Typography>
        </Paper>

        {/* Our Vision */}
        <Paper elevation={3} sx={{ p: 4, mb: 4, borderRadius: '16px', bgcolor: 'white', border: '1px solid #e0e0e0' }}>
          <Typography variant="h4" sx={{ fontWeight: 600, mb: 3, color: '#006D5B' }}>
            Our Vision
          </Typography>
          <Typography variant="body1" sx={{ fontSize: '1.1rem', lineHeight: 1.6, color: '#333' }}>
            We are committed to building the most reliable and data-rich platform for medicine fulfillment, 
            turning every pharmacy in Africa into a digitally empowered, reliable access point. We are building 
            the future of African health, one fulfilled prescription at a time.
          </Typography>
        </Paper>

        {/* Call to Action */}
        <Paper elevation={3} sx={{ p: 4, textAlign: 'center', borderRadius: '16px', bgcolor: '#C2185B', color: 'white' }}>
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 2, color: 'black' }}>
            Join Us in Transforming Healthcare Access
          </Typography>
          <Typography variant="body1" sx={{ fontSize: '1.1rem', lineHeight: 1.6, color: 'white' }}>
            Together, we can ensure that no patient in Africa is left without access to the medications they need.
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
}