'use client';

import {
  Typography,
  Box,
  Card,
  CardContent,
  TextField,
  InputAdornment,
  CircularProgress,
  Button,
  IconButton,
} from '@mui/material';
import { LocationOn, ArrowBackIos, ArrowForwardIos } from '@mui/icons-material';
import Link from 'next/link';
import { useState, useEffect } from 'react';

// A custom hook for debouncing to prevent excessive API calls
function useDebounce(value: string, delay: number): string {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup function to cancel the timeout if the value changes
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Define the pharmacy interface
interface IPharmacy {
  _id: string;
  businessName: string;
  businessAddress: string;
  slug: string;
}

export default function PharmacySearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [pharmacies, setPharmacies] = useState<IPharmacy[]>([]);
  const [loading, setLoading] = useState(true);

  // Carousel state
  const [mobileIndex, setMobileIndex] = useState(0);
  const [desktopIndex, setDesktopIndex] = useState(0);
  const DESKTOP_ITEMS_PER_VIEW = 3;

  // Use the debounced search query for API calls
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Fetch pharmacies whenever the debounced query changes
  useEffect(() => {
    const fetchPharmacies = async () => {
      setLoading(true);
      // Reset carousel on new search
      setMobileIndex(0);
      setDesktopIndex(0);
      try {
        const response = await fetch(`/api/pharmacies?search=${encodeURIComponent(debouncedSearchQuery)}`);
        if (!response.ok) throw new Error('Failed to fetch pharmacies');
        const data = await response.json();
        setPharmacies(data.pharmacies || []);
      } catch (error) {
        console.error('Error fetching pharmacies:', error);
        setPharmacies([]);
      }
      setLoading(false);
    };

    fetchPharmacies();
  }, [debouncedSearchQuery]);

  // --- Carousel Scroll Handlers ---
  const handleMobileScroll = (direction: 'left' | 'right') => {
    setMobileIndex(prev => {
      if (direction === 'left') return Math.max(0, prev - 1);
      if (direction === 'right') return Math.min(pharmacies.length - 1, prev + 1);
      return prev;
    });
  };

  const handleDesktopScroll = (direction: 'left' | 'right') => {
    setDesktopIndex(prev => {
      if (direction === 'left') return Math.max(0, prev - DESKTOP_ITEMS_PER_VIEW);
      if (direction === 'right') {
        const maxIndex = Math.max(0, pharmacies.length - DESKTOP_ITEMS_PER_VIEW);
        return Math.min(maxIndex, prev + DESKTOP_ITEMS_PER_VIEW);
      }
      return prev;
    });
  };

  return (
    <Box sx={{ bgcolor: '#f0f7f4', p: { xs: 2, sm: 3, md: 4 }, borderRadius: '16px' }}>
      {/* Search Bar */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search pharmacies by name or address..."
          variant="outlined"
          size="small"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <LocationOn sx={{ color: '#006D5B' }} />
              </InputAdornment>
            ),
            sx: { borderRadius: '12px', bgcolor: 'white' }
          }}
        />
      </Box>

      {/* Conditional Rendering: Loading, Empty, or Carousel */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}>
          <CircularProgress />
        </Box>
      ) : pharmacies.length === 0 ? (
        <Typography sx={{ textAlign: 'center', my: 5, color: 'text.secondary' }}>
          {debouncedSearchQuery
            ? `No pharmacies found for "${debouncedSearchQuery}".`
            : "No pharmacies are listed at the moment."
          }
        </Typography>
      ) : (
        <>
          {/* --- Mobile Carousel (1 item) --- */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1 }}>
            <IconButton onClick={() => handleMobileScroll('left')} disabled={mobileIndex === 0}>
              <ArrowBackIos />
            </IconButton>
            <Box sx={{ flex: 1, overflow: 'hidden' }}>
              <Box sx={{ display: 'flex', transform: `translateX(-${mobileIndex * 100}%)`, transition: 'transform 0.4s ease' }}>
                {pharmacies.map((pharmacy) => (
                  <Box key={pharmacy._id} sx={{ width: '100%', flexShrink: 0, px: 1 }}>
                    <PharmacyCard pharmacy={pharmacy} />
                  </Box>
                ))}
              </Box>
            </Box>
            <IconButton onClick={() => handleMobileScroll('right')} disabled={mobileIndex >= pharmacies.length - 1}>
              <ArrowForwardIos />
            </IconButton>
          </Box>

          {/* --- Desktop Carousel (3 items) --- */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 1 }}>
            <IconButton onClick={() => handleDesktopScroll('left')} disabled={desktopIndex === 0}>
              <ArrowBackIos />
            </IconButton>
            <Box sx={{ flex: 1, overflow: 'hidden' }}>
              <Box sx={{ display: 'flex', gap: 3, transform: `translateX(-${desktopIndex * (100 / DESKTOP_ITEMS_PER_VIEW)}%)`, transition: 'transform 0.5s ease-in-out' }}>
                {pharmacies.map((pharmacy) => (
                  <Box key={pharmacy._id} sx={{ width: `calc((100% / ${DESKTOP_ITEMS_PER_VIEW}) - 11px)`, flexShrink: 0 }}>
                    <PharmacyCard pharmacy={pharmacy} />
                  </Box>
                ))}
              </Box>
            </Box>
            <IconButton onClick={() => handleDesktopScroll('right')} disabled={desktopIndex >= pharmacies.length - DESKTOP_ITEMS_PER_VIEW}>
              <ArrowForwardIos />
            </IconButton>
          </Box>
        </>
      )}
    </Box>
  );
}


// A reusable Card component to keep the code clean
const PharmacyCard = ({ pharmacy }: { pharmacy: IPharmacy }) => (
  <Card
    component={Link}
    href={`https://${pharmacy.slug}.psx.ng/find-medicines?slug=${pharmacy.slug}`}
    target="_blank" 
    rel="noopener noreferrer"
    sx={{
      bgcolor: '#1B5E20', // Dark green background for the whole card
      color: 'white', // Default text color to white for readability
      textDecoration: 'none',
      cursor: 'pointer',
      borderRadius: '30px 10px',
      overflow: 'hidden',
      '&:hover': {
        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        transform: 'translateY(-4px)'
      },
      transition: 'all 0.3s ease',
      display: 'flex',
      flexDirection: 'column',
      height: '100%'
    }}
  >
    <Box sx={{
      p: 2,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      textAlign: 'center'
    }}>
      <Typography variant="h6" sx={{ fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {pharmacy.businessName}
      </Typography>
      <Typography variant="body2" sx={{ mt: 1, opacity: 0.9 }}>
        {pharmacy.businessAddress}
      </Typography>
    </Box>
    <CardContent sx={{ p: 2, flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <Button
        fullWidth
        variant="outlined"
        sx={{
          borderColor: 'white',
          color: 'white',
          '&:hover': { 
            bgcolor: 'rgba(255, 255, 255, 0.1)',
            borderColor: 'white'
          },
          mt: 'auto'
        }}
      >
        Visit Store
      </Button>
    </CardContent>
  </Card>
);
