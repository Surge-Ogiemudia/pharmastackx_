"use client";
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useSession } from "@/context/SessionProvider";
import { Box, Typography, Avatar, Button, List, ListItem, Divider, CircularProgress, Grid, Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton, Select, MenuItem, FormControl, InputLabel, Switch, FormControlLabel } from "@mui/material";
import { Person, VpnKey, Logout, Info, ContactMail, Business, LocationOn, VerifiedUser, ArrowBack, Phone, LocalHospital, Assignment, Edit, CheckCircleOutline, ErrorOutline, CloudUpload, AttachFile, Close, WhatsApp as WhatsAppIcon, Email as EmailIcon, Medication as MedicationIcon } from "@mui/icons-material";
import FileUpload from './FileUpload';
// Dynamically import SubscriptionContent to avoid "window is not defined" SSR error
const SubscriptionContent = dynamic(() => import('./SubscriptionContent'), { ssr: false });
const StoreManagement = dynamic(() => import('../app/components/StoreManagement'), { ssr: false });
const MedicineRestock = dynamic(() => import('./MedicineRestock'), { ssr: false });
const WhatsAppManagement = dynamic(() => import('./WhatsAppManagement'), { ssr: false });
import AboutContent from './AboutContent';
import PrivacyContent from './PrivacyContent';
import DotCanvas from './DotCanvas';
import '../styles/Account.css';

// Define a more detailed user interface
interface DetailedUser {
    _id: string;
    username: string;
    email: string;
    profilePicture?: string;
    role: 'admin' | 'customer' | 'pharmacy' | 'clinic' | 'vendor' | 'agent' | 'pharmacist' | 'user';
    businessName?: string;
    businessAddress?: string;
    slug?: string;
    state?: string;
    city?: string;
    emailVerified: boolean;
    professionalVerificationStatus: 'not_started' | 'pending_review' | 'approved' | 'rejected';
    subscriptionStatus: 'subscribed' | 'unsubscribed';
    mobile?: string;
    phoneNumber?: string;
    stateOfPractice?: string;
    licenseNumber?: string;
    pharmacy?: { _id: string; businessName: string; city?: string };
    canManageStore?: boolean;
}

// Specific interface for connected pharmacists
interface Pharmacist {
    _id: string;
    username: string;
    email: string;
    profilePicture?: string;
    canManageStore: boolean;
}

interface AccountContentProps {
    setView: (view: string) => void;
    onBack?: () => void;
}

interface EditDialogProps {
    open: boolean;
    onClose: () => void;
    onSave: (fieldName: string, value: any) => void;
    fieldName: string;
    value: any;
}

interface SwitchPharmacyDialogProps {
    open: boolean;
    onClose: () => void;
    onSwitch: (pharmacyId: string) => void;
}

interface EditableListItemProps {
    fieldName: string;
    label: string;
    value?: string | null;
    icon: React.ReactElement;
}

const nigerianStates = [
    "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
    "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT - Abuja", "Gombe",
    "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos",
    "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto",
    "Taraba", "Yobe", "Zamfara"
];

const EditDialog = ({ open, onClose, onSave, fieldName, value }: EditDialogProps) => {
    const [currentValue, setCurrentValue] = useState(value);

    useEffect(() => {
        setCurrentValue(value);
    }, [value]);

    const handleSave = () => {
        onSave(fieldName, currentValue);
    };
    
    const formattedFieldName = fieldName.replace(/([A-Z])/g, ' $1').trim();

    const renderInput = () => {
        const inputProps = {
            sx: {
                '& .MuiOutlinedInput-root': {
                    borderRadius: '12px',
                    fontFamily: 'Sora, sans-serif',
                    '&.Mui-focused fieldset': {
                        borderColor: 'var(--primary-green)',
                    }
                },
                '& .MuiInputLabel-root.Mui-focused': {
                    color: 'var(--primary-green)',
                }
            }
        };

        if (fieldName === 'stateOfPractice' || fieldName === 'state') {
            return (
                <FormControl fullWidth margin="dense" {...inputProps}>
                    <InputLabel>{formattedFieldName}</InputLabel>
                    <Select
                        autoFocus
                        value={currentValue || ''}
                        label={formattedFieldName}
                        onChange={(e) => setCurrentValue(e.target.value)}
                    >
                        {nigerianStates.map(state => (
                            <MenuItem key={state} value={state} sx={{ fontFamily: 'Sora, sans-serif' }}>{state}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
            );
        }

        if (fieldName === 'professionalVerificationStatus') {
            return (
                <FormControl fullWidth margin="dense" {...inputProps}>
                    <InputLabel>Verification Status</InputLabel>
                    <Select
                        autoFocus
                        value={currentValue || ''}
                        label="Verification Status"
                        onChange={(e) => setCurrentValue(e.target.value)}
                    >
                        <MenuItem value="not_started">Not Started</MenuItem>
                        <MenuItem value="pending_review">Pending Review</MenuItem>
                        <MenuItem value="approved">Approved</MenuItem>
                        <MenuItem value="rejected">Rejected</MenuItem>
                    </Select>
                </FormControl>
            );
        }

        return (
            <TextField
                autoFocus
                margin="dense"
                label={formattedFieldName}
                type="text"
                fullWidth
                variant="outlined"
                value={currentValue || ''}
                onChange={(e) => setCurrentValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSave()}
                {...inputProps}
            />
        );
    };

    return (
        <Dialog 
            open={open} 
            onClose={onClose} 
            fullWidth 
            maxWidth="xs"
            PaperProps={{ className: 'verification-modal-paper' }}
        >
            <DialogTitle sx={{ 
                fontFamily: 'Sora, sans-serif', 
                fontWeight: 700, 
                fontSize: '1.25rem',
                color: '#1a1a1a',
                pb: 1
            }}>
                Edit {formattedFieldName}
            </DialogTitle>
            <DialogContent sx={{ pt: 1 }}>
                {renderInput()}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                <Button 
                    onClick={onClose}
                    sx={{ 
                        color: '#666', 
                        fontFamily: 'Sora, sans-serif',
                        fontWeight: 600,
                        textTransform: 'none'
                    }}
                >
                    Cancel
                </Button>
                <Button 
                    onClick={handleSave}
                    variant="contained"
                    sx={{ 
                        bgcolor: 'var(--primary-green)',
                        '&:hover': { bgcolor: 'hsl(160, 80%, 25%)' },
                        borderRadius: '10px',
                        fontFamily: 'Sora, sans-serif',
                        fontWeight: 600,
                        textTransform: 'none',
                        px: 3
                    }}
                >
                    Save Changes
                </Button>
            </DialogActions>
        </Dialog>
    );
};

const SwitchPharmacyDialog = ({ open, onClose, onSwitch }: SwitchPharmacyDialogProps) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [pharmacies, setPharmacies] = useState<DetailedUser[]>([]);
    const [selectedPharmacy, setSelectedPharmacy] = useState<DetailedUser | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const search = async () => {
            if (!searchQuery.trim()) {
                setPharmacies([]);
                return;
            }
            setIsSearching(true);
            setError(null);
            try {
                const response = await fetch(`/api/pharmacies?search=${searchQuery}`);
                if (!response.ok) {
                    throw new Error('Failed to search for pharmacies.');
                }
                const data = await response.json();
                const pharmaciesData = Array.isArray(data) ? data : data.pharmacies || [];
                setPharmacies(pharmaciesData);
            } catch (err: any) {
                setError(err.message);
                setPharmacies([]);
            } finally {
                setIsSearching(false);
            }
        };

        const timerId = setTimeout(() => {
            search();
        }, 500);

        return () => clearTimeout(timerId);
    }, [searchQuery]);

    const handleSwitch = () => {
        if (selectedPharmacy) {
            onSwitch(selectedPharmacy._id);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>Switch Pharmacy</DialogTitle>
            <DialogContent>
                <TextField
                    autoFocus
                    margin="dense"
                    label="Search for a pharmacy by name or address"
                    type="text"
                    fullWidth
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                {isSearching && <CircularProgress size={24} sx={{ display: 'block', margin: 'auto', mt: 2 }} />}
                {error && <Typography color="error" sx={{ mt: 2 }}>{error}</Typography>}
                <List sx={{ mt: 2 }}>
                    {pharmacies.map((pharmacy) => (
                        <ListItem
                            key={pharmacy._id}
                            onClick={() => setSelectedPharmacy(pharmacy)}
                            sx={{
                                p: 2,
                                border: '1px solid',
                                borderColor: selectedPharmacy?._id === pharmacy._id ? '#0F6E56' : 'rgba(0,0,0,0.06)',
                                borderRadius: '12px',
                                mb: 1,
                                cursor: 'pointer',
                                background: selectedPharmacy?._id === pharmacy._id ? 'rgba(15, 110, 86, 0.05)' : 'transparent',
                                '&:hover': { background: 'rgba(0,0,0,0.02)' }
                            }}
                        >
                            <Box>
                                <Typography sx={{ fontWeight: 600 }}>{pharmacy.businessName}</Typography>
                                <Typography variant="caption" sx={{ color: '#666' }}>{pharmacy.businessAddress}</Typography>
                            </Box>
                        </ListItem>
                    ))}
                    {pharmacies.length === 0 && searchQuery.length > 0 && !isSearching && (
                        <Typography sx={{ textAlign: 'center', mt: 2 }}>No pharmacies found.</Typography>
                    )}
                </List>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={handleSwitch} disabled={!selectedPharmacy}>Confirm Switch</Button>
            </DialogActions>
        </Dialog>
    );
};


const AccountContent = ({ setView, onBack }: AccountContentProps) => {
    const { user: sessionUser, isLoading: isSessionLoading, refreshSession, logout } = useSession();
    const [detailedUser, setDetailedUser] = useState<DetailedUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
    const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
    const [editingField, setEditingField] = useState<string | null>(null);
    const [fieldValue, setFieldValue] = useState<any>(null);
    const [showSubscription, setShowSubscription] = useState(false);
    const [isSwitchingPharmacy, setIsSwitchingPharmacy] = useState(false);
    const [pharmacists, setPharmacists] = useState<Pharmacist[]>([]);
    const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
    const [isUpdatingAccess, setIsUpdatingAccess] = useState(false);
    const [accessUpdateResult, setAccessUpdateResult] = useState<{ status: 'success' | 'error'; message: string } | null>(null);
    const [pushEnabled, setPushEnabled] = useState(true);
    const [whatsappEnabled, setWhatsappEnabled] = useState(true);
    const [locationEnabled, setLocationEnabled] = useState(true);
    const [isActivityCentreEnabled, setIsActivityCentreEnabled] = useState(true);
    const [profileMode, setProfileMode] = useState<'list' | 'profile' | 'contact' | 'about' | 'privacy' | 'store' | 'restock' | 'consultations' | 'whatsapp'>('list');
    const [consultations, setConsultations] = useState<any[]>([]);
    const [isConsultationLoading, setIsConsultationLoading] = useState(false);
    const [currentConsultation, setCurrentConsultation] = useState<any | null>(null);
    const [replyText, setReplyText] = useState('');
    const [isReplying, setIsReplying] = useState(false);
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [isRxModalOpen, setIsRxModalOpen] = useState(false);
    const [rxFile, setRxFile] = useState<File | null>(null);
    const [isUploadingRx, setIsUploadingRx] = useState(false);
    const [rxUploadError, setRxUploadError] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        const fetchGlobalSettings = async () => {
            if (sessionUser?.role === 'admin') {
                try {
                    const res = await fetch('/api/admin/settings');
                    const data = await res.json();
                    if (data && typeof data.isActivityCentreEnabled === 'boolean') {
                        setIsActivityCentreEnabled(data.isActivityCentreEnabled);
                    }
                } catch (err) {
                    console.error("Error fetching admin settings:", err);
                }
            }
        };

        const fetchUserData = async () => {
            if (sessionUser) {
                try {
                    setIsLoading(true);
                    
                    // Fetch account and pharmacists in parallel if user is a pharmacy
                    const accountPromise = fetch('/api/account', { 
                        credentials: 'include',
                        cache: 'no-store'
                    });

                    let pharmacistsPromise: Promise<Response | null> = Promise.resolve(null);
                    if (sessionUser.role === 'pharmacy') {
                        pharmacistsPromise = fetch('/api/account/pharmacists', { 
                            credentials: 'include',
                            cache: 'no-store'
                        });
                    }

                    const [accountRes, pharmacistsRes] = await Promise.all([accountPromise, pharmacistsPromise]);

                    if (!accountRes.ok) throw new Error('Failed to fetch account details.');
                    const data = await accountRes.json();
                    setDetailedUser(data);

                    if (pharmacistsRes && pharmacistsRes.ok) {
                        const pharmacistsData = await pharmacistsRes.json();
                        setPharmacists(pharmacistsData.pharmacists);
                    }
                } catch (err: any) {
                    setError(err.message);
                } finally {
                    setIsLoading(false);
                }
            }
        };

        const fetchConsultations = async () => {
            if (sessionUser?.role === 'admin') {
                try {
                    setIsConsultationLoading(true);
                    const res = await fetch('/api/consultations?type=escalated');
                    const data = await res.json();
                    setConsultations(Array.isArray(data) ? data : []);
                } catch (err) {
                    console.error("Error fetching consultations:", err);
                } finally {
                    setIsConsultationLoading(false);
                }
            }
        };

        if (!isSessionLoading) {
            if (sessionUser) {
                fetchUserData();
                fetchGlobalSettings();
                fetchConsultations();
            } else {
                router.push('/auth');
            }
        }
    }, [sessionUser, isSessionLoading, router]);

    const handleConsultationReply = async () => {
        if (!currentConsultation || !replyText.trim()) return;
        setIsReplying(true);
        try {
            const res = await fetch('/api/consultations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ consultationId: currentConsultation._id, text: replyText })
            });
            if (res.ok) {
                const updated = await res.json();
                setCurrentConsultation(updated);
                setReplyText('');
                // Refresh list
                const listRes = await fetch('/api/consultations?type=escalated');
                const listData = await listRes.json();
                setConsultations(Array.isArray(listData) ? listData : []);
            }
        } catch (err) {
            console.error("Reply err:", err);
        } finally {
            setIsReplying(false);
        }
    };

    const handleAccessChange = async (pharmacistId: string, canManageStore: boolean) => {
        setIsAccessModalOpen(true);
        setIsUpdatingAccess(true);
        setAccessUpdateResult(null);

        try {
            const response = await fetch('/api/account/pharmacists/manage-access', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ pharmacistId, canManageStore }),
            });

            const responseBody = await response.json();

            if (!response.ok) {
                throw new Error(responseBody.message || 'An unknown error occurred.');
            }
            
            setAccessUpdateResult({ status: 'success', message: 'Access updated successfully!' });
            router.refresh();
        } catch (err: any) {
            setAccessUpdateResult({ status: 'error', message: `Update failed: ${err.message}` });
        } finally {
            setIsUpdatingAccess(false);
        }
    };
    
    const handleCloseAccessModal = () => {
        setIsAccessModalOpen(false);
        setTimeout(() => setAccessUpdateResult(null), 300);
    };

    const handleLogout = async () => {
        await logout();
        router.replace('/auth');
    };

    const handleEdit = (fieldName: string, value: any) => {
        setEditingField(fieldName);
        setFieldValue(value);
    };

    const handleCloseDialog = () => {
        setEditingField(null);
        setFieldValue(null);
    };

    const handleSave = async (fieldName: string, newValue: any) => {
        // Optimistic UI update: Close instantly and show new value
        const previousValue = detailedUser ? (detailedUser as any)[fieldName] : null;
        if (detailedUser) {
            setDetailedUser({ ...detailedUser, [fieldName]: newValue });
        }
        handleCloseDialog();

        try {
            const response = await fetch('/api/account', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ [fieldName]: newValue }),
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Failed to update ${fieldName}.`);
            }
            
            if (fieldName === 'username') refreshSession();
        } catch (err: any) {
            console.error('Update failed:', err);
            // Revert state on failure
            if (detailedUser) {
                setDetailedUser({ ...detailedUser, [fieldName]: previousValue });
            }
            alert(err.message || 'Failed to sync update with server.');
        }
    };

    const handleResendVerification = async () => {
        if (!detailedUser || detailedUser.emailVerified || resendStatus === 'sending') return;
        
        // Optimistic UI: Set as sent and open modal immediately
        setResendStatus('sent');
        setIsEmailModalOpen(true);

        try {
            const response = await fetch('/api/auth/resend-verification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: detailedUser.email })
            });
            if (!response.ok) {
                // If it fails in background, we can log it or show a subtle error
                // For now, we don't disrupt the user's "success" modal unless it's critical
                console.error('Background verification resend failed');
            }
        } catch (err) {
            console.error('Network error during verification resend:', err);
        }
    };

    const handleSwitchPharmacy = async (pharmacyId: string) => {
        try {
            const response = await fetch('/api/account/switch-pharmacy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pharmacyId }),
            });
            if (!response.ok) throw new Error('Failed to switch pharmacy.');
            setDetailedUser(null);
            setIsLoading(true);
            setIsSwitchingPharmacy(false);
            const refreshRes = await fetch('/api/account');
            if (refreshRes.ok) {
                const refreshedData = await refreshRes.json();
                setDetailedUser(refreshedData.user);
            }
            setIsLoading(false);
            refreshSession();
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleSubscriptionSuccess = () => {
        refreshSession();
        setShowSubscription(false);
    };

    const handleProfileImageChange = async (imageUrl: string) => {
        if (!detailedUser) return;
        try {
            const response = await fetch('/api/account', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ profilePicture: imageUrl })
            });
            if (!response.ok) throw new Error('Failed to update profile picture');
            setDetailedUser({ ...detailedUser, profilePicture: imageUrl });
            refreshSession();
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleAvatarClick = () => {
        document.getElementById('avatar-input')?.click();
    };

    const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !detailedUser) return;

        // Ensure the file is an image and reasonably sized
        if (!file.type.startsWith('image/')) {
            setError("Please select an image file.");
            return;
        }

        if (file.size > 2 * 1024 * 1024) { // 2MB limit
            setError("Image size should be less than 2MB.");
            return;
        }

        try {
            setIsLoading(true);
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64String = reader.result as string;
                await handleProfileImageChange(base64String);
                setIsLoading(false);
            };
            reader.onerror = () => {
                setError("Failed to read file.");
                setIsLoading(false);
            };
            reader.readAsDataURL(file);
        } catch (err: any) {
            setError("Failed to process image: " + err.message);
            setIsLoading(false);
        }
    };

    const getInitials = (name: string) => {
        if (!name) return '?';
        return name.charAt(0).toUpperCase();
    };

    const EditableListItem = ({ fieldName, label, value, icon }: { fieldName: string, label: string, value: any, icon: React.ReactNode }) => (
        <div className="profile-detail-item" onClick={() => handleEdit(fieldName, value)} style={{ cursor: 'pointer' }}>
            <div className="profile-detail-info">
                <div className="profile-detail-label">{label}</div>
                <div className="profile-detail-value">{value || 'Not provided'}</div>
            </div>
            <div style={{ color: 'var(--primary-green)', opacity: 0.6 }}>
                {icon}
            </div>
        </div>
    );

    if (isSessionLoading || isLoading) return (
        <Box className="account-container" sx={{ pt: 2 }}>
            {/* Skeleton Top Bar */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4 }}>
                <Box sx={{ width: 80, height: 32, bgcolor: 'rgba(0,0,0,0.05)', borderRadius: '20px' }} />
                <Box sx={{ width: 100, height: 32, bgcolor: 'rgba(0,0,0,0.05)', borderRadius: '20px' }} />
            </Box>

            {/* Skeleton Profile Header */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 6 }}>
                <Box sx={{ width: 100, height: 100, bgcolor: 'rgba(0,0,0,0.05)', borderRadius: '50%', mb: 2 }} />
                <Box sx={{ width: 160, height: 24, bgcolor: 'rgba(0,0,0,0.05)', borderRadius: '4px', mb: 2 }} />
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Box sx={{ width: 60, height: 20, bgcolor: 'rgba(0,0,0,0.05)', borderRadius: '10px' }} />
                    <Box sx={{ width: 60, height: 20, bgcolor: 'rgba(0,0,0,0.05)', borderRadius: '10px' }} />
                </Box>
            </Box>

            {/* Skeleton List Items */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {[1, 2, 3, 4].map(i => (
                    <Box key={i} sx={{ width: '100%', height: 60, bgcolor: 'rgba(0,0,0,0.03)', borderRadius: '16px' }} />
                ))}
            </Box>
        </Box>
    );

    if (error || !detailedUser) {
        return (
            <div className="account-container" style={{ textAlign: 'center', paddingTop: '100px' }}>
                <Typography sx={{ color: '#d32f2f', mb: 2 }}>Error: {error || 'Could not load data.'}</Typography>
                <Button variant="contained" sx={{ bgcolor: 'var(--primary-green)', borderRadius: '12px' }} onClick={() => window.location.href = '/auth'}>Login</Button>
            </div>
        );
    }

    const accountUser = detailedUser as DetailedUser;

    return (
        <Box className="account-page-wrapper" sx={{ position: 'relative', width: '100%', pt: 2 }}>
            <Box sx={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0, pointerEvents: 'none' }}>
                <DotCanvas />
            </Box>

            <div className="account-container" style={{ position: 'relative', zIndex: 1 }}>
                
                {/* Unified Top Bar */}
                <div className="profile-top-bar">
                    {onBack && profileMode === 'list' && !showSubscription && (
                        <div className="back-btn-pill" onClick={onBack}>
                            <ArrowBack style={{ fontSize: '16px' }} />
                            <span>Back</span>
                        </div>
                    )}
                    {(profileMode === 'profile' || profileMode === 'contact' || profileMode === 'about' || profileMode === 'privacy' || profileMode === 'whatsapp') && (
                        <div className="back-btn-pill" onClick={() => setProfileMode('list')}>
                            <ArrowBack style={{ fontSize: '16px' }} />
                            <span>Back</span>
                        </div>
                    )}
                    <div className="profile-role-tag">
                        {accountUser.role === 'customer' || accountUser.role === 'user' ? 'Patient' : accountUser.role}
                    </div>
                </div>

                {showSubscription ? (
                    <Box sx={{ mt: 2 }}>
                        <div className="back-btn-pill" onClick={() => setShowSubscription(false)} style={{ width: 'fit-content', marginBottom: '24px' }}>
                            <ArrowBack style={{ fontSize: '16px' }} />
                            <span>Back to Account</span>
                        </div>
                        <SubscriptionContent onSubscriptionSuccess={handleSubscriptionSuccess} />
                    </Box>
                ) : (
                    <Box sx={{ width: '100%' }}>
                        {profileMode === 'profile' && (
                            <Box sx={{ mt: 2 }}>
                                <div className="sec-tag" style={{ marginTop: 0 }}>Identity & Contact</div>
                                <div className="glass-card">
                                    <EditableListItem fieldName="username" label="Name" value={accountUser.username} icon={<Person fontSize="small" />} />
                                    <EditableListItem fieldName="email" label="Email" value={accountUser.email} icon={<ContactMail fontSize="small" />} />
                                    
                                    {(() => {
                                        const isPharmacist = accountUser.role === 'pharmacist';
                                        const phoneFieldName = isPharmacist ? 'mobile' : 'phoneNumber';
                                        const phoneValue = isPharmacist ? accountUser.mobile : accountUser.phoneNumber;
                                        const stateFieldName = isPharmacist ? 'stateOfPractice' : 'state';
                                        const stateValue = isPharmacist ? accountUser.stateOfPractice : accountUser.state;

                                        return (
                                            <>
                                                <EditableListItem fieldName={phoneFieldName} label="Phone Number" value={phoneValue} icon={<Phone fontSize="small" />} />
                                                <EditableListItem fieldName={stateFieldName} label="State" value={stateValue} icon={<LocationOn fontSize="small" />} />
                                                <EditableListItem fieldName="city" label="City" value={accountUser.city} icon={<LocationOn fontSize="small" />} />
                                            </>
                                        );
                                    })()}
                                </div>

                                {['pharmacy', 'clinic', 'vendor', 'pharmacist'].includes(accountUser.role) && (
                                    <>
                                        <div className="sec-tag">Professional Details</div>
                                        <div className="glass-card">
                                            {['pharmacy', 'clinic', 'vendor'].includes(accountUser.role) && (
                                                <>
                                                    <EditableListItem fieldName="businessName" label="Business Name" value={accountUser.businessName} icon={<Business fontSize="small" />} />
                                                    <EditableListItem fieldName="businessAddress" label="Business Address" value={accountUser.businessAddress} icon={<LocationOn fontSize="small" />} />
                                                </>
                                            )}
                                            {['pharmacist', 'pharmacy'].includes(accountUser.role) && (
                                                <EditableListItem fieldName="licenseNumber" label="License Number" value={accountUser.licenseNumber} icon={<Assignment fontSize="small" />} />
                                            )}
                                        </div>
                                    </>
                                )}
                            </Box>
                        )}

                        {profileMode === 'contact' && (
                            <Box sx={{ mt: 2 }}>
                                <div className="sec-tag" style={{ marginTop: 0 }}>Contact & Support</div>
                                <div className="glass-card" style={{ padding: '8px' }}>
                                    <a href="https://wa.me/2349134589572" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
                                        <div className="profile-row-action">
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <WhatsAppIcon style={{ color: '#25D366' }} />
                                                <Typography className="profile-row-label">Chat on WhatsApp</Typography>
                                            </Box>
                                            <span className="profile-chevron">›</span>
                                        </div>
                                    </a>
                                    <a href="mailto:pharmastackx@gmail.com" style={{ textDecoration: 'none', color: 'inherit' }}>
                                        <div className="profile-row-action">
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <EmailIcon style={{ color: 'var(--primary-green)' }} />
                                                <Typography className="profile-row-label">Email Support</Typography>
                                            </Box>
                                            <span className="profile-chevron">›</span>
                                        </div>
                                    </a>
                                    <a href="tel:+2349134589572" style={{ textDecoration: 'none', color: 'inherit' }}>
                                        <div className="profile-row-action">
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <Phone style={{ color: 'var(--primary-green)' }} />
                                                <Typography className="profile-row-label">Call Us</Typography>
                                            </Box>
                                            <span className="profile-chevron">›</span>
                                        </div>
                                    </a>
                                </div>
                                <Box sx={{ mt: 4, textAlign: 'center', opacity: 0.6 }}>
                                    <Typography variant="caption" sx={{ fontFamily: 'Sora, sans-serif' }}>
                                        We typically respond within an hour during business hours.
                                    </Typography>
                                </Box>
                            </Box>
                        )}

                        {profileMode === 'about' && (
                            <Box sx={{ mt: 2 }}>
                                <AboutContent />
                            </Box>
                        )}

                        {profileMode === 'privacy' && (
                            <Box sx={{ mt: 2 }}>
                                <PrivacyContent />
                            </Box>
                        )}

                        {profileMode === 'store' && (
                            <Box sx={{ mt: 2 }}>
                                <StoreManagement onBack={() => setProfileMode('list')} />
                            </Box>
                        )}

                        {profileMode === 'restock' && (
                            <Box sx={{ mt: 2 }}>
                                {sessionUser && <MedicineRestock onBack={() => setProfileMode('list')} userId={(sessionUser as any)._id || sessionUser.id} />}
                            </Box>
                        )}

                        {profileMode === 'whatsapp' && (
                            <Box sx={{ mt: 2 }}>
                                <WhatsAppManagement />
                            </Box>
                        )}

                        {profileMode === 'list' && (
                            <Box sx={{ mt: 2 }}>
                                <div className="profile-main-header">
                                    <div className="avatar-wrapper" onClick={handleAvatarClick}>
                                        <Avatar src={accountUser.profilePicture} className="profile-avatar-large">
                                            {!accountUser.profilePicture && getInitials(accountUser.username)}
                                        </Avatar>
                                        <div className="avatar-edit-overlay">
                                            <Edit style={{ fontSize: '16px', color: '#fff' }} />
                                        </div>
                                        <input type="file" id="avatar-input" hidden accept="image/*" onChange={handleAvatarChange} />
                                    </div>
                                    <div className="profile-name">{accountUser.username}</div>
                                    
                                    <div className="badge-row">
                                        {/* Email Badge */}
                                        {accountUser.emailVerified ? (
                                            <div className="badge badge-verified">
                                                <span className="status-dot"></span>
                                                <span>Verified</span>
                                            </div>
                                        ) : (
                                            <div 
                                                className="badge badge-unverified" 
                                                onClick={handleResendVerification}
                                                style={{ cursor: 'pointer' }}
                                            >
                                                <span className="status-dot"></span>
                                                <span>{resendStatus === 'sent' ? 'Verification Sent' : 'Verify Email'}</span>
                                            </div>
                                        )}

                                        {/* Membership Badge */}
                                        <div className="badge badge-rating" onClick={() => setShowSubscription(true)} style={{ cursor: 'pointer' }}>
                                            <span className="status-dot"></span>
                                            <span>{accountUser.subscriptionStatus === 'subscribed' ? 'Pro Membership' : 'Basic Plan'}</span>
                                        </div>

                                        {/* Professional RX Badge */}
                                        {['pharmacist', 'pharmacy'].includes(accountUser.role) && (
                                            <div 
                                                className={`badge ${
                                                    accountUser.professionalVerificationStatus === 'approved' ? 'badge-verified' : 
                                                    accountUser.professionalVerificationStatus === 'pending_review' ? 'badge-pending' : 
                                                    'badge-unverified'
                                                }`} 
                                                onClick={() => {
                                                    if (accountUser.professionalVerificationStatus === 'not_started' || accountUser.professionalVerificationStatus === 'rejected') {
                                                        setIsRxModalOpen(true);
                                                    }
                                                }}
                                                style={{ cursor: (accountUser.professionalVerificationStatus === 'not_started' || accountUser.professionalVerificationStatus === 'rejected') ? 'pointer' : 'default' }}
                                            >
                                                <span className="status-dot"></span>
                                                <span>{
                                                    accountUser.professionalVerificationStatus === 'approved' ? 'RX Verified' : 
                                                    accountUser.professionalVerificationStatus === 'pending_review' ? 'Pending Review' : 
                                                    'RX Unverified'
                                                }</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="sec-tag">Personal Information</div>
                                <div className="glass-card" style={{ padding: '8px' }}>
                                    <div className="profile-row-action" onClick={() => setProfileMode('profile')}>
                                        <Person style={{ color: 'var(--primary-green)' }} />
                                        <span className="profile-row-label">User Profile</span>
                                        <span className="profile-chevron">›</span>
                                    </div>
                                </div>

                                {['pharmacy', 'pharmacist', 'admin', 'clinic'].includes(accountUser.role) && (
                                    <>
                                        <div className="sec-tag">Pharmacy Management</div>
                                        <div className="glass-card" style={{ padding: '8px' }}>
                                            {['pharmacy', 'pharmacist', 'admin'].includes(accountUser.role) && (
                                                <div className="profile-row-action" onClick={() => setProfileMode('store')}>
                                                    <Business style={{ color: 'var(--primary-green)' }} />
                                                    <span className="profile-row-label">Store Management</span>
                                                    <span className="profile-chevron">›</span>
                                                </div>
                                            )}
                                            {['pharmacy', 'pharmacist', 'admin', 'clinic'].includes(accountUser.role) && (
                                                <div className="profile-row-action" onClick={() => setProfileMode('restock')}>
                                                    <LocalHospital style={{ color: 'var(--primary-green)' }} />
                                                    <span className="profile-row-label">Medicine Restock</span>
                                                    <span className="profile-chevron">›</span>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}

                                {accountUser.role === 'admin' && (
                                    <>
                                        <div className="sec-tag">Platform Administration</div>
                                        <div className="glass-card" style={{ padding: '8px' }}>
                                            <div className="profile-row">
                                                <div className="profile-row-left">
                                                    <LocalHospital style={{ color: 'var(--primary-green)' }} />
                                                    <div className="profile-row-info">
                                                        <span className="profile-row-label">Activity Centre Module</span>
                                                        <span className="profile-row-subtitle">Toggle Activity Centre visibility globally</span>
                                                    </div>
                                                </div>
                                                <Switch 
                                                    checked={isActivityCentreEnabled}
                                                    onChange={async (e) => {
                                                        const newVal = e.target.checked;
                                                        setIsActivityCentreEnabled(newVal);
                                                        try {
                                                            await fetch('/api/admin/settings', {
                                                                method: 'POST',
                                                                headers: { 'Content-Type': 'application/json' },
                                                                body: JSON.stringify({ isActivityCentreEnabled: newVal }),
                                                            });
                                                        } catch (err) {
                                                            console.error("Error updating settings:", err);
                                                        }
                                                    }}
                                                    sx={{
                                                        '& .MuiSwitch-switchBase.Mui-checked': { color: 'var(--primary-green)' },
                                                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: 'var(--primary-green)' }
                                                    }}
                                                />
                                            </div>
                                            <div className="profile-row-action" onClick={() => router.push('/admin/god-mode')}>
                                                <VpnKey style={{ color: 'var(--primary-green)' }} />
                                                <span className="profile-row-label">God Mode Terminal</span>
                                                <span className="profile-chevron">›</span>
                                            </div>
                                            <div className="profile-row-action" onClick={() => setProfileMode('whatsapp')}>
                                                <WhatsAppIcon style={{ color: '#25D366' }} />
                                                <span className="profile-row-label">WhatsApp Management</span>
                                                <span className="profile-chevron">›</span>
                                            </div>
                                            <div className="profile-row-action" onClick={() => setProfileMode('consultations')}>
                                                <MedicationIcon style={{ color: 'var(--primary-green)' }} />
                                                <span className="profile-row-label">Pharmacy Consultations</span>
                                                {consultations.length > 0 && <span style={{ background: '#B45309', color: 'white', fontSize: '10px', padding: '2px 6px', borderRadius: '10px', marginLeft: '8px' }}>{consultations.length}</span>}
                                                <span className="profile-chevron">›</span>
                                            </div>
                                        </div>
                                    </>
                                )}

                                <div className="sec-tag">Support</div>
                                <div className="glass-card" style={{ padding: '8px' }}>
                                    <div className="profile-row-action" onClick={() => setProfileMode('contact')}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <ContactMail style={{ color: 'var(--primary-green)' }} />
                                            <Typography className="profile-row-label">Contact Us</Typography>
                                        </Box>
                                        <span className="profile-chevron">›</span>
                                    </div>
                                    <div className="profile-row-action" onClick={() => setProfileMode('about')}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <Info style={{ color: 'var(--primary-green)' }} />
                                            <Typography className="profile-row-label">About Us</Typography>
                                        </Box>
                                        <span className="profile-chevron">›</span>
                                    </div>
                                    <div className="profile-row-action" onClick={() => setProfileMode('privacy')}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <Assignment style={{ color: 'var(--primary-green)' }} />
                                            <Typography className="profile-row-label">Privacy Policy</Typography>
                                        </Box>
                                        <span className="profile-chevron">›</span>
                                    </div>
                                </div>

                                <div className="account-signout" onClick={handleLogout}>Sign out</div>
                                <div className="account-version">PharmaStackX v1.0.0</div>
                            </Box>
                        )}

                        {profileMode === 'consultations' && (
                            <Box sx={{ p: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                                    <IconButton onClick={() => { setProfileMode('list'); setCurrentConsultation(null); }} size="small">
                                        <ArrowBack />
                                    </IconButton>
                                    <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: 'Sora, sans-serif' }}>
                                        {currentConsultation ? 'Chat Session' : 'Escalated Consultations'}
                                    </Typography>
                                </Box>

                                {!currentConsultation ? (
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        {isConsultationLoading ? <CircularProgress sx={{ mx: 'auto', mt: 4 }} /> : (
                                            consultations.length === 0 ? (
                                                <Typography sx={{ textAlign: 'center', p: 4, color: '#666' }}>No escalated consultations at the moment.</Typography>
                                            ) : (
                                                consultations.map((c: any) => (
                                                    <Box key={c._id} onClick={() => setCurrentConsultation(c)} className="glass-card" sx={{ p: 2, cursor: 'pointer', '&:hover': { background: 'rgba(0,0,0,0.02)' } }}>
                                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                                            <Typography sx={{ fontWeight: 700, color: '#0F6E56' }}>User Session</Typography>
                                                            <Typography sx={{ fontSize: '12px', color: '#666' }}>{new Date(c.updatedAt).toLocaleDateString()}</Typography>
                                                        </Box>
                                                        <Typography sx={{ fontSize: '13px', color: '#333', mb: 1, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                                            Last: {c.messages[c.messages.length - 1]?.text}
                                                        </Typography>
                                                        <Box sx={{ display: 'flex', gap: 1 }}>
                                                            <span style={{ fontSize: '10px', background: '#FFFBEB', color: '#B45309', padding: '2px 4px', borderRadius: '4px', border: '1px solid #FDE68A' }}>
                                                                Escalated ({c.aiMoveCount} AI moves)
                                                            </span>
                                                        </Box>
                                                    </Box>
                                                ))
                                            )
                                        )}
                                    </Box>
                                ) : (
                                    <Box sx={{ display: 'flex', flexDirection: 'column', height: '600px', bgcolor: '#fff', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.06)' }}>
                                        <Box 
                                            sx={{ 
                                                flexGrow: 1, 
                                                p: 2, 
                                                overflowY: 'auto', 
                                                display: 'flex', 
                                                flexDirection: 'column', 
                                                gap: 2, 
                                                bgcolor: '#fafafa',
                                                '&::-webkit-scrollbar': {
                                                    width: '8px',
                                                },
                                                '&::-webkit-scrollbar-track': {
                                                    background: '#f1f1f1',
                                                },
                                                '&::-webkit-scrollbar-thumb': {
                                                    background: '#0F6E56',
                                                    borderRadius: '10px',
                                                },
                                                '&::-webkit-scrollbar-thumb:hover': {
                                                    background: '#0B5E4A',
                                                },
                                            }}
                                        >
                                            {currentConsultation.messages.map((m: any, i: number) => (
                                                <Box key={i} sx={{ alignSelf: m.sender === 'user' ? 'flex-start' : 'flex-end', maxWidth: '85%', p: 1.5, borderRadius: '12px', bgcolor: m.sender === 'user' ? '#fff' : (m.sender === 'ai' ? '#eee' : '#0F6E56'), color: (m.sender === 'user' || m.sender === 'ai') ? '#333' : '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                                                    <Typography sx={{ fontSize: '10px', fontWeight: 700, mb: 0.5, opacity: 0.7 }}>{m.sender.toUpperCase()}</Typography>
                                                    <Typography sx={{ fontSize: '13px' }}>{m.text}</Typography>
                                                </Box>
                                            ))}
                                        </Box>
                                        <Box sx={{ p: 2, borderTop: '1px solid #eee', display: 'flex', gap: 1 }}>
                                            <TextField 
                                                fullWidth 
                                                size="small" 
                                                placeholder="Type professional response..." 
                                                value={replyText} 
                                                onChange={(e) => setReplyText(e.target.value)}
                                                onKeyPress={(e) => e.key === 'Enter' && handleConsultationReply()}
                                                disabled={isReplying}
                                            />
                                            <Button 
                                                variant="contained" 
                                                onClick={handleConsultationReply} 
                                                disabled={isReplying || !replyText.trim()}
                                                sx={{ bgcolor: '#0F6E56', '&:hover': { bgcolor: '#0B5E4A' } }}
                                            >
                                                {isReplying ? <CircularProgress size={20} /> : 'Send'}
                                            </Button>
                                        </Box>
                                    </Box>
                                )}
                            </Box>
                        )}
                    </Box>
                )}

                {editingField && <EditDialog open={!!editingField} onClose={handleCloseDialog} onSave={handleSave} fieldName={editingField} value={fieldValue} />}
                
                <SwitchPharmacyDialog 
                    open={isSwitchingPharmacy} 
                    onClose={() => setIsSwitchingPharmacy(false)} 
                    onSwitch={handleSwitchPharmacy} 
                />

                <Dialog open={isAccessModalOpen} onClose={handleCloseAccessModal} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: '24px', p: 1 } }}>
                    <DialogTitle sx={{ textAlign: 'center', pb: 1, fontFamily: 'var(--font-sora), sans-serif', fontWeight: 700 }}>
                        {isUpdatingAccess ? 'Updating Access' : accessUpdateResult?.status === 'success' ? 'Update Successful' : 'Update Failed'}
                    </DialogTitle>
                    <DialogContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 3 }}>
                        {isUpdatingAccess ? (
                            <CircularProgress sx={{ mb: 2, color: 'var(--primary-green)' }} />
                        ) : accessUpdateResult?.status === 'success' ? (
                            <CheckCircleOutline sx={{ fontSize: 60, mb: 2, color: 'var(--primary-green)' }} />
                        ) : (
                            <ErrorOutline color="error" sx={{ fontSize: 60, mb: 2 }} />
                        )}
                        <Typography variant="body1" sx={{ textAlign: 'center', color: '#555' }}>
                            {isUpdatingAccess ? 'Changing pharmacist permissions...' : accessUpdateResult?.message}
                        </Typography>
                    </DialogContent>
                    <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
                        {!isUpdatingAccess && (
                            <Button 
                                onClick={handleCloseAccessModal}
                                sx={{ color: '#111', fontWeight: 600, textTransform: 'none' }}
                            >
                                Close
                            </Button>
                        )}
                    </DialogActions>
                </Dialog>

                <Dialog open={isEmailModalOpen} onClose={() => setIsEmailModalOpen(false)} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: '24px', p: 1 } }}>
                    <DialogTitle sx={{ textAlign: 'center', pb: 1, fontFamily: 'var(--font-sora), sans-serif', fontWeight: 700 }}>
                        Verify Your Email
                    </DialogTitle>
                    <DialogContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 3 }}>
                        <ContactMail sx={{ fontSize: 60, mb: 2, color: 'var(--primary-green)' }} />
                        <Typography variant="body1" sx={{ textAlign: 'center', color: '#555' }}>
                            A verification link has been sent to your email address. Please check your inbox (and spam folder) to complete the verification.
                        </Typography>
                    </DialogContent>
                    <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
                        <Button 
                            onClick={() => setIsEmailModalOpen(false)}
                            sx={{ 
                                bgcolor: 'var(--primary-green)', 
                                color: '#fff', 
                                fontWeight: 600, 
                                textTransform: 'none',
                                px: 4,
                                borderRadius: '12px',
                                '&:hover': { bgcolor: '#084d3c' }
                            }}
                        >
                            Got it!
                        </Button>
                    </DialogActions>
                </Dialog>
                
                {/* RX Verification Modal */}
                <Dialog 
                    open={isRxModalOpen} 
                    onClose={() => !isUploadingRx && setIsRxModalOpen(false)} 
                    fullWidth 
                    maxWidth="sm" 
                    PaperProps={{ 
                        className: 'verification-modal-paper'
                    }}
                >
                    <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1, pt: 3, px: 3 }}>
                        <Typography sx={{ fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: '20px' }}>
                            Professional Verification
                        </Typography>
                        {!isUploadingRx && (
                            <IconButton onClick={() => setIsRxModalOpen(false)} size="small">
                                <Close />
                            </IconButton>
                        )}
                    </DialogTitle>
                    <DialogContent sx={{ px: 3, pb: 4 }}>
                        <Typography variant="body2" sx={{ color: '#666', mb: 3 }}>
                            Please upload your pharmacist license or business permit to verify your professional status.
                        </Typography>

                        <input
                            type="file"
                            id="rx-file-input"
                            style={{ display: 'none' }}
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) setRxFile(file);
                            }}
                            accept="image/*,application/pdf"
                        />

                        <label htmlFor="rx-file-input" style={{ width: '100%' }}>
                            <Box className={`upload-zone ${rxFile ? 'has-file' : ''}`}>
                                {rxFile ? (
                                    <Box className="file-preview">
                                        <AttachFile className="file-preview-icon" />
                                        <Typography className="file-preview-name">{rxFile.name}</Typography>
                                    </Box>
                                ) : (
                                    <Box sx={{ py: 2 }}>
                                        <CloudUpload sx={{ fontSize: 48, color: 'var(--primary-green)', mb: 1, opacity: 0.5 }} />
                                        <Typography sx={{ fontWeight: 700, mb: 0.5 }}>Click to upload document</Typography>
                                        <Typography variant="caption" sx={{ color: '#999' }}>JPG, PNG or PDF (Max 5MB)</Typography>
                                    </Box>
                                )}
                            </Box>
                        </label>

                        {rxUploadError && (
                            <Typography color="error" variant="caption" sx={{ display: 'block', mt: 2, textAlign: 'center', fontWeight: 600 }}>
                                {rxUploadError}
                            </Typography>
                        )}
                    </DialogContent>
                    <DialogActions sx={{ px: 3, pb: 4 }}>
                        <Button 
                            className="upgrade-button-premium"
                            fullWidth
                            disabled={!rxFile || isUploadingRx}
                            onClick={async () => {
                                if (!rxFile) return;
                                setIsUploadingRx(true);
                                setRxUploadError(null);
                                
                                const formData = new FormData();
                                formData.append('file', rxFile);
                                
                                try {
                                    const res = await fetch('/api/account/verify-professional', {
                                        method: 'POST',
                                        body: formData
                                    });
                                    
                                    if (res.ok) {
                                        // Update local state IMMEDIATELY
                                        if (detailedUser) {
                                            setDetailedUser({
                                                ...detailedUser,
                                                professionalVerificationStatus: 'pending_review'
                                            });
                                        }
                                        setIsRxModalOpen(false);
                                        // Refresh session in background to sync other components
                                        refreshSession();
                                    } else {
                                        const data = await res.json();
                                        setRxUploadError(data.error || 'Failed to upload document.');
                                    }
                                } catch (err) {
                                    setRxUploadError('Connection error. Please try again.');
                                } finally {
                                    setIsUploadingRx(false);
                                }
                            }}
                        >
                            {isUploadingRx ? <CircularProgress size={24} color="inherit" /> : 'Submit for Review'}
                        </Button>
                    </DialogActions>
                </Dialog>
            </div>
        </Box>
    );
};

export default AccountContent;
