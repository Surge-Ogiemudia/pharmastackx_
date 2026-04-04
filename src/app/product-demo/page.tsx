
'use client';

import { useRef } from 'react';
import { 
    Box, 
    Typography, 
    Container, 
    Paper,
    Link,
    Grid,
    List,
    ListItem,
    ListItemIcon,
    ListItemText
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import DemoSignupForm from './DemoSignupForm';
import Image from 'next/image';

const ProductDemoPage = () => {
    const formRef = useRef<HTMLDivElement>(null);

    const handleScrollToForm = () => {
        formRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <>
            <Container maxWidth="lg">
                <Paper elevation={3} sx={{ p: { xs: 2, md: 4 }, mt: 4, borderRadius: '16px', bgcolor: '#f8f9fa' }}>
                    <Grid container spacing={4} alignItems="center">
                        <Grid item xs={12} md={6} sx={{ order: { xs: 1, md: 1 } }}>
                            <Box sx={{ position: 'relative', width: '100%', height: { xs: 'auto', md: '100%' }, minHeight: 400, borderRadius: '12px', overflow: 'hidden' }}>
                                <Image 
                                    src="/product-demo.png"
                                    alt="Pharmastackx Product Demo"
                                    width={600} 
                                    height={600}
                                    layout="responsive"
                                    objectFit="contain"
                                />
                                <Box
                                    onClick={handleScrollToForm}
                                    sx={{
                                        display: { xs: 'block', md: 'none' },
                                        position: 'absolute',
                                        bottom: 0,
                                        right: 0,
                                        bgcolor: 'maroon',
                                        color: 'white',
                                        padding: '10px 20px',
                                        cursor: 'pointer',
                                        borderTopLeftRadius: '20px',
                                        borderBottomRightRadius: '12px',
                                        '&::before': {
                                            content: '""',
                                            position: 'absolute',
                                            bottom: 0,
                                            left: -20,
                                            width: 20,
                                            height: 20,
                                            backgroundColor: 'maroon',
                                        },
                                        '&::after': {
                                            content: '""',
                                            position: 'absolute',
                                            bottom: 0,
                                            left: -20,
                                            width: 20,
                                            height: 20,
                                            backgroundColor: '#f8f9fa',
                                            borderBottomRightRadius: '20px',
                                        }
                                    }}
                                >
                                    <Typography variant="button" sx={{ fontWeight: 'bold' }}>Sign Up Now</Typography>
                                </Box>
                            </Box>
                        </Grid>
                        <Grid item xs={12} md={6} sx={{ order: { xs: 2, md: 2 } }}>
                            <Typography variant="h4" component="h1" sx={{ fontWeight: 600, mb: 1, color: '#006D5B' }}>
                                Turning Medicine Requests Into Revenue
                            </Typography>
                            <Typography variant="h6" component="h2" sx={{ mb: 3, color: '#444' }}>
                                How pharmacists use PharmaStackX to fulfill verified medicine requests and earn additional income.
                            </Typography>
                            <Typography variant="body1" sx={{ mb: 2, lineHeight: 1.6, color: '#444' }}>
                                PharmaStackX routes verified medicine requests from patients and partnered clinics directly to community pharmacists.
                            </Typography>
                            <Typography variant="body1" sx={{ mb: 1, fontWeight: 'bold' }}>
                                This 45-minute live session will show pharmacists how to:
                            </Typography>
                            <List dense sx={{py: 0}}>
                                <ListItem sx={{py: 0}}><ListItemIcon><CheckCircleOutlineIcon sx={{ color: '#006D5B' }} /></ListItemIcon><ListItemText primary="Sign up and add PharmaStackX as an app" /></ListItem>
                                <ListItem sx={{py: 0}}><ListItemIcon><CheckCircleOutlineIcon sx={{ color: '#006D5B' }} /></ListItemIcon><ListItemText primary="Enable notifications for real-time alerts" /></ListItem>
                                <ListItem sx={{py: 0}}><ListItemIcon><CheckCircleOutlineIcon sx={{ color: '#006D5B' }} /></ListItemIcon><ListItemText primary="Receive verified medicine requests" /></ListItem>
                                <ListItem sx={{py: 0}}><ListItemIcon><CheckCircleOutlineIcon sx={{ color: '#006D5B' }} /></ListItemIcon><ListItemText primary="Respond based on stock availability" /></ListItem>
                                <ListItem sx={{py: 0}}><ListItemIcon><CheckCircleOutlineIcon sx={{ color: '#006D5B' }} /></ListItemIcon><ListItemText primary="Fulfil requests and earn a 5% service commission" /></ListItem>
                            </List>
                            <Typography variant="body1" sx={{ mt: 2, mb: 2, lineHeight: 1.6, color: '#444' }}>
                                Plus a walkthrough of additional platform features.
                            </Typography>
                             <Typography variant="h6" sx={{ mt: 2, mb: 3, color: 'darkmagenta', fontWeight: 'bold' }}>
                                Friday, January 23rd, 2026, at 8:00 PM WAT
                            </Typography>
                            <Box ref={formRef}>
                                <DemoSignupForm />
                            </Box>
                            <Typography variant="body2" sx={{ mt: 4, color: '#666', textAlign: 'center' }}>
                                By registering, you agree to our <Link href="/privacy-policy" target="_blank" rel="noopener noreferrer">Privacy Policy</Link>.
                                We are committed to protecting your privacy and handling your personal information in a lawful, transparent, and secure manner.
                            </Typography>
                        </Grid>
                    </Grid>
                </Paper>
            </Container>
        </>
    );
};

export default ProductDemoPage;
