"use client";
import { useState, useEffect } from 'react';
import { 
    Box, 
    Typography, 
    Grid, 
    Checkbox, 
    FormControlLabel, 
    Paper, 
    Table, 
    TableBody, 
    TableCell, 
    TableContainer, 
    TableHead, 
    TableRow, 
    CircularProgress,
    Button,
    Chip,
    Alert,
    Snackbar
} from '@mui/material';
import { WhatsApp, Refresh, CheckCircle, Error as ErrorIcon, RadioButtonChecked } from '@mui/icons-material';

const nigerianStates = [
    "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
    "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "Gombe",
    "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos",
    "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto",
    "Taraba", "Yobe", "Zamfara", "FCT - Abuja"
];

const WhatsAppManagement = () => {
    const [disabledStates, setDisabledStates] = useState<string[]>([]);
    const [requests, setRequests] = useState<any[]>([]);
    const [isLoadingSettings, setIsLoadingSettings] = useState(true);
    const [isLoadingRequests, setIsLoadingRequests] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false,
        message: '',
        severity: 'success'
    });

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/admin/whatsapp/settings');
            if (res.ok) {
                const data = await res.json();
                setDisabledStates(data.disabledWhatsAppStates || []);
            }
        } catch (err) {
            console.error("Error fetching WhatsApp settings:", err);
        } finally {
            setIsLoadingSettings(false);
        }
    };

    const fetchRequests = async () => {
        setIsLoadingRequests(true);
        try {
            const res = await fetch('/api/admin/whatsapp/requests');
            if (res.ok) {
                const data = await res.json();
                setRequests(data || []);
            }
        } catch (err) {
            console.error("Error fetching WhatsApp requests:", err);
        } finally {
            setIsLoadingRequests(false);
        }
    };

    useEffect(() => {
        fetchSettings();
        fetchRequests();
    }, []);

    const handleToggleState = (state: string) => {
        setDisabledStates(prev => 
            prev.includes(state) 
                ? prev.filter(s => s !== state) 
                : [...prev, state]
        );
    };

    const saveSettings = async () => {
        setIsSaving(true);
        try {
            const res = await fetch('/api/admin/whatsapp/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ disabledWhatsAppStates: disabledStates })
            });
            if (res.ok) {
                setSnackbar({ open: true, message: 'Settings saved successfully', severity: 'success' });
            } else {
                throw new Error('Failed to save settings');
            }
        } catch (err) {
            setSnackbar({ open: true, message: 'Error saving settings', severity: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoadingSettings) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;

    return (
        <Box sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <WhatsApp sx={{ color: '#25D366', fontSize: 32 }} />
                <Typography variant="h5" sx={{ fontWeight: 700, fontFamily: 'Sora, sans-serif' }}>
                    WhatsApp Funnel Management
                </Typography>
            </Box>

            <Alert severity="info" sx={{ mb: 4, borderRadius: '12px' }}>
                Unchecked states will receive automated WhatsApp request notifications. Checked states are "muted" (only admins notified).
            </Alert>

            <Paper className="glass-card" sx={{ p: 3, mb: 4, borderRadius: '20px' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <RadioButtonChecked sx={{ fontSize: 18, color: 'var(--primary-green)' }} />
                    Active Notification States
                </Typography>
                <Grid container spacing={1}>
                    {nigerianStates.sort().map(state => (
                        <Grid item xs={6} sm={4} md={3} key={state}>
                            <FormControlLabel
                                control={
                                    <Checkbox 
                                        checked={!disabledStates.includes(state)} 
                                        onChange={() => handleToggleState(state)}
                                        sx={{ 
                                            color: 'rgba(0,0,0,0.2)',
                                            '&.Mui-checked': { color: '#0F6E56' } 
                                        }}
                                    />
                                }
                                label={state}
                                sx={{ 
                                    '& .MuiFormControlLabel-label': { 
                                        fontSize: '13px', 
                                        fontFamily: 'Sora, sans-serif',
                                        color: disabledStates.includes(state) ? '#999' : '#111'
                                    } 
                                }}
                            />
                        </Grid>
                    ))}
                </Grid>
                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button 
                        variant="contained" 
                        onClick={saveSettings} 
                        disabled={isSaving}
                        sx={{ 
                            bgcolor: '#0F6E56', 
                            borderRadius: '12px',
                            px: 4,
                            '&:hover': { bgcolor: '#0B5E4A' }
                        }}
                    >
                        {isSaving ? 'Saving...' : 'Save Configuration'}
                    </Button>
                </Box>
            </Paper>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: 'Sora, sans-serif' }}>
                    Funnel Monitor (Live Requests)
                </Typography>
                <Button 
                    startIcon={<Refresh />} 
                    onClick={fetchRequests} 
                    disabled={isLoadingRequests}
                    size="small"
                >
                    Refresh Feed
                </Button>
            </Box>

            <TableContainer component={Paper} className="glass-card" sx={{ borderRadius: '20px', overflow: 'hidden' }}>
                <Table size="small">
                    <TableHead sx={{ bgcolor: 'rgba(15, 110, 86, 0.05)' }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 700 }}>Time</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Sender</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Location (AI)</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Medicine Found</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {isLoadingRequests ? (
                            <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4 }}><CircularProgress size={24} /></TableCell></TableRow>
                        ) : requests.length === 0 ? (
                            <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4 }}>No requests found in funnel.</TableCell></TableRow>
                        ) : (
                            requests.map((req) => (
                                <TableRow key={req._id}>
                                    <TableCell sx={{ fontSize: '12px' }}>{new Date(req.createdAt).toLocaleString()}</TableCell>
                                    <TableCell sx={{ fontSize: '12px' }}>{req.sender_phone}</TableCell>
                                    <TableCell>
                                        <Chip 
                                            label={req.location || 'Unknown'} 
                                            size="small" 
                                            variant="outlined"
                                            sx={{ fontSize: '10px' }}
                                        />
                                    </TableCell>
                                    <TableCell sx={{ fontSize: '12px' }}>
                                        {req.medicines?.map((m: any) => m.name).join(', ') || 'None'}
                                    </TableCell>
                                    <TableCell>
                                        {req.platform_request_id ? (
                                            <Chip 
                                                icon={<CheckCircle sx={{ fontSize: '14px !important' }} />} 
                                                label="Processed" 
                                                size="small" 
                                                color="success" 
                                                sx={{ height: '20px', fontSize: '10px' }} 
                                            />
                                        ) : (
                                            <Chip 
                                                icon={<ErrorIcon sx={{ fontSize: '14px !important' }} />} 
                                                label="Dropped" 
                                                size="small" 
                                                color="warning" 
                                                sx={{ height: '20px', fontSize: '10px' }} 
                                            />
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <Snackbar 
                open={snackbar.open} 
                autoHideDuration={4000} 
                onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
            >
                <Alert severity={snackbar.severity} sx={{ width: '100%', borderRadius: '12px' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default WhatsAppManagement;
