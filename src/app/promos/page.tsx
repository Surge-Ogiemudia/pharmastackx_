'use client'

import {
  Typography,
  Container,
  Box,
  Paper,
  Button,
  Card,
  CardContent,
  TextField,
  Chip,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  InputAdornment,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  ContentCopy,
  LocalOffer,
  Percent,
  LocalShipping,
  Star,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';
import { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import { usePromo } from '../../contexts/PromoContext';
import { useSession } from '../../context/SessionProvider';
import { useRouter } from 'next/navigation';

const existingPromos = [
  {
    id: 1,
    code: 'DELIVERYOFF',
    type: 'delivery_free',
    discount: 0,
    description: 'Free delivery on all orders',
    isActive: true,
    usageCount: 45,
    maxUses: 100,
    expiryDate: '2025-12-31'
  },
  {
    id: 2,
    code: 'ALL',
    type: 'total_free',
    discount: 0,
    description: 'All fees waived - Premium promo',
    isActive: true,
    usageCount: 8,
    maxUses: 20,
    expiryDate: '2025-11-30'
  },
  {
    id: 3,
    code: 'SAVE20',
    type: 'percentage',
    discount: 20,
    description: '20% off total order',
    isActive: true,
    usageCount: 123,
    maxUses: 500,
    expiryDate: '2025-12-15'
  },
  {
    id: 4,
    code: 'FIRSTORDER',
    type: 'percentage',
    discount: 15,
    description: '15% off for new customers',
    isActive: false,
    usageCount: 89,
    maxUses: 200,
    expiryDate: '2025-11-20'
  },
  {
    id: 5,
    code: 'BULK50',
    type: 'fixed_amount',
    discount: 5000,
    description: '₦5,000 off orders above ₦20,000',
    isActive: true,
    usageCount: 34,
    maxUses: 150,
    expiryDate: '2025-12-25'
  }
];

export default function Promos() {
  const { promos, addPromo, updatePromo, deletePromo, togglePromoStatus } = usePromo();
  const { user, isLoading } = useSession();
  const router = useRouter();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPromo, setEditingPromo] = useState<any>(null);
  const [newPromo, setNewPromo] = useState({
    code: '',
    type: 'percentage',
    discount: 0,
    description: '',
    maxUses: 100,
    expiryDate: ''
  });

  useEffect(() => {
    if (!isLoading && user?.role !== 'admin') {
      router.push('/');
    }
  }, [user, isLoading, router]);

  if (isLoading || user?.role !== 'admin') {
    return <p>Loading...</p>;
  }

  const getPromoTypeIcon = (type: string) => {
    switch (type) {
      case 'delivery_free': return <LocalShipping />;
      case 'all_free': return <Star />;
      case 'all_discount': return <LocalOffer />;
      case 'percentage': return <Percent />;
      case 'fixed_amount': return <LocalOffer />;
      default: return <LocalOffer />;
    }
  };

  const getPromoTypeColor = (type: string) => {
    switch (type) {
      case 'delivery_free': return '#4caf50';
      case 'all_free': return '#E91E63';
      case 'all_discount': return '#9c27b0';
      case 'percentage': return '#ff9800';
      case 'fixed_amount': return '#2196f3';
      default: return '#666';
    }
  };

  const getPromoDisplayValue = (promo: any) => {
    switch (promo.type) {
      case 'delivery_free': return 'FREE DELIVERY';
      case 'all_free': return 'ALL FEES FREE';
      case 'all_discount': return `${promo.discount}% OFF + FREE DELIVERY`;
      case 'percentage': return `${promo.discount}% OFF`;
      case 'fixed_amount': return `₦${promo.discount.toLocaleString()} OFF`;
      default: return 'PROMO';
    }
  };

  const handleCreatePromo = () => {
    if (newPromo.code && newPromo.description) {
      if (editingPromo) {
        handleUpdatePromo();
      } else {
        addPromo({
          code: newPromo.code.toUpperCase(),
          type: newPromo.type as any,
          discount: Number(newPromo.discount),
          description: newPromo.description,
          isActive: true,
          maxUses: Number(newPromo.maxUses),
          expiryDate: newPromo.expiryDate,
          minOrderAmount: newPromo.type === 'fixed_amount' ? 1000 : undefined
        });
        setNewPromo({
          code: '',
          type: 'percentage',
          discount: 0,
          description: '',
          maxUses: 100,
          expiryDate: ''
        });
        setShowCreateForm(false);
      }
    }
  };

  const handleCancelEdit = () => {
    setNewPromo({
      code: '',
      type: 'percentage',
      discount: 0,
      description: '',
      maxUses: 100,
      expiryDate: ''
    });
    setShowCreateForm(false);
    setEditingPromo(null);
  };

  const handleEditPromo = (promo: any) => {
    setEditingPromo(promo);
    setNewPromo({
      code: promo.code,
      type: promo.type,
      discount: promo.discount,
      description: promo.description,
      maxUses: promo.maxUses,
      expiryDate: promo.expiryDate
    });
    setShowCreateForm(true);
  };

  const handleUpdatePromo = () => {
    if (editingPromo && newPromo.code && newPromo.description) {
      updatePromo(editingPromo.id, {
        code: newPromo.code.toUpperCase(),
        type: newPromo.type as any,
        discount: Number(newPromo.discount),
        description: newPromo.description,
        maxUses: Number(newPromo.maxUses),
        expiryDate: newPromo.expiryDate,
        minOrderAmount: newPromo.type === 'fixed_amount' ? 1000 : undefined
      });
      
      // Reset form
      setNewPromo({
        code: '',
        type: 'percentage',
        discount: 0,
        description: '',
        maxUses: 100,
        expiryDate: ''
      });
      setShowCreateForm(false);
      setEditingPromo(null);
    }
  };

  const handleDeletePromo = (id: number) => {
    if (confirm('Are you sure you want to delete this promo code?')) {
      deletePromo(id);
    }
  };

  const copyPromoCode = (code: string) => {
    navigator.clipboard.writeText(code);
  };

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column' 
    }}>
      <Navbar />
      
      {/* Page Header */}
      <Box sx={{ bgcolor: '#f8f9fa', py: 2, mb: 0 }}>
        <Container maxWidth="lg">
          <Paper 
            elevation={3} 
            sx={{ 
              width: '100%',
              px: 3, 
              py: 2, 
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #006D5B 0%, #004D40 50%, #00332B 100%)',
              border: 'none',
              mb: 0,
              textAlign: 'center',
              boxShadow: '0 4px 20px rgba(0, 109, 91, 0.3)'
            }}
          >
            <Typography variant="h5" sx={{ color: '#ffffff', fontWeight: 600 }}>
              Promo Management
            </Typography>
          </Paper>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ mt: 0.5, mb: 3, flex: 1 }}>
        
        {/* Create New Promo Button */}
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#006D5B' }}>
            Active Promotions ({promos.filter(p => p.isActive).length})
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setShowCreateForm(!showCreateForm)}
            sx={{
              background: 'linear-gradient(135deg, #006D5B 0%, #004D40 100%)',
              borderRadius: '25px',
              px: 3,
              textTransform: 'none',
              fontWeight: 600,
              '&:hover': {
                background: 'linear-gradient(135deg, #004D40 0%, #00332B 100%)'
              }
            }}
          >
            Create New Promo
          </Button>
        </Box>

        {/* Create Promo Form */}
        {showCreateForm && (
          <Paper 
            elevation={2} 
            sx={{ 
              p: 3, 
              mb: 3, 
              borderRadius: '16px',
              border: '2px solid #006D5B'
            }}
          >
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#006D5B' }}>
              {editingPromo ? 'Edit Promotion' : 'Create New Promotion'}
            </Typography>
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ flex: '1 1 45%' }}>
                <TextField
                  fullWidth
                  label="Promo Code"
                  value={newPromo.code}
                  onChange={(e) => setNewPromo({...newPromo, code: e.target.value.toUpperCase()})}
                  placeholder="e.g., SAVE20, DELIVERYOFF"
                  sx={{ mb: 2 }}
                />
              </Box>
              <Box sx={{ flex: '1 1 45%' }}>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Promo Type</InputLabel>
                  <Select
                    value={newPromo.type}
                    label="Promo Type"
                    onChange={(e) => setNewPromo({...newPromo, type: e.target.value})}
                  >
                    <MenuItem value="percentage">Percentage Discount</MenuItem>
                    <MenuItem value="fixed_amount">Fixed Amount Off</MenuItem>
                    <MenuItem value="delivery_free">Free Delivery</MenuItem>
                    <MenuItem value="all_discount">All Discount (% + Free Delivery)</MenuItem>
                    <MenuItem value="all_free">All Fees Free</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              
              {(newPromo.type === 'percentage' || newPromo.type === 'fixed_amount' || newPromo.type === 'all_discount') && (
                <Box sx={{ flex: '1 1 45%' }}>
                  <TextField
                    fullWidth
                    label="Discount Value"
                    type="number"
                    value={newPromo.discount === 0 ? '' : newPromo.discount}
                    onChange={(e) => setNewPromo({...newPromo, discount: e.target.value === '' ? 0 : Number(e.target.value)})}
                    placeholder={newPromo.type === 'percentage' ? 'Enter percentage (e.g., 20)' : 'Enter amount (e.g., 500)'}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          {newPromo.type === 'percentage' ? '%' : '₦'}
                        </InputAdornment>
                      )
                    }}
                    sx={{ mb: 2 }}
                  />
                </Box>
              )}
              
              <Box sx={{ flex: '1 1 45%' }}>
                <TextField
                  fullWidth
                  label="Max Uses"
                  type="number"
                  value={newPromo.maxUses}
                  onChange={(e) => setNewPromo({...newPromo, maxUses: Number(e.target.value)})}
                  sx={{ mb: 2 }}
                />
              </Box>
              
              <Box sx={{ flex: '1 1 45%' }}>
                <TextField
                  fullWidth
                  label="Expiry Date"
                  type="date"
                  value={newPromo.expiryDate}
                  onChange={(e) => setNewPromo({...newPromo, expiryDate: e.target.value})}
                  InputLabelProps={{ shrink: true }}
                  sx={{ mb: 2 }}
                />
              </Box>
              
              <Box sx={{ flex: '1 1 100%' }}>
                <TextField
                  fullWidth
                  label="Description"
                  value={newPromo.description}
                  onChange={(e) => setNewPromo({...newPromo, description: e.target.value})}
                  placeholder="Brief description of the promotion"
                  sx={{ mb: 2 }}
                />
              </Box>
            </Box>
            
            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              <Button
                variant="contained"
                onClick={handleCreatePromo}
                sx={{
                  background: 'linear-gradient(135deg, #006D5B 0%, #004D40 100%)',
                  borderRadius: '8px',
                  textTransform: 'none',
                  fontWeight: 600
                }}
              >
                {editingPromo ? 'Update Promotion' : 'Create Promotion'}
              </Button>
              <Button
                variant="outlined"
                onClick={handleCancelEdit}
                sx={{
                  color: '#666',
                  borderColor: '#e0e0e0',
                  borderRadius: '8px',
                  textTransform: 'none'
                }}
              >
                Cancel
              </Button>
            </Box>
          </Paper>
        )}

        {/* Promos Grid */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {promos.map((promo) => (
            <Box sx={{ flex: '1 1 300px' }} key={promo.id}>
              <Card 
                elevation={2} 
                sx={{ 
                  borderRadius: '16px',
                  border: promo.isActive ? '2px solid #006D5B' : '1px solid #e0e0e0',
                  position: 'relative',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 8px 25px rgba(0, 109, 91, 0.2)',
                    transition: 'all 0.3s ease'
                  }
                }}
              >
                {/* Status Indicator */}
                <Box sx={{ 
                  position: 'absolute', 
                  top: 12, 
                  right: 12, 
                  display: 'flex', 
                  gap: 1 
                }}>
                  <Chip
                    size="small"
                    label={promo.isActive ? 'Active' : 'Inactive'}
                    sx={{
                      bgcolor: promo.isActive ? '#4caf50' : '#f44336',
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: '0.7rem'
                    }}
                  />
                </Box>

                <CardContent sx={{ p: 3 }}>
                  {/* Promo Type Icon */}
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    mb: 2, 
                    color: getPromoTypeColor(promo.type) 
                  }}>
                    {getPromoTypeIcon(promo.type)}
                    <Typography variant="caption" sx={{ ml: 1, fontWeight: 600, textTransform: 'uppercase' }}>
                      {promo.type.replace('_', ' ')}
                    </Typography>
                  </Box>

                  {/* Promo Code */}
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h5" sx={{ 
                      fontWeight: 700, 
                      color: '#006D5B',
                      fontFamily: 'monospace',
                      mr: 1
                    }}>
                      {promo.code}
                    </Typography>
                    <Tooltip title="Copy code">
                      <IconButton 
                        size="small" 
                        onClick={() => copyPromoCode(promo.code)}
                        sx={{ color: '#666' }}
                      >
                        <ContentCopy fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>

                  {/* Discount Value */}
                  <Paper sx={{ 
                    p: 2, 
                    mb: 2, 
                    bgcolor: getPromoTypeColor(promo.type), 
                    color: 'white',
                    textAlign: 'center',
                    borderRadius: '12px'
                  }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      {getPromoDisplayValue(promo)}
                    </Typography>
                  </Paper>

                  {/* Description */}
                  <Typography variant="body2" sx={{ color: '#666', mb: 2, lineHeight: 1.5 }}>
                    {promo.description}
                  </Typography>

                  <Divider sx={{ mb: 2 }} />

                  {/* Usage Stats */}
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="caption" sx={{ color: '#666' }}>
                        Usage
                      </Typography>
                      <Typography variant="caption" sx={{ fontWeight: 600 }}>
                        {promo.usageCount} / {promo.maxUses}
                      </Typography>
                    </Box>
                    <Box sx={{ 
                      width: '100%', 
                      height: 6, 
                      bgcolor: '#e0e0e0', 
                      borderRadius: '3px',
                      overflow: 'hidden'
                    }}>
                      <Box sx={{ 
                        width: `${(promo.usageCount / promo.maxUses) * 100}%`,
                        height: '100%',
                        bgcolor: '#006D5B',
                        borderRadius: '3px'
                      }} />
                    </Box>
                  </Box>

                  {/* Expiry Date */}
                  <Typography variant="caption" sx={{ color: '#666', display: 'block', mb: 2 }}>
                    Expires: {new Date(promo.expiryDate).toLocaleDateString()}
                  </Typography>

                  {/* Action Buttons */}
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      size="small"
                      startIcon={promo.isActive ? <VisibilityOff /> : <Visibility />}
                      onClick={() => togglePromoStatus(promo.id)}
                      sx={{
                        color: promo.isActive ? '#f44336' : '#4caf50',
                        textTransform: 'none',
                        fontSize: '0.8rem'
                      }}
                    >
                      {promo.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Tooltip title="Edit Promo">
                      <IconButton 
                        size="small" 
                        sx={{ color: '#666' }}
                        onClick={() => handleEditPromo(promo)}
                      >
                        <Edit fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Promo">
                      <IconButton 
                        size="small" 
                        sx={{ color: '#f44336' }}
                        onClick={() => handleDeletePromo(promo.id)}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </CardContent>
              </Card>
            </Box>
          ))}
        </Box>
      </Container>

      {/* Footer */}
      <Box sx={{ 
        bgcolor: '#e0e0e0', 
        py: 2, 
        mt: 'auto',
        borderTop: '1px solid #d0d0d0'
      }}>
        <Container maxWidth="lg">
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            flexWrap: 'wrap',
            gap: 2
          }}>
            <Box sx={{ display: 'flex', gap: 3 }}>
              <Typography 
                variant="body2" 
                component="a"
                href="/privacy-policy"
                sx={{ 
                  color: '#006D5B', 
                  fontSize: '0.85rem', 
                  cursor: 'pointer',
                  textDecoration: 'none',
                  '&:hover': { textDecoration: 'underline' }
                }}
              >
                Privacy Policy
              </Typography>
              <Typography 
                variant="body2" 
                component="a"
                href="https://wa.me/2349050066638?text=Hi%2C%20I%20need%20help%20with%20promos%20on%20Pharmastackx"
                target="_blank"
                rel="noopener noreferrer"
                sx={{ 
                  color: '#006D5B', 
                  fontSize: '0.85rem', 
                  cursor: 'pointer',
                  textDecoration: 'none',
                  '&:hover': { textDecoration: 'underline' }
                }}
              >
                Need Help?
              </Typography>
              <Typography 
                variant="body2" 
                component="a"
                href="https://wa.me/2349050066638?text=Hello%2C%20I%20would%20like%20to%20get%20in%20touch%20regarding%20Pharmastackx"
                target="_blank"
                rel="noopener noreferrer"
                sx={{ 
                  color: '#006D5B', 
                  fontSize: '0.85rem', 
                  cursor: 'pointer',
                  textDecoration: 'none',
                  '&:hover': { textDecoration: 'underline' }
                }}
              >
                Contact
              </Typography>
            </Box>
          </Box>
        </Container>
      </Box>
    </Box>
  );
}