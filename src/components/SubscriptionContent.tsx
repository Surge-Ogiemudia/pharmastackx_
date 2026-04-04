"use client";

import { useState } from 'react';
import { Box, Typography, Button, CircularProgress, Icon } from "@mui/material";
import { 
    Chat, 
    VerifiedUser, 
    LocalHospital, 
    CardGiftcard, 
    CheckCircle, 
    ArrowForward,
    Shield
} from "@mui/icons-material";
import { useSession } from "@/context/SessionProvider";
import { usePaystackPayment } from 'react-paystack';
import '../styles/Account.css';

interface SubscriptionContentProps {
    onSubscriptionSuccess: () => void;
}

const SubscriptionContent = ({ onSubscriptionSuccess }: SubscriptionContentProps) => {
    const { user, refreshSession } = useSession();
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Paystack Configuration
    const config = {
        reference: (new Date()).getTime().toString(),
        email: user?.email || '',
        amount: 4800 * 100, // ₦4,800 (roughly $3) in kobo
        publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '',
        metadata: {
            custom_fields: [
                {
                    display_name: "Subscription Plan",
                    variable_name: "plan",
                    value: "PharmaStackX Pro"
                }
            ]
        }
    };

    const initializePayment = usePaystackPayment(config);

    const handleUpdateSubscription = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/subscription/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ payment_success: true })
            });

            if (response.ok) {
                setIsSuccess(true);
                refreshSession();
                setTimeout(() => onSubscriptionSuccess(), 3000);
            } else {
                setError('Failed to update subscription status.');
            }
        } catch (err) {
            setError('An error occurred. Please contact support.');
        } finally {
            setIsLoading(false);
        }
    };

    const onSuccess = (reference: any) => {
        console.log('Payment Success:', reference);
        handleUpdateSubscription();
    };

    const onClose = () => {
        console.log('Payment closed');
    };

    const handleUpgrade = () => {
        if (!user?.email) {
            setError('Please ensure you are logged in correctly.');
            return;
        }
        initializePayment({ onSuccess, onClose });
    };

    if (isSuccess) {
        return (
            <Box className="success-container glass-card">
                <Box className="success-icon-bg">
                    <CheckCircle sx={{ fontSize: 48 }} />
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 800, mb: 1, fontFamily: 'Sora' }}>
                    You're Pro!
                </Typography>
                <Typography variant="body1" sx={{ color: '#666', mb: 4 }}>
                    Welcome to the elite side of healthcare. Your badges have been updated.
                </Typography>
                <CircularProgress size={24} sx={{ color: 'var(--primary-green)' }} />
                <Typography variant="caption" sx={{ display: 'block', mt: 2, color: '#999' }}>
                    Redirecting you back...
                </Typography>
            </Box>
        );
    }

    return (
        <Box className="subscription-container">
            <Box className="pro-card">
                {/* Pro Header */}
                <Box className="pro-header">
                    <Box className="pro-badge">Limited Offer</Box>
                    <Typography className="pro-title">PharmaStackX Pro</Typography>
                    <Typography className="pro-tagline">The ultimate healthcare companion.</Typography>
                </Box>

                {/* Features List */}
                <Box className="pro-features">
                    <Box className="feature-item">
                        <Box className="feature-icon-wrapper">
                            <Chat fontSize="small" />
                        </Box>
                        <Box className="feature-text">
                            <Typography className="feature-label">Unlimited Pharmacist Chat</Typography>
                            <Typography className="feature-desc">Complete 1-month access to real pharmacists for consultations.</Typography>
                        </Box>
                    </Box>

                    <Box className="feature-item">
                        <Box className="feature-icon-wrapper">
                            <Shield fontSize="small" />
                        </Box>
                        <Box className="feature-text">
                            <Typography className="feature-label">Priority Order Service</Typography>
                            <Typography className="feature-desc">Zero service fees on up to 4 orders per month.</Typography>
                        </Box>
                    </Box>

                    <Box className="feature-item">
                        <Box className="feature-icon-wrapper">
                            <CardGiftcard fontSize="small" />
                        </Box>
                        <Box className="feature-text">
                            <Typography className="feature-label">Exclusive Member Perks</Typography>
                            <Typography className="feature-desc">Unlock pickup locations and hidden professional tools.</Typography>
                        </Box>
                    </Box>
                </Box>

                {/* Pricing */}
                <Box className="price-container">
                    <Typography className="price-main">$3 <span className="price-period">/ month</span></Typography>
                    <Typography variant="caption" sx={{ color: '#999' }}>Approximately ₦4,800 based on current rates.</Typography>
                </Box>

                {error && (
                    <Typography color="error" sx={{ textAlign: 'center', mb: 2, fontSize: '13px', fontWeight: 600 }}>
                        {error}
                    </Typography>
                )}

                {/* Action Button */}
                <Button 
                    className="upgrade-button-premium"
                    onClick={handleUpgrade}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <CircularProgress size={24} color="inherit" />
                    ) : (
                        <>
                            Get Started Now <ArrowForward />
                        </>
                    )}
                </Button>
            </Box>
        </Box>
    );
};

export default SubscriptionContent;
