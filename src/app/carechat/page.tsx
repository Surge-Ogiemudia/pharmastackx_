'use client';

import React, { useState } from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Avatar,
  Chip,
  Box,
  TextField,
  InputAdornment,
  Button,
  IconButton,
  Tooltip,
  Badge,
} from '@mui/material';
import Navbar from '../../components/Navbar';
import {
  Search as SearchIcon,
  LocalPharmacy as PharmacyIcon,
  MedicalServices as DoctorIcon,
  Psychology as PsychologyIcon,
  Favorite as CardiologyIcon,
  Visibility as OphthalmologyIcon,
  ChildCare as PediatricsIcon,
  Chat as ChatIcon,
  Verified as VerifiedIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  LocationOn as LocationIcon,
} from '@mui/icons-material';

interface HealthProfessional {
  id: string;
  name: string;
  profession: string;
  specialization: string;
  keyInterests: string[];
  business: string;
  licenseNumber: string;
  languages: string[];
  avatar: string;
  isOnline: boolean;
  rating: number;
  consultationFee: number;
  location: string;
  phone: string;
  email: string;
  yearsExperience: number;
}

const healthProfessionals: HealthProfessional[] = [
  {
    id: '1',
    name: 'Dr. Adaora Okafor',
    profession: 'Pharmacist',
    specialization: 'Clinical Pharmacy',
    keyInterests: ['Drug Interactions', 'Medication Therapy', 'Patient Counseling'],
    business: 'HealthPlus Pharmacy',
    licenseNumber: 'PCN/001/2019',
    languages: ['English', 'Igbo', 'Yoruba'],
    avatar: '/api/placeholder/100/100',
    isOnline: true,
    rating: 4.8,
    consultationFee: 2500,
    location: 'Lagos, Nigeria',
    phone: '+234 801 234 5678',
    email: 'adaora.okafor@healthplus.ng',
    yearsExperience: 8
  },
  {
    id: '2',
    name: 'Dr. Ibrahim Musa',
    profession: 'General Practitioner',
    specialization: 'Family Medicine',
    keyInterests: ['Preventive Care', 'Chronic Disease Management', 'Health Education'],
    business: 'MedCare Clinic',
    licenseNumber: 'MDCN/002/2017',
    languages: ['English', 'Hausa', 'Arabic'],
    avatar: '/api/placeholder/100/100',
    isOnline: false,
    rating: 4.9,
    consultationFee: 5000,
    location: 'Abuja, Nigeria',
    phone: '+234 802 345 6789',
    email: 'ibrahim.musa@medcare.ng',
    yearsExperience: 12
  },
  {
    id: '3',
    name: 'Dr. Fatima Abubakar',
    profession: 'Cardiologist',
    specialization: 'Interventional Cardiology',
    keyInterests: ['Heart Disease', 'Hypertension', 'Cardiac Surgery'],
    business: 'CardioMax Hospital',
    licenseNumber: 'MDCN/003/2015',
    languages: ['English', 'Hausa', 'French'],
    avatar: '/api/placeholder/100/100',
    isOnline: true,
    rating: 4.7,
    consultationFee: 8000,
    location: 'Kano, Nigeria',
    phone: '+234 803 456 7890',
    email: 'fatima.abubakar@cardiomax.ng',
    yearsExperience: 15
  },
  {
    id: '4',
    name: 'Dr. Chioma Eze',
    profession: 'Pediatrician',
    specialization: 'Child Health',
    keyInterests: ['Child Development', 'Vaccination', 'Pediatric Nutrition'],
    business: 'KidsHealth Clinic',
    licenseNumber: 'MDCN/004/2018',
    languages: ['English', 'Igbo'],
    avatar: '/api/placeholder/100/100',
    isOnline: true,
    rating: 4.9,
    consultationFee: 6000,
    location: 'Port Harcourt, Nigeria',
    phone: '+234 804 567 8901',
    email: 'chioma.eze@kidshealth.ng',
    yearsExperience: 10
  },
  {
    id: '5',
    name: 'Dr. Olumide Adebayo',
    profession: 'Pharmacist',
    specialization: 'Industrial Pharmacy',
    keyInterests: ['Drug Manufacturing', 'Quality Control', 'Regulatory Affairs'],
    business: 'PharmaTech Solutions',
    licenseNumber: 'PCN/005/2016',
    languages: ['English', 'Yoruba'],
    avatar: '/api/placeholder/100/100',
    isOnline: false,
    rating: 4.6,
    consultationFee: 3000,
    location: 'Ibadan, Nigeria',
    phone: '+234 805 678 9012',
    email: 'olumide.adebayo@pharmatech.ng',
    yearsExperience: 11
  },
  {
    id: '6',
    name: 'Dr. Amina Hassan',
    profession: 'Psychiatrist',
    specialization: 'Mental Health',
    keyInterests: ['Depression', 'Anxiety', 'PTSD Treatment'],
    business: 'MindCare Center',
    licenseNumber: 'MDCN/006/2019',
    languages: ['English', 'Hausa', 'Arabic'],
    avatar: '/api/placeholder/100/100',
    isOnline: true,
    rating: 4.8,
    consultationFee: 7000,
    location: 'Kaduna, Nigeria',
    phone: '+234 806 789 0123',
    email: 'amina.hassan@mindcare.ng',
    yearsExperience: 9
  }
];

const getProfessionIcon = (profession: string) => {
  switch (profession.toLowerCase()) {
    case 'pharmacist':
      return <PharmacyIcon />;
    case 'general practitioner':
    case 'doctor':
      return <DoctorIcon />;
    case 'psychiatrist':
      return <PsychologyIcon />;
    case 'cardiologist':
      return <CardiologyIcon />;
    case 'ophthalmologist':
      return <OphthalmologyIcon />;
    case 'pediatrician':
      return <PediatricsIcon />;
    default:
      return <DoctorIcon />;
  }
};

export default function CareChat() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProfession, setSelectedProfession] = useState('');

  const filteredProfessionals = healthProfessionals.filter(professional => {
    const matchesSearch = professional.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         professional.profession.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         professional.specialization.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         professional.keyInterests.some(interest => 
                           interest.toLowerCase().includes(searchTerm.toLowerCase())
                         );
    
    const matchesProfession = selectedProfession === '' || 
                            professional.profession.toLowerCase().includes(selectedProfession.toLowerCase());
    
    return matchesSearch && matchesProfession;
  });

  const professions = [...new Set(healthProfessionals.map(p => p.profession))];

  const handleStartChat = (professional: HealthProfessional) => {
    // Later integrate with actual chat system
    console.log('Starting chat with:', professional.name);
  };

  return (
    <>
      <Navbar />
      <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography 
          variant="h3" 
          sx={{ 
            fontWeight: 'bold',
            background: 'linear-gradient(45deg, #1B5E20, #E91E63)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            mb: 2
          }}
        >
          CareChat
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>
          Connect with verified health professionals for prescription verification, 
          medical advice, and personalized healthcare guidance
        </Typography>

        {/* Search and Filter */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
          <TextField
            placeholder="Search professionals, specializations, or interests..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="primary" />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 300 }}
          />
          
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }}>
            <Chip
              label="All"
              onClick={() => setSelectedProfession('')}
              color={selectedProfession === '' ? 'primary' : 'default'}
              variant={selectedProfession === '' ? 'filled' : 'outlined'}
            />
            {professions.map((profession) => (
              <Chip
                key={profession}
                label={profession}
                onClick={() => setSelectedProfession(profession)}
                color={selectedProfession === profession ? 'primary' : 'default'}
                variant={selectedProfession === profession ? 'filled' : 'outlined'}
              />
            ))}
          </Box>
        </Box>
      </Box>

      {/* Professionals Grid */}
      <Box 
        sx={{ 
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(2, 1fr)',
            sm: 'repeat(3, 1fr)',
            md: 'repeat(4, 1fr)',
            lg: 'repeat(5, 1fr)'
          },
          gap: 2,
          alignItems: 'stretch'
        }}
      >
        {filteredProfessionals.map((professional) => (
          <Card 
            key={professional.id}
            sx={{ 
              height: 320, // Even more compact
              display: 'flex',
              flexDirection: 'column',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: 6,
              },
              position: 'relative',
              overflow: 'hidden'
            }}
          >
              {/* Online Status Badge */}
              {professional.isOnline && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: -8,
                    right: -8,
                    zIndex: 1
                  }}
                >
                  <Badge
                    color="success"
                    variant="dot"
                    sx={{
                      '& .MuiBadge-badge': {
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        border: '3px solid white'
                      }
                    }}
                  />
                </Box>
              )}

            <CardContent sx={{ 
              p: 1.2, 
              display: 'flex', 
              flexDirection: 'column',
              height: '100%',
              gap: 0.8
            }}>
              {/* Header with Avatar and Basic Info */}
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar
                  src={professional.avatar}
                  sx={{ 
                    width: 36, 
                    height: 36, 
                    mr: 0.8,
                    border: professional.isOnline ? '2px solid #4caf50' : '2px solid #e0e0e0'
                  }}
                >
                  {professional.name.split(' ').map(n => n[0]).join('')}
                </Avatar>
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography variant="h6" sx={{ 
                    fontWeight: 'bold', 
                    fontSize: '0.8rem',
                    lineHeight: 1,
                    mb: 0.2,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {professional.name}
                    <Tooltip title="Verified Professional">
                      <VerifiedIcon 
                        color="primary" 
                        sx={{ ml: 0.3, fontSize: 12 }} 
                      />
                    </Tooltip>
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.2 }}>
                    <Box sx={{ fontSize: 12, display: 'flex', alignItems: 'center' }}>
                      {getProfessionIcon(professional.profession)}
                    </Box>
                    <Typography variant="body2" color="primary" sx={{ 
                      fontWeight: 'medium', 
                      fontSize: '0.65rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {professional.profession}
                    </Typography>
                  </Box>
                </Box>
              </Box>              {/* Specialization */}
              <Typography variant="body2" color="text.secondary" sx={{ 
                fontSize: '0.65rem', 
                lineHeight: 1.2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                <strong>Specialization:</strong> {professional.specialization}
              </Typography>

              {/* Key Interests */}
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ 
                  mb: 0.3, 
                  fontSize: '0.65rem',
                  lineHeight: 1.2
                }}>
                  <strong>Key Interests:</strong>
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.2 }}>
                  {professional.keyInterests.slice(0, 2).map((interest, index) => (
                    <Chip
                      key={index}
                      label={interest}
                      size="small"
                      color="secondary"
                      variant="outlined"
                      sx={{ fontSize: '0.55rem', height: 16, '& .MuiChip-label': { px: 0.5 } }}
                    />
                  ))}
                  {professional.keyInterests.length > 2 && (
                    <Chip
                      label={`+${professional.keyInterests.length - 2}`}
                      size="small"
                      color="secondary"
                      variant="outlined"
                      sx={{ fontSize: '0.55rem', height: 16, '& .MuiChip-label': { px: 0.5 } }}
                    />
                  )}
                </Box>
              </Box>

              {/* Business */}
              <Typography variant="body2" color="text.secondary" sx={{ 
                fontSize: '0.65rem',
                lineHeight: 1.2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {professional.business}
              </Typography>

              {/* License Number */}
              <Typography variant="body2" color="text.secondary" sx={{ 
                fontSize: '0.65rem',
                lineHeight: 1.2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                <strong>License:</strong> {professional.licenseNumber}
              </Typography>

              {/* Languages */}
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ 
                  mb: 0.3, 
                  fontSize: '0.65rem',
                  lineHeight: 1.2
                }}>
                  <strong>Languages:</strong>
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.2 }}>
                  {professional.languages.slice(0, 3).map((language, index) => (
                    <Chip
                      key={index}
                      label={language}
                      size="small"
                      color="primary"
                      variant="filled"
                      sx={{ fontSize: '0.55rem', height: 16, '& .MuiChip-label': { px: 0.5 } }}
                    />
                  ))}
                </Box>
              </Box>

              {/* Contact Info */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                <LocationIcon sx={{ fontSize: 12 }} color="action" />
                <Typography variant="body2" color="text.secondary" sx={{ 
                  fontSize: '0.6rem',
                  lineHeight: 1.2,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {professional.location}
                </Typography>
              </Box>

              {/* Action Buttons - Fixed at Bottom */}
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 'auto' }}>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<ChatIcon sx={{ fontSize: 8 }} />}
                  onClick={() => handleStartChat(professional)}
                  disabled={!professional.isOnline}
                  sx={{
                    background: professional.isOnline 
                      ? 'linear-gradient(45deg, #1B5E20, #E91E63)'
                      : undefined,
                    fontSize: '0.5rem',
                    height: 20,
                    minHeight: 20,
                    width: '60%',
                    px: 1
                  }}
                >
                  {professional.isOnline ? 'Contact' : 'Offline'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>

      {filteredProfessionals.length === 0 && (
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Typography variant="h6" color="text.secondary">
            No health professionals found matching your criteria
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Try adjusting your search or filter options
          </Typography>
        </Box>
      )}
    </Container>
    </>
  );
}