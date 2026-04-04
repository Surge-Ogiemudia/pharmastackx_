'use client';

import CartContent from '@/components/CartContent';
import { Box, Container, Paper, Typography } from '@mui/material';
import Navbar from '@/components/Navbar';

export default function CartPage() {
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      
      <Box sx={{ bgcolor: '#f8f9fa', py: 2 }}>
        <Container maxWidth="lg">
          <Paper elevation={3} sx={{ px: 3, py: 2, borderRadius: '12px', background: 'linear-gradient(135deg, #006D5B 0%, #004D40 100%)', textAlign: 'center' }}>
            <Typography variant="h5" sx={{ color: '#ffffff', fontWeight: 600 }}>Cart</Typography>
          </Paper>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ mt: 2, mb: 3, flex: 1 }}>
        <CartContent />
      </Container>
    </Box>
  );
}
