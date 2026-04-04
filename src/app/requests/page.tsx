
'use client';

import React from 'react';
import {
  Container,
  Typography,
} from '@mui/material';
import Navbar from '@/components/Navbar';
import OrderRequestsContent from '@/components/OrderRequestsContent';


const RequestsPage: React.FC = () => {

  return (
    <>
      <Navbar />
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 700, color: '#333' }}>
          Incoming Requests
        </Typography>
        <OrderRequestsContent />
      </Container>
    </>
  );
};

export default RequestsPage;
