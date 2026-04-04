'use client'

import {
  Typography,
  Badge,
  Container,
  Box,
  Card,
  CardContent,
  CardMedia,
  TextField,
  InputAdornment,
  FormControl,
  Select,
  MenuItem,
  Pagination,
  CircularProgress,
  IconButton,
  Modal,
  Snackbar,
  Alert,
  Chip,
  Button,
  Paper,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Search,
  LocationOn,
  Add,
  Close,
  ArrowBack,
  ShoppingBag,
} from '@mui/icons-material';
import React, { useState, useEffect, useCallback, useRef } from 'react';

import { useCart } from '../contexts/CartContext';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

import { event } from '../lib/gtag';
import { debounce } from 'lodash';



// --- CONFIGURATION --- //
const AVERAGE_TRAVEL_SPEED_KMH = 15; // km/h (Lowered for more realistic city travel time)

// --- Haversine Distance Calculation --- //
const haversineDistance = (coords1: { lat: number; lon: number }, coords2: { lat: number; lon: number }) => {
  if (!coords1 || !coords2) return null;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371; // Earth radius in km

  const dLat = toRad(coords2.lat - coords1.lat);
  const dLon = toRad(coords2.lon - coords1.lon);
  const lat1 = toRad(coords1.lat);
  const lat2 = toRad(coords2.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return d; // returns distance in km
};


const modalStyle = {
  position: 'absolute' as 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: { xs: '88%', sm: '400px', md: '450px' },
  bgcolor: 'rgba(255,255,255,0.98)',
  boxShadow: '0 32px 100px rgba(0,0,0,0.18)',
  p: 0,
  borderRadius: '32px',
  maxHeight: { xs: '65vh', sm: '58vh' },
  overflowY: 'auto',
  border: '1px solid rgba(255,255,255,0.5)',
  outline: 'none'
};

export default function FindMedicinesContent({ setView }: { setView?: (view: string) => void }) {
  const searchParams = useSearchParams();
  const slug = searchParams?.get('slug') || '';
  const router = useRouter();
  const [medicines, setMedicines] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const initialSearch = searchParams?.get('search') || '';
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [sortBy, setSortBy] = useState('recommended');
  const [filterBy, setFilterBy] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);

  const itemsPerPage = 12;
  const { addToCart } = useCart(); 

  const [selectedMedicine, setSelectedMedicine] = useState<any | null>(null);
  
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const isInitialLoad = useRef(true);
   

  const drugClasses = ['all', 'Analgesic', 'Antibiotic', 'Antimalarial', 'Antifungal', 'Vitamin', 'NSAID', 'Antidiabetic'];

  
  const fetchMedicines = useCallback(debounce(async (page: number, search: string, filter: string, sort: string) => {
    // Only show full loader if we have NO medicines yet (even from cache)
    if (medicines.length === 0) {
      setIsLoading(true);
    }
    
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: itemsPerPage.toString(),
        search,
        drugClass: filter,
        sortBy: sort,
      });
      if (slug) params.append('slug', slug);

      const response = await fetch(`/api/products?${params.toString()}`);
      if (!response.ok) throw new Error(`Failed to fetch products. Status: ${response.status}`);
      
      const data = await response.json();
        if (data.success) {
          let processed = data.data;
          
          // Cache the results for "instant" load next time
          if (search === '' && filter === 'all' && sort === 'recommended' && page === 1) {
            localStorage.setItem('cached_medicines', JSON.stringify(processed));
            localStorage.setItem('cached_pagination', JSON.stringify(data.pagination));
          }

          if (userLocation) {
          processed = data.data.map((m:any) => {
            if (m.pharmacyCoordinates) {
              const distance = haversineDistance(userLocation, m.pharmacyCoordinates);
              const travelTime = distance != null ? (distance / AVERAGE_TRAVEL_SPEED_KMH) * 60 : null;
              return { ...m, distance, travelTime };
            } 
            return { ...m, distance: null, travelTime: null };
          });
        }

        if (sort === 'distance' && userLocation) {
            processed.sort((a:any, b:any) => {
                if (a.distance === null) return 1;
                if (b.distance === null) return -1;
                return a.distance - b.distance;
            });
        }

        setMedicines(processed);
        setTotalPages(data.pagination.totalPages);
        setTotalProducts(data.pagination.totalProducts);
      } else {
        throw new Error(data.error || 'An unknown error occurred');
      }
    } catch (err: any) {
      console.error('Error fetching medicines:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, 500), [slug, itemsPerPage, userLocation]);


  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          };
          setUserLocation(location);
          setLocationError(null);
        },
        (error) => {
          setLocationError("Location access denied. Distances may not be calculated.");
        }
      );
    } else {
      setLocationError("Geolocation is not supported by this browser.");
    }
  }, []);

  useEffect(() => {
    // Load from cache on mount for instant feel
    const cached = localStorage.getItem('cached_medicines');
    const cachedPag = localStorage.getItem('cached_pagination');
    if (cached && cachedPag) {
      try {
        setMedicines(JSON.parse(cached));
        setTotalPages(JSON.parse(cachedPag).totalPages);
        setTotalProducts(JSON.parse(cachedPag).totalProducts);
      } catch (e) {
        console.error("Cache parse error", e);
      }
    }
  }, []);

  useEffect(() => {
    if (isInitialLoad.current) {
        // Immediate fetch on first mount (bypass debounce)
        fetchMedicines.cancel(); // cancel any pending debounced calls
        fetchMedicines(currentPage, searchQuery, filterBy, sortBy);
        isInitialLoad.current = false;
    } else {
        fetchMedicines(currentPage, searchQuery, filterBy, sortBy);
    }
  }, [currentPage, searchQuery, filterBy, sortBy, fetchMedicines]);

  useEffect(() => {
    if (searchQuery) {
      event({ action: 'search', category: 'engagement', label: searchQuery });
    }
  }, [searchQuery]);

  useEffect(() => {
    if (slug) {
      event({ action: 'visit_pharmacy_subdomain', category: 'acquisition', label: slug });
    }
  }, [slug]);


  const handleOpenModal = (medicine: any) => {
    event({ action: 'view_item', category: 'ecommerce', label: medicine.name, value: medicine.price });
    setSelectedMedicine(medicine);
  };

  const handleCloseModal = () => setSelectedMedicine(null);
  const handleSnackbarClose = () => setSnackbarOpen(false);
  

  const handleAddToCart = (medicine: any) => {
    event({ action: 'add_to_cart', category: 'ecommerce', label: medicine.name, value: medicine.price });
    addToCart(medicine);
    setSnackbarOpen(true);
  };
  
  const handlePageChange = (_: React.ChangeEvent<unknown>, page: number) => {
    setCurrentPage(page);
  };

  


  return (
    <Box
      sx={{
        p: { xs: 2.5, sm: 4 },
        pb: { xs: 12, sm: 4 },
        m: 0,
        borderRadius: 0,
        height: '100%',
        overflowY: 'auto',
        color: 'var(--black)',
        backgroundColor: '#fafaf8',
        fontFamily: "'Sora', sans-serif"
      }}
    >
      <Container maxWidth="lg" sx={{ mt: { xs: 0, sm: 1 }, mb: 3 }}>
        <Box 
          sx={{ 
            display: 'flex', 
            flexDirection: 'row', 
            justifyContent: 'flex-start', 
            alignItems: 'center', 
            mb: { xs: 2.5, sm: 4 },
            gap: 2
          }}
        >
          <Box 
            onClick={() => setView?.('orderMedicines')}
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 0.5, 
              cursor: 'pointer',
              color: 'var(--gray)',
              bgcolor: 'white',
              border: '1.5px solid var(--border)',
              borderRadius: '100px',
              px: { xs: 2, sm: 2 },
              py: 0.75,
              '&:hover': { bgcolor: 'rgba(0,0,0,0.03)', color: 'var(--black)', borderColor: 'rgba(0,0,0,0.2)' },
              transition: 'all 0.2s'
            }}
          >
            <ArrowBack sx={{ fontSize: 13 }} />
            <Typography sx={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Back
            </Typography>
          </Box>
          <Typography className="fraunces" sx={{ fontSize: { xs: '22px', sm: '28px' }, fontWeight: 900, color: 'var(--black)', letterSpacing: '-0.7px' }}>
            Our Catalog
          </Typography>
        </Box>
        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            placeholder={slug ? "Search this pharmacy..." : "Search medicine names..."}
            variant="outlined"
            size="medium"
            value={searchQuery}
            onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1);
            }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><Search sx={{ color: 'var(--green)', fontSize: 18 }} /></InputAdornment>,
              sx: { 
                borderRadius: '16px', 
                bgcolor: 'white',
                border: '1.5px solid var(--border)',
                '& fieldset': { border: 'none' },
                fontSize: { xs: '12px', sm: '14px' },
                fontWeight: 500,
                boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
              }
            }}
          />
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap', mb: 2 }}>
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <Select 
              value={filterBy} 
              onChange={(e) => { setFilterBy(e.target.value); setCurrentPage(1); }} 
              displayEmpty 
              sx={{ 
                borderRadius: '100px', 
                fontSize: '11px', 
                fontWeight: 700,
                bgcolor: 'white',
                '& .MuiOutlinedInput-notchedOutline': { border: '1.5px solid var(--border)' }
              }}
            >
              <MenuItem value="all" sx={{ fontSize: '12px' }}>All Classes</MenuItem>
              {drugClasses.slice(1).map((drugClass) => (
                <MenuItem key={drugClass} value={drugClass} sx={{ fontSize: '12px' }}>{drugClass}</MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <Select 
              value={sortBy} 
              onChange={(e) => { setSortBy(e.target.value); setCurrentPage(1);}} 
              displayEmpty 
              sx={{ 
                borderRadius: '100px', 
                fontSize: '11px', 
                fontWeight: 700,
                bgcolor: 'white',
                '& .MuiOutlinedInput-notchedOutline': { border: '1.5px solid var(--border)' }
              }}
            >
              <MenuItem value="recommended" sx={{ fontSize: '12px' }}>Recommended</MenuItem>
              <MenuItem value="name" sx={{ fontSize: '12px' }}>Name</MenuItem>
              <MenuItem value="price" sx={{ fontSize: '12px' }}>Price</MenuItem>
              <MenuItem value="distance" sx={{ fontSize: '12px' }}>Distance</MenuItem>
            </Select>
          </FormControl>

          <Typography sx={{ ml: 'auto', fontSize: '11px', fontWeight: 600, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {totalProducts} products
          </Typography>
        </Box>
        {locationError && (
          <Typography variant="caption" color="error" sx={{ display: 'block', textAlign: 'center', my: 1 }}>
            {locationError}
          </Typography>
        )}
      </Container>

      <Container maxWidth="lg" sx={{ mb: 2, flex: 1 }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}><CircularProgress /></Box>
        ) : error ? (
          <Box sx={{ textAlign: 'center', mt: 4 }}>
            <Typography color="error" variant="h5">An Error Occurred</Typography>
            <Typography color="error">{error}</Typography>
          </Box>
        ): medicines.length === 0 && searchQuery ? (
            <Box sx={{ textAlign: 'center', mt: 4 }}>
                <Typography variant="h6">No Medicines Found</Typography>
                <Typography color="text.secondary">
                    We couldn\'t find any products matching your search for "{searchQuery}".
                </Typography>
            </Box>
        ) : (
          <>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2 }}>
              {medicines.map((medicine) => (
                <Card 
                  key={medicine.id} 
                  sx={{ 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    borderRadius: '24px', 
                    border: '1.5px solid var(--border)', 
                    bgcolor: 'white', 
                    cursor: 'pointer', 
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', 
                    boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
                    '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 12px 30px rgba(0,0,0,0.06)', borderColor: 'rgba(15,110,86,0.1)' } 
                  }} 
                  onClick={() => handleOpenModal(medicine)}
                >
                  <Box sx={{ position: 'relative', height: { xs: '100px', md: '140px' }, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f9f9f9', p: { xs: 1, md: 1.5 } }}>
                    {medicine.POM && (
                      <Chip
                          label="POM"
                          size="small"
                          sx={{
                              position: 'absolute',
                              top: { xs: 6, md: 10 },
                              right: { xs: 6, md: 10 },
                              zIndex: 1,
                              fontWeight: 800,
                              fontSize: { xs: '8px', md: '9px' },
                              bgcolor: 'var(--black)',
                              color: 'white'
                          }}
                      />
                    )}
                    <CardMedia component="img" image={medicine.image} alt={medicine.name} sx={{ objectFit: 'contain', width: '100%', height: '100%', maxWidth: '85%', transition: 'transform 0.5s', '&:hover': { transform: 'scale(1.05)' } }}/>
                  </Box>

                  <CardContent sx={{ flexGrow: 1, p: { xs: 1.5, md: 2 }, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <Box sx={{ mb: 1.5 }}>
                      <Typography className="fraunces" sx={{ fontWeight: 900, fontSize: { xs: '13px', md: '15px' }, lineHeight: 1.25, color: 'var(--black)', letterSpacing: '-0.3px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {medicine.name}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography className="sora" sx={{ fontWeight: 800, color: 'var(--green)', fontSize: { xs: '15px', md: '18px' }, mb: 1 }}>
                        {medicine.formattedPrice}
                      </Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <Box sx={{ flexGrow: 1, minWidth: 0, mr: 0.5 }}>
                          <Typography variant="caption" sx={{ color: 'var(--gray)', fontWeight: 600, fontSize: '9px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', textTransform: 'uppercase' }}>
                            {medicine.pharmacy}
                          </Typography>
                          {typeof medicine.travelTime === 'number' && typeof medicine.distance === 'number' ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: '4px' }}>
                              <LocationOn sx={{ fontSize: 11, color: 'var(--green)' }} />
                              <Typography variant="caption" sx={{ fontSize: '9px', fontWeight: 600, color: 'var(--green)' }}>
                                {medicine.travelTime.toFixed(0)} min · {medicine.distance.toFixed(1)} km
                              </Typography>
                            </Box>
                          ) : (
                            <Box sx={{ height: '18px' }} />
                          )}
                        </Box>
                        <IconButton 
                          onClick={(e) => { e.stopPropagation(); handleAddToCart({ ...medicine, price: medicine.price }); }} 
                          sx={{ 
                            bgcolor: 'var(--green-pale)', 
                            color: 'var(--green)', 
                            width: { xs: 28, md: 34 }, 
                            height: { xs: 28, md: 34 }, 
                            flexShrink: 0, 
                            ml: 0.5, 
                            '&:hover': { bgcolor: 'var(--green)', color: 'white' },
                            transition: 'all 0.2s'
                          }}
                        >
                          <Add sx={{ fontSize: { xs: '14px', md: '18px' } }} />
                        </IconButton>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>

            {totalPages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                <Pagination count={totalPages} page={currentPage} onChange={handlePageChange} color="primary" size="large" sx={{ '& .MuiPaginationItem-root.Mui-selected': { bgcolor: '#006D5B' } }}/>
              </Box>
            )}
          </>
        )}
      </Container>
      <Modal 
        open={!!selectedMedicine} 
        onClose={handleCloseModal}
        slots={{
          backdrop: (props) => (
            <Box 
              {...props} 
              sx={{ 
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
                bgcolor: 'rgba(10,15,12,0.4)', backdropFilter: 'blur(12px)', zIndex: -1 
              }} 
            />
          )
        }}
        closeAfterTransition
      >
        <Box sx={modalStyle}>
          {selectedMedicine && (
            <Box sx={{ position: 'relative' }}>
              <IconButton 
                onClick={handleCloseModal} 
                sx={{ 
                  position: 'absolute', right: 16, top: 16, 
                  bgcolor: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(4px)',
                  zIndex: 10, '&:hover': { bgcolor: 'white' }
                }}
              >
                <Close sx={{ fontSize: 18 }} />
              </IconButton>

              <Box sx={{ p: 3 }}>
                {/* IMAGE AREA */}
                <Box sx={{ 
                  width: '100%', height: 280, display: 'flex', alignItems: 'center', 
                  justifyContent: 'center', bgcolor: '#f9f9f7', borderRadius: '24px',
                  mb: 3, border: '1.5px solid var(--border)'
                }}>
                  <CardMedia 
                    component="img" 
                    image={selectedMedicine.image} 
                    alt={selectedMedicine.name} 
                    sx={{ objectFit: 'contain', width: '100%', height: '100%', maxWidth: '85%', p: 2 }}
                  />
                </Box>

                {/* CONTENT AREA */}
                <Typography className="fraunces" sx={{ fontSize: '22px', fontWeight: 900, color: 'var(--black)', lineHeight: 1.1, mb: 1, letterSpacing: '-0.3px' }}>
                  {selectedMedicine.name}
                </Typography>

                <Typography className="sora" sx={{ fontSize: '18px', fontWeight: 800, color: 'var(--green)', mb: 2.5 }}>
                  {selectedMedicine.formattedPrice}
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                  <Box>
                    <Typography sx={{ fontSize: '10px', fontWeight: 800, color: '#bbb', mb: 0.8, textTransform: 'uppercase', letterSpacing: '1px' }}>Active Ingredients</Typography>
                    <Typography sx={{ fontSize: '14px', color: 'var(--green)', fontWeight: 600, fontStyle: 'italic' }}>{selectedMedicine.activeIngredients || 'Not specified'}</Typography>
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', pt: 2.5 }}>
                    <Box>
                      <Typography sx={{ fontSize: '10px', fontWeight: 800, color: '#bbb', mb: 0.8, textTransform: 'uppercase', letterSpacing: '1px' }}>Pharmacy</Typography>
                      <Typography sx={{ fontSize: '14px', fontWeight: 700 }}>{selectedMedicine.pharmacy}</Typography>
                      {typeof selectedMedicine.travelTime === 'number' && (
                        <Typography variant="caption" sx={{ color: 'var(--green)', fontWeight: 600, mt: 0.5, display: 'block' }}>
                          {selectedMedicine.travelTime.toFixed(0)} mins · {selectedMedicine.distance.toFixed(1)} km away
                        </Typography>
                      )}
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography sx={{ fontSize: '10px', fontWeight: 800, color: '#bbb', mb: 0.8, textTransform: 'uppercase', letterSpacing: '1px' }}>Drug Class</Typography>
                      <Typography sx={{ fontSize: '14px', fontWeight: 700 }}>{selectedMedicine.drugClass}</Typography>
                    </Box>
                  </Box>

                  {selectedMedicine.info && (
                    <Box sx={{ borderTop: '1px solid var(--border)', pt: 2.5 }}>
                      <Typography sx={{ fontSize: '10px', fontWeight: 800, color: '#bbb', mb: 0.8, textTransform: 'uppercase', letterSpacing: '1px' }}>Additional Information</Typography>
                      <Typography sx={{ fontSize: '13px', color: '#666', lineHeight: 1.6 }}>{selectedMedicine.info}</Typography>
                    </Box>
                  )}
                </Box>

                <button 
                  onClick={() => { addToCart({ ...selectedMedicine, price: selectedMedicine.price }); handleCloseModal(); setSnackbarOpen(true); }}
                  style={{ 
                    width: '100%', background: 'var(--green)', color: 'white', border: 'none',
                    borderRadius: '12px', padding: '12.5px 18px', fontSize: '13px', fontWeight: 800,
                    cursor: 'pointer', marginTop: '24px', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', gap: '8px', transition: 'all 0.2s', fontFamily: "'Sora', sans-serif",
                    textTransform: 'uppercase', letterSpacing: '0.3px'
                  }}
                  className="hover-scale"
                >
                  <Add sx={{ fontSize: 18 }} />
                  Add to Cart
                </button>
              </Box>
            </Box>
          )}
        </Box>
      </Modal>


      

      <Snackbar 
        open={snackbarOpen} 
        autoHideDuration={3000} 
        onClose={handleSnackbarClose} 
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ 
          bottom: { xs: "120px !important", sm: "220px !important" }, 
          zIndex: "50000 !important" 
        }}
      >
        <Alert 
          onClose={handleSnackbarClose} 
          severity="success" 
          sx={{ 
            width: '100%', 
            bgcolor: '#0F6E56', 
            color: 'white', 
            fontWeight: 700,
            borderRadius: '12px',
            '& .MuiAlert-icon': { color: 'white' },
            boxShadow: '0 8px 30px rgba(0,0,0,0.15)'
          }}
        >
          Item added to cart!
        </Alert>
      </Snackbar>

      {useCart().getTotalItems() > 0 && (
        <Paper
          elevation={6}
          sx={{
            position: 'fixed',
            bottom: { xs: 100, sm: 110 },
            right: { xs: 20, sm: 40 },
            bgcolor: 'var(--green)',
            color: 'white',
            borderRadius: '100px',
            px: 2.5,
            py: 1.5,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            cursor: 'pointer',
            zIndex: 40000,
            transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            '&:hover': {
              transform: 'scale(1.05) translateY(-4px)',
              bgcolor: 'var(--green-light)',
              boxShadow: '0 12px 30px rgba(15,110,86,0.25)'
            },
            boxShadow: '0 8px 32px rgba(15,110,86,0.2)'
          }}
          onClick={() => setView?.('confirmOrder')}
        >
          <Badge badgeContent={useCart().getTotalItems()} color="secondary">
            <ShoppingBag sx={{ fontSize: 22 }} />
          </Badge>
          <Typography sx={{ fontWeight: 800, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Check Out
          </Typography>
        </Paper>
      )}

    </Box>
  );
}
