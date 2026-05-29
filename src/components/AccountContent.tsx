"use client";
import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useSession } from "@/context/SessionProvider";
import { Box, Typography, Avatar, Button, List, ListItem, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton, Select, MenuItem, FormControl, InputLabel, Switch, Chip } from "@mui/material";
import { Person, VpnKey, Info, ContactMail, Business, LocationOn, ArrowBack, Phone, LocalHospital, Assignment, Edit, CheckCircleOutline, ErrorOutline, CloudUpload, AttachFile, Close, WhatsApp as WhatsAppIcon, Email as EmailIcon, Medication as MedicationIcon, SmartToy, NotificationsActive, Security, BarChart } from "@mui/icons-material";
import { messaging } from '../lib/firebase';
import { getToken } from 'firebase/messaging';
import { motion, AnimatePresence } from 'framer-motion';
import '../styles/Account.css';

// Dynamically import sub-components
const SubscriptionContent = dynamic(() => import('./SubscriptionContent'), { ssr: false });
const StoreManagement = dynamic(() => import('../app/components/StoreManagement'), { ssr: false });
const MedicineRestock = dynamic(() => import('./MedicineRestock'), { ssr: false });
const WhatsAppManagement = dynamic(() => import('./WhatsAppManagement'), { ssr: false });
const DataCentreContent = dynamic(() => import('./DataCentreContent'), { ssr: false });
const AICommandCentreContent = dynamic(() => import('./AICommandCentreContent'), { ssr: false });
const TopContactsContent = dynamic(() => import('@/components/TopContactsContent'), { ssr: false });
const DeliveryAgentsContent = dynamic(() => import('@/components/DeliveryAgentsContent'), { ssr: false });
const AboutContent = dynamic(() => import('./AboutContent'), { ssr: false });
const PrivacyContent = dynamic(() => import('./PrivacyContent'), { ssr: false });
const GodMode = dynamic(() => import('../app/admin/god-mode/page'), { ssr: false });

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
    pharmacy?: string | { _id: string; businessName: string; city?: string };
}

interface AccountContentProps {
    setView: (view: string) => void;
    onBack?: () => void;
}

const nigerianStates = [
    "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
    "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT - Abuja", "Gombe",
    "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos",
    "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto",
    "Taraba", "Yobe", "Zamfara"
];

const EditDialog = ({ open, onClose, onSave, fieldName, value }: any) => {
    const [currentValue, setCurrentValue] = useState(value);
    useEffect(() => setCurrentValue(value), [value]);
    const handleSave = () => onSave(fieldName, currentValue);
    const formattedFieldName = fieldName.replace(/([A-Z])/g, ' $1').trim();

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" PaperProps={{ className: 'verification-modal-paper' }}>
            <DialogTitle sx={{ fontFamily: 'Sora, sans-serif', fontWeight: 700 }}>Edit {formattedFieldName}</DialogTitle>
            <DialogContent sx={{ pt: 1 }}>
                {(fieldName === 'stateOfPractice' || fieldName === 'state') ? (
                    <FormControl fullWidth margin="dense">
                        <InputLabel>{formattedFieldName}</InputLabel>
                        <Select value={currentValue || ''} label={formattedFieldName} onChange={(e) => setCurrentValue(e.target.value)}>
                            {nigerianStates.map(state => <MenuItem key={state} value={state}>{state}</MenuItem>)}
                        </Select>
                    </FormControl>
                ) : (
                    <TextField autoFocus margin="dense" label={formattedFieldName} fullWidth variant="outlined" value={currentValue || ''} onChange={(e) => setCurrentValue(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSave()} />
                )}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={onClose} sx={{ color: '#666', textTransform: 'none' }}>Cancel</Button>
                <Button onClick={handleSave} variant="contained" sx={{ bgcolor: 'var(--primary-green)', '&:hover': { bgcolor: '#084d3c' }, borderRadius: '10px', textTransform: 'none' }}>Save Changes</Button>
            </DialogActions>
        </Dialog>
    );
};

const SubPageWrapper = ({ children, onBack, title }: { children: React.ReactNode, onBack: () => void, title?: string }) => (
    <Box 
        component={motion.div}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        sx={{ 
            display: 'flex',
            flexDirection: 'column',
            maxWidth: '1200px',
            margin: '0 auto',
            left: '50%',
            transform: 'translateX(-50%)',
            boxShadow: { sm: '0 10px 40px rgba(0,0,0,0.1)' },
            minHeight: '100vh',
            pb: 10
        }}
    >
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
            <div className="back-btn-pill" onClick={onBack}>
                <ArrowBack style={{ fontSize: '16px' }} />
                <span>Back</span>
            </div>
            {title && (
                <Typography className="fraunces" sx={{ fontWeight: 800, fontSize: '18px', color: 'var(--black)' }}>
                    {title}
                </Typography>
            )}
        </Box>
        <Box sx={{ flexGrow: 1, overflowY: 'auto', p: { xs: 2, sm: 3 } }}>
            {children}
        </Box>
    </Box>
);

const AccountContent = ({ setView, onBack }: AccountContentProps) => {
    const { user: sessionUser, isLoading: isSessionLoading, refreshSession, logout } = useSession();
    const [detailedUser, setDetailedUser] = useState<DetailedUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
    const [editingField, setEditingField] = useState<string | null>(null);
    const [fieldValue, setFieldValue] = useState<any>(null);
    const [showSubscription, setShowSubscription] = useState(false);
    const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
    const [isUpdatingAccess, setIsUpdatingAccess] = useState(false);
    const [accessUpdateResult, setAccessUpdateResult] = useState<{ status: 'success' | 'error'; message: string } | null>(null);
    const [isActivityCentreEnabled, setIsActivityCentreEnabled] = useState(true);
    const [isPulseEnabled, setIsPulseEnabled] = useState(true);
    const [profileMode, setProfileMode] = useState<'list' | 'platform' | 'profile' | 'contact' | 'about' | 'privacy' | 'store' | 'restock' | 'consultations' | 'whatsapp' | 'datacentre' | 'aicentre' | 'top-contacts' | 'delivery-agents' | 'godmode'>('list');
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
    const [isPushSyncing, setIsPushSyncing] = useState(false);
    const [isPWA, setIsPWA] = useState(false);
    const router = useRouter();

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setIsPWA(window.matchMedia('(display-mode: standalone)').matches);
        }
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            if (!sessionUser) return;
            try {
                setIsLoading(true);
                const [userRes, settingsRes, consultRes] = await Promise.all([
                    fetch('/api/account', { credentials: 'include' }),
                    sessionUser.role === 'admin' ? fetch('/api/admin/settings') : Promise.resolve(null),
                    sessionUser.role === 'admin' ? fetch('/api/consultations?type=escalated') : Promise.resolve(null)
                ]);

                if (userRes.ok) setDetailedUser(await userRes.json());
                if (settingsRes?.ok) {
                    const s = await settingsRes.json();
                    setIsActivityCentreEnabled(s.isActivityCentreEnabled !== false);
                    setIsPulseEnabled(s.isPulseModuleEnabled !== false);
                }
                if (consultRes?.ok) setConsultations(await consultRes.json());
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        if (!isSessionLoading) {
            if (sessionUser) fetchData();
            else router.push('/auth');
        }
    }, [sessionUser, isSessionLoading, router]);

    const handleLogout = async () => { await logout(); router.replace('/auth'); };
    const handleSave = async (fieldName: string, newValue: any) => {
        if (detailedUser) setDetailedUser({ ...detailedUser, [fieldName]: newValue });
        setEditingField(null);
        try {
            await fetch('/api/account', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ [fieldName]: newValue }),
            });
            if (fieldName === 'username') refreshSession();
        } catch (err) { console.error(err); }
    };

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
                setCurrentConsultation(await res.json());
                setReplyText('');
                const listRes = await fetch('/api/consultations?type=escalated');
                setConsultations(await listRes.json());
            }
        } catch (err) { console.error(err); }
        finally { setIsReplying(false); }
    };

    const handleUpdatePlatformSettings = async (field: 'activity' | 'pulse', value: boolean) => {
        const payload = {
            isActivityCentreEnabled: field === 'activity' ? value : isActivityCentreEnabled,
            isPulseModuleEnabled: field === 'pulse' ? value : isPulseEnabled
        };
        
        try {
            const res = await fetch('/api/admin/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                if (field === 'activity') setIsActivityCentreEnabled(value);
                else setIsPulseEnabled(value);
            }
        } catch (err) { console.error(err); }
    };

    const EditableListItem = ({ fieldName, label, value, icon }: any) => (
        <div className="profile-detail-item" onClick={() => { setEditingField(fieldName); setFieldValue(value); }} style={{ cursor: 'pointer' }}>
            <div className="profile-detail-info">
                <div className="profile-detail-label">{label}</div>
                <div className="profile-detail-value">{value || 'Not provided'}</div>
            </div>
            <div style={{ color: 'var(--primary-green)', opacity: 0.6 }}>{icon}</div>
        </div>
    );

    if (isSessionLoading || isLoading) return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress color="inherit" /></Box>;
    if (!detailedUser) return null;

    const accountUser = detailedUser;

    const quickCardSx = {
        background: '#fff',
        border: '1px solid rgba(0,0,0,0.06)',
        borderRadius: '20px',
        p: 2,
        cursor: 'pointer',
        transition: 'all 0.15s',
        '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' },
        '&:active': { transform: 'scale(0.97)' },
    };
    const quickIconSx = (color: string, bg: string) => ({
        width: 38, height: 38, borderRadius: '12px', bgcolor: bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '18px', mb: 1.5,
    });
    const quickTitleSx = { fontSize: '13px', fontWeight: 700, color: '#111', fontFamily: 'Sora, sans-serif', lineHeight: 1.2, mb: 0.25 };
    const quickDescSx = { fontSize: '11px', color: '#aaa', fontFamily: 'Sora, sans-serif', lineHeight: 1.3 };

    return (
        <Box sx={{ position: 'relative', width: '100%' }}>
            <AnimatePresence mode="wait">
                {profileMode === 'list' && !showSubscription ? (
                    <Box
                        key="list"
                        component={motion.div}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        sx={{ maxWidth: '480px', margin: '0 auto', pb: '120px' }}
                    >
                        {/* ── Hero ── */}
                        <Box sx={{ px: 3, pt: 3, pb: 2, textAlign: 'center' }}>
                            <Avatar
                                src={accountUser.profilePicture}
                                sx={{ width: 80, height: 80, mx: 'auto', mb: 1.5, border: '3px solid #fff', boxShadow: '0 8px 24px rgba(0,0,0,0.10)', bgcolor: '#0F6E56', fontSize: 28, fontWeight: 700 }}
                            >
                                {!accountUser.profilePicture && accountUser.username?.[0]?.toUpperCase()}
                            </Avatar>
                            <Typography sx={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: '20px', letterSpacing: '-0.5px', color: '#111' }}>
                                {accountUser.username}
                            </Typography>
                            <Typography sx={{ fontSize: '12px', color: '#aaa', fontWeight: 600, mb: 1.5, textTransform: 'capitalize' }}>
                                {accountUser.businessName || accountUser.role}
                            </Typography>
                            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                                <Box sx={{ px: 1.5, py: 0.5, borderRadius: '100px', bgcolor: 'rgba(15,110,86,0.08)', border: '1px solid rgba(15,110,86,0.15)', fontSize: '11px', fontWeight: 700, color: '#0F6E56', fontFamily: 'Sora, sans-serif' }}>
                                    ✓ Verified
                                </Box>
                                <Box
                                    onClick={() => setShowSubscription(true)}
                                    sx={{ px: 1.5, py: 0.5, borderRadius: '100px', bgcolor: 'rgba(120,60,180,0.07)', border: '1px solid rgba(120,60,180,0.15)', fontSize: '11px', fontWeight: 700, color: '#7c3aed', fontFamily: 'Sora, sans-serif', cursor: 'pointer' }}
                                >
                                    {accountUser.subscriptionStatus === 'subscribed' ? '⚡ Pro' : '· Basic'}
                                </Box>
                            </Box>
                        </Box>

                        {/* ── Quick-action cards ── */}
                        <Box sx={{ px: 2, mb: 1 }}>
                            <Typography sx={{ fontSize: '10px', fontWeight: 700, color: '#bbb', textTransform: 'uppercase', letterSpacing: '1px', mb: 1.5, ml: 0.5, fontFamily: 'Sora, sans-serif' }}>
                                Quick actions
                            </Typography>
                            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>

                                {/* Profile */}
                                <Box onClick={() => setProfileMode('profile')} sx={quickCardSx}>
                                    <Box sx={quickIconSx('#0F6E56', 'rgba(15,110,86,0.08)')}>👤</Box>
                                    <Typography sx={quickTitleSx}>My Profile</Typography>
                                    <Typography sx={quickDescSx}>Name, email, phone</Typography>
                                </Box>

                                {/* Orders — route to activity hub */}
                                <Box onClick={() => setView('orders')} sx={quickCardSx}>
                                    <Box sx={quickIconSx('#1565C0', 'rgba(21,101,192,0.07)')}>📦</Box>
                                    <Typography sx={quickTitleSx}>My Orders</Typography>
                                    <Typography sx={quickDescSx}>Track deliveries</Typography>
                                </Box>

                                {/* Store Management — pharmacy + admin only */}
                                {['pharmacy', 'admin'].includes(accountUser.role) && (
                                    <Box onClick={() => setProfileMode('store')} sx={quickCardSx}>
                                        <Box sx={quickIconSx('#B45309', 'rgba(180,83,9,0.07)')}>🏪</Box>
                                        <Typography sx={quickTitleSx}>Store</Typography>
                                        <Typography sx={quickDescSx}>Manage inventory</Typography>
                                    </Box>
                                )}

                                {/* Medicine Restock — pharmacy, pharmacist, admin */}
                                {['pharmacy', 'pharmacist', 'admin'].includes(accountUser.role) && (
                                    <Box onClick={() => setProfileMode('restock')} sx={quickCardSx}>
                                        <Box sx={quickIconSx('#0F6E56', 'rgba(15,110,86,0.08)')}>💊</Box>
                                        <Typography sx={quickTitleSx}>Restock</Typography>
                                        <Typography sx={quickDescSx}>Request medicines</Typography>
                                    </Box>
                                )}

                                {/* Subscription upgrade for non-pro */}
                                {accountUser.subscriptionStatus !== 'subscribed' && (
                                    <Box onClick={() => setShowSubscription(true)} sx={{ ...quickCardSx, background: 'linear-gradient(135deg, #f3e8ff 0%, #ede9fe 100%)', border: '1.5px solid rgba(124,58,237,0.2)' }}>
                                        <Box sx={quickIconSx('#7c3aed', 'rgba(124,58,237,0.1)')}>⚡</Box>
                                        <Typography sx={{ ...quickTitleSx, color: '#7c3aed' }}>Go Pro</Typography>
                                        <Typography sx={quickDescSx}>Unlock features</Typography>
                                    </Box>
                                )}
                            </Box>
                        </Box>

                        {/* ── Admin tools (collapsed section) ── */}
                        {accountUser.role === 'admin' && (
                            <Box sx={{ px: 2, mt: 3, mb: 1 }}>
                                <Typography sx={{ fontSize: '10px', fontWeight: 700, color: '#bbb', textTransform: 'uppercase', letterSpacing: '1px', mb: 1.5, ml: 0.5, fontFamily: 'Sora, sans-serif' }}>
                                    Administration
                                </Typography>
                                <Box sx={{ background: '#fff', borderRadius: '20px', border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                                    {[
                                        { label: 'Platform Controls', icon: <Assignment sx={{ fontSize: 18 }} />, mode: 'platform' },
                                        { label: 'WhatsApp Management', icon: <WhatsAppIcon sx={{ fontSize: 18, color: '#25D366' }} />, mode: 'whatsapp' },
                                        { label: 'Data Hub', icon: <Business sx={{ fontSize: 18 }} />, mode: 'datacentre' },
                                        { label: 'Top Contacts', icon: <WhatsAppIcon sx={{ fontSize: 18 }} />, mode: 'top-contacts' },
                                        { label: 'Delivery Agents', icon: <WhatsAppIcon sx={{ fontSize: 18 }} />, mode: 'delivery-agents' },
                                        { label: 'AI Centre', icon: <SmartToy sx={{ fontSize: 18 }} />, mode: 'aicentre' },
                                        { label: 'Consultations', icon: <MedicationIcon sx={{ fontSize: 18 }} />, mode: 'consultations', badge: consultations.length },
                                        { label: 'Pulse Analytics', icon: <BarChart sx={{ fontSize: 18 }} />, mode: 'pulse-analytics' },
                                    ].map((item, i) => (
                                        <Box
                                            key={item.mode}
                                            onClick={() => item.mode === 'pulse-analytics' ? window.open('https://www.pharmastackx.com/admin/pulse-analytics', '_blank') : setProfileMode(item.mode as any)}
                                            sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.5, cursor: 'pointer', borderTop: i > 0 ? '1px solid rgba(0,0,0,0.04)' : 'none', '&:hover': { bgcolor: 'rgba(0,0,0,0.02)' }, color: '#0F6E56' }}
                                        >
                                            {item.icon}
                                            <Typography sx={{ flex: 1, fontSize: '13px', fontWeight: 600, color: '#222', fontFamily: 'Sora, sans-serif' }}>{item.label}</Typography>
                                            {item.badge ? <Box sx={{ bgcolor: '#B45309', color: '#fff', fontSize: '10px', fontWeight: 700, px: 1, py: 0.25, borderRadius: '100px' }}>{item.badge}</Box> : null}
                                            <Typography sx={{ color: '#ddd', fontSize: '16px' }}>›</Typography>
                                        </Box>
                                    ))}
                                    {/* God Mode — special red row */}
                                    <Box
                                        onClick={() => setProfileMode('godmode')}
                                        sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.5, cursor: 'pointer', borderTop: '1px solid rgba(0,0,0,0.04)', bgcolor: 'rgba(211,47,47,0.03)', '&:hover': { bgcolor: 'rgba(211,47,47,0.06)' } }}
                                    >
                                        <Security sx={{ fontSize: 18, color: '#D32F2F' }} />
                                        <Typography sx={{ flex: 1, fontSize: '13px', fontWeight: 700, color: '#D32F2F', fontFamily: 'Sora, sans-serif' }}>God Mode</Typography>
                                        <Typography sx={{ color: '#D32F2F', fontSize: '16px', opacity: 0.4 }}>›</Typography>
                                    </Box>
                                </Box>
                            </Box>
                        )}

                        {/* ── Footer rows ── */}
                        <Box sx={{ px: 2, mt: 3 }}>
                            <Typography sx={{ fontSize: '10px', fontWeight: 700, color: '#bbb', textTransform: 'uppercase', letterSpacing: '1px', mb: 1.5, ml: 0.5, fontFamily: 'Sora, sans-serif' }}>
                                Support
                            </Typography>
                            <Box sx={{ background: '#fff', borderRadius: '20px', border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                                {[
                                    { label: 'Contact Us', icon: <ContactMail sx={{ fontSize: 18 }} />, mode: 'contact' },
                                    { label: 'About PharmaStackX', icon: <Info sx={{ fontSize: 18 }} />, mode: 'about' },
                                    { label: 'Privacy Policy', icon: <Assignment sx={{ fontSize: 18 }} />, mode: 'privacy' },
                                ].map((item, i) => (
                                    <Box
                                        key={item.mode}
                                        onClick={() => setProfileMode(item.mode as any)}
                                        sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.5, cursor: 'pointer', borderTop: i > 0 ? '1px solid rgba(0,0,0,0.04)' : 'none', '&:hover': { bgcolor: 'rgba(0,0,0,0.02)' }, color: '#0F6E56' }}
                                    >
                                        {item.icon}
                                        <Typography sx={{ flex: 1, fontSize: '13px', fontWeight: 600, color: '#222', fontFamily: 'Sora, sans-serif' }}>{item.label}</Typography>
                                        <Typography sx={{ color: '#ddd', fontSize: '16px' }}>›</Typography>
                                    </Box>
                                ))}
                            </Box>
                        </Box>

                        {/* ── Sign out ── */}
                        <Box sx={{ px: 2, mt: 3 }}>
                            <Box
                                onClick={handleLogout}
                                sx={{ textAlign: 'center', py: 1.5, borderRadius: '16px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, color: '#C84B8F', fontFamily: 'Sora, sans-serif', '&:hover': { bgcolor: 'rgba(200,75,143,0.05)' } }}
                            >
                                Sign out
                            </Box>
                            <Typography sx={{ textAlign: 'center', fontSize: '10px', color: '#ddd', mt: 0.5, fontFamily: 'Sora, sans-serif' }}>
                                PharmaStackX v2
                            </Typography>
                        </Box>
                    </Box>
                ) : (
                    <>
                        {showSubscription && (
                            <SubPageWrapper onBack={() => setShowSubscription(false)} title="Subscription">
                                <SubscriptionContent onSubscriptionSuccess={() => { setShowSubscription(false); refreshSession(); }} />
                            </SubPageWrapper>
                        )}

                        {profileMode === 'profile' && (
                            <SubPageWrapper onBack={() => setProfileMode('list')} title="Identity & Contact">
                                <EditableListItem fieldName="username" label="Name" value={accountUser.username} icon={<Person />} />
                                <EditableListItem fieldName="email" label="Email" value={accountUser.email} icon={<ContactMail />} />
                                <EditableListItem fieldName="mobile" label="Phone" value={accountUser.mobile || accountUser.phoneNumber} icon={<Phone />} />
                            </SubPageWrapper>
                        )}

                        {profileMode === 'contact' && (
                            <SubPageWrapper onBack={() => setProfileMode('list')} title="Contact & Support">
                                <div className="glass-card" style={{ padding: '16px', textAlign: 'center' }}>
                                    <WhatsAppIcon sx={{ fontSize: 48, color: '#25D366', mb: 2 }} />
                                    <Typography>Chat with us on WhatsApp</Typography>
                                    <Button variant="contained" href="https://wa.me/2349134589572" target="_blank" sx={{ mt: 2, bgcolor: '#25D366' }}>Open WhatsApp</Button>
                                </div>
                            </SubPageWrapper>
                        )}

                        {profileMode === 'about' && (
                            <SubPageWrapper onBack={() => setProfileMode('list')} title="About PharmaStackX">
                                <AboutContent />
                            </SubPageWrapper>
                        )}

                        {profileMode === 'privacy' && (
                            <SubPageWrapper onBack={() => setProfileMode('list')} title="Privacy Policy">
                                <PrivacyContent />
                            </SubPageWrapper>
                        )}

                        {profileMode === 'store' && (
                            <SubPageWrapper onBack={() => setProfileMode('list')} title="Store Management">
                                <StoreManagement onBack={() => setProfileMode('list')} />
                            </SubPageWrapper>
                        )}

                        {profileMode === 'restock' && (
                            <SubPageWrapper onBack={() => setProfileMode('list')} title="Medicine Restock">
                                <MedicineRestock onBack={() => setProfileMode('list')} userId={accountUser._id} />
                            </SubPageWrapper>
                        )}

                        {profileMode === 'whatsapp' && (
                            <SubPageWrapper onBack={() => setProfileMode('list')} title="WhatsApp Management">
                                <WhatsAppManagement />
                            </SubPageWrapper>
                        )}

                        {profileMode === 'datacentre' && (
                            <SubPageWrapper onBack={() => setProfileMode('list')} title="Data Hub">
                                <DataCentreContent />
                            </SubPageWrapper>
                        )}


                        {profileMode === 'platform' && (
                            <SubPageWrapper onBack={() => setProfileMode('list')} title="Platform Administration">
                                <Box sx={{ mb: 4 }}>
                                    <Typography variant="subtitle2" sx={{ color: 'var(--gray)', fontWeight: 700, mb: 2, textTransform: 'uppercase', letterSpacing: '1px' }}>Module Visibility</Typography>
                                    <List className="glass-card" sx={{ p: 0 }}>
                                        <ListItem sx={{ display: 'flex', justifyContent: 'space-between', p: 2, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                                            <Box>
                                                <Typography sx={{ fontWeight: 700, color: 'var(--black)' }}>Activity Centre Hub Widget</Typography>
                                                <Typography variant="caption" sx={{ color: 'var(--gray)' }}>Toggle visibility of the "Activity Centre" widget inside the Activity Hub.</Typography>
                                            </Box>
                                            <Switch checked={isActivityCentreEnabled} onChange={(e) => handleUpdatePlatformSettings('activity', e.target.checked)} color="success" />
                                        </ListItem>
                                        <ListItem sx={{ display: 'flex', justifyContent: 'space-between', p: 2 }}>
                                            <Box>
                                                <Typography sx={{ fontWeight: 700, color: 'var(--black)' }}>PSX Pulse Hub Widget</Typography>
                                                <Typography variant="caption" sx={{ color: 'var(--gray)' }}>Toggle visibility of the "PSX Pulse" widget inside the Activity Hub.</Typography>
                                            </Box>
                                            <Switch checked={isPulseEnabled} onChange={(e) => handleUpdatePlatformSettings('pulse', e.target.checked)} color="success" />
                                        </ListItem>
                                    </List>
                                </Box>
                            </SubPageWrapper>
                        )}

                        {profileMode === 'godmode' && (
                            <SubPageWrapper onBack={() => setProfileMode('list')} title="God Mode Control">
                                <GodMode />
                            </SubPageWrapper>
                        )}

                        {profileMode === 'aicentre' && (
                            <SubPageWrapper onBack={() => setProfileMode('list')} title="AI Centre">
                                <AICommandCentreContent />
                            </SubPageWrapper>
                        )}

                        {profileMode === 'top-contacts' && (
                            <SubPageWrapper onBack={() => setProfileMode('list')} title="Top Contacts">
                                <TopContactsContent />
                            </SubPageWrapper>
                        )}
                        {profileMode === 'delivery-agents' && (
                            <SubPageWrapper onBack={() => setProfileMode('list')} title="Delivery Agents">
                                <DeliveryAgentsContent />
                            </SubPageWrapper>
                        )}

                        {profileMode === 'consultations' && (
                            <SubPageWrapper onBack={() => { setProfileMode('list'); setCurrentConsultation(null); }} title="Consultations">
                                {!currentConsultation ? (
                                    <List>
                                        {consultations.map(c => (
                                            <ListItem key={c._id} button onClick={() => setCurrentConsultation(c)} className="glass-card" sx={{ mb: 2 }}>
                                                <Typography>Consultation #{c._id.slice(-6).toUpperCase()}</Typography>
                                            </ListItem>
                                        ))}
                                    </List>
                                ) : (
                                    <Box sx={{ height: '500px', display: 'flex', flexDirection: 'column' }}>
                                        <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2, bgcolor: '#f5f5f5', borderRadius: '12px', mb: 2 }}>
                                            {currentConsultation.messages.map((m: any, i: number) => (
                                                <Typography key={i} sx={{ mb: 1, textAlign: m.sender === 'user' ? 'left' : 'right' }}>
                                                    <strong>{m.sender}:</strong> {m.text}
                                                </Typography>
                                            ))}
                                        </Box>
                                        <Box sx={{ display: 'flex', gap: 1 }}>
                                            <TextField fullWidth size="small" value={replyText} onChange={(e) => setReplyText(e.target.value)} />
                                            <Button variant="contained" onClick={handleConsultationReply} disabled={isReplying}>Send</Button>
                                        </Box>
                                    </Box>
                                )}
                            </SubPageWrapper>
                        )}
                    </>
                )}
            </AnimatePresence>

            {editingField && <EditDialog open={!!editingField} onClose={() => setEditingField(null)} onSave={handleSave} fieldName={editingField} value={fieldValue} />}
        </Box>
    );
};

export default AccountContent;
