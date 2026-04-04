'use client'

import {
  Typography,
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
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Search,
  LocationOn,
  Add,
  Close,
} from '@mui/icons-material';
import { useState, useEffect, useCallback } from 'react';

import { useCart } from '../../contexts/CartContext';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

import { event } from '../../lib/gtag';
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
  width: { xs: '90%', md: 600 },
  bgcolor: 'background.paper',
  border: '2px solid #000',
  boxShadow: 24,
  p: 4,
  borderRadius: '16px',
  maxHeight: '90vh',
  overflowY: 'auto',
};

export default function FindMedicinesPage() {
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
   

  const drugClasses = ['all', 'Analgesic', 'Antibiotic', 'Antimalarial', 'Antifungal', 'Vitamin', 'NSAID', 'Antidiabetic'];

  
  const fetchMedicines = useCallback(debounce(async (page: number, search: string, filter: string, sort: string) => {
    setIsLoading(true);
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
    fetchMedicines(currentPage, searchQuery, filterBy, sortBy);
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
    <>
      <Container maxWidth="lg" sx={{ mt: 0.5, mb: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
        <Button
    variant="contained"
    component={Link}
    href="/?view=orderMedicines"
    sx={{
        borderRadius: '20px',
        bgcolor: '#E91E63',
        '&:hover': { bgcolor: '#C2185B' },
        color: 'white'
    }}
>
    Search by Prescription
</Button>

        </Box>
        <Box sx={{ mb: 1 }}>
          <TextField
            fullWidth
            placeholder={slug ? "Search medicines at this pharmacy..." : "Search by medicine, ingredient, or class..."}
            variant="outlined"
            size="small"
            value={searchQuery}
            onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1); // Reset to first page on new search
            }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><Search sx={{ color: '#006D5B' }} /></InputAdornment>,
              sx: { borderRadius: '25px', bgcolor: 'white' }
            }}
          />
        </Box>

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', mb: 1 }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <Select value={filterBy} onChange={(e) => { setFilterBy(e.target.value); setCurrentPage(1); }} displayEmpty sx={{ borderRadius: '20px' }}>
              <MenuItem value="all">All Classes</MenuItem>
              {drugClasses.slice(1).map((drugClass) => (
                <MenuItem key={drugClass} value={drugClass}>{drugClass}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <Select value={sortBy} onChange={(e) => { setSortBy(e.target.value); setCurrentPage(1);}} displayEmpty sx={{ borderRadius: '20px' }}>
              <MenuItem value="recommended">Recommended</MenuItem>
              <MenuItem value="name">Name</MenuItem>
              <MenuItem value="price">Price</MenuItem>
              <MenuItem value="distance">Distance</MenuItem>
            </Select>
          </FormControl>

          <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
            {totalProducts} results
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
                <Card key={medicine.id} sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: '20px', border: '2px solid #e0e0e0', bgcolor: 'white', cursor: 'pointer', transition: 'box-shadow 0.3s', '&:hover': { boxShadow: 6 } }} onClick={() => handleOpenModal(medicine)}>
                  <Box sx={{ position: 'relative', height: { xs: '100px', md: '120px' }, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f0f7f4', p: 1 }}>
                    {medicine.POM && (
                      <Chip
                          label="POM"
                          color="error"
                          size="small"
                          sx={{
                              position: 'absolute',
                              top: 8,
                              right: 8,
                              zIndex: 1,
                              fontWeight: 'bold',
                          }}
                      />
                    )}
                    <CardMedia component="img" image={medicine.image} alt={medicine.name} sx={{ objectFit: 'contain', width: '100%', height: '100%', maxWidth: '80%' }}/>
                  </Box>

                  <CardContent sx={{ flexGrow: 1, p: 2, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem', lineHeight: 1.2, mb: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{medicine.name}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: '#006D5B', mb: 1 }}>{medicine.formattedPrice}</Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                          <Typography title={medicine.pharmacy} variant="caption" sx={{ color: '#006D5B', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>{medicine.pharmacy}</Typography>
                          {typeof medicine.travelTime === 'number' && typeof medicine.distance === 'number' ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: '2px' }}>
                              <LocationOn sx={{ fontSize: 14, color: 'text.secondary' }} />
                              <Typography variant="caption" color="text.secondary">{medicine.travelTime.toFixed(0)} mins ({medicine.distance.toFixed(1)} km)</Typography>
                            </Box>
                          ) : (
                            <Box sx={{ height: '18px' }} />
                          )}
                        </Box>
                        <IconButton onClick={(e) => { e.stopPropagation(); handleAddToCart({ ...medicine, price: medicine.price }); }} sx={{ bgcolor: '#E91E63', color: 'white', width: 32, height: 32, flexShrink: 0, ml: 1, '&:hover': { bgcolor: '#C2185B' } }}>
                          <Add sx={{ fontSize: '16px' }} />
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

      <Modal open={!!selectedMedicine} onClose={handleCloseModal}>
        <Box sx={modalStyle}>
          {selectedMedicine && (
            <Grid container spacing={3}>
              <IconButton aria-label="close" onClick={handleCloseModal} sx={{ position: 'absolute', right: 8, top: 8, color: (theme) => theme.palette.grey[500] }}><Close /></IconButton>
              <Grid sx={{ width: { xs: '100%', md: '41.66%' } }}>
                <Box sx={{ width: '100%', height: {xs: 200, md: '100%'}, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f0f7f4', borderRadius: '12px' }}>
                   <CardMedia component="img" image={selectedMedicine.image} alt={selectedMedicine.name} sx={{ objectFit: 'contain', width: '100%', height: '100%', maxHeight: {xs: 180, md: 250} }}/>
                </Box>
              </Grid>
              <Grid sx={{ width: { xs: '100%', md: '58.33%' } }}>
                <Typography variant="h4" component="h2" sx={{ fontWeight: 700, color: '#006D5B', mb: 2 }}>{selectedMedicine.name}</Typography>
                <Typography variant="h5" sx={{ fontWeight: 600, my: 2 }}>{selectedMedicine.formattedPrice}</Typography>
                <Box sx={{ my: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Active Ingredients:</Typography>
                    <Typography variant="body1" sx={{ fontStyle: 'italic', color: '#006D5B' }}>{selectedMedicine.activeIngredients}</Typography>
                </Box>
                 <Box sx={{ my: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Pharmacy:</Typography>
                    <Typography variant="body1">{selectedMedicine.pharmacy}</Typography>
                      {typeof selectedMedicine.travelTime === 'number' && typeof selectedMedicine.distance === 'number' && (
                        <Typography variant="body2" color="text.secondary">{selectedMedicine.travelTime.toFixed(0)} mins ({selectedMedicine.distance.toFixed(1)} km)</Typography>
                      )}
                </Box>
                 <Box sx={{ my: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Drug Class:</Typography>
                    <Typography variant="body1">{selectedMedicine.drugClass}</Typography>
                </Box>

                {selectedMedicine.info && (
                    <Box sx={{ my: 2 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Additional Information:</Typography>
                        <Typography variant="body1">{selectedMedicine.info}</Typography>
                    </Box>
                )}

                      <IconButton onClick={(e) => { e.stopPropagation(); handleAddToCart({ ...selectedMedicine, price: selectedMedicine.price }); handleCloseModal(); }} sx={{ bgcolor: '#E91E63', color: 'white', borderRadius: '25px', px: 4, py: 1, mt: 2, '&:hover': { bgcolor: '#C2185B' } }}>
                      <Add sx={{ mr: 1 }}/>
                      <Typography>Add to Cart</Typography>
                    </IconButton>
              </Grid>
            </Grid>
          )}
        </Box>
      </Modal>

      

      <Snackbar open={snackbarOpen} autoHideDuration={3000} onClose={handleSnackbarClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={handleSnackbarClose} severity="success" sx={{ width: '100%' }}>
          Item added to cart!
        </Alert>
      </Snackbar>

    </>
  );
}
