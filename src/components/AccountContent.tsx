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
import './Orders.css';

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

const SubPageWrapper = ({ children, onBack, title }: { children: React.ReactNode, onBack: () => void, title?: string }) => {
    useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }); }, []);
    return (
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
            <Box sx={{ flexGrow: 1, p: { xs: 2, sm: 3 } }}>
                {children}
            </Box>
        </Box>
    );
};

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
    const goTo = (mode: typeof profileMode) => { window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }); setProfileMode(mode); };

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
                    <motion.div
                        key="list"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="activity-dashboard sora"
                    >
                        {/* ── Header ── */}
                        <div className="activity-header" style={{ marginBottom: '24px', border: 'none' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                <Avatar
                                    src={accountUser.profilePicture}
                                    sx={{ width: 56, height: 56, border: '2px solid #fff', boxShadow: '0 4px 16px rgba(0,0,0,0.10)', bgcolor: '#0F6E56', fontSize: 22, fontWeight: 700, flexShrink: 0 }}
                                >
                                    {!accountUser.profilePicture && accountUser.username?.[0]?.toUpperCase()}
                                </Avatar>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography className="fraunces" style={{ fontSize: '24px', fontWeight: 900, color: '#111', letterSpacing: '-1px', lineHeight: 1.1 }}>
                                        {accountUser.username}
                                    </Typography>
                                    <Typography sx={{ fontSize: '12px', color: '#aaa', fontWeight: 500, textTransform: 'capitalize', mt: 0.25 }}>
                                        {accountUser.businessName || accountUser.role}
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'flex-end' }}>
                                    <Box sx={{ px: 1.5, py: 0.4, borderRadius: '100px', bgcolor: 'rgba(15,110,86,0.08)', border: '1px solid rgba(15,110,86,0.15)', fontSize: '10px', fontWeight: 700, color: '#0F6E56', fontFamily: 'Sora, sans-serif', whiteSpace: 'nowrap' }}>
                                        ✓ Verified
                                    </Box>
                                    <Box onClick={() => setShowSubscription(true)} sx={{ px: 1.5, py: 0.4, borderRadius: '100px', bgcolor: 'rgba(120,60,180,0.07)', border: '1px solid rgba(120,60,180,0.15)', fontSize: '10px', fontWeight: 700, color: '#7c3aed', fontFamily: 'Sora, sans-serif', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                        {accountUser.subscriptionStatus === 'subscribed' ? '⚡ Pro' : '· Basic'}
                                    </Box>
                                </Box>
                            </Box>

                            {/* ── Inline fields ── */}
                            <Box sx={{ background: '#fff', borderRadius: '18px', border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                                {[
                                    { label: 'Name', value: accountUser.username, field: 'username' },
                                    { label: 'Email', value: accountUser.email, field: 'email' },
                                    { label: 'Phone', value: accountUser.mobile || accountUser.phoneNumber || '', field: 'mobile' },
                                ].map((item, i) => (
                                    <Box key={item.field} onClick={() => { setEditingField(item.field); setFieldValue(item.value); }}
                                        sx={{ display: 'flex', alignItems: 'center', px: 2, py: 1.25, borderTop: i > 0 ? '1px solid rgba(0,0,0,0.04)' : 'none', cursor: 'pointer', '&:hover': { bgcolor: 'rgba(0,0,0,0.015)' } }}>
                                        <Box sx={{ flex: 1 }}>
                                            <Typography sx={{ fontSize: '9px', color: '#bbb', fontWeight: 700, fontFamily: 'Sora, sans-serif', textTransform: 'uppercase', letterSpacing: '0.6px' }}>{item.label}</Typography>
                                            <Typography sx={{ fontSize: '13px', fontWeight: 600, color: item.value ? '#111' : '#ccc', fontFamily: 'Sora, sans-serif', mt: 0.1 }}>{item.value || 'Not set'}</Typography>
                                        </Box>
                                        <Edit sx={{ fontSize: 13, color: '#ddd' }} />
                                    </Box>
                                ))}
                            </Box>
                        </div>

                        {/* ── Pharmacy widgets ── */}
                        {['pharmacy', 'admin'].includes(accountUser.role) && (
                            <div className="activity-widget" onClick={() => goTo('store')}>
                                <div className="widget-icon-box">🏪</div>
                                <div className="widget-content">
                                    <div className="widget-title">Store Management</div>
                                    <div className="widget-desc">Manage your pharmacy inventory and listings.</div>
                                </div>
                                <div className="widget-arrow">→</div>
                            </div>
                        )}

                        {['pharmacy', 'pharmacist', 'admin'].includes(accountUser.role) && (
                            <div className="activity-widget" onClick={() => goTo('restock')}>
                                <div className="widget-icon-box">💊</div>
                                <div className="widget-content">
                                    <div className="widget-title">Medicine Restock</div>
                                    <div className="widget-desc">Request or manage medicine restocking orders.</div>
                                </div>
                                <div className="widget-arrow">→</div>
                            </div>
                        )}

                        {/* ── Upgrade widget ── */}
                        {accountUser.subscriptionStatus !== 'subscribed' && (
                            <div className="activity-widget" onClick={() => setShowSubscription(true)} style={{ background: 'linear-gradient(135deg, #f3e8ff 0%, #ede9fe 100%)', border: '1.5px solid rgba(124,58,237,0.2)' }}>
                                <div className="widget-icon-box" style={{ background: 'rgba(124,58,237,0.1)', color: '#7c3aed' }}>⚡</div>
                                <div className="widget-content">
                                    <div className="widget-title" style={{ color: '#7c3aed' }}>Go Pro</div>
                                    <div className="widget-desc">Unlock premium features and priority support.</div>
                                </div>
                                <div className="widget-arrow" style={{ background: 'rgba(124,58,237,0.1)', color: '#7c3aed' }}>→</div>
                            </div>
                        )}

                        {/* ── Admin widgets ── */}
                        {accountUser.role === 'admin' && (<>
                            <div className="activity-widget" onClick={() => goTo('platform')}>
                                <div className="widget-icon-box">⚙️</div>
                                <div className="widget-content"><div className="widget-title">Platform Controls</div><div className="widget-desc">Manage global app settings and feature flags.</div></div>
                                <div className="widget-arrow">→</div>
                            </div>
                            <div className="activity-widget" onClick={() => goTo('whatsapp')}>
                                <div className="widget-icon-box" style={{ background: 'rgba(37,211,102,0.1)', color: '#25D366' }}>💬</div>
                                <div className="widget-content"><div className="widget-title">WhatsApp Management</div><div className="widget-desc">Configure WhatsApp channels and messaging.</div></div>
                                <div className="widget-arrow">→</div>
                            </div>
                            <div className="activity-widget" onClick={() => goTo('datacentre')}>
                                <div className="widget-icon-box">🗄️</div>
                                <div className="widget-content"><div className="widget-title">Data Hub</div><div className="widget-desc">Access and manage platform data.</div></div>
                                <div className="widget-arrow">→</div>
                            </div>
                            <div className="activity-widget" onClick={() => goTo('delivery-agents')}>
                                <div className="widget-icon-box">🛵</div>
                                <div className="widget-content"><div className="widget-title">Delivery Agents</div><div className="widget-desc">Manage riders and delivery network.</div></div>
                                <div className="widget-arrow">→</div>
                            </div>
                            <div className="activity-widget" onClick={() => goTo('aicentre')}>
                                <div className="widget-icon-box">🤖</div>
                                <div className="widget-content"><div className="widget-title">AI Centre</div><div className="widget-desc">Configure AI models and automation.</div></div>
                                <div className="widget-arrow">→</div>
                            </div>
                            <div className="activity-widget" onClick={() => goTo('consultations')}>
                                <div className="widget-icon-box">🩺</div>
                                <div className="widget-content">
                                    <div className="widget-title">Consultations</div>
                                    <div className="widget-desc">Review escalated patient consultations.</div>
                                </div>
                                {consultations.length > 0 && <div className="widget-badge">{consultations.length} New</div>}
                                <div className="widget-arrow">→</div>
                            </div>
                            <div className="activity-widget" onClick={() => window.open('https://www.pharmastackx.com/admin/pulse-analytics', '_blank')}>
                                <div className="widget-icon-box">📊</div>
                                <div className="widget-content"><div className="widget-title">Pulse Analytics</div><div className="widget-desc">View platform-wide trends and reports.</div></div>
                                <div className="widget-arrow">→</div>
                            </div>
                            <div className="activity-widget god-mode-card" onClick={() => goTo('godmode')} style={{ background: '#1a1a1a', border: '1px solid #333' }}>
                                <div className="widget-icon-box" style={{ background: '#333', color: '#fff' }}>⚡</div>
                                <div className="widget-content">
                                    <div className="widget-title" style={{ color: '#fff' }}>God Mode</div>
                                    <div className="widget-desc" style={{ color: '#aaa' }}>High-level system controls and overrides.</div>
                                </div>
                                <div className="widget-arrow" style={{ color: '#fff' }}>→</div>
                            </div>
                        </>)}

                        {/* ── Support widgets ── */}
                        <div className="activity-widget" onClick={() => goTo('contact')}>
                            <div className="widget-icon-box">💬</div>
                            <div className="widget-content"><div className="widget-title">Contact Us</div><div className="widget-desc">Get help via WhatsApp or email.</div></div>
                            <div className="widget-arrow">→</div>
                        </div>
                        <div className="activity-widget" onClick={() => goTo('about')}>
                            <div className="widget-icon-box">ℹ️</div>
                            <div className="widget-content"><div className="widget-title">About PharmaStackX</div><div className="widget-desc">Our mission, team, and story.</div></div>
                            <div className="widget-arrow">→</div>
                        </div>
                        <div className="activity-widget" onClick={() => goTo('privacy')}>
                            <div className="widget-icon-box">🔒</div>
                            <div className="widget-content"><div className="widget-title">Privacy Policy</div><div className="widget-desc">How we handle your data.</div></div>
                            <div className="widget-arrow">→</div>
                        </div>

                        {/* ── Sign out ── */}
                        <div style={{ textAlign: 'center', padding: '8px 0 4px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, color: '#C84B8F', fontFamily: 'Sora, sans-serif' }} onClick={handleLogout}>
                            Sign out
                        </div>
                        <div style={{ textAlign: 'center', fontSize: '10px', color: '#ddd', paddingBottom: '8px', fontFamily: 'Sora, sans-serif' }}>PharmaStackX v2</div>
                    </motion.div>
                ) : (
                    <>
                        {showSubscription && (
                            <SubPageWrapper onBack={() => setShowSubscription(false)} title="Subscription">
                                <SubscriptionContent onSubscriptionSuccess={() => { setShowSubscription(false); refreshSession(); }} />
                            </SubPageWrapper>
                        )}

                        {profileMode === 'profile' && (
                            <SubPageWrapper onBack={() => goTo('list')} title="Identity & Contact">
                                <EditableListItem fieldName="username" label="Name" value={accountUser.username} icon={<Person />} />
                                <EditableListItem fieldName="email" label="Email" value={accountUser.email} icon={<ContactMail />} />
                                <EditableListItem fieldName="mobile" label="Phone" value={accountUser.mobile || accountUser.phoneNumber} icon={<Phone />} />
                            </SubPageWrapper>
                        )}

                        {profileMode === 'contact' && (
                            <SubPageWrapper onBack={() => goTo('list')} title="Contact & Support">
                                <div className="glass-card" style={{ padding: '16px', textAlign: 'center' }}>
                                    <WhatsAppIcon sx={{ fontSize: 48, color: '#25D366', mb: 2 }} />
                                    <Typography>Chat with us on WhatsApp</Typography>
                                    <Button variant="contained" href="https://wa.me/2349134589572" target="_blank" sx={{ mt: 2, bgcolor: '#25D366' }}>Open WhatsApp</Button>
                                </div>
                            </SubPageWrapper>
                        )}

                        {profileMode === 'about' && (
                            <SubPageWrapper onBack={() => goTo('list')} title="About PharmaStackX">
                                <AboutContent />
                            </SubPageWrapper>
                        )}

                        {profileMode === 'privacy' && (
                            <SubPageWrapper onBack={() => goTo('list')} title="Privacy Policy">
                                <PrivacyContent />
                            </SubPageWrapper>
                        )}

                        {profileMode === 'store' && (
                            <SubPageWrapper onBack={() => goTo('list')} title="Store Management">
                                <StoreManagement onBack={() => goTo('list')} />
                            </SubPageWrapper>
                        )}

                        {profileMode === 'restock' && (
                            <SubPageWrapper onBack={() => goTo('list')} title="Medicine Restock">
                                <MedicineRestock onBack={() => goTo('list')} userId={accountUser._id} />
                            </SubPageWrapper>
                        )}

                        {profileMode === 'whatsapp' && (
                            <SubPageWrapper onBack={() => goTo('list')} title="WhatsApp Management">
                                <WhatsAppManagement />
                            </SubPageWrapper>
                        )}

                        {profileMode === 'datacentre' && (
                            <SubPageWrapper onBack={() => goTo('list')} title="Data Hub">
                                <DataCentreContent />
                            </SubPageWrapper>
                        )}


                        {profileMode === 'platform' && (
                            <SubPageWrapper onBack={() => goTo('list')} title="Platform Administration">
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
                            <SubPageWrapper onBack={() => goTo('list')} title="God Mode Control">
                                <GodMode />
                            </SubPageWrapper>
                        )}

                        {profileMode === 'aicentre' && (
                            <SubPageWrapper onBack={() => goTo('list')} title="AI Centre">
                                <AICommandCentreContent />
                            </SubPageWrapper>
                        )}

                        {profileMode === 'top-contacts' && (
                            <SubPageWrapper onBack={() => goTo('list')} title="Top Contacts">
                                <TopContactsContent />
                            </SubPageWrapper>
                        )}
                        {profileMode === 'delivery-agents' && (
                            <SubPageWrapper onBack={() => goTo('list')} title="Delivery Agents">
                                <DeliveryAgentsContent />
                            </SubPageWrapper>
                        )}

                        {profileMode === 'consultations' && (
                            <SubPageWrapper onBack={() => { goTo('list'); setCurrentConsultation(null); }} title="Consultations">
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
