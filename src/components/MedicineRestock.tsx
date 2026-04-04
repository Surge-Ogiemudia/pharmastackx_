'use client';

import React, { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  TextField,
  Button,
  IconButton,
  Grid,
  Select,
  MenuItem,
  FormControl,
  CircularProgress,
  Alert,
  IconButton as MuiIconButton,
  Tooltip,
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteIcon from '@mui/icons-material/Delete';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PhotoCamera from '@mui/icons-material/PhotoCamera';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

interface RestockItem {
  brandName: string;
  activeIngredients: string;
  form: string;
  strength: string;
  quantity: string;
  image?: File | null;
  imagePreview?: string | null;
}

const drugForms = [
  'Tablet', 'Capsule', 'Syrup', 'Suspension', 'Injection', 'Drops', 
  'Cream', 'Ointment', 'Gel', 'Lotion', 'Suppository', 'Pessary', 
  'Inhaler', 'Nebulizer Solution', 'Powder', 'Granules'
];

interface MedicineRestockProps {
  onBack: () => void;
  userId: string;
}

const MedicineRestock: React.FC<MedicineRestockProps> = ({ onBack, userId }) => {
  const [tabIndex, setTabIndex] = useState(0);
  const [items, setItems] = useState<RestockItem[]>([{ brandName: '', activeIngredients: '', form: '', strength: '', quantity: '', image: null, imagePreview: null }]);
  const [notes, setNotes] = useState('');
  const [listUploadFile, setListUploadFile] = useState<File | null>(null);
  const [submissionStatus, setSubmissionStatus] = useState<'idle' | 'submitting' | 'submitted' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isFormValid, setIsFormValid] = useState(false);

  useEffect(() => {
    let isValid = false;
    if (tabIndex === 0) {
      isValid = items.some(item => 
        item.brandName || item.activeIngredients || item.form || item.strength || item.quantity || item.image
      );
    } else if (tabIndex === 1) {
      isValid = !!listUploadFile;
    }
    setIsFormValid(isValid);
  }, [items, listUploadFile, tabIndex]);

  const handleItemChange = (index: number, field: keyof RestockItem, value: string) => {
    const newItems = items.map((item, i) => {
      if (i === index) {
        return { ...item, [field]: value };
      }
      return item;
    });
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { brandName: '', activeIngredients: '', form: '', strength: '', quantity: '', image: null, imagePreview: null }]);
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  const handleListFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setListUploadFile(event.target.files[0]);
    }
  };

  const handleItemImageChange = (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        const imagePreview = reader.result as string;
        setItems(currentItems => currentItems.map((item, i) => {
          if (i === index) {
            return { ...item, image: file, imagePreview };
          }
          return item;
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removeItemImage = (index: number) => {
    setItems(currentItems => currentItems.map((item, i) => {
      if (i === index) {
        return { ...item, image: null, imagePreview: null };
      }
      return item;
    }));
  };

  const handleSubmit = async () => {
    if (!isFormValid) return;
    setSubmissionStatus('submitting');
    setError(null);

    const formData = new FormData();
    formData.append('userId', userId);

    if (tabIndex === 0) {
      formData.append('submissionType', 'list');
      const textItems = items.map(({ image, imagePreview, ...rest }) => rest);
      formData.append('listContent', JSON.stringify(textItems));

      items.forEach((item, index) => {
        if (item.image) {
          formData.append(`itemImage_${index}`, item.image, item.image.name);
        }
      });
    } else {
      formData.append('submissionType', 'file');
      if (listUploadFile) {
        formData.append('listFile', listUploadFile);
      }
    }

    formData.append('notes', notes);

    try {
      const response = await fetch('/api/submit-restock', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setSubmissionStatus('submitted');
      } else {
        throw new Error(result.message || 'An unknown error occurred.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit the request. Please try again.');
      setSubmissionStatus('error');
    }
  };

  if (submissionStatus === 'submitted') {
    return (
      <Box 
        component={motion.div}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        sx={{ width: '100%', maxWidth: '600px', mx: 'auto', mt: 4 }}
      >
        <Box 
          className="glass-card" 
          sx={{ 
            p: 6, 
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}
        >
          <Box className="success-icon-bg" sx={{ mb: 4 }}>
            <CheckCircleOutlineIcon sx={{ fontSize: 48 }} />
          </Box>
          <Typography className="fraunces" variant="h4" sx={{ mb: 2, fontWeight: 900 }}>Request Submitted!</Typography>
          <Typography className="sora" sx={{ color: 'var(--gray)', mb: 4, maxWidth: '400px' }}>
            Thank you for your submission. Our team is reviewing your restock request and will reach out with a quote shortly.
          </Typography>
          <Button 
            variant="contained" 
            className="upgrade-button-premium"
            onClick={() => {
              setSubmissionStatus('idle');
              setItems([{ brandName: '', activeIngredients: '', form: '', strength: '', quantity: '', image: null, imagePreview: null }]);
              setListUploadFile(null);
              setNotes('');
              onBack();
            }}
            sx={{ px: 6 }}
          >
            Back to Dashboard
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box className="sora" sx={{ width: '100%', maxWidth: '900px', mx: 'auto', pb: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
        <MuiIconButton 
          onClick={onBack} 
          sx={{ 
            mr: 2, 
            bgcolor: 'rgba(0,0,0,0.03)', 
            '&:hover': { bgcolor: 'rgba(0,0,0,0.06)' } 
          }}
        >
          <ArrowBackIcon />
        </MuiIconButton>
        <Box>
          <Typography className="fraunces" variant="h4" sx={{ fontWeight: 900, letterSpacing: '-1px' }}>
            Medicine Restock
          </Typography>
          <Typography variant="body2" sx={{ color: 'var(--gray)', fontWeight: 500 }}>
            Restock your inventory by building a list or uploading a file
          </Typography>
        </Box>
      </Box>

      {/* Tabs Switcher */}
      <Box sx={{ display: 'flex', gap: 1, mb: 4, p: 0.5, bgcolor: 'rgba(0,0,0,0.03)', borderRadius: '16px', width: 'fit-content' }}>
        {[
          { icon: '📝', label: 'Build a List' },
          { icon: '📄', label: 'Upload File' }
        ].map((tab, idx) => (
          <Box
            key={idx}
            onClick={() => setTabIndex(idx)}
            sx={{
              px: 3,
              py: 1.2,
              borderRadius: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              transition: 'all 0.2s',
              bgcolor: tabIndex === idx ? 'white' : 'transparent',
              boxShadow: tabIndex === idx ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
              color: tabIndex === idx ? 'var(--green)' : 'var(--gray)',
            }}
          >
            <Typography sx={{ fontSize: '14px' }}>{tab.icon}</Typography>
            <Typography sx={{ fontSize: '13px', fontWeight: tabIndex === idx ? 800 : 600 }}>
              {tab.label}
            </Typography>
          </Box>
        ))}
      </Box>

      <AnimatePresence mode="wait">
        {tabIndex === 0 ? (
          <Box 
            component={motion.div}
            key="list"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
          >
            {items.map((item, index) => (
              <Box 
                key={index} 
                className="glass-card" 
                sx={{ 
                  mb: 2, 
                  p: 3,
                  position: 'relative',
                  border: '1.5px solid #f1f3f5',
                  '&:hover': { borderColor: 'var(--green-pale)' }
                }}
              >
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <TextField 
                      fullWidth 
                      label="Brand Name" 
                      variant="outlined"
                      value={item.brandName} 
                      onChange={e => handleItemChange(index, 'brandName', e.target.value)}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', bgcolor: 'rgba(0,0,0,0.01)' } }}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField 
                      fullWidth 
                      label="Active Ingredients" 
                      variant="outlined"
                      value={item.activeIngredients} 
                      onChange={e => handleItemChange(index, 'activeIngredients', e.target.value)}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', bgcolor: 'rgba(0,0,0,0.01)' } }}
                    />
                  </Grid>
                  <Grid item xs={6} md={2}>
                    <FormControl fullWidth>
                      <Select 
                        value={item.form} 
                        displayEmpty
                        onChange={e => handleItemChange(index, 'form', e.target.value)}
                        sx={{ borderRadius: '12px', bgcolor: 'rgba(0,0,0,0.01)' }}
                      >
                        <MenuItem value="" disabled>Form</MenuItem>
                        {drugForms.map(form => <MenuItem key={form} value={form}>{form}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={6} md={2}>
                    <TextField 
                      fullWidth 
                      label="Strength" 
                      value={item.strength} 
                      onChange={e => handleItemChange(index, 'strength', e.target.value)}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', bgcolor: 'rgba(0,0,0,0.01)' } }}
                    />
                  </Grid>
                  
                  <Grid item xs={6} md={2}>
                    <TextField 
                      fullWidth 
                      label="Quantity" 
                      value={item.quantity} 
                      onChange={e => handleItemChange(index, 'quantity', e.target.value)}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', bgcolor: 'rgba(0,0,0,0.01)' } }}
                    />
                  </Grid>

                  <Grid item xs={6} md={8} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    {item.imagePreview ? (
                      <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 1 }}>
                        <img src={item.imagePreview} alt="Preview" style={{ height: '44px', width: '44px', objectFit: 'cover', borderRadius: '8px' }} />
                        <Typography variant="caption" sx={{ color: 'var(--green)', fontWeight: 700 }}>Image Ready</Typography>
                        <Tooltip title="Remove Image">
                          <IconButton size="small" onClick={() => removeItemImage(index)} sx={{ color: 'var(--pink)' }}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    ) : (
                      <Button 
                        variant="outlined" 
                        component="label" 
                        size="small" 
                        startIcon={<PhotoCamera />}
                        sx={{ borderRadius: '10px', textTransform: 'none', borderColor: 'divider', color: 'var(--gray)', '&:hover': { bgcolor: 'rgba(0,0,0,0.02)' } }}
                      >
                        Add Photo
                        <input type="file" accept="image/*" hidden onChange={(e) => handleItemImageChange(index, e)} />
                      </Button>
                    )}
                  </Grid>

                  <Grid item xs={12} md={2} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                     {items.length > 1 && (
                       <Tooltip title="Remove item">
                         <IconButton onClick={() => removeItem(index)} sx={{ color: 'var(--pink)', bgcolor: 'rgba(200, 75, 143, 0.05)', '&:hover': { bgcolor: 'rgba(200, 75, 143, 0.1)' } }}>
                           <DeleteIcon />
                         </IconButton>
                       </Tooltip>
                     )}
                  </Grid>
                </Grid>
              </Box>
            ))}
            
            <Button 
              startIcon={<AddCircleOutlineIcon />} 
              onClick={addItem} 
              sx={{ 
                mt: 1, 
                color: 'var(--black)', 
                fontWeight: 800, 
                fontSize: '13px', 
                textTransform: 'none',
                bgcolor: 'rgba(0,0,0,0.03)',
                px: 3,
                borderRadius: '12px',
                '&:hover': { bgcolor: 'rgba(0,0,0,0.06)' }
              }}
            >
              Add Another Item
            </Button>
          </Box>
        ) : (
          <Box 
            component={motion.div}
            key="file"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            sx={{ textAlign: 'center', p: 8, border: '2px dashed #E0E0E0', borderRadius: '32px', bgcolor: 'rgba(0,0,0,0.01)', transition: 'all 0.3s' }}
            className="hover-lift"
          >
            <div style={{ width: 80, height: 80, background: 'var(--green-pale)', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <FileUploadIcon sx={{ fontSize: 40, color: 'var(--green)' }} />
            </div>
            <Typography variant="h6" className="fraunces" sx={{ mb: 1, fontWeight: 900 }}>Drop your file here</Typography>
            <Typography variant="body2" sx={{ color: 'var(--gray)', mb: 4, maxWidth: '280px', mx: 'auto' }}>
              Upload any list or spreadsheet. We'll extract the details for you.
            </Typography>
            <Button 
              variant="contained" 
              component="label"
              sx={{ 
                borderRadius: '14px', 
                bgcolor: 'var(--black)', 
                px: 4, 
                py: 1.5,
                fontWeight: 700,
                boxShadow: '0 8px 24px rgba(0,0,0,0.1)'
              }}
            >
              Select File
              <input type="file" hidden onChange={handleListFileChange} />
            </Button>
            {listUploadFile && (
              <Box sx={{ mt: 3, p: 2, bgcolor: 'white', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', gap: 1, border: '1px solid var(--green-pale)' }}>
                <CheckCircleOutlineIcon sx={{ color: 'var(--green)', fontSize: 18 }} />
                <Typography sx={{ fontSize: '12px', fontWeight: 800 }}>{listUploadFile.name}</Typography>
              </Box>
            )}
          </Box>
        )}
      </AnimatePresence>
      
      {/* Notes & Submit */}
      <Box sx={{ mt: 6 }}>
        <Typography variant="subtitle1" className="fraunces" sx={{ mb: 2, fontWeight: 900, fontSize: '18px' }}>
          Additional Notes
        </Typography>
        <TextField 
            fullWidth 
            multiline 
            rows={4} 
            placeholder="Specify any preferences or target brands here..."
            variant="outlined" 
            value={notes} 
            onChange={(e) => setNotes(e.target.value)} 
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '20px', bgcolor: 'white', border: '1px solid #f1f3f5' } }}
        />
        
        {error && <Alert severity="error" sx={{ mt: 3, borderRadius: '12px' }}>{error}</Alert>}

        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
          <Button 
            variant="contained" 
            className="upgrade-button-premium"
            onClick={handleSubmit} 
            disabled={!isFormValid || !userId || submissionStatus === 'submitting'}
            sx={{ width: '100%', maxWidth: '400px', height: '60px', fontSize: '16px' }}
          >
            {submissionStatus === 'submitting' ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Submit Restock Request'}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};
export default MedicineRestock;
