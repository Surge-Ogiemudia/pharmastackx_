'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import LoginForm from '../auth/LoginForm';
import SignupForm from '../auth/SignupForm';
import ForgotPasswordForm from '../auth/ForgotPasswordForm';
import { Box, Typography, Paper, Tabs, Tab, CircularProgress, Button, Alert } from '@mui/material';

function AuthViewSwitcher() {
    const searchParams = useSearchParams();
    const initialView = searchParams?.get('view') === 'signup' ? 'signup' : 'login';
    const [view, setView] = useState(initialView);
    const [showForgotPasswordSuccess, setShowForgotPasswordSuccess] = useState(false);

    const redirectUrl = searchParams?.get('redirect') || null;

    const handleTabChange = (event: React.SyntheticEvent, newValue: string) => {
        setView(newValue);
    };

    const handleForgotPasswordSuccess = () => {
        setShowForgotPasswordSuccess(true);
    };

    if (showForgotPasswordSuccess) {
        return (
            <Paper elevation={8} sx={{ p: 4, width: '100%', maxWidth: '420px', borderRadius: '16px' }}>
                <Box sx={{ textAlign: 'center' }}>
                    <Alert severity="success" sx={{ mb: 2 }}>
                        If an account with that email exists, a password reset link has been sent.
                    </Alert>
                    <Button onClick={() => setView('login')} sx={{ textTransform: 'none', color: 'teal', mt: 2 }}>
                        Back to Login
                    </Button>
                </Box>
            </Paper>
        );
    }

    return (
        <Paper 
            elevation={8}
            sx={{
                p: { xs: 2, sm: 4 }, 
                width: '100%',
                maxWidth: '420px', 
                borderRadius: '16px',
                bgcolor: 'background.paper',
                maxHeight: '90vh', 
                overflowY: 'auto',   
            }}
        >
            {view !== 'forgotPassword' && (
                <Tabs
                    value={view}
                    onChange={handleTabChange}
                    variant="fullWidth"
                    sx={{ 
                        mb: 3, 
                        position: 'sticky', 
                        top: 0, 
                        background: 'white', 
                        zIndex: 1,
                        '& .MuiTabs-indicator': { backgroundColor: 'teal' },
                        '& .MuiTab-root.Mui-selected': { color: 'teal' },
                    }}
                >
                    <Tab label="Login" value="login" />
                    <Tab label="Sign Up" value="signup" />
                </Tabs>
            )}

            {view === 'login' && (
                <Box>
                    <Typography variant="h5" component="h1" sx={{ textAlign: 'center', fontWeight: 700, mb: 2 }}>
                        Welcome Back
                    </Typography>
                    <LoginForm redirectUrl={redirectUrl} />
                    <Box sx={{ textAlign: 'center', mt: 2 }}>
                        <Button onClick={() => setView('forgotPassword')} sx={{ textTransform: 'none', color: 'teal' }}>
                            Forgot Password?
                        </Button>
                    </Box>
                </Box>
            )}
            {view === 'signup' && (
                <Box>
                    <Typography variant="h5" component="h1" sx={{ textAlign: 'center', fontWeight: 700, mb: 2 }}>
                        Create an Account
                    </Typography>
                    <SignupForm redirectUrl={redirectUrl} />
                </Box>
            )}
            {view === 'forgotPassword' && (
                <Box>
                    <ForgotPasswordForm onSuccess={handleForgotPasswordSuccess} />
                    <Box sx={{ textAlign: 'center', mt: 2 }}>
                        <Button onClick={() => setView('login')} sx={{ textTransform: 'none', color: 'teal' }}>
                            Back to Login
                        </Button>
                    </Box>
                </Box>
            )}
        </Paper>
    );
}

export default function ModalAuthContent() {
    return (
        <Suspense fallback={<CircularProgress />}>
            <AuthViewSwitcher />
        </Suspense>
    );
}
