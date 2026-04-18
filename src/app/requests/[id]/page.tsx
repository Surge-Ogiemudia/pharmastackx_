'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import ManageRequest from '@/components/ManageRequest';
import Navbar from '@/components/Navbar';
import { Box, Container, Typography } from '@mui/material';

const RequestDetailPage: React.FC = () => {
  const params = useParams();
  const router = useRouter();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id || '';

  const handleBack = () => {
    router.push('/requests');
  };

  const handleSuccess = () => {
    router.push('/requests');
  };

  if (!id) {
    return (
      <Box>
        <Navbar />
        <Container maxWidth="lg">
          <Typography sx={{ my: 4 }}>Invalid Request ID.</Typography>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: '#fafaf8', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <Box sx={{ pt: { xs: 8, sm: 10 }, pb: 10, flexGrow: 1, overflowY: 'auto' }}>
        <ManageRequest requestId={id} onBack={handleBack} onSuccess={handleSuccess} />
      </Box>
    </Box>
  );
};

export default RequestDetailPage;
