'use client';

import React, { useState, FormEvent, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Box, Typography, Container, InputBase, CircularProgress, Alert } from '@mui/material';
import { motion } from 'framer-motion';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import VisibilityIcon from '@mui/icons-material/Visibility';
import axios from 'axios';

export default function ResetPasswordPage() {
  const router = useRouter();
  const params = useParams();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (params?.token) {
      const tokenValue = Array.isArray(params.token) ? params.token[0] : params.token;
      setToken(tokenValue);
    }
  }, [params]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!token) {
      setError('Invalid or missing reset token.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await axios.post('/api/auth/reset-password', {
        token,
        password,
      });

      setSuccess(res.data.message || 'Password reset successfully!');
      setTimeout(() => {
        router.push('/auth?mode=login');
      }, 3000);

    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Something went wrong.');
    } finally {
      setIsLoading(false);
    }
  };

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

  const labelSx = { fontSize: 13, fontWeight: 600, color: '#111', mb: 1, ml: 0.5 };

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
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ display: 'flex', flexDirection: 'column', flex: 1 }}
            >
                {/* Back Button */}
                <Box 
                  component={motion.div} 
                  initial={{ opacity: 0, y: -10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  sx={{ display: 'flex', alignItems: 'center', gap: 1, p: '12px 24px 16px', cursor: 'pointer', mt: { xs: 0, sm: 2 } }}
                  onClick={() => router.push('/auth?mode=login')}
                >
                  <Box sx={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid #e8e8e8', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(255,255,255,0.8)', color: '#888' }}>
                    <ArrowBackIcon sx={{ fontSize: 16 }} />
                  </Box>
                  <Typography sx={{ fontSize: 12, color: '#888', fontWeight: 500 }}>Back to Sign in</Typography>
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
                    sx={{ fontFamily: 'var(--font-fraunces), serif', fontSize: 26, fontWeight: 900, color: '#111', lineHeight: 1.1, letterSpacing: '-1px', mb: 1 }}
                  >
                    Set new<br/><em style={{ color: '#0F6E56', fontStyle: 'italic' }}>password.</em>
                  </Typography>
                  <Typography 
                    component={motion.p} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    sx={{ fontSize: 13, color: '#888', fontWeight: 300, lineHeight: 1.65 }}
                  >
                    Please choose a strong, secure password.
                  </Typography>
                </Box>

                <Box component="form" onSubmit={handleSubmit} sx={{ px: 3, display: 'flex', flexDirection: 'column', flex: 1 }}>
                    {(error || success) && (
                        <Alert 
                          severity={error ? 'error' : 'success'} 
                          sx={{ mb: 2, borderRadius: '12px', fontSize: 13 }}
                        >
                            {error || success}
                        </Alert>
                    )}

                    {!success && (
                      <>
                        <Box sx={{ mb: 1.5 }}>
                            <Typography sx={labelSx}>New Password</Typography>
                            <Box sx={{ position: 'relative' }}>
                                <InputBase 
                                    name="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter new password" 
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
                        
                        <Box sx={{ mb: 3 }}>
                            <Typography sx={labelSx}>Confirm Password</Typography>
                            <Box sx={{ position: 'relative' }}>
                                <InputBase 
                                    name="confirmPassword"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Confirm new password" 
                                    type={showConfirmPassword ? 'text' : 'password'} 
                                    required
                                    sx={{ ...inputSx, pr: 5 }} 
                                />
                                <Box 
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    sx={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: '#ccc', cursor: 'pointer' }}
                                >
                                    <VisibilityIcon sx={{ fontSize: 16 }} />
                                </Box>
                            </Box>
                        </Box>

                        <Box 
                            component="button" 
                            type="submit"
                            disabled={isLoading || !token}
                            sx={{ width: '100%', bgcolor: '#111', color: '#fff', borderRadius: '14px', py: 2, fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-sora), sans-serif', border: 'none', cursor: 'pointer', transition: 'opacity 0.2s', '&:hover': { opacity: 0.85 }, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}
                        >
                            {isLoading ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : 'Reset Password'}
                        </Box>
                      </>
                    )}
                </Box>
            </motion.div>
        </Box>
      </Container>
    </Box>
  );
}
