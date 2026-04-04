
'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Container,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Grid,
  TextField,
  Checkbox,
  FormControlLabel,
  Button,
  Avatar,
  Chip,
  Divider,
  Card,
  CardContent,
  IconButton,
  Paper,
  Modal,
  Backdrop
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import ArrowBackIcon from '@mui/icons-material/ArrowBack'; 
import Navbar from '@/components/Navbar';

// Interfaces
interface ManualItem { name: string; price: number; pharmacyQuantity: number; isAvailable: boolean; }
interface ExistingItemDetail { name: string; form: string; strength: string; quantity: number; notes: string; image: string | null; isAvailable: boolean; price: number; pharmacyQuantity: number; }
interface FullRequest { _id: string; createdAt: string; status: string; requestType: 'drug-list' | 'image-upload'; items: ExistingItemDetail[] | string[]; notes?: string; prescriptionImage?: string; } // <<< FIX: Added prescriptionImage

const modalStyle = { position: 'absolute' as 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', maxWidth: '90vw', maxHeight: '90vh', bgcolor: 'background.paper', boxShadow: 24, p: 2, outline: 'none', borderRadius: '12px' };

const ManageRequestPage: React.FC = () => {
  const router = useRouter();
  const params = useParams();
  const id = params?.id;

  const [request, setRequest] = useState<FullRequest | null>(null);
  const [manualItems, setManualItems] = useState<ManualItem[]>([ { name: '', price: 0, pharmacyQuantity: 1, isAvailable: true } ]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      const fetchRequest = async () => {
        try {
          const response = await fetch(`/api/requests/${id}`);
          if (!response.ok) throw new Error('Failed to fetch request details');
          const data: FullRequest = await response.json();
          if (data.requestType === 'drug-list' && Array.isArray(data.items)) {
            data.items = (data.items as ExistingItemDetail[]).map(item => ({ ...item, pharmacyQuantity: item.pharmacyQuantity || item.quantity, isAvailable: item.isAvailable !== false }));
          }
          if (data.requestType === 'image-upload' && data.prescriptionImage && Array.isArray(data.items) && data.items.length > 0 && typeof data.items[0] !== 'string') {
            setManualItems(data.items as ManualItem[]);
          }
          if(data.notes) setNotes(data.notes);
          setRequest(data);
        } catch (err) { setError(err instanceof Error ? err.message : 'An unknown error');
        } finally { setLoading(false); }
      };
      fetchRequest();
    }
  }, [id]);

  const handleManualItemChange = (index: number, field: keyof ManualItem, value: any) => { const u = [...manualItems]; u[index] = { ...u[index], [field]: value }; setManualItems(u); };
  const addNewItem = () => { setManualItems([...manualItems, { name: '', price: 0, pharmacyQuantity: 1, isAvailable: true }]); };
  const removeItem = (index: number) => { setManualItems(manualItems.filter((_, i) => i !== index)); };
  const handleExistingItemChange = (index: number, field: keyof ExistingItemDetail, value: any) => { if (!request) return; const u = [...(request.items as ExistingItemDetail[])]; u[index] = { ...u[index], [field]: value }; if(field === 'isAvailable' && !value) u[index].price = 0; setRequest({ ...request, items: u }); };
  
  const handleSubmitQuote = async (location: { latitude: number; longitude: number }) => {
    if (!request) return;
    setIsSubmitting(true);
    setError(null);
    const itemsToSubmit = request.requestType === 'image-upload' 
      ? manualItems.filter(item => item.name.trim() !== '') 
      : request.items;

    try {
      const response = await fetch(`/api/requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'submit-quote', 
          items: itemsToSubmit, 
          notes: notes, 
          coordinates: [location.longitude, location.latitude] // GEOJSON format: [longitude, latitude]
        }),
      });
      if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to submit quote');
      }
      router.push('/requests');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setIsSubmitting(false); // Only set submitting to false on error
    }
  };

  const handleGetLocationAndSubmit = () => {
    setIsGettingLocation(true);
    setError(null);

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser. Please use a modern browser.");
      setIsGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        handleSubmitQuote({ latitude, longitude });
        // No need to set isGettingLocation to false here, as handleSubmitQuote will handle the loading state.
      },
      (geoError) => {
        let msg = "Could not get your location. ";
        if (geoError.code === 1) msg += "Permission denied. Please enable location in your browser settings.";
        else msg += "Please ensure you have a stable internet connection and try again.";
        setError(msg);
        setIsGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };
  
  const getImageUrl = () => {
    if (!request) return '';
    if (request.prescriptionImage) return request.prescriptionImage;
    if (request.requestType === 'image-upload' && Array.isArray(request.items) && typeof request.items[0] === 'string') {
      return request.items[0];
    }
    return '';
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>;
  if (!request && !loading) return <Container sx={{ py: 4 }}><Alert severity="error">{error || 'Could not load the request.'}</Alert></Container>;
  
  const imageUrl = getImageUrl();

  return (
    <>
      <Navbar />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
            {error.includes('Store Management') && (
              <Box sx={{ mt: 1 }}>
                <Link href="/dashboard/store-management" passHref>
                  <Button variant="outlined" color="inherit" size="small">
                    Click here to update your profile
                  </Button>
                </Link>
              </Box>
            )}
          </Alert>
        )}

        {!request ? <Alert severity="warning">Could not load request.</Alert> : (
          <Paper sx={{p: {xs: 2, md: 3}, borderRadius: '16px'}}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <IconButton onClick={() => router.push('/requests')} aria-label="back to requests"><ArrowBackIcon /></IconButton>
                <Typography variant="h5" component="h1" sx={{ ml: 1, flexGrow: 1 }}>Manage Dispatch Request</Typography>
            </Box>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, pl: '48px' }}>ID: {request._id}</Typography>

            {request.requestType === 'image-upload' && (
              <Grid container spacing={3}>
                <Grid item xs={12} md={5}>
                  <Typography variant="h6" gutterBottom>Uploaded Prescription</Typography>
                  <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1, cursor: imageUrl ? 'pointer' : 'default' }} onClick={() => imageUrl && setSelectedImage(imageUrl)}>
                     <img src={imageUrl} alt="Prescription" style={{ width: '100%', height: 'auto', borderRadius: '8px', display: imageUrl ? 'block' : 'none' }} />
                     {!imageUrl && <Alert severity="info">No prescription image found.</Alert>}
                  </Box>
                </Grid>
                <Grid item xs={12} md={7}>
                  <Typography variant="h6" gutterBottom>Build Quote</Typography>
                  {manualItems.map((item, index) => (
                    <Card key={index} variant="outlined" sx={{ mb: 2, p: 2 }}>
                      <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={5}><TextField fullWidth label="Drug Name" value={item.name} onChange={e => handleManualItemChange(index, 'name', e.target.value)} /></Grid>
                        <Grid item xs={6} sm={3}><TextField fullWidth label="Price" type="number" value={item.price} onChange={e => handleManualItemChange(index, 'price', parseFloat(e.target.value) || 0)} InputProps={{ startAdornment: <Typography sx={{ mr: 0.5 }}>₦</Typography> }} /></Grid>
                        <Grid item xs={6} sm={3}><TextField fullWidth label="Quantity" type="number" value={item.pharmacyQuantity} onChange={e => handleManualItemChange(index, 'pharmacyQuantity', parseInt(e.target.value) || 0)} /></Grid>
                        <Grid item xs={12} sm={1}><IconButton onClick={() => removeItem(index)} color="error"><DeleteIcon /></IconButton></Grid>
                      </Grid>
                    </Card>
                  ))}
                  <Button startIcon={<AddCircleOutlineIcon />} onClick={addNewItem} variant="text">Add Another Drug</Button>
                </Grid>
              </Grid>
            )}

            {request.requestType === 'drug-list' && (request.items as ExistingItemDetail[]).map((item, index) => (
                <Card key={index} variant="outlined" sx={{ borderRadius: '12px', opacity: item.isAvailable ? 1 : 0.6, mb: 2 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      {item.image && <Avatar src={item.image} sx={{ width: 48, height: 48, mr: 2, cursor: 'pointer' }} variant="rounded" onClick={() => setSelectedImage(item.image)} />}
                      <Box>
                        <Typography variant="h6">{item.name}</Typography>
                        <Box sx={{display: 'flex', gap: 1, flexWrap: 'wrap'}}>
                            {item.strength && <Chip label={item.strength} size="small" />}
                            {item.form && <Chip label={item.form} size="small" />}
                            <Chip label={`Requested Qty: ${item.quantity}`} size="small" />
                        </Box>
                      </Box>
                    </Box>
                    <Divider sx={{my: 1.5}} />
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} sm={3}><FormControlLabel control={<Checkbox checked={item.isAvailable} onChange={e => handleExistingItemChange(index, 'isAvailable', e.target.checked)}/>} label="Is Available?"/></Grid>
                      <Grid item xs={6} sm={4}><TextField label="Set Price" type="number" size="small" fullWidth disabled={!item.isAvailable} value={item.price || ''} onChange={e => handleExistingItemChange(index, 'price', parseFloat(e.target.value) || 0)} InputProps={{ startAdornment: <Typography sx={{ mr: 0.5 }}>₦</Typography> }}/></Grid>
                      <Grid item xs={6} sm={4}><TextField label="Confirm Quantity" type="number" size="small" fullWidth disabled={!item.isAvailable} value={item.pharmacyQuantity || ''} onChange={e => handleExistingItemChange(index, 'pharmacyQuantity', parseInt(e.target.value) || 0)}/></Grid>
                    </Grid>
                  </CardContent>
                </Card>
            ))}
            
            <Divider sx={{ my: 3 }} />

            <Box sx={{ mt: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>Notes for Patient</Typography>
              <TextField fullWidth multiline rows={3} label="Add general notes for the patient (e.g., delivery info, advice)" variant="outlined" value={notes} onChange={(e) => setNotes(e.target.value)} />
             </Box>

            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
                 <Button variant="contained" color="primary" onClick={handleGetLocationAndSubmit} disabled={isSubmitting || isGettingLocation} sx={{ bgcolor: '#006D5B', '&:hover': { bgcolor: '#004D3F' } }}>
                   {(isSubmitting || isGettingLocation) ? <CircularProgress size={24} /> : 'Submit Quote to Patient'}
                 </Button>
            </Box>
          </Paper>
        )}
      </Container>

      <Modal open={!!selectedImage} onClose={() => setSelectedImage(null)} closeAfterTransition BackdropComponent={Backdrop} BackdropProps={{ timeout: 500 }}>
        <Box sx={modalStyle}>
            <img src={selectedImage || ''} alt="Full-size preview" style={{ maxWidth: '100%', maxHeight: 'calc(90vh - 60px)', display: 'block' }} />
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                <Button variant="contained" startIcon={<DownloadIcon />} href={selectedImage || ''} download>Download</Button>
            </Box>
        </Box>
      </Modal>
    </>
  );
};

export default ManageRequestPage;
