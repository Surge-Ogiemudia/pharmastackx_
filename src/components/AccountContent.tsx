"use client";
import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useSession } from "@/context/SessionProvider";
import { Box, Typography, Avatar, Button, List, ListItem, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton, Select, MenuItem, FormControl, InputLabel, Switch, Chip } from "@mui/material";
import { Person, VpnKey, Info, ContactMail, Business, LocationOn, ArrowBack, Phone, LocalHospital, Assignment, Edit, CheckCircleOutline, ErrorOutline, CloudUpload, AttachFile, Close, WhatsApp as WhatsAppIcon, Email as EmailIcon, Medication as MedicationIcon, SmartToy, NotificationsActive } from "@mui/icons-material";
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
const AboutContent = dynamic(() => import('./AboutContent'), { ssr: false });
const PrivacyContent = dynamic(() => import('./PrivacyContent'), { ssr: false });

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
            position: 'absolute', 
            top: 0, 
            width: '100%', 
            height: '100%', 
            bgcolor: '#fff', 
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            maxWidth: '1200px',
            margin: '0 auto',
            left: '50%',
            transform: 'translateX(-50%)',
            boxShadow: { sm: '0 10px 40px rgba(0,0,0,0.1)' }
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
    const [profileMode, setProfileMode] = useState<'list' | 'platform' | 'profile' | 'contact' | 'about' | 'privacy' | 'store' | 'restock' | 'consultations' | 'whatsapp' | 'datacentre' | 'aicentre'>('list');
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

    return (
        <Box sx={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
            <AnimatePresence mode="wait">
                {profileMode === 'list' && !showSubscription ? (
                    <Box 
                        key="list"
                        component={motion.div}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        sx={{ 
                            height: '100%', 
                            overflowY: 'auto', 
                            p: { xs: 2, sm: 3 },
                            maxWidth: '1000px',
                            margin: '0 auto'
                        }}
                    >
                        <div className="profile-top-bar">
                            <div className="profile-role-tag">{accountUser.role}</div>
                        </div>

                        <div className="profile-main-header">
                            <Avatar src={accountUser.profilePicture} sx={{ width: 80, height: 80, mb: 2 }} />
                            <div className="profile-name">{accountUser.username}</div>
                            <div className="badge-row">
                                <div className="badge badge-verified">Verified</div>
                                <div className="badge badge-rating" onClick={() => setShowSubscription(true)}>
                                    {accountUser.subscriptionStatus === 'subscribed' ? 'Pro' : 'Basic'}
                                </div>
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

                        {['pharmacy', 'pharmacist', 'admin'].includes(accountUser.role) && (
                            <>
                                <div className="sec-tag">Pharmacy Management</div>
                                <div className="glass-card" style={{ padding: '8px' }}>
                                    {['pharmacy', 'admin'].includes(accountUser.role) && (
                                        <div className="profile-row-action" onClick={() => setProfileMode('store')}>
                                            <Business style={{ color: 'var(--primary-green)' }} />
                                            <span className="profile-row-label">Store Management</span>
                                            <span className="profile-chevron">›</span>
                                        </div>
                                    )}
                                    <div className="profile-row-action" onClick={() => setProfileMode('restock')}>
                                        <LocalHospital style={{ color: 'var(--primary-green)' }} />
                                        <span className="profile-row-label">Medicine Restock</span>
                                        <span className="profile-chevron">›</span>
                                    </div>
                                </div>
                            </>
                        )}

                        {accountUser.role === 'admin' && (
                            <>
                                <div className="sec-tag">Administration</div>
                                <div className="glass-card" style={{ padding: '8px' }}>
                                    <div className="profile-row-action" onClick={() => setProfileMode('platform')}>
                                        <Assignment style={{ color: 'var(--primary-green)' }} />
                                        <span className="profile-row-label">Platform Controls</span>
                                        <span className="profile-chevron">›</span>
                                    </div>
                                    <div className="profile-row-action" onClick={() => setProfileMode('whatsapp')}>
                                        <WhatsAppIcon style={{ color: '#25D366' }} />
                                        <span className="profile-row-label">WhatsApp Management</span>
                                        <span className="profile-chevron">›</span>
                                    </div>
                                    <div className="profile-row-action" onClick={() => setProfileMode('datacentre')}>
                                        <Business style={{ color: 'var(--primary-green)' }} />
                                        <span className="profile-row-label">Data Hub</span>
                                        <span className="profile-chevron">›</span>
                                    </div>
                                    <div className="profile-row-action" onClick={() => setProfileMode('aicentre')}>
                                        <SmartToy style={{ color: 'var(--primary-green)' }} />
                                        <span className="profile-row-label">AI Centre</span>
                                        <span className="profile-chevron">›</span>
                                    </div>
                                    <div className="profile-row-action" onClick={() => setProfileMode('consultations')}>
                                        <MedicationIcon style={{ color: 'var(--primary-green)' }} />
                                        <span className="profile-row-label">Consultations</span>
                                        {consultations.length > 0 && <Chip label={consultations.length} size="small" sx={{ ml: 1, bgcolor: '#B45309', color: '#fff' }} />}
                                        <span className="profile-chevron">›</span>
                                    </div>
                                </div>
                            </>
                        )}

                        <div className="sec-tag">Support</div>
                        <div className="glass-card" style={{ padding: '8px' }}>
                            <div className="profile-row-action" onClick={() => setProfileMode('contact')}>
                                <ContactMail sx={{ color: 'var(--primary-green)' }} />
                                <span className="profile-row-label">Contact Us</span>
                                <span className="profile-chevron">›</span>
                            </div>
                            <div className="profile-row-action" onClick={() => setProfileMode('about')}>
                                <Info sx={{ color: 'var(--primary-green)' }} />
                                <span className="profile-row-label">About Us</span>
                                <span className="profile-chevron">›</span>
                            </div>
                            <div className="profile-row-action" onClick={() => setProfileMode('privacy')}>
                                <Assignment sx={{ color: 'var(--primary-green)' }} />
                                <span className="profile-row-label">Privacy Policy</span>
                                <span className="profile-chevron">›</span>
                            </div>
                        </div>

                        <div className="account-signout" onClick={handleLogout}>Sign out</div>
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

                        {profileMode === 'aicentre' && (
                            <SubPageWrapper onBack={() => setProfileMode('list')} title="AI Centre">
                                <AICommandCentreContent />
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
