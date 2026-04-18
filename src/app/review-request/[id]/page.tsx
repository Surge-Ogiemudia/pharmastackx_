
'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation'; // Import useRouter
import ManageRequest from '../../../components/ManageRequest';
import Navbar from '../../../components/Navbar';
import { Box, Container, Typography } from '@mui/material';

const ReviewRequestPage = () => {
  const pathname = usePathname();
  const router = useRouter(); // Get router instance
  const requestId = pathname ? pathname.split('/').pop() || '' : '';

  // Define the onBack handler
  const handleBack = () => {
    router.push('/'); // Navigate to the homepage
  };

  if (!requestId) {
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
        <ManageRequest requestId={requestId} onBack={handleBack} />
      </Box>
    </Box>
  );
};

export default ReviewRequestPage;
