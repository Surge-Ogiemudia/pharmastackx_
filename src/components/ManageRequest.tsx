'use client';

import React, { useState, useEffect } from 'react';
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
  Backdrop,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import ArrowBackIcon from '@mui/icons-material/ArrowBack'; 
import { useSession } from '@/context/SessionProvider';

// Interfaces
interface ManualItem { name: string; price: number; pharmacyQuantity: number; isAvailable: boolean; }
interface ExistingItemDetail { name: string; form: string; strength: string; quantity: number; notes: string; image: string | null; isAvailable: boolean; price: number; pharmacyQuantity: number; }
interface FullRequest { _id: string; createdAt: string; status: string; requestType: 'drug-list' | 'image-upload'; items: ExistingItemDetail[] | string[]; notes?: string; prescriptionImage?: string; } // <<< FIX: Added prescriptionImage

const modalStyle = { position: 'absolute' as 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', maxWidth: '90vw', maxHeight: '90vh', bgcolor: 'background.paper', boxShadow: 24, p: 2, outline: 'none', borderRadius: '12px' };

interface ManageRequestProps {
  requestId: string;
  onBack: () => void;
  onSuccess?: () => void;
  initialData?: FullRequest;
}

const ManageRequest: React.FC<ManageRequestProps> = ({ requestId, onBack, onSuccess, initialData }) => {
  const { user } = useSession();
  const [request, setRequest] = useState<FullRequest | null>(initialData || null);
  const [manualItems, setManualItems] = useState<ManualItem[]>(() => {
    if (initialData?.requestType === 'image-upload' && Array.isArray(initialData.items) && initialData.items.length > 0 && typeof initialData.items[0] !== 'string') {
      return initialData.items as ManualItem[];
    }
    return [ { name: '', price: 0, pharmacyQuantity: 1, isAvailable: true } ];
  });
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [locationPromptOpen, setLocationPromptOpen] = useState(false);


  useEffect(() => {
    if (requestId) {
      const fetchRequest = async () => {
        try {
          const response = await fetch(`/api/requests/${requestId}`);
          if (!response.ok) throw new Error('Failed to fetch request details');
          const data: FullRequest = await response.json();
          
          // Background Update: Carefully update items to avoid wiping out user changes
          const transformedItems = (data.requestType === 'drug-list' && Array.isArray(data.items))
            ? (data.items as ExistingItemDetail[]).map(item => ({ ...item, pharmacyQuantity: item.pharmacyQuantity || item.quantity, isAvailable: item.isAvailable !== false }))
            : data.items;
          
          setRequest({ ...data, items: transformedItems });
          
          if (data.requestType === 'image-upload' && data.prescriptionImage && Array.isArray(data.items) && data.items.length > 0 && typeof data.items[0] !== 'string') {
            // Only set manual items if the user hasn't started editing yet (simple check)
            if (manualItems.length === 1 && manualItems[0].name === '') {
              setManualItems(data.items as ManualItem[]);
            }
          }
          
          if (data.notes && !notes) setNotes(data.notes);
        } catch (err) { 
          if (!request) setError(err instanceof Error ? err.message : 'An unknown error');
        } finally { 
          setLoading(false); 
        }
      };
      fetchRequest();
    }
  }, [requestId]);

  const handleManualItemChange = (index: number, field: keyof ManualItem, value: any) => { const u = [...manualItems]; u[index] = { ...u[index], [field]: value }; setManualItems(u); };
  const addNewItem = () => { setManualItems([...manualItems, { name: '', price: 0, pharmacyQuantity: 1, isAvailable: true }]); };
  const removeItem = (index: number) => { setManualItems(manualItems.filter((_, i) => i !== index)); };
  const handleExistingItemChange = (index: number, field: keyof ExistingItemDetail, value: any) => { if (!request) return; const u = [...(request.items as ExistingItemDetail[])]; u[index] = { ...u[index], [field]: value }; if(field === 'isAvailable' && !value) u[index].price = 0; setRequest({ ...request, items: u }); };
  
  const handleSubmitQuote = async (coordinates: GeolocationCoordinates) => {
    if (!request) return;
    setIsSubmitting(true);
    setError(null);
    setLocationPromptOpen(false);

    const itemsToSubmit = request.requestType === 'image-upload' 
      ? manualItems.filter(item => item.name.trim() !== '') 
      : request.items;

    try {
      const response = await fetch(`/api/requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'submit-quote', 
          items: itemsToSubmit, 
          notes: notes, 
          coordinates: [coordinates.longitude, coordinates.latitude]
        }),
      });
      if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to submit quote');
      }

      // Notify patient after successful quote submission
      try {
        await fetch('/api/notify-patient', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requestId: request._id }),
        });
      } catch (notificationError) {
        console.error('Failed to send notification to patient:', notificationError);
      }

      if (onSuccess) onSuccess();
      else onBack(); // Go back to the list view
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInitialSubmit = () => {
      setLocationPromptOpen(true);
  };

  const handleLocationPromptClose = (agreed: boolean) => {
    setLocationPromptOpen(false);
    if (agreed) {
      setIsSubmitting(true); // Show loading indicator immediately
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            handleSubmitQuote(position.coords);
          },
          (error) => {
            setError("Failed to get location. Please enable location services and try again.");
            setIsSubmitting(false);
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      } else {
        setError("Geolocation is not supported by this browser.");
        setIsSubmitting(false);
      }
    }
  };
  
  const getImageUrl = () => {
    if (!request) return '';
    if (request.prescriptionImage) return request.prescriptionImage;
    if (request.requestType === 'image-upload' && Array.isArray(request.items) && typeof request.items[0] === 'string') {
      return request.items[0];
    }
    return '';
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}><CircularProgress /></Box>;
  if (!request) return <Container sx={{ py: 4 }}><Alert severity="error">{error || 'Could not load the request.'}</Alert></Container>;
  
  const imageUrl = getImageUrl();

  return (
    <div className="sora" style={{ padding: '0 20px 80px' }}>
        <div className="back-btn-pill" onClick={onBack} style={{ marginBottom: '24px', display: 'inline-flex', cursor: 'pointer' }}>
          <ArrowBackIcon style={{ fontSize: '16px' }} />
          <span>Back</span>
        </div>

        <div className="fraunces" style={{ fontSize: '24px', fontWeight: 900, color: 'var(--black)', letterSpacing: '-1px', marginBottom: '6px' }}>
          Manage <em style={{ color: 'var(--green)', fontStyle: 'italic' }}>Request</em>
        </div>
        <div style={{ fontSize: '12px', color: 'var(--gray)', marginBottom: '24px', fontWeight: 500 }}>
          ID: {request._id.slice(-8).toUpperCase()} · {new Date(request.createdAt).toLocaleDateString()}
        </div>

        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: '12px' }}>
            {error}
          </Alert>
        )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
        {request.requestType === 'image-upload' && (
          <div className="glass-card" style={{ cursor: 'default' }}>
            <div className="sec-tag" style={{ marginTop: 0 }}>Prescription Image</div>
            <div 
              style={{ 
                borderRadius: '16px', 
                overflow: 'hidden', 
                border: '1px solid var(--border)',
                maxHeight: '300px',
                cursor: 'pointer',
                position: 'relative'
              }}
              onClick={() => imageUrl && setSelectedImage(imageUrl)}
            >
              <img src={imageUrl} alt="Prescription" style={{ width: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', bottom: 12, right: 12, background: 'rgba(0,0,0,0.5)', color: '#fff', padding: '4px 12px', borderRadius: '100px', fontSize: '10px', backdropFilter: 'blur(4px)' }}>Tap to zoom</div>
            </div>

            <div className="sec-tag" style={{ marginTop: '24px' }}>Build Quote</div>
            {manualItems.map((item, index) => (
              <div key={index} style={{ background: '#f5f5f5', padding: '20px', borderRadius: '20px', marginBottom: '16px', border: '1px solid rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                  <input 
                    className="form-input" 
                    placeholder="Medicine Name" 
                    value={item.name} 
                    onChange={e => handleManualItemChange(index, 'name', e.target.value)} 
                    style={{ flex: 2, background: '#fff', border: '1px solid #ddd', borderRadius: '12px', fontSize: '14px', fontWeight: 600 }}
                  />
                  <button onClick={() => removeItem(index)} style={{ padding: '0 12px', background: '#ffebeb', borderRadius: '12px', border: 'none', color: '#ff4d4d', fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                </div>
                
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', background: '#fff', padding: '12px 16px', borderRadius: '16px', border: '1px solid #eee' }}>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <div style={{ fontSize: '9px', fontWeight: 800, color: 'var(--gray)', textTransform: 'uppercase', marginBottom: '4px' }}>Unit Price</div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{ color: 'var(--black)', fontSize: '14px', fontWeight: 700, marginRight: '4px' }}>₦</span>
                      <input 
                        type="number"
                        placeholder="0.00" 
                        value={item.price || ''} 
                        onChange={e => handleManualItemChange(index, 'price', parseFloat(e.target.value) || 0)} 
                        style={{ background: 'transparent', border: 'none', padding: 0, outline: 'none', width: '100%', fontSize: '16px', fontWeight: 800, color: 'var(--black)' }}
                      />
                    </div>
                  </div>
                  <div style={{ width: '1px', height: '30px', background: '#eee' }}></div>
                  <div style={{ flex: 0.6 }}>
                    <div style={{ fontSize: '9px', fontWeight: 800, color: 'var(--gray)', textTransform: 'uppercase', marginBottom: '4px' }}>QTY</div>
                    <input 
                      type="number"
                      placeholder="1" 
                      value={item.pharmacyQuantity} 
                      onChange={e => handleManualItemChange(index, 'pharmacyQuantity', parseInt(e.target.value) || 0)} 
                      style={{ background: 'transparent', border: 'none', padding: 0, outline: 'none', width: '100%', fontSize: '16px', fontWeight: 800, color: 'var(--black)' }}
                    />
                  </div>
                </div>
              </div>
            ))}
            <button 
              onClick={addNewItem} 
              style={{ background: 'transparent', border: '2px dashed #eee', width: '100%', padding: '16px', borderRadius: '20px', color: 'var(--gray)', fontSize: '13px', fontWeight: 700, transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              className="hover-opacity"
            >
              <div style={{ background: '#eee', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>+</div>
              Add another medicine
            </button>
          </div>
        )}

        {request.requestType === 'drug-list' && (request.items as ExistingItemDetail[]).map((item, index) => (
          <div key={index} className="glass-card" style={{ opacity: item.isAvailable ? 1 : 0.6, cursor: 'default', padding: '24px' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '20px' }}>
              {item.image ? (
                <img src={item.image} style={{ width: 68, height: 68, borderRadius: '20px', objectFit: 'cover', border: '2px solid #fff', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} onClick={() => setSelectedImage(item.image)} />
              ) : (
                <div style={{ width: 68, height: 68, borderRadius: '20px', background: 'var(--green-pale)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', border: '2px solid #fff', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>💊</div>
              )}
              <div style={{ flex: 1 }}>
                <div className="fraunces" style={{ fontSize: '18px', fontWeight: 900, color: 'var(--black)', letterSpacing: '-0.5px' }}>{item.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--gray)', marginTop: '4px', fontWeight: 500 }}>{item.strength} · {item.form} · Needs {item.quantity}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  padding: '8px 16px', 
                  borderRadius: '100px', 
                  background: item.isAvailable ? 'rgba(15, 110, 86, 0.08)' : '#F3F4F6',
                  color: item.isAvailable ? '#0F6E56' : '#6B7280',
                  fontSize: '11px', 
                  fontWeight: 800, 
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  border: `1px solid ${item.isAvailable ? 'rgba(15, 110, 86, 0.15)' : 'rgba(0,0,0,0.05)'}`
                }}>
                  <input type="checkbox" checked={item.isAvailable} onChange={e => handleExistingItemChange(index, 'isAvailable', e.target.checked)} style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#0F6E56' }} />
                  {item.isAvailable ? 'IN STOCK' : 'OUT OF STOCK'}
                </label>
              </div>
            </div>
            
            {item.isAvailable && (
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', background: '#f9f9f9', padding: '16px', borderRadius: '20px', border: '1px solid rgba(0,0,0,0.03)' }}>
                <div style={{ flex: 1.2, position: 'relative' }}>
                  <div style={{ fontSize: '9px', fontWeight: 800, color: 'var(--gray)', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.5px' }}>Unit Price Offer</div>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ color: 'var(--black)', fontSize: '16px', fontWeight: 800, marginRight: '6px' }}>₦</span>
                    <input 
                      type="number"
                      placeholder="0.00" 
                      value={item.price || ''} 
                      onChange={e => handleExistingItemChange(index, 'price', parseFloat(e.target.value) || 0)} 
                      style={{ background: 'transparent', border: 'none', padding: 0, outline: 'none', width: '100%', fontSize: '18px', fontWeight: 900, color: 'var(--black)' }}
                    />
                  </div>
                </div>
                <div style={{ width: '1.5px', height: '36px', background: '#eee' }}></div>
                <div style={{ flex: 0.8 }}>
                  <div style={{ fontSize: '9px', fontWeight: 800, color: 'var(--gray)', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.5px' }}>In-stock Qty</div>
                  <input 
                    type="number"
                    placeholder="1" 
                    value={item.pharmacyQuantity || ''} 
                    onChange={e => handleExistingItemChange(index, 'pharmacyQuantity', parseInt(e.target.value) || 0)} 
                    style={{ background: 'transparent', border: 'none', padding: 0, outline: 'none', width: '100%', fontSize: '18px', fontWeight: 900, color: 'var(--black)' }}
                  />
                </div>
              </div>
            )}
          </div>
        ))}

        {request.notes && (
          <div className="glass-card" style={{ cursor: 'default', background: 'rgba(255,165,0,0.03)', border: '1px solid rgba(255,165,0,0.1)' }}>
            <div className="sec-tag" style={{ marginTop: 0, color: '#B45309', fontSize: '10px', letterSpacing: '1px', fontWeight: 900 }}>PATIENT REQUIREMENTS</div>
            <Typography sx={{ fontSize: '14px', color: '#1a1a1a', fontWeight: 500, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {request.notes}
            </Typography>
          </div>
        )}

        <div className="glass-card" style={{ cursor: 'default', background: 'rgba(15, 110, 86, 0.03)', border: '1px solid rgba(15, 110, 86, 0.1)', minHeight: '160px' }}>
          <div className="sec-tag" style={{ marginTop: 0, color: 'var(--primary-green)', fontSize: '10px', letterSpacing: '1.2px', fontWeight: 900 }}>YOUR RESPONSE NOTES</div>
          <textarea 
            className="form-notes" 
            placeholder="Mention substitutions (e.g. tablet vs. syrup), partial availability, or dosage advice..." 
            value={notes} 
            onChange={(e) => setNotes(e.target.value)} 
            style={{ minHeight: '120px', background: 'transparent', color: 'var(--black)', fontWeight: 500, border: 'none', padding: 0, fontSize: '14px', lineHeight: 1.6, outline: 'none', width: '100%', resize: 'none' }}
          />
        </div>
      </div>

      <div 
        style={{ 
          marginTop: '32px',
          padding: '6px', 
          background: 'rgba(0,0,0,0.02)', 
          borderRadius: '100px', 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          maxWidth: '340px',
          margin: '32px auto 0'
        }}
      >
        <button 
          className="send-btn" 
          onClick={handleInitialSubmit} 
          disabled={isSubmitting}
          style={{ 
            background: 'linear-gradient(135deg, #111 0%, #333 100%)', 
            color: '#fff', 
            height: '56px',
            width: '100%',
            borderRadius: '100px',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '12px',
            margin: 0,
            fontSize: '14px',
            fontWeight: 800,
            letterSpacing: '1px',
            opacity: isSubmitting ? 0.7 : 1,
            boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          {isSubmitting ? (
            <>
              <CircularProgress size={20} sx={{ color: '#fff' }} />
              TRANSMITTING...
            </>
          ) : (
            <>
              <span>SUBMIT QUOTE TO PATIENT</span>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--primary-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 4px 10px rgba(15,110,86,0.3)' }}>
                <span style={{ fontSize: '16px', fontWeight: 900 }}>→</span>
              </div>
            </>
          )}
        </button>
      </div>

      <Dialog open={locationPromptOpen} onClose={() => handleLocationPromptClose(false)} PaperProps={{ sx: { borderRadius: '24px', p: 1 } }}>
        <DialogTitle className="fraunces" style={{ fontWeight: 900 }}>Location Required</DialogTitle>
        <DialogContent>
          <DialogContentText className="sora" style={{ fontSize: '13px', lineHeight: 1.6 }}>
            To ensure accurate delivery and distance calculations, we need to verify your pharmacy's current location. This will be shared only with the patient receiving your quote.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => handleLocationPromptClose(false)} sx={{ color: 'var(--gray)', fontSize: '12px', fontWeight: 600 }}>Cancel</Button>
          <Button onClick={() => handleLocationPromptClose(true)} autoFocus sx={{ color: 'var(--green)', fontSize: '12px', fontWeight: 700 }}>VERIFY & SUBMIT</Button>
        </DialogActions>
      </Dialog>

      <Modal open={!!selectedImage} onClose={() => setSelectedImage(null)} BackdropComponent={Backdrop} BackdropProps={{ timeout: 500 }}>
        <Box sx={modalStyle}>
          <img src={selectedImage || ''} alt="Preview" style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: '12px' }} />
          <Button fullWidth sx={{ mt: 2, background: 'var(--black)', color: '#fff', borderRadius: '12px', '&:hover': { background: '#222' } }} onClick={() => setSelectedImage(null)}>Close Preview</Button>
        </Box>
      </Modal>
    </div>
  );
};

export default ManageRequest;
