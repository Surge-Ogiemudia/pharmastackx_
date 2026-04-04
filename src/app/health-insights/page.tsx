'use client';

import { Box, Container, Typography, Paper, Grid } from '@mui/material';
import Navbar from '../../components/Navbar';

export default function HealthInsightsPage() {
  return (
    <>
      <Navbar />
      <Box sx={{ bgcolor: 'grey.50', minHeight: '100vh' }}>
        <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
          {/* Page Header */}
          <Paper
            elevation={0}
            sx={{
              p: { xs: 3, md: 5 },
              textAlign: 'center',
              borderRadius: '20px',
              mb: 6,
              bgcolor: '#004D40',
              color: 'white'
            }}
          >
            <Typography
              variant="h2"
              component="h1"
              sx={{
                fontWeight: 700,
                fontSize: { xs: '2.5rem', md: '3.5rem' },
                mb: 2
              }}
            >
              Health Insights & Updates
            </Typography>
            <Typography
              variant="h6"
              sx={{
                color: 'rgba(255, 255, 255, 0.8)',
                maxWidth: '700px',
                mx: 'auto'
              }}
            >
              
            </Typography>
          </Paper>

          {/* Articles will be displayed here */}
          <Grid container spacing={4}>
            {/* Future articles will be mapped and rendered here as Grid items */}
          </Grid>
        </Container>
      </Box>
    </>
  );
}
