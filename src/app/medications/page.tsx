'use client'

import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  InputAdornment,
  Chip,
  AppBar,
  Toolbar,
  IconButton,
  Stack,
  Avatar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Badge,
} from '@mui/material';
import {
  LocalPharmacy,
  Search,
  LocationOn,
  FilterList,
  ShoppingCart,
  Add,
  Remove,
  Person,
  Favorite,
  Star,
} from '@mui/icons-material';
import { useState } from 'react';

interface Medication {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  manufacturer: string;
  dosage: string;
  prescriptionRequired: boolean;
  rating: number;
  inStock: boolean;
  pharmacy: {
    name: string;
    distance: number;
    rating: number;
    deliveryTime: string;
  };
}

const medications: Medication[] = [
  {
    id: 1,
    name: 'Aspirin 100mg',
    description: 'Pain relief and fever reducer. Effective for headaches, muscle pain, and inflammation.',
    price: 5.99,
    category: 'Pain Relief',
    manufacturer: 'PharmaCorp',
    dosage: '100mg tablets',
    prescriptionRequired: false,
    rating: 4.5,
    inStock: true,
    pharmacy: {
      name: 'HealthPlus Pharmacy',
      distance: 0.8,
      rating: 4.7,
      deliveryTime: '30-45 min'
    }
  },
  {
    id: 2,
    name: 'Ibuprofen 200mg',
    description: 'Anti-inflammatory medication for pain, fever, and swelling relief.',
    price: 8.49,
    category: 'Pain Relief',
    manufacturer: 'MediCare Inc.',
    dosage: '200mg capsules',
    prescriptionRequired: false,
    rating: 4.3,
    inStock: true,
    pharmacy: {
      name: 'CityMed Pharmacy',
      distance: 1.2,
      rating: 4.5,
      deliveryTime: '45-60 min'
    }
  },
  {
    id: 3,
    name: 'Vitamin D3 1000 IU',
    description: 'Essential vitamin supplement for bone health and immune system support.',
    price: 12.99,
    category: 'Supplements',
    manufacturer: 'VitaLife',
    dosage: '1000 IU softgels',
    prescriptionRequired: false,
    rating: 4.8,
    inStock: true,
    pharmacy: {
      name: 'WellCare Pharmacy',
      distance: 2.1,
      rating: 4.6,
      deliveryTime: '60-90 min'
    }
  },
  {
    id: 4,
    name: 'Lisinopril 10mg',
    description: 'ACE inhibitor for high blood pressure and heart failure treatment.',
    price: 15.50,
    category: 'Cardiovascular',
    manufacturer: 'CardioMed',
    dosage: '10mg tablets',
    prescriptionRequired: true,
    rating: 4.4,
    inStock: true,
    pharmacy: {
      name: 'HealthPlus Pharmacy',
      distance: 0.8,
      rating: 4.7,
      deliveryTime: '30-45 min'
    }
  },
  {
    id: 5,
    name: 'Metformin 500mg',
    description: 'Medication for type 2 diabetes to control blood sugar levels.',
    price: 18.99,
    category: 'Diabetes',
    manufacturer: 'DiabeCare',
    dosage: '500mg tablets',
    prescriptionRequired: true,
    rating: 4.2,
    inStock: false,
    pharmacy: {
      name: 'MediCenter Pharmacy',
      distance: 1.5,
      rating: 4.4,
      deliveryTime: '45-75 min'
    }
  }
];

export default function MedicationsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState('distance');
  const [cartItems, setCartItems] = useState<{[key: number]: number}>({});
  const [cartOpen, setCartOpen] = useState(false);

  const categories = ['Pain Relief', 'Supplements', 'Cardiovascular', 'Diabetes', 'Antibiotics'];

  const filteredMedications = medications
    .filter(med => 
      med.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      (selectedCategory === '' || med.category === selectedCategory)
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'distance':
          return a.pharmacy.distance - b.pharmacy.distance;
        case 'price':
          return a.price - b.price;
        case 'rating':
          return b.rating - a.rating;
        default:
          return 0;
      }
    });

  const addToCart = (medicationId: number) => {
    setCartItems(prev => ({
      ...prev,
      [medicationId]: (prev[medicationId] || 0) + 1
    }));
  };

  const removeFromCart = (medicationId: number) => {
    setCartItems(prev => {
      const newCart = { ...prev };
      if (newCart[medicationId] && newCart[medicationId] > 1) {
        newCart[medicationId] -= 1;
      } else {
        delete newCart[medicationId];
      }
      return newCart;
    });
  };

  const getTotalItems = () => {
    return Object.values(cartItems).reduce((sum, count) => sum + count, 0);
  };

  const getTotalPrice = () => {
    return Object.entries(cartItems).reduce((sum, [id, count]) => {
      const med = medications.find(m => m.id === parseInt(id));
      return sum + (med ? med.price * count : 0);
    }, 0);
  };

  return (
    <Box>
      {/* Header */}
      <AppBar position="static" elevation={0}>
        <Toolbar>
          <LocalPharmacy sx={{ mr: 2 }} />
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
            Pharmastackx
          </Typography>
          <IconButton color="inherit" onClick={() => setCartOpen(true)}>
            <Badge badgeContent={getTotalItems()} color="secondary">
              <ShoppingCart />
            </Badge>
          </IconButton>
          <IconButton color="inherit">
            <Person />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {/* Search and Filters */}
        <Box mb={4}>
          <Typography variant="h3" fontWeight="bold" gutterBottom>
            Find Medications
          </Typography>
          <Typography color="textSecondary" paragraph>
            Browse medications from verified pharmacies near you
          </Typography>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 3 }}>
            <TextField
              fullWidth
              placeholder="Search for medications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
            
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Category</InputLabel>
              <Select
                value={selectedCategory}
                label="Category"
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <MenuItem value="">All Categories</MenuItem>
                {categories.map(category => (
                  <MenuItem key={category} value={category}>{category}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Sort By</InputLabel>
              <Select
                value={sortBy}
                label="Sort By"
                onChange={(e) => setSortBy(e.target.value)}
              >
                <MenuItem value="distance">Nearest First</MenuItem>
                <MenuItem value="price">Price: Low to High</MenuItem>
                <MenuItem value="rating">Highest Rated</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </Box>

        {/* Results */}
        <Typography variant="h6" gutterBottom>
          {filteredMedications.length} medications found
        </Typography>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr', lg: 'repeat(3, 1fr)' }, gap: 3 }}>
          {filteredMedications.map((medication) => (
            <Box key={medication.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Typography variant="h6" fontWeight="bold">
                      {medication.name}
                    </Typography>
                    <IconButton size="small">
                      <Favorite />
                    </IconButton>
                  </Box>

                  <Box display="flex" alignItems="center" mb={1}>
                    <Star sx={{ color: 'warning.main', mr: 0.5 }} />
                    <Typography variant="body2">
                      {medication.rating} ({Math.floor(Math.random() * 50 + 10)} reviews)
                    </Typography>
                  </Box>

                  <Typography color="textSecondary" paragraph sx={{ fontSize: '0.875rem' }}>
                    {medication.description}
                  </Typography>

                  <Stack direction="row" spacing={1} mb={2}>
                    <Chip label={medication.category} size="small" />
                    {medication.prescriptionRequired && (
                      <Chip label="Prescription Required" size="small" color="warning" />
                    )}
                    {!medication.inStock && (
                      <Chip label="Out of Stock" size="small" color="error" />
                    )}
                  </Stack>

                  <Typography variant="body2" color="textSecondary" mb={1}>
                    <strong>Dosage:</strong> {medication.dosage}
                  </Typography>

                  <Box sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 1, mb: 2 }}>
                    <Box display="flex" alignItems="center" mb={1}>
                      <LocalPharmacy sx={{ fontSize: 16, mr: 1, color: 'primary.main' }} />
                      <Typography variant="body2" fontWeight="bold">
                        {medication.pharmacy.name}
                      </Typography>
                    </Box>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                      <Box display="flex" alignItems="center">
                        <LocationOn sx={{ fontSize: 14, mr: 0.5, color: 'grey.600' }} />
                        <Typography variant="body2" color="textSecondary">
                          {medication.pharmacy.distance} km away
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="primary" fontWeight="bold">
                        {medication.pharmacy.deliveryTime}
                      </Typography>
                    </Box>
                    <Box display="flex" alignItems="center" mt={1}>
                      <Star sx={{ fontSize: 14, mr: 0.5, color: 'warning.main' }} />
                      <Typography variant="body2">
                        {medication.pharmacy.rating} pharmacy rating
                      </Typography>
                    </Box>
                  </Box>

                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Typography variant="h6" color="primary" fontWeight="bold">
                      ${medication.price.toFixed(2)}
                    </Typography>
                    
                    {cartItems[medication.id] ? (
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <IconButton
                          size="small"
                          onClick={() => removeFromCart(medication.id)}
                          sx={{ bgcolor: 'grey.100' }}
                        >
                          <Remove />
                        </IconButton>
                        <Typography fontWeight="bold">
                          {cartItems[medication.id]}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() => addToCart(medication.id)}
                          sx={{ bgcolor: 'primary.main', color: 'white' }}
                          disabled={!medication.inStock}
                        >
                          <Add />
                        </IconButton>
                      </Stack>
                    ) : (
                      <Button
                        variant="contained"
                        startIcon={<ShoppingCart />}
                        onClick={() => addToCart(medication.id)}
                        disabled={!medication.inStock}
                      >
                        Add to Cart
                      </Button>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Box>
          ))}
        </Box>
      </Container>

      {/* Cart Dialog */}
      <Dialog open={cartOpen} onClose={() => setCartOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Shopping Cart ({getTotalItems()} items)
        </DialogTitle>
        <DialogContent>
          {Object.keys(cartItems).length === 0 ? (
            <Typography textAlign="center" color="textSecondary" py={4}>
              Your cart is empty
            </Typography>
          ) : (
            <Stack spacing={2}>
              {Object.entries(cartItems).map(([id, count]) => {
                const med = medications.find(m => m.id === parseInt(id));
                if (!med) return null;
                
                return (
                  <Box key={id} sx={{ display: 'flex', alignItems: 'center', p: 2, border: '1px solid', borderColor: 'grey.200', borderRadius: 1 }}>
                    <Box flexGrow={1}>
                      <Typography fontWeight="bold">{med.name}</Typography>
                      <Typography color="textSecondary" variant="body2">
                        {med.pharmacy.name} • ${med.price.toFixed(2)} each
                      </Typography>
                    </Box>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <IconButton
                        size="small"
                        onClick={() => removeFromCart(med.id)}
                      >
                        <Remove />
                      </IconButton>
                      <Typography fontWeight="bold" sx={{ minWidth: '20px', textAlign: 'center' }}>
                        {count}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => addToCart(med.id)}
                      >
                        <Add />
                      </IconButton>
                    </Stack>
                    <Typography fontWeight="bold" sx={{ ml: 2, minWidth: '60px', textAlign: 'right' }}>
                      ${(med.price * count).toFixed(2)}
                    </Typography>
                  </Box>
                );
              })}
              
              <Box sx={{ borderTop: '2px solid', borderColor: 'grey.300', pt: 2, mt: 2 }}>
                <Typography variant="h6" textAlign="right">
                  Total: ${getTotalPrice().toFixed(2)}
                </Typography>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCartOpen(false)}>
            Continue Shopping
          </Button>
          {Object.keys(cartItems).length > 0 && (
            <Button variant="contained" size="large">
              Proceed to Checkout
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}