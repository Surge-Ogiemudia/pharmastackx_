'use client';

import { useState, useRef } from 'react';
import {
  Box,
  TextField,
  Button,
  IconButton,
  Typography,
  Card,
  CardMedia,
} from '@mui/material';
import { AddAPhoto as AddPhotoIcon, Clear as ClearIcon } from '@mui/icons-material';

interface OtherInfoInputProps {
  notes: string;
  image: string | null;
  onNotesChange: (notes: string) => void;
  onImageChange: (image: string | null) => void;
}

export default function OtherInfoInput({ notes, image, onNotesChange, onImageChange }: OtherInfoInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onImageChange(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    onImageChange(null);
    if (fileInputRef.current) {
        fileInputRef.current.value = ''; // Reset file input
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <Box sx={{ mt: 2, p: 2, border: '1px dashed grey', borderRadius: '12px' }}>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
        Add notes about active ingredients, brands, or upload a picture of the medicine.
      </Typography>
      <TextField
        fullWidth
        multiline
        rows={3}
        label="Notes (e.g., 'Brand: Panadol', 'Active Ingredient: Paracetamol')"
        value={notes}
        onChange={(e) => onNotesChange(e.target.value)}
        variant="outlined"
        sx={{ mb: 2 }}
      />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button
          variant="outlined"
          startIcon={<AddPhotoIcon />}
          onClick={triggerFileInput}
        >
          {image ? 'Change Image' : 'Upload Image'}
        </Button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageUpload}
          accept="image/*"
          hidden
        />
        {image && (
          <Box sx={{ position: 'relative' }}>
            <Card sx={{ width: 80, height: 80 }}>
              <CardMedia
                component="img"
                image={image}
                alt="Medicine Preview"
                sx={{ objectFit: 'cover', width: '100%', height: '100%' }}
              />
            </Card>
            <IconButton
              size="small"
              onClick={handleRemoveImage}
              sx={{
                position: 'absolute',
                top: -10,
                right: -10,
                bgcolor: 'background.paper',
                '&:hover': { bgcolor: 'grey.300' },
              }}
            >
              <ClearIcon fontSize="small" />
            </IconButton>
          </Box>
        )}
      </Box>
    </Box>
  );
}
