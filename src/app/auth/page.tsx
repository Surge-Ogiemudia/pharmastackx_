'use client';

import React, { useState, useEffect } from 'react';
import { Box, Typography, Container, InputBase, NativeSelect, CircularProgress, Alert } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SearchIcon from '@mui/icons-material/Search';
import axios from 'axios';
import { useSession } from '@/context/SessionProvider';
import BottomNav from '@/components/BottomNav';

const nigerianStates = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT - Abuja", "Gombe",
  "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos",
  "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto",
  "Taraba", "Yobe", "Zamfara"
];

export default function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshSession } = useSession();
  
  // State machine for onboarding flow
  const initialStep = (searchParams?.get('mode') === 'login' ? 'sign-in' : 'role') as 'role' | 'patient-signup' | 'pharmacist-signup' | 'pharmacy-owner-signup' | 'clinic-signup' | 'sign-in';
  const [step, setStep] = useState(initialStep);
  const [showPassword, setShowPassword] = useState(false);

  // Unified Form State
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    phoneNumber: '',
    licenseNumber: '',
    state: '',
    city: '',
    businessName: '',
    businessAddress: '',
    pharmacy: '',
    mobile: '' // For pharmacists
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await axios.post('/api/auth/login', { 
        email: formData.email, 
        password: formData.password 
      });
      setSuccess('Login successful! Redirecting...');
      await refreshSession();
      
      const requestId = searchParams?.get('requestId');
      const view = searchParams?.get('view');
      let redirectUrl = '/';
      const params = new URLSearchParams();
      if (requestId) params.append('requestId', requestId);
      if (view) params.append('view', view);
      const queryString = params.toString();
      if (queryString) redirectUrl += '?' + queryString;
      
      window.location.href = redirectUrl;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent, role: string) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      let payload: any = { 
        username: formData.username, 
        email: formData.email, 
        password: formData.password, 
        role 
      };

      if (role === 'pharmacist') {
        payload = { 
          ...payload, 
          mobile: formData.phoneNumber, 
          licenseNumber: formData.licenseNumber, 
          stateOfPractice: formData.state, 
          pharmacy: formData.pharmacy 
        };
      } else if (role === 'pharmacy' || role === 'clinic') {
        payload = { 
          ...payload, 
          businessName: formData.businessName, 
          state: formData.state, 
          city: formData.city, 
          businessAddress: formData.businessAddress, 
          phoneNumber: formData.phoneNumber, 
          license: formData.licenseNumber 
        };
      }

      await axios.post('/api/auth/signup', payload);
      await axios.post('/api/auth/login', { email: formData.email, password: formData.password });
      
      setSuccess('Signup successful! Redirecting...');
      await refreshSession();

      const requestId = searchParams?.get('requestId');
      const view = searchParams?.get('view');
      let redirectUrl = '/';
      const params = new URLSearchParams();
      if (requestId) params.append('requestId', requestId);
      if (view) params.append('view', view);
      const queryString = params.toString();
      if (queryString) redirectUrl += '?' + queryString;

      window.location.href = redirectUrl;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Signup failed. Please try again.');
      setLoading(false);
    }
  };

  // States for pharmacist search removed

  const inputSx = {
    width: '100%',
    bgcolor: 'rgba(255,255,255,0.85)',
    border: '1px solid #ebebeb',
    borderRadius: '13px',
    px: 2,
    py: 1.5,
    fontSize: 13,
    color: '#111',
    fontFamily: 'var(--font-dm-sans), sans-serif',
    transition: 'all 0.2s',
    '&.Mui-focused': {
      borderColor: '#0F6E56',
      boxShadow: '0 0 0 3px rgba(15,110,86,0.06)',
      bgcolor: '#fff'
    }
  };

  const inputPinkSx = {
    ...inputSx,
    '&.Mui-focused': {
      borderColor: '#C84B8F',
      boxShadow: '0 0 0 3px rgba(200,75,143,0.06)',
      bgcolor: '#fff'
    }
  };

  const inputAmberSx = {
    ...inputSx,
    '&.Mui-focused': {
      borderColor: '#BA7517',
      boxShadow: '0 0 0 3px rgba(186,117,23,0.06)',
      bgcolor: '#fff'
    }
  };

  const labelSx = {
    fontSize: 10,
    color: '#bbb',
    letterSpacing: '1px',
    textTransform: 'uppercase',
    fontWeight: 500,
    display: 'block',
    mb: '6px'
  };

  const renderSectionDivider = (text: string) => (
    <Box component={motion.div} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} sx={{ mt: 3, mb: 2, px: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <Box sx={{ flex: 1, height: '1px', bgcolor: 'rgba(0,0,0,0.06)' }} />
      <Typography sx={{ fontSize: 9, color: '#ccc', letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: 500, whiteSpace: 'nowrap' }}>{text}</Typography>
      <Box sx={{ flex: 1, height: '1px', bgcolor: 'rgba(0,0,0,0.06)' }} />
    </Box>
  );

  const renderRoleSelection = () => (
    <motion.div
      key="role-selection"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      style={{ display: 'flex', flexDirection: 'column', flex: 1 }}
    >
        {/* Back Button */}
        <Box 
          component={motion.div} 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }} 
          sx={{ display: 'flex', alignItems: 'center', gap: 1, p: '12px 24px 16px', cursor: 'pointer', mt: { xs: 0, sm: 2 } }}
          onClick={() => router.push('/')}
        >
          <Box sx={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid #e8e8e8', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(255,255,255,0.8)', color: '#888' }}>
            <ArrowBackIcon sx={{ fontSize: 16 }} />
          </Box>
          <Typography sx={{ fontSize: 12, color: '#888', fontWeight: 500 }}>Back to home</Typography>
        </Box>

        {/* Hero */}
        <Box sx={{ p: '8px 24px 16px' }}>
          <Typography 
            component={motion.h1} 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.1 }}
            sx={{ fontFamily: 'var(--font-fraunces), serif', fontSize: { xs: 28, sm: 32 }, fontWeight: 900, color: '#111', lineHeight: 1.1, letterSpacing: '-1.2px', mb: 1 }}
          >
            I am a...
          </Typography>
          <Typography 
            component={motion.p} 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.2 }}
            sx={{ fontSize: 13, color: '#888', fontWeight: 300, lineHeight: 1.65 }}
          >
            Tell us who you are so we can set up the right experience for you.
          </Typography>
        </Box>

        {/* Choices */}
        <Box sx={{ p: '8px 24px 0', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* Patient Card */}
          <Box 
            component={motion.div} 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            transition={{ delay: 0.2 }}
            sx={{ 
              bgcolor: 'rgba(255,255,255,0.85)', border: '1.5px solid #ebebeb', borderRadius: '20px', p: '22px', 
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2, backdropFilter: 'blur(4px)',
              transition: 'all 0.25s ease',
              '&:hover': { borderColor: '#0F6E56', bgcolor: '#fff', transform: 'translateY(-2px)', boxShadow: '0 8px 32px rgba(15,110,86,0.08)' },
              '&:hover .arrow': { color: '#0F6E56', transform: 'translateX(3px)' }
            }}
            onClick={() => setStep('patient-signup')}
          >
            <Box sx={{ width: 52, height: 52, borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, bgcolor: '#E1F5EE' }}>
              <Box sx={{ width: 22, height: 22, borderRadius: '50%', border: '2.5px solid #0F6E56' }} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontFamily: 'var(--font-sora), sans-serif', fontSize: 15, fontWeight: 700, color: '#111', letterSpacing: '-0.4px', mb: 0.5 }}>Patient</Typography>
              <Typography sx={{ fontSize: 11, color: '#888', lineHeight: 1.55, fontWeight: 300 }}>I want to find medicines near me and connect with pharmacists.</Typography>
            </Box>
            <KeyboardArrowRightIcon className="arrow" sx={{ color: '#ddd', transition: 'all 0.2s', fontSize: 20 }} />
          </Box>

          {/* Pharmacist Card */}
          <Box 
            component={motion.div} 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            transition={{ delay: 0.3 }}
            sx={{ 
              bgcolor: 'rgba(255,255,255,0.85)', border: '1.5px solid #ebebeb', borderRadius: '20px', p: '22px', 
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2, backdropFilter: 'blur(4px)',
              transition: 'all 0.25s ease',
              '&:hover': { borderColor: '#C84B8F', bgcolor: '#fff', transform: 'translateY(-2px)', boxShadow: '0 8px 32px rgba(200,75,143,0.08)' },
              '&:hover .arrow': { color: '#C84B8F', transform: 'translateX(3px)' }
            }}
            onClick={() => setStep('pharmacist-signup')}
          >
            <Box sx={{ width: 52, height: 52, borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, bgcolor: '#fdf0f6' }}>
              <Box sx={{ width: 22, height: 22, borderRadius: '50%', border: '2.5px solid #C84B8F' }} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontFamily: 'var(--font-sora), sans-serif', fontSize: 15, fontWeight: 700, color: '#111', letterSpacing: '-0.4px', mb: 0.5 }}>Pharmacist</Typography>
              <Typography sx={{ fontSize: 11, color: '#888', lineHeight: 1.55, fontWeight: 300 }}>I want to receive medicine requests and serve patients near me.</Typography>
            </Box>
            <KeyboardArrowRightIcon className="arrow" sx={{ color: '#ddd', transition: 'all 0.2s', fontSize: 20 }} />
          </Box>

        </Box>

        {/* Provider Types */}
        <Box 
          component={motion.div} 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.4 }}
          sx={{ p: '20px 24px 0' }}
        >
          <Typography sx={{ fontSize: 10, color: '#bbb', letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: 500, mb: 1.5 }}>Also joining as</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
            {[
              { label: 'Pharmacy Owner', step: 'pharmacy-owner-signup' },
              { label: 'Clinic', step: 'clinic-signup' }
            ].map((item) => (
              <Box 
                key={item.label}
                onClick={() => item.step && setStep(item.step as any)}
                sx={{ 
                  bgcolor: 'rgba(255,255,255,0.8)', border: '1px solid #ebebeb', borderRadius: '10px', p: '10px 12px', 
                  fontSize: 11, color: '#888', fontWeight: 400, textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s',
                  '&:hover': { borderColor: item.label === 'Clinic' ? '#BA7517' : '#0F6E56', color: item.label === 'Clinic' ? '#BA7517' : '#0F6E56', bgcolor: '#fff' }
                }}
              >
                {item.label}
              </Box>
            ))}
          </Box>
        </Box>

        {/* Sign In Link */}
        <Box 
          component={motion.div} 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.4 }}
          sx={{ p: '24px 24px 24px', textAlign: 'center' }}
        >
          <Typography sx={{ fontSize: 12, color: '#bbb' }}>
            Already have an account? <span onClick={() => setStep('sign-in')} style={{ color: '#0F6E56', fontWeight: 500, cursor: 'pointer' }}>Sign in</span>
          </Typography>
        </Box>
    </motion.div>
  );

  const renderPatientSignup = () => (
    <motion.div
      key="patient-signup"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      style={{ display: 'flex', flexDirection: 'column', flex: 1 }}
    >
        {/* Back Button */}
        <Box 
          component={motion.div} 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }} 
          sx={{ display: 'flex', alignItems: 'center', gap: 1, p: '12px 24px 16px', cursor: 'pointer', mt: { xs: 0, sm: 2 } }}
          onClick={() => setStep('role')}
        >
          <Box sx={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid #e8e8e8', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(255,255,255,0.8)', color: '#888' }}>
            <ArrowBackIcon sx={{ fontSize: 16 }} />
          </Box>
          <Typography sx={{ fontSize: 12, color: '#888', fontWeight: 500 }}>I am a...</Typography>
        </Box>

        {/* Progress Bar */}
        <Box component={motion.div} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} sx={{ mx: 3, mb: 2.5 }}>
            <Box sx={{ bgcolor: '#ebebeb', borderRadius: 100, height: 3 }}>
                <Box sx={{ width: '50%', height: 3, bgcolor: '#0F6E56', borderRadius: 100, transition: 'width 0.4s ease' }} />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                <Typography sx={{ fontSize: 10, color: '#0F6E56', fontWeight: 500 }}>Account details</Typography>
                <Typography sx={{ fontSize: 10, color: '#bbb', letterSpacing: '0.3px' }}>Step 1 of 2</Typography>
            </Box>
        </Box>

        {/* Hero */}
        <Box sx={{ px: 3, pb: 2 }}>
          <Box 
             component={motion.div} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
             sx={{ display: 'inline-flex', alignItems: 'center', gap: '6px', bgcolor: '#E1F5EE', border: '1px solid rgba(15,110,86,0.15)', borderRadius: 100, px: 1.5, py: 0.5, mb: 2 }}
          >
              <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: '#0F6E56' }} />
              <Typography sx={{ fontSize: 10, color: '#0F6E56', fontWeight: 500, letterSpacing: '0.2px' }}>Patient account</Typography>
          </Box>
          <Typography 
            component={motion.h1} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            sx={{ fontFamily: 'var(--font-fraunces), serif', fontSize: 28, fontWeight: 900, color: '#111', lineHeight: 1.1, letterSpacing: '-1px', mb: 1 }}
          >
            Create your<br/><em style={{ color: '#0F6E56', fontStyle: 'italic' }}>account.</em>
          </Typography>
          <Typography 
            component={motion.p} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            sx={{ fontSize: 12, color: '#888', fontWeight: 300, lineHeight: 1.65 }}
          >
            Find any medicine near you in minutes.
          </Typography>
        </Box>

        {/* Content */}
        {(error || success) && (
            <Alert 
              severity={error ? 'error' : 'success'} 
              sx={{ mx: 3, mb: 2, borderRadius: '12px', fontSize: 13 }}
            >
                {error || success}
            </Alert>
        )}

        <Box component="form" onSubmit={(e) => handleSignUp(e, 'customer')} sx={{ px: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Box component={motion.div} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <Typography sx={labelSx}>Full name</Typography>
                <InputBase 
                    placeholder="Your full name" 
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    required
                    sx={inputSx} 
                />
            </Box>

            <Box component={motion.div} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <Typography sx={labelSx}>Phone number</Typography>
                <Box sx={{ display: 'flex' }}>
                    <Box sx={{ bgcolor: 'rgba(255,255,255,0.85)', border: '1px solid #ebebeb', borderRight: 'none', borderRadius: '13px 0 0 13px', px: 2, display: 'flex', alignItems: 'center', gap: 0.5, color: '#888', fontWeight: 500, fontSize: 13 }}>
                        🇳🇬 <span style={{ fontSize: 10 }}>+234</span>
                    </Box>
                    <InputBase 
                        placeholder="800 000 0000" 
                        name="phoneNumber"
                        value={formData.phoneNumber}
                        onChange={handleInputChange}
                        type="tel" 
                        sx={{ ...inputSx, borderRadius: '0 13px 13px 0' }} 
                    />
                </Box>
            </Box>

            <Box component={motion.div} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                <Typography sx={labelSx}>Email address</Typography>
                <InputBase 
                    placeholder="you@email.com" 
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    sx={inputSx} 
                />
            </Box>

            <Box component={motion.div} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                <Typography sx={labelSx}>Password</Typography>
                <Box sx={{ position: 'relative' }}>
                    <InputBase 
                        placeholder="Create a strong password" 
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={handleInputChange}
                        required
                        sx={{ ...inputSx, pr: 5 }} 
                    />
                    <Box 
                        onClick={() => setShowPassword(!showPassword)}
                        sx={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: '#ccc', cursor: 'pointer' }}
                    >
                        <VisibilityIcon sx={{ fontSize: 16 }} />
                    </Box>
                </Box>
            </Box>

            <Box component={motion.div} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} sx={{ mt: 1 }}>
                <Box 
                    component="button" 
                    type="submit"
                    disabled={loading}
                    sx={{ width: '100%', bgcolor: '#0F6E56', color: '#fff', borderRadius: '14px', py: 2, fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-sora), sans-serif', border: 'none', cursor: 'pointer', transition: 'opacity 0.2s', '&:hover': { opacity: 0.88 }, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}
                >
                    {loading ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : 'Create account'}
                </Box>
            </Box>

            <Box component={motion.div} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} sx={{ textAlign: 'center' }}>
                <Typography sx={{ fontSize: 12, color: '#bbb' }}>
                    Already have an account? <span onClick={() => setStep('sign-in')} style={{ color: '#0F6E56', fontWeight: 500, cursor: 'pointer' }}>Sign in</span>
                </Typography>
            </Box>
        </Box>


        {/* Trust Banner */}
        <Box component={motion.div} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} sx={{ mx: 3, mt: 3, mb: 1, bgcolor: '#E1F5EE', border: '1px solid rgba(15,110,86,0.12)', borderRadius: '12px', p: 2, display: 'flex', gap: 1.5 }}>
            <Box sx={{ width: 2, bgcolor: '#0F6E56', borderRadius: 2, flexShrink: 0, opacity: 0.4 }} />
            <Typography sx={{ fontSize: 11, color: '#888', lineHeight: 1.65, fontWeight: 300 }}>
                Your data is <strong style={{ color: '#0F6E56', fontWeight: 500 }}>private and secure.</strong> We never share your personal information without your consent.
            </Typography>
        </Box>
    </motion.div>
  );

  const renderPharmacistSignup = () => (
    <motion.div
      key="pharmacist-signup"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      style={{ display: 'flex', flexDirection: 'column', flex: 1 }}
    >
        {/* Content */}
        <Box component="form" onSubmit={(e) => handleSignUp(e, 'pharmacist')}>
            {/* Back Button */}
            <Box 
              component={motion.div} 
              initial={{ opacity: 0, y: -10 }} 
              animate={{ opacity: 1, y: 0 }} 
              sx={{ display: 'flex', alignItems: 'center', gap: 1, p: '12px 24px 16px', cursor: 'pointer', mt: { xs: 0, sm: 2 } }}
              onClick={() => setStep('role')}
            >
              <Box sx={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid #e8e8e8', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(255,255,255,0.8)', color: '#888' }}>
                <ArrowBackIcon sx={{ fontSize: 16 }} />
              </Box>
              <Typography sx={{ fontSize: 12, color: '#888', fontWeight: 500 }}>I am a...</Typography>
            </Box>

            {/* Progress Bar (Pink Variant) */}
            <Box component={motion.div} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} sx={{ mx: 3, mb: 2.5 }}>
                <Box sx={{ bgcolor: '#ebebeb', borderRadius: 100, height: 3 }}>
                    <Box sx={{ width: '50%', height: 3, bgcolor: '#C84B8F', borderRadius: 100, transition: 'width 0.4s ease' }} />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                    <Typography sx={{ fontSize: 10, color: '#C84B8F', fontWeight: 500 }}>Account details</Typography>
                    <Typography sx={{ fontSize: 10, color: '#bbb', letterSpacing: '0.3px' }}>Step 1 of 2</Typography>
                </Box>
            </Box>

            {(error || success) && (
                <Alert 
                  severity={error ? 'error' : 'success'} 
                  sx={{ mx: 3, mb: 2, borderRadius: '12px', fontSize: 13 }}
                >
                    {error || success}
                </Alert>
            )}

            {renderSectionDivider('Personal info')}

            <Box sx={{ px: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box component={motion.div} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                    <Typography sx={labelSx}>Full name</Typography>
                    <InputBase 
                        placeholder="Your full name" 
                        name="username"
                        value={formData.username}
                        onChange={handleInputChange}
                        required
                        sx={inputPinkSx} 
                    />
                </Box>
                <Box component={motion.div} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                    <Typography sx={labelSx}>Phone number</Typography>
                    <Box sx={{ display: 'flex' }}>
                        <Box sx={{ bgcolor: 'rgba(255,255,255,0.85)', border: '1px solid #ebebeb', borderRight: 'none', borderRadius: '13px 0 0 13px', px: 2, display: 'flex', alignItems: 'center', gap: 0.5, color: '#888', fontWeight: 500, fontSize: 13 }}>
                            🇳🇬 <span style={{ fontSize: 10 }}>+234</span>
                        </Box>
                        <InputBase 
                            placeholder="800 000 0000" 
                            name="phoneNumber"
                            value={formData.phoneNumber}
                            onChange={handleInputChange}
                            required
                            type="tel" 
                            sx={{ ...inputPinkSx, borderRadius: '0 13px 13px 0' }} 
                        />
                    </Box>
                </Box>
                <Box component={motion.div} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                    <Typography sx={labelSx}>Email address</Typography>
                    <InputBase 
                        placeholder="you@email.com" 
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        sx={inputPinkSx} 
                    />
                </Box>
                <Box component={motion.div} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                    <Typography sx={labelSx}>Password</Typography>
                    <Box sx={{ position: 'relative' }}>
                        <InputBase 
                            placeholder="Create a strong password" 
                            name="password"
                            type={showPassword ? 'text' : 'password'}
                            value={formData.password}
                            onChange={handleInputChange}
                            required
                            sx={{ ...inputPinkSx, pr: 5 }} 
                        />
                        <Box 
                            onClick={() => setShowPassword(!showPassword)}
                            sx={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: '#ccc', cursor: 'pointer' }}
                        >
                            <VisibilityIcon sx={{ fontSize: 16 }} />
                        </Box>
                    </Box>
                </Box>
            </Box>

            {renderSectionDivider('Professional info')}

            <Box sx={{ px: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box component={motion.div} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                    <Typography sx={labelSx}>PCN Licence number</Typography>
                    <InputBase 
                        placeholder="PCN/2024/XXXXX" 
                        name="licenseNumber"
                        value={formData.licenseNumber}
                        onChange={handleInputChange}
                        sx={inputPinkSx} 
                    />
                    <Typography sx={{ fontSize: 10, color: '#ccc', mt: 0.5, fontWeight: 300 }}>Optional but speeds up verification</Typography>
                </Box>
                <Box component={motion.div} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                    <Typography sx={labelSx}>State of practice</Typography>
                    <NativeSelect 
                        disableUnderline 
                        name="state"
                        value={formData.state}
                        onChange={handleSelectChange}
                        sx={inputPinkSx} 
                        defaultValue=""
                    >
                        <option value="" disabled>Select your state</option>
                        {nigerianStates.map(state => (
                            <option key={state} value={state}>{state}</option>
                        ))}
                    </NativeSelect>
                </Box>
                <Box component={motion.div} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                    <Typography sx={labelSx}>City / Area of practice</Typography>
                    <InputBase 
                        placeholder="e.g. GRA Benin City" 
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        sx={inputPinkSx} 
                    />
                </Box>
            </Box>

            {renderSectionDivider('Your workplace')}

            <Box sx={{ px: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box component={motion.div} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
                    <Typography sx={labelSx}>Place of Work</Typography>
                    <InputBase 
                        placeholder="e.g. General Hospital" 
                        name="pharmacy"
                        value={formData.pharmacy}
                        onChange={handleInputChange}
                        required
                        sx={inputPinkSx} 
                    />
                </Box>
            </Box>

            {renderSectionDivider('Notifications')}

            <Box sx={{ px: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box component={motion.div} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
                    <Typography sx={labelSx}>WhatsApp number for alerts</Typography>
                    <Box sx={{ position: 'relative', display: 'flex' }}>
                        <Box sx={{ bgcolor: 'rgba(255,255,255,0.85)', border: '1px solid #ebebeb', borderRight: 'none', borderRadius: '13px 0 0 13px', px: 2, display: 'flex', alignItems: 'center', gap: 0.5, color: '#888', fontWeight: 500, fontSize: 13 }}>
                            🇳🇬 <span style={{ fontSize: 10 }}>+234</span>
                        </Box>
                        <InputBase 
                            name="phoneNumber"
                            value={formData.phoneNumber}
                            onChange={handleInputChange}
                            placeholder="800 000 0000" 
                            type="tel" 
                            sx={{ ...inputPinkSx, borderRadius: '0 13px 13px 0', pr: '44px' }} 
                        />
                        <Box sx={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', bgcolor: '#25D366', color: '#fff', fontSize: 9, fontWeight: 600, borderRadius: 100, px: 1, py: 0.3, letterSpacing: '0.2px' }}>
                            WA
                        </Box>
                    </Box>
                </Box>

                <Box component={motion.div} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} sx={{ mt: 1 }}>
                    <Box 
                        component="button" 
                        type="submit"
                        disabled={loading}
                        sx={{ width: '100%', bgcolor: '#C84B8F', color: '#fff', borderRadius: '14px', py: 2, fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-sora), sans-serif', border: 'none', cursor: 'pointer', transition: 'opacity 0.2s', '&:hover': { opacity: 0.88 }, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}
                    >
                        {loading ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : 'Create pharmacist account'}
                    </Box>
                </Box>

                <Box component={motion.div} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} sx={{ textAlign: 'center', mt: 1 }}>
                    <Typography sx={{ fontSize: 12, color: '#bbb' }}>
                        Already have an account? <span onClick={() => setStep('sign-in')} style={{ color: '#0F6E56', fontWeight: 500, cursor: 'pointer' }}>Sign in</span>
                    </Typography>
                </Box>
            </Box>
        </Box>

        <Box component={motion.div} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }} sx={{ mx: 3, mt: 3, mb: 1, bgcolor: '#E1F5EE', border: '1px solid rgba(15,110,86,0.12)', borderRadius: '12px', p: 2, display: 'flex', gap: 1.5 }}>
            <Box sx={{ width: 2, bgcolor: '#0F6E56', borderRadius: 2, flexShrink: 0, opacity: 0.4 }} />
            <Typography sx={{ fontSize: 11, color: '#888', lineHeight: 1.65, fontWeight: 300 }}>
                Your PCN licence and personal data are <strong style={{ color: '#0F6E56', fontWeight: 500 }}>securely stored.</strong> We comply with Nigerian data protection regulations.
            </Typography>
        </Box>
    </motion.div>
  );

  const renderPharmacyOwnerSignup = () => (
    <motion.div
      key="pharmacy-owner-signup"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      style={{ display: 'flex', flexDirection: 'column', flex: 1 }}
    >
        {/* Back Button */}
        <Box 
          component={motion.div} 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }} 
          sx={{ display: 'flex', alignItems: 'center', gap: 1, p: '12px 24px 16px', cursor: 'pointer', mt: { xs: 0, sm: 2 } }}
          onClick={() => setStep('role')}
        >
          <Box sx={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid #e8e8e8', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(255,255,255,0.8)', color: '#888' }}>
            <ArrowBackIcon sx={{ fontSize: 16 }} />
          </Box>
          <Typography sx={{ fontSize: 12, color: '#888', fontWeight: 500 }}>I am a...</Typography>
        </Box>

        {/* Progress Bar (Owner) */}
        <Box component={motion.div} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} sx={{ mx: 3, mb: 2.5 }}>
            <Box sx={{ bgcolor: '#ebebeb', borderRadius: 100, height: 3 }}>
                <Box sx={{ width: '50%', height: 3, bgcolor: '#0F6E56', borderRadius: 100, transition: 'width 0.4s ease' }} />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                <Typography sx={{ fontSize: 10, color: '#0F6E56', fontWeight: 500 }}>Business details</Typography>
                <Typography sx={{ fontSize: 10, color: '#bbb', letterSpacing: '0.3px' }}>Step 1 of 2</Typography>
            </Box>
        </Box>

        {/* Content */}
        <Box component="form" onSubmit={(e) => handleSignUp(e, 'pharmacist')}>
            {(error || success) && (
                <Alert 
                  severity={error ? 'error' : 'success'} 
                  sx={{ mx: 3, mb: 2, borderRadius: '12px', fontSize: 13 }}
                >
                    {error || success}
                </Alert>
            )}

            {renderSectionDivider('Business info')}

            <Box sx={{ px: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box component={motion.div} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                    <Typography sx={labelSx}>Full name (Owner)</Typography>
                    <InputBase 
                        name="username"
                        value={formData.username}
                        onChange={handleInputChange}
                        placeholder="Owner name" 
                        required
                        sx={inputSx} 
                    />
                </Box>
                <Box component={motion.div} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                    <Typography sx={labelSx}>Phone number</Typography>
                    <Box sx={{ display: 'flex' }}>
                        <Box sx={{ bgcolor: 'rgba(255,255,255,0.85)', border: '1px solid #ebebeb', borderRight: 'none', borderRadius: '13px 0 0 13px', px: 2, display: 'flex', alignItems: 'center', gap: 0.5, color: '#888', fontWeight: 500, fontSize: 13 }}>
                            🇳🇬 <span style={{ fontSize: 10 }}>+234</span>
                        </Box>
                        <InputBase 
                            name="phoneNumber"
                            value={formData.phoneNumber}
                            onChange={handleInputChange}
                            placeholder="800 000 0000" 
                            required
                            type="tel" 
                            sx={{ ...inputSx, borderRadius: '0 13px 13px 0' }} 
                        />
                    </Box>
                </Box>
                <Box component={motion.div} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                    <Typography sx={labelSx}>Email address</Typography>
                    <InputBase 
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="business@email.com" 
                        type="email"
                        required
                        sx={inputSx} 
                    />
                </Box>
                <Box component={motion.div} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                    <Typography sx={labelSx}>Password</Typography>
                    <Box sx={{ position: 'relative' }}>
                        <InputBase 
                            name="password"
                            value={formData.password}
                            onChange={handleInputChange}
                            placeholder="Create a strong password" 
                            type={showPassword ? 'text' : 'password'}
                            required
                            sx={{ ...inputSx, pr: 5 }} 
                        />
                        <Box 
                            onClick={() => setShowPassword(!showPassword)}
                            sx={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: '#ccc', cursor: 'pointer' }}
                        >
                            <VisibilityIcon sx={{ fontSize: 16 }} />
                        </Box>
                    </Box>
                </Box>
            </Box>

            {renderSectionDivider('Establishment')}

            <Box sx={{ px: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box component={motion.div} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                    <Typography sx={labelSx}>Business name</Typography>
                    <InputBase 
                        name="businessName"
                        value={formData.businessName}
                        onChange={handleInputChange}
                        placeholder="e.g. HealthX Pharmacy" 
                        required
                        sx={inputSx} 
                    />
                </Box>
                <Box component={motion.div} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                    <Typography sx={labelSx}>State</Typography>
                    <NativeSelect 
                        name="state"
                        value={formData.state}
                        onChange={handleSelectChange}
                        disableUnderline 
                        sx={inputSx} 
                        defaultValue=""
                        required
                    >
                        <option value="" disabled>Select state</option>
                        {nigerianStates.map(state => (
                            <option key={state} value={state}>{state}</option>
                        ))}
                    </NativeSelect>
                </Box>
                <Box component={motion.div} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
                    <Typography sx={labelSx}>Full Business Address</Typography>
                    <InputBase 
                        name="businessAddress"
                        value={formData.businessAddress}
                        onChange={handleInputChange}
                        placeholder="Street, City, Area" 
                        required
                        sx={inputSx} 
                    />
                </Box>
                <Box component={motion.div} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
                    <Typography sx={labelSx}>PCN Licence (optional)</Typography>
                    <InputBase 
                        name="licenseNumber"
                        value={formData.licenseNumber}
                        onChange={handleInputChange}
                        placeholder="Licence number" 
                        sx={inputSx} 
                    />
                </Box>

                <Box component={motion.div} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} sx={{ mt: 1 }}>
                    <Box 
                        component="button" 
                        type="submit"
                        disabled={loading}
                        sx={{ width: '100%', bgcolor: '#0F6E56', color: '#fff', borderRadius: '14px', py: 2, fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-sora), sans-serif', border: 'none', cursor: 'pointer', transition: 'opacity 0.2s', '&:hover': { opacity: 0.88 }, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}
                    >
                        {loading ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : 'Create owner account'}
                    </Box>
                </Box>

                <Box component={motion.div} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} sx={{ textAlign: 'center', mt: 1, mb: 2 }}>
                    <Typography sx={{ fontSize: 12, color: '#bbb' }}>
                        Already have an account? <span onClick={() => setStep('sign-in')} style={{ color: '#0F6E56', fontWeight: 500, cursor: 'pointer' }}>Sign in</span>
                    </Typography>
                </Box>
            </Box>
        </Box>
    </motion.div>
  );

  const renderClinicSignup = () => (
    <motion.div
      key="clinic-signup"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      style={{ display: 'flex', flexDirection: 'column', flex: 1 }}
    >
        {/* Back Button */}
        <Box 
          component={motion.div} 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }} 
          sx={{ display: 'flex', alignItems: 'center', gap: 1, p: '12px 24px 16px', cursor: 'pointer', mt: { xs: 0, sm: 2 } }}
          onClick={() => setStep('role')}
        >
          <Box sx={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid #e8e8e8', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(255,255,255,0.8)', color: '#888' }}>
            <ArrowBackIcon sx={{ fontSize: 16 }} />
          </Box>
          <Typography sx={{ fontSize: 12, color: '#888', fontWeight: 500 }}>I am a...</Typography>
        </Box>

        {/* Progress Bar (Clinic) */}
        <Box component={motion.div} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} sx={{ mx: 3, mb: 2.5 }}>
            <Box sx={{ bgcolor: '#ebebeb', borderRadius: 100, height: 3 }}>
                <Box sx={{ width: '50%', height: 3, bgcolor: '#BA7517', borderRadius: 100, transition: 'width 0.4s ease' }} />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                <Typography sx={{ fontSize: 10, color: '#BA7517', fontWeight: 500 }}>Business details</Typography>
                <Typography sx={{ fontSize: 10, color: '#bbb', letterSpacing: '0.3px' }}>Step 1 of 2</Typography>
            </Box>
        </Box>

        {/* Hero */}
        <Box sx={{ px: 3, pb: 2 }}>
          <Box 
             component={motion.div} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
             sx={{ display: 'inline-flex', alignItems: 'center', gap: '6px', bgcolor: '#fef3c7', border: '1px solid rgba(186,117,23,0.15)', borderRadius: 100, px: 1.5, py: 0.5, mb: 2 }}
          >
              <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: '#BA7517' }} />
              <Typography sx={{ fontSize: 10, color: '#BA7517', fontWeight: 500, letterSpacing: '0.2px' }}>Healthcare facility</Typography>
          </Box>
          <Typography 
            component={motion.h1} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            sx={{ fontFamily: 'var(--font-fraunces), serif', fontSize: 28, fontWeight: 900, color: '#111', lineHeight: 1.1, letterSpacing: '-1px', mb: 1 }}
          >
            Clinic & Medical<br/><em style={{ color: '#BA7517', fontStyle: 'italic' }}>Practice.</em>
          </Typography>
        </Box>

        {/* Content */}
        <Box component="form" onSubmit={(e) => handleSignUp(e, 'pharmacist')}>
            {(error || success) && (
                <Alert 
                  severity={error ? 'error' : 'success'} 
                  sx={{ mx: 3, mb: 2, borderRadius: '12px', fontSize: 13 }}
                >
                    {error || success}
                </Alert>
            )}

            <Box sx={{ px: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <Box component={motion.div} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                    <Typography sx={labelSx}>Contact Person Name</Typography>
                    <InputBase 
                        name="username"
                        value={formData.username}
                        onChange={handleInputChange}
                        placeholder="Dr/Mr/Ms Name" 
                        required
                        sx={inputSx} 
                    />
                </Box>
                <Box component={motion.div} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                    <Typography sx={labelSx}>Clinic Email</Typography>
                    <InputBase 
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="clinic@email.com" 
                        type="email"
                        required
                        sx={inputSx} 
                    />
                </Box>
                <Box component={motion.div} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                    <Typography sx={labelSx}>Clinic Phone</Typography>
                    <InputBase 
                        name="phoneNumber"
                        value={formData.phoneNumber}
                        onChange={handleInputChange}
                        placeholder="Phone number" 
                        required
                        type="tel" 
                        sx={inputSx} 
                    />
                </Box>
                <Box component={motion.div} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                    <Typography sx={labelSx}>Password</Typography>
                    <Box sx={{ position: 'relative' }}>
                        <InputBase 
                            name="password"
                            value={formData.password}
                            onChange={handleInputChange}
                            placeholder="Create password" 
                            type={showPassword ? 'text' : 'password'}
                            required
                            sx={{ ...inputSx, pr: 5 }} 
                        />
                        <Box 
                            onClick={() => setShowPassword(!showPassword)}
                            sx={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: '#ccc', cursor: 'pointer' }}
                        >
                            <VisibilityIcon sx={{ fontSize: 16 }} />
                        </Box>
                    </Box>
                </Box>

                <Box component={motion.div} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} sx={{ mt: 1 }}>
                    <Box 
                        component="button" 
                        type="submit"
                        disabled={loading}
                        sx={{ width: '100%', bgcolor: '#BA7517', color: '#fff', borderRadius: '14px', py: 2, fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-sora), sans-serif', border: 'none', cursor: 'pointer', transition: 'opacity 0.2s', '&:hover': { opacity: 0.88 }, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}
                    >
                        {loading ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : 'Register clinic'}
                    </Box>
                </Box>

                <Box component={motion.div} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} sx={{ textAlign: 'center', mb: 3 }}>
                    <Typography sx={{ fontSize: 12, color: '#bbb' }}>
                        Already have an account? <span onClick={() => setStep('sign-in')} style={{ color: '#0F6E56', fontWeight: 500, cursor: 'pointer' }}>Sign in</span>
                    </Typography>
                </Box>
            </Box>
        </Box>
    </motion.div>
  );
  const renderSignIn = () => (
    <motion.div
      key="sign-in"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      style={{ display: 'flex', flexDirection: 'column', flex: 1 }}
    >
        {/* Back Button */}
        <Box 
          component={motion.div} 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }} 
          sx={{ display: 'flex', alignItems: 'center', gap: 1, p: '12px 24px 16px', cursor: 'pointer', mt: { xs: 0, sm: 2 } }}
          onClick={() => setStep('role')}
        >
          <Box sx={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid #e8e8e8', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(255,255,255,0.8)', color: '#888' }}>
            <ArrowBackIcon sx={{ fontSize: 16 }} />
          </Box>
          <Typography sx={{ fontSize: 12, color: '#888', fontWeight: 500 }}>Back</Typography>
        </Box>

        {/* Logo Mark */}
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
            <Box sx={{ width: 56, height: 56, borderRadius: '16px', bgcolor: '#E1F5EE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Box sx={{ width: 24, height: 24, borderRadius: '50%', border: '3px solid #0F6E56' }} />
            </Box>
        </Box>

        {/* Hero */}
        <Box sx={{ px: 3, pb: 3, textAlign: 'center' }}>
          <Typography 
            component={motion.h1} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            sx={{ fontFamily: 'var(--font-fraunces), serif', fontSize: 30, fontWeight: 900, color: '#111', lineHeight: 1.1, letterSpacing: '-1.2px', mb: 1 }}
          >
            Welcome<br/><em style={{ color: '#0F6E56', fontStyle: 'italic' }}>back.</em>
          </Typography>
          <Typography 
            component={motion.p} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            sx={{ fontSize: 13, color: '#888', fontWeight: 300, lineHeight: 1.65 }}
          >
            Sign in to continue finding medicines.
          </Typography>
        </Box>

        <Box component="form" onSubmit={handleSignIn} sx={{ px: 3, display: 'flex', flexDirection: 'column', flex: 1 }}>
            {(error || success) && (
                <Alert 
                  severity={error ? 'error' : 'success'} 
                  sx={{ mb: 2, borderRadius: '12px', fontSize: 13 }}
                >
                    {error || success}
                </Alert>
            )}

            <Box sx={{ mb: 1.5 }}>
                <Typography sx={labelSx}>Email address</Typography>
                <InputBase 
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="you@email.com" 
                    type="email" 
                    required
                    sx={inputSx} 
                />
            </Box>
            <Box sx={{ mb: 1 }}>
                <Typography sx={labelSx}>Password</Typography>
                <Box sx={{ position: 'relative' }}>
                    <InputBase 
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        placeholder="Your password" 
                        type={showPassword ? 'text' : 'password'} 
                        required
                        sx={{ ...inputSx, pr: 5 }} 
                    />
                    <Box 
                        onClick={() => setShowPassword(!showPassword)}
                        sx={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: '#ccc', cursor: 'pointer' }}
                    >
                        <VisibilityIcon sx={{ fontSize: 16 }} />
                    </Box>
                </Box>
            </Box>
            <Box sx={{ textAlign: 'right', mb: 2.5 }}>
                <Typography sx={{ fontSize: 11, color: '#C84B8F', fontWeight: 500, cursor: 'pointer' }}>Forgot password?</Typography>
            </Box>
            <Box 
                component="button" 
                type="submit"
                disabled={loading}
                sx={{ width: '100%', bgcolor: '#111', color: '#fff', borderRadius: '14px', py: 2, fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-sora), sans-serif', border: 'none', cursor: 'pointer', transition: 'opacity 0.2s', '&:hover': { opacity: 0.85 }, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}
            >
                {loading ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : 'Sign in'}
            </Box>

            <Box sx={{ textAlign: 'center', mt: 3, mb: 1 }}>
                <Typography sx={{ fontSize: 12, color: '#bbb' }}>
                    Don't have an account? <span onClick={() => setStep('role')} style={{ color: '#0F6E56', fontWeight: 500, cursor: 'pointer' }}>Create one</span>
                </Typography>
            </Box>
        </Box>

    </motion.div>
  );

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      bgcolor: '#fafaf8', 
      display: 'flex', 
      justifyContent: 'flex-start', 
      fontFamily: 'var(--font-dm-sans), sans-serif',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <Container maxWidth="lg" sx={{ 
          pt: { xs: '64px', sm: '80px' }, 
          p: 0, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          minHeight: '100vh', 
          position: 'relative',
          pb: '80px' 
        }}>
        
        <Box sx={{ width: '100%', maxWidth: '440px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        
            <AnimatePresence mode="wait">
                {step === 'role' && renderRoleSelection()}
                {step === 'patient-signup' && renderPatientSignup()}
                {step === 'pharmacist-signup' && renderPharmacistSignup()}
                {step === 'pharmacy-owner-signup' && renderPharmacyOwnerSignup()}
                {step === 'clinic-signup' && renderClinicSignup()}
                {step === 'sign-in' && renderSignIn()}
            </AnimatePresence>

        </Box>
        
        {/* Shared Minimal Bottom Navigation */}
        <BottomNav 
          currentView="home" 
          onTabClick={(id) => {
            if (id === 'home') router.push('/');
            else router.push(`/?view=${id}`);
          }} 
        />

      </Container>
    </Box>
  );
}
