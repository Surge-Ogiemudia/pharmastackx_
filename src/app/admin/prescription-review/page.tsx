'use client';

import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  IconButton,
  Chip,
  Modal,
} from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';
import Navbar from '../../../components/Navbar'; // Assuming a generic Navbar exists

// Define the structure of a prescription object
interface Prescription {
  id: number;
  fileName: string;
  imageUrl: string;
  message: string;
  status: 'pending';
  timestamp: string;
}

const modalStyle = {
  position: 'absolute' as 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '80vw',
  maxWidth: '800px',
  bgcolor: 'background.paper',
  boxShadow: 24,
  p: 2,
};


const PrescriptionReviewPage = () => {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Load prescriptions from localStorage on component mount
  useEffect(() => {
    const storedPrescriptions = localStorage.getItem('prescriptions');
    if (storedPrescriptions) {
      const parsedPrescriptions: Prescription[] = JSON.parse(storedPrescriptions);
      // Sort by newest first
      parsedPrescriptions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setPrescriptions(parsedPrescriptions);
    }
  }, []);

  const handleDelete = (id: number) => {
    const updatedPrescriptions = prescriptions.filter(p => p.id !== id);
    setPrescriptions(updatedPrescriptions);
    localStorage.setItem('prescriptions', JSON.stringify(updatedPrescriptions));
  };
  
  const handleOpenModal = (imageUrl: string) => {
    setSelectedImage(imageUrl);
  };
  
  const handleCloseModal = () => {
    setSelectedImage(null);
  };

  return (
    <>
      <Navbar />
      <Box sx={{ bgcolor: '#f8f9fa', py: 2, mb: 3 }}>
        <Container maxWidth="lg">
          <Paper elevation={3} sx={{ px: 3, py: 2, borderRadius: '12px', background: 'linear-gradient(135deg, #006D5B 0%, #004D40 100%)' }}>
            <Typography variant="h5" sx={{ color: '#ffffff', fontWeight: 600 }}>
              Prescription Review
            </Typography>
          </Paper>
        </Container>
      </Box>

      <Container maxWidth="lg">
        {prescriptions.length === 0 ? (
          <Paper sx={{ textAlign: 'center', p: 6, borderRadius: '16px' }}>
            <Typography variant="h6" color="text.secondary">
              No pending prescriptions for review.
            </Typography>
          </Paper>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(3, 1fr)',
              },
              gap: 3,
            }}
          >
            {prescriptions.map((p) => (
                <Card key={p.id} sx={{ borderRadius: '16px', height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardMedia
                    component="img"
                    height="200"
                    image={p.imageUrl}
                    alt={`Prescription: ${p.fileName}`}
                    sx={{ objectFit: 'contain', p: 1, cursor: 'pointer' }}
                    onClick={() => handleOpenModal(p.imageUrl)}
                  />
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography gutterBottom variant="h6" component="div" noWrap>
                      {p.fileName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Received: {new Date(p.timestamp).toLocaleString()}
                    </Typography>
                    {p.message && (
                       <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                         "{p.message}"
                       </Typography>
                    )}
                  </CardContent>
                  <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                     <Chip label={p.status} color="warning" size="small" />
                     <IconButton onClick={() => handleDelete(p.id)} color="error">
                        <DeleteIcon />
                     </IconButton>
                  </CardActions>
                </Card>
            ))}
          </Box>
        )}
      </Container>
      
      <Modal open={!!selectedImage} onClose={handleCloseModal}>
        <Box sx={modalStyle}>
          <img src={selectedImage || ''} alt="Selected Prescription" style={{ width: '100%', height: 'auto' }} />
        </Box>
      </Modal>
    </>
  );
};

export default PrescriptionReviewPage;
