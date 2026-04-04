'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Box, Typography, Button, TextField, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Paper, Checkbox, FormControlLabel,
  IconButton, Tooltip, CircularProgress, LinearProgress, Modal, Fade, Chip, Alert, AlertTitle,
  Select, MenuItem, InputLabel, FormControl, Collapse, Container, Grid
} from '@mui/material';
import { 
  UploadFile, Inventory, Dashboard, History, ShoppingCart, 
  Search, FilterList, Refresh, Edit, Delete, Close,
  Share, QrCode, WhatsApp, ContentCopy, AddCircle, Help, ExpandMore, ExpandLess,
  ArrowBackIos, ArrowForwardIos, ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from '@/context/SessionProvider';
import axios from 'axios';
import QRCode from 'qrcode';
import Link from 'next/link';

// --- STYLING VARS (Free & Open Aesthetic) ---
const COLORS = {
  bg: '#fafaf8',
  paper: '#ffffff',
  text: 'var(--black)',
  sub: 'var(--gray)',
  pink: 'var(--pink)',
  pinkPale: 'var(--pink-pale)',
  green: 'var(--green)',
  greenPale: 'var(--green-pale)',
  border: 'var(--border)',
  accent: '#f4f1ed'
};

// --- TYPES & INTERFACES ---
interface StockItem {
  _id?: string;
  itemName: string;
  activeIngredient: string;
  amount: number;
  category: string;
  isPublished: boolean;
  imageUrl?: string;
  info: string;
  POM: boolean;
  businessName?: string;
}

export default function StoreManagement({ onBack }: { onBack?: () => void }) {
  const { user, isLoading: sessionLoading, refreshSession } = useSession();
  const [selectedTab, setSelectedTab] = useState(0); // 0: Storefront, 1: Upload, 2: Stock
  const [userBusinessName, setUserBusinessName] = useState('');
  const [userSlug, setUserSlug] = useState('');
  
  const isMounted = useRef(false);

  // -- Shared Data State --
  const [stockData, setStockData] = useState<StockItem[]>([]);
  const [stockStats, setStockStats] = useState({ total: 0, published: 0, attention: 0 });
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingStock, setLoadingStock] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [stockDisplayLimit, setStockDisplayLimit] = useState(12);
  
  // -- Modals & Editing --
  const [selectedProduct, setSelectedProduct] = useState<StockItem | null>(null);
  const [isEditingTile, setIsEditingTile] = useState(false);
  const [tileEditData, setTileEditData] = useState<StockItem | null>(null);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [showCsvUpload, setShowCsvUpload] = useState(false);
  
  // -- Suggestions System --
  const [enrichingId, setEnrichingId] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionData, setSuggestionData] = useState<any>(null);

  // -- Bulk Upload State --
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // -- Manual Form State --
  const [formValues, setFormValues] = useState({
    itemName: '',
    activeIngredient: '',
    amount: 0,
    category: '',
    info: '',
    POM: false,
    imageUrl: ''
  });
  const [isStorePublished, setIsStorePublished] = useState(false);
  const [isStoreSetupRequired, setIsStoreSetupRequired] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupForm, setSetupForm] = useState({ businessName: '', slug: '', city: '', state: '' });

  const formRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [copied, setCopied] = useState(false);

  // --- INITIALIZATION ---
  useEffect(() => {
    isMounted.current = true;
    if (user) {
      if (user.role === 'pharmacist' && (!user.businessName || !user.slug)) {
        setIsStoreSetupRequired(true);
      } else if (user.businessName) {
        setUserBusinessName(user.businessName);
        setUserSlug(user.slug || '');
        fetchInitialData();
        setIsStoreSetupRequired(false);
      }
    }
    return () => { isMounted.current = false; };
  }, [user, user?.businessName, user?.slug]);

  const handleSetupSubmit = async () => {
    if (!setupForm.businessName || !setupForm.slug) return alert('Business Name and Store Link are required.');
    setSetupLoading(true);
    try {
      await axios.put('/api/account', setupForm);
      if (refreshSession) await refreshSession();
      if (isMounted.current) setIsStoreSetupRequired(false);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to initialize store.');
    } finally {
      if (isMounted.current) setSetupLoading(false);
    }
  };

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  };

  const fetchInitialData = async (isLoadMore = false) => {
    if (!user?.businessName) return;
    if (isLoadMore) setLoadingMore(true); else setLoadingStock(true);
    
    try {
      const offset = isLoadMore ? stockData.length : 0;
      const url = `/api/stock?businessName=${encodeURIComponent(user.businessName)}&limit=12&offset=${offset}`;
      const stockRes = await axios.get(url);
      
      if (!isMounted.current) return;

      const newItems = stockRes.data.items || [];
      setStockData(prev => isLoadMore ? [...prev, ...newItems] : newItems);
      setStockStats({
        total: stockRes.data.total || 0,
        published: stockRes.data.published || 0,
        attention: stockRes.data.attention || 0
      });
      // Hydrate store publish status from session/user
      if (user.isStorePublished !== undefined) {
        setIsStorePublished(user.isStorePublished);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      if (isMounted.current) {
        setLoadingStock(false);
        setLoadingMore(false);
      }
    }
  };

  // --- LOGIC: Bulk Handling ---
  const handleBulkFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('businessName', user?.businessName || '');

      try {
          await axios.post('/api/stock/enrich-and-upload', formData);
          if (isMounted.current) {
              fetchInitialData();
              setShowCsvUpload(false);
              alert('Upload successful!');
          }
      } catch (err) {
          console.error('Upload Error:', err);
          alert('Upload failed. Please check file format.');
      } finally {
          if (isMounted.current) setIsUploading(false);
      }
  };

  // --- LOGIC: Stock Actions ---
  const handleSave = async (id: string) => {
    if (!tileEditData) return;
    try {
      await axios.put(`/api/stock/${id}`, tileEditData);
      if (!isMounted.current) return;
      setStockData(prev => prev.map(p => p._id === id ? tileEditData : p));
      setSelectedProduct(null);
      setIsEditingTile(false);
    } catch (err) { alert('Save failed'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Permanently delete this item?')) return;
    try {
      await axios.delete(`/api/stock/${id}?businessName=${user?.businessName}`);
      if (!isMounted.current) return;
      setStockData(prev => prev.filter(p => p._id !== id));
      setSelectedProduct(null);
    } catch (err) { alert('Delete failed'); }
  };

  const handlePublish = async (id: string) => {
    try {
        await axios.post('/api/stock/publish', { productId: id, businessName: user?.businessName });
        if (!isMounted.current) return;
        setStockData(prev => prev.map(p => p._id === id ? { ...p, isPublished: true } : p));
        if (tileEditData?._id === id) setTileEditData({ ...tileEditData, isPublished: true });
    } catch (err) { alert('Publish failed'); }
  };

  const handleUnpublish = async (id: string) => {
    try {
        await axios.post('/api/stock/unpublish', { productId: id, businessName: user?.businessName });
        if (!isMounted.current) return;
        setStockData(prev => prev.map(p => p._id === id ? { ...p, isPublished: false } : p));
        if (tileEditData?._id === id) setTileEditData({ ...tileEditData, isPublished: false });
    } catch (err) { alert('Withdrawal failed'); }
  };

  const handleEnrich = async (id: string) => {
      setEnrichingId(id);
      try {
          const res = await axios.post('/api/stock/enrich-and-upload', { manualId: id, businessName: user?.businessName });
          if (isMounted.current && res.data.suggestion) {
              setSuggestionData(res.data.suggestion);
              setShowSuggestions(true);
          }
      } catch (err) { alert('AI Refinement failed'); }
      finally { if (isMounted.current) setEnrichingId(null); }
  };

  const handleFormChange = (e: any) => {
      const { name, value } = e.target;
      setFormValues(prev => ({ ...prev, [name]: value }));
  };
  
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormValues(prev => ({ ...prev, imageUrl: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleFormSubmit = async () => {
    if (!formValues.itemName) return alert('Medication Name is required');
    if (!formValues.category) return alert('Please select a Category');
    if (!formValues.activeIngredient) return alert('Active Ingredient is required');
    setIsSubmitting(true);
    try {
        const payload = { ...formValues, businessName: user?.businessName };
        const res = await axios.post('/api/stock', payload);
        if (isMounted.current) {
            setStockData([res.data.product, ...stockData]);
            setFormValues({ itemName: '', activeIngredient: '', amount: 0, category: '', info: '', POM: false, imageUrl: '' });
            setShowUploadForm(false);
            alert('Product added successfully!');
        }
    } catch (err: any) { 
        console.error('Add failed:', err);
        alert(err.response?.data?.error || 'Add failed. Please check all fields.'); 
    }
    finally { if (isMounted.current) setIsSubmitting(false); }
  };

  const handleDownloadSampleCsv = () => {
    // UTF-8 BOM for Excel compatibility
    const BOM = "\ufeff";
    const headers = "itemName,activeIngredient,category,amount,info,POM\n";
    const sampleRow = "Amoxicillin 500mg,Amoxicillin,Antibiotics,1500,Standard dosage: 1 tab every 8 hours,false";
    const csvContent = BOM + headers + sampleRow;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.style.display = 'none';
    link.href = url;
    link.download = "pharmastack_inventory_template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- LOGIC: UI Helpers ---
  const handleCopyUrl = () => {
    const url = `${userSlug}.psx.ng`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGetLocation = async (e?: any) => {
    console.log("📍 handleGetLocation triggered");
    if (e) {
      if (typeof e.preventDefault === 'function') e.preventDefault();
      if (typeof e.stopPropagation === 'function') e.stopPropagation();
    }

    if (!navigator.geolocation) {
      alert('⚠️ Geolocation is not supported by your browser.');
      return;
    }

    // Use confirm for better UX and threading pause
    const proceed = window.confirm('📍 Please ensure you are currently within your pharmacy premises or store to get an accurate location pin. \n\nContinue to get GPS coordinates?');
    
    if (!proceed) return;

    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      console.log("📍 Coordinates received:", latitude, longitude);
      try {
        await axios.put('/api/account', { latitude, longitude });
        if (isMounted.current) {
          alert('✅ Location updated successfully!');
          if (refreshSession) refreshSession(); 
        }
      } catch (err) {
        console.error("📍 Error saving location:", err);
        alert('❌ Failed to save location. Please check your connection.');
      }
    }, (error) => {
      console.error("📍 Geolocation error:", error);
      alert(`⚠️ Location access denied or unavailable: ${error.message}`);
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
  };

  const isLocationSet = !!user?.businessCoordinates?.latitude;

  const filteredStock = useMemo(() => {
    return stockData.filter(item => 
      item.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.activeIngredient.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [stockData, searchQuery]);

  const displayableStock = useMemo(() => {
    if (searchQuery) return filteredStock;
    return filteredStock.slice(0, stockDisplayLimit);
  }, [filteredStock, searchQuery, stockDisplayLimit]);

  const totalProducts = stockData.length;
  const publishedItems = stockData.filter(i => i.isPublished).length;
  const needsAttention = stockData.filter(i => !i.imageUrl || !i.info).length;

  if (sessionLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: COLORS.bg }}><CircularProgress color="secondary" /></Box>;

  if (isStoreSetupRequired) {
    return (
      <Box sx={{ 
        background: COLORS.bg, 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        p: 3,
        fontFamily: '"Sora", sans-serif'
      }}>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <Box className="glass-card" sx={{ p: 4, width: '100%', maxWidth: '450px', textAlign: 'center' }}>
            <Box sx={{ width: 64, height: 64, bgcolor: 'var(--green-pale)', color: 'var(--green)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 3 }}>
              <Inventory sx={{ fontSize: 32 }} />
            </Box>
            <Typography className="fraunces" variant="h4" sx={{ fontWeight: 900, mb: 1, letterSpacing: '-1px' }}>
              Initialize Your Store
            </Typography>
            <Typography variant="body2" sx={{ color: 'var(--gray)', mb: 4 }}>
              Unlock your inventory dashboard by setting up your business information.
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, textAlign: 'left' }}>
              <Box>
                <Typography sx={{ fontSize: '10px', fontWeight: 800, color: '#bbb', mb: 0.8, textTransform: 'uppercase' }}>BUSINESS NAME</Typography>
                <TextField 
                  fullWidth 
                  placeholder="e.g. Wellness Pharmacy" 
                  value={setupForm.businessName}
                  onChange={(e) => {
                    const name = e.target.value;
                    setSetupForm(prev => ({ ...prev, businessName: name, slug: generateSlug(name) }));
                  }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '16px', bgcolor: 'rgba(0,0,0,0.02)' } }}
                />
              </Box>
              <Box>
                <Typography sx={{ fontSize: '10px', fontWeight: 800, color: '#bbb', mb: 0.8, textTransform: 'uppercase' }}>STORE LINK (SLUG)</Typography>
                <TextField 
                  fullWidth 
                  placeholder="wellness-pharmacy"
                  value={setupForm.slug}
                  onChange={(e) => setSetupForm(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/ /g, '-') }))}
                  helperText={setupForm.slug ? `Your link: ${setupForm.slug}.psx.ng` : ''}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '16px', bgcolor: 'rgba(0,0,0,0.02)' } }}
                />
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography sx={{ fontSize: '10px', fontWeight: 800, color: '#bbb', mb: 0.8, textTransform: 'uppercase' }}>CITY</Typography>
                  <TextField 
                    fullWidth 
                    placeholder="Lagos" 
                    value={setupForm.city}
                    onChange={(e) => setSetupForm(prev => ({ ...prev, city: e.target.value }))}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '16px', bgcolor: 'rgba(0,0,0,0.02)' } }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography sx={{ fontSize: '10px', fontWeight: 800, color: '#bbb', mb: 0.8, textTransform: 'uppercase' }}>STATE</Typography>
                  <TextField 
                    fullWidth 
                    placeholder="Lagos" 
                    value={setupForm.state}
                    onChange={(e) => setSetupForm(prev => ({ ...prev, state: e.target.value }))}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '16px', bgcolor: 'rgba(0,0,0,0.02)' } }}
                  />
                </Grid>
              </Grid>

              <Button 
                variant="contained" 
                onClick={handleSetupSubmit}
                disabled={setupLoading || !setupForm.businessName || !setupForm.slug}
                className="upgrade-button-premium"
                sx={{ mt: 2, height: '56px' }}
              >
                {setupLoading ? <CircularProgress size={24} color="inherit" /> : 'Create My Storehub'}
              </Button>
            </Box>
          </Box>
        </motion.div>
      </Box>
    );
  }

  return (
    <Box className="store-mgmt-free" sx={{ 
      background: COLORS.bg, 
      minHeight: '100vh', 
      pt: 0,
      pb: '100px',
      fontFamily: '"Sora", sans-serif',
      color: COLORS.text
    }}>
      
      {/* HEADER SECTION */}
      <Box sx={{ 
        px: { xs: 2.5, sm: 4 },
        py: 0,
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'flex-start',
        position: 'relative',
        mb: 0
      }}>
        {/* LEFT: BACK & PROFILE */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <IconButton 
            onClick={() => onBack ? onBack() : window.history.back()}
            sx={{ 
              width: 44,
              height: 44,
              bgcolor: 'white', 
              border: `1px solid #e8e8e8`,
              borderRadius: '50%',
              '&:hover': { bgcolor: 'rgba(0,0,0,0.03)' }
            }}
          >
            <ArrowBackIcon sx={{ color: 'var(--gray)', fontSize: 18 }} />
          </IconButton>
          <Typography sx={{ color: 'var(--gray)', fontSize: '15px', fontWeight: 500 }}>
            Back
          </Typography>
        </Box>
      </Box>

      {/* TABS SECTION (Underlined) */}
      <Box sx={{ 
        display: 'flex', 
        borderBottom: `1px solid ${COLORS.border}`,
        mb: 2,
        px: { xs: 2.5, sm: 4 }
      }}>
        {[
          { id: 0, label: 'Storefront' },
          { id: 1, label: 'Upload' },
          { id: 2, label: 'Stock' }
        ].map(tab => (
          <Box 
            key={tab.id}
            onClick={() => setSelectedTab(tab.id)}
            sx={{ 
              flex: 1,
              textAlign: 'center',
              pt: 1.5,
              pb: 0.8,
              cursor: 'pointer', 
              fontSize: '14px', 
              fontWeight: 700,
              color: selectedTab === tab.id ? '#0F6E56' : '#bbb',
              borderBottom: `3px solid ${selectedTab === tab.id ? '#0F6E56' : 'transparent'}`,
              transition: 'all 0.2s',
              '&:hover': { color: selectedTab === tab.id ? '#0F6E56' : 'var(--black)' }
            }}
          >
            {tab.label}
          </Box>
        ))}
      </Box>

      <Container maxWidth="lg">
        {/* CONTENT AREA */}
        <Box className="mgmt-content">
          <AnimatePresence mode="wait">
            
            {/* TAB 0: STOREFRONT */}
            {selectedTab === 0 && (
              <motion.div key="tab0" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <Box sx={{ 
                  background: '#0F6E56', 
                  borderRadius: '24px', 
                  padding: { xs: '24px 20px', sm: '32px' }, 
                  color: '#fff',
                  boxShadow: '0 10px 40px rgba(15, 110, 86, 0.15)',
                  position: 'relative',
                  overflow: 'hidden',
                  mb: 2
                }}>
                  {/* Decorative circle */}
                  <Box sx={{ 
                    position: 'absolute', 
                    top: -40, 
                    right: -40, 
                    width: 120, 
                    height: 120, 
                    bgcolor: 'rgba(255,255,255,0.05)', 
                    borderRadius: '50%' 
                  }} />

                  <Typography sx={{ fontSize: '10px', fontWeight: 800, opacity: 0.5, letterSpacing: '1.2px', textTransform: 'uppercase', mb: 1.5 }}>
                    YOUR {user?.role === 'pharmacy' ? 'PHARMACY' : 'PHARMACIST'} STORE
                  </Typography>
                  
                  <Box sx={{ mb: 1.5 }}>
                    <Typography className="fraunces" sx={{ 
                      fontSize: { xs: '24px', sm: '32px' }, 
                      fontWeight: 900, 
                      lineHeight: 0.85,
                      letterSpacing: '-1.2px',
                      maxWidth: '100%',
                      wordWrap: 'break-word'
                    }}>
                      {userBusinessName?.split(' ')[0]} <em style={{ fontStyle: 'italic', fontWeight: 900, opacity: 0.9 }}>{userBusinessName?.split(' ').slice(1).join(' ')}</em>
                    </Typography>
                  </Box>

                  {/* URL BOX */}
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    background: 'rgba(0,0,0,0.15)', 
                    borderRadius: '12px', 
                    padding: '12px 16px', 
                    mb: 2.5,
                    border: '1px solid rgba(255,255,255,0.05)',
                  }}>
                    <Typography sx={{ fontSize: '13px', fontWeight: 600, fontFamily: 'var(--sora)' }}>
                      {userSlug}<span style={{ opacity: 0.4 }}>.psx.ng</span>
                    </Typography>
                    <Typography 
                      onClick={handleCopyUrl}
                      sx={{ 
                        fontSize: '11px', 
                        fontWeight: 700, 
                        opacity: 0.5, 
                        cursor: 'pointer',
                        '&:hover': { opacity: 0.9 }
                      }}
                    >
                      {copied ? 'Copied' : 'Copy link'}
                    </Typography>
                  </Box>

                  {/* ACTION BUTTONS */}
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button 
                      fullWidth
                      onClick={handleCopyUrl}
                      sx={{ 
                        bgcolor: 'white', 
                        color: '#0F6E56', 
                        borderRadius: '10px', 
                        py: 1.3, 
                        px: 0,
                        fontSize: '11px', 
                        fontWeight: 900,
                        textTransform: 'none',
                        fontFamily: 'var(--sora)',
                        whiteSpace: 'nowrap',
                        boxShadow: 'none',
                        '&:hover': { bgcolor: '#fff', opacity: 0.9, boxShadow: 'none' }
                      }}
                    >
                      Share store
                    </Button>
                    <Button 
                      fullWidth
                      sx={{ 
                        bgcolor: 'rgba(255,255,255,0.06)', 
                        color: 'white', 
                        borderRadius: '10px', 
                        py: 1.3, 
                        px: 0,
                        fontSize: '11px', 
                        fontWeight: 700,
                        textTransform: 'none',
                        fontFamily: 'var(--sora)',
                        whiteSpace: 'nowrap',
                        border: '1px solid rgba(255,255,255,0.15)',
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
                      }}
                    >
                      View store
                    </Button>
                    <Button 
                      fullWidth
                      sx={{ 
                        bgcolor: 'rgba(255,255,255,0.06)', 
                        color: 'white', 
                        borderRadius: '100px', 
                        py: 1.3, 
                        px: 0,
                        fontSize: '11px', 
                        fontWeight: 700,
                        textTransform: 'none',
                        fontFamily: 'var(--sora)',
                        whiteSpace: 'nowrap',
                        border: '1px solid rgba(255,255,255,0.15)',
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
                      }}
                    >
                      Get flyer
                    </Button>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.8, pb: 2 }}>
                  {/* STORE LOCATION SECTION */}
                  <Box>
                    <Typography sx={{ fontSize: '9px', fontWeight: 800, color: 'rgba(0,0,0,0.3)', letterSpacing: '0.8px', mb: 0.8, textTransform: 'uppercase' }}>
                      STORE LOCATION
                    </Typography>
                    <Box sx={{ 
                      background: 'white', 
                      borderRadius: '20px', 
                      padding: '12px', 
                      border: '1px solid #eee',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.02)'
                    }}>
                      <Box sx={{ 
                        height: '90px', 
                        width: '100%', 
                        bgcolor: '#EBF7F2', 
                        borderRadius: '12px',
                        position: 'relative',
                        mb: 1.2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundImage: `linear-gradient(#dcf0e8 1px, transparent 1px), linear-gradient(90deg, #dcf0e8 1px, transparent 1px)`,
                        backgroundSize: '20px 20px'
                      }}>
                        <Box sx={{ 
                          width: 28, 
                          height: 28, 
                          bgcolor: 'rgba(15,110,86,0.15)', 
                          borderRadius: '50%', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center' 
                        }}>
                          <Box sx={{ width: 10, height: 10, bgcolor: '#0F6E56', borderRadius: '50%', border: '2.5px solid white' }} />
                        </Box>
                      </Box>
                      <Typography sx={{ fontSize: '10px', color: 'rgba(0,0,0,0.3)', mb: 1.2, fontWeight: 500 }}>
                        {user?.businessCoordinates?.latitude ? (
                          <>Lat: {user.businessCoordinates.latitude.toFixed(4)}, Lon: {user.businessCoordinates.longitude?.toFixed(4)} · {user.stateOfPractice || user.city || 'Unknown Area'}</>
                        ) : (
                          <>Location not set · {user?.city || 'Unknown Area'}</>
                        )}
                      </Typography>
                      <Button 
                        type="button"
                        fullWidth
                        onClick={(e) => handleGetLocation(e)}
                        sx={{ 
                          bgcolor: '#E1F5EE', 
                          color: '#0F6E56', 
                          borderRadius: '100px', 
                          py: 1.2, 
                          fontSize: '13px', 
                          fontWeight: 700,
                          textTransform: 'none',
                          boxShadow: 'none',
                          '&:hover': { bgcolor: '#d4ece3', boxShadow: 'none' }
                        }}
                      >
                        Update location
                      </Button>
                    </Box>
                  </Box>

                  {/* STORE FLYER SECTION */}
                  <Box>
                    <Typography sx={{ fontSize: '9px', fontWeight: 800, color: 'rgba(0,0,0,0.3)', letterSpacing: '0.8px', mb: 0.8, textTransform: 'uppercase' }}>
                      STORE FLYER
                    </Typography>
                    <Box sx={{ 
                      background: 'white', 
                      borderRadius: '20px', 
                      padding: '12px', 
                      border: '1px solid #eee',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.02)'
                    }}>
                      <Box sx={{ 
                        background: '#0F6E56', 
                        borderRadius: '16px', 
                        padding: '16px', 
                        color: 'white',
                        position: 'relative',
                        mb: 1.2,
                        overflow: 'hidden'
                      }}>
                        <Typography sx={{ fontSize: '11px', fontWeight: 900, mb: 1 }}>
                          PharmaStack<span style={{ color: '#FF4D97' }}>X</span>
                        </Typography>
                        <Typography className="fraunces" sx={{ fontSize: '16px', fontWeight: 900, lineHeight: 1.2, mb: 0.8, maxWidth: '180px' }}>
                          Find medicines at <em style={{ fontStyle: 'italic', opacity: 0.9 }}>{userBusinessName}'s</em> store.
                        </Typography>
                        <Typography sx={{ fontSize: '10px', opacity: 0.5, fontWeight: 500 }}>
                          {userSlug}.psx.ng
                        </Typography>
                        <Box sx={{ 
                          position: 'absolute', 
                          bottom: 15, 
                          right: 15, 
                          width: 40, 
                          height: 40, 
                          bgcolor: 'white', 
                          borderRadius: '6px',
                          display: 'grid',
                          gridTemplateColumns: 'repeat(3, 1fr)',
                          gap: '2px',
                          p: '5px'
                        }}>
                          {[...Array(9)].map((_, i) => (
                            <Box key={i} sx={{ bgcolor: i % 2 === 0 ? '#000' : '#eee', borderRadius: '1px' }} />
                          ))}
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button 
                          fullWidth
                          sx={{ 
                            bgcolor: '#E1F5EE', 
                            color: '#0F6E56', 
                            borderRadius: '10px', 
                            py: 1.2, 
                            fontSize: '13px', 
                            fontWeight: 700,
                            textTransform: 'none',
                            boxShadow: 'none',
                            '&:hover': { bgcolor: '#d4ece3' }
                          }}
                        >
                          Download flyer
                        </Button>
                        <Button 
                          fullWidth
                          sx={{ 
                            bgcolor: '#FDF2F5', 
                            color: '#FF4D97', 
                            borderRadius: '10px', 
                            py: 1.2, 
                            fontSize: '13px', 
                            fontWeight: 700,
                            textTransform: 'none',
                            boxShadow: 'none',
                            '&:hover': { bgcolor: '#fbe4eb' }
                          }}
                        >
                          Share flyer
                        </Button>
                      </Box>
                    </Box>
                  </Box>
                </Box>
              </motion.div>
            )}

            {/* TAB 1: UPLOAD */}
            {selectedTab === 1 && (
              <motion.div key="tab1" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <Box sx={{ mb: 3.5, px: 0.5 }}>
                  <Typography sx={{ fontSize: '14px', color: 'rgba(0,0,0,0.4)', fontWeight: 500, lineHeight: 1.5, maxWidth: '300px' }}>
                    Add medicines to your store one at a time or upload in bulk using a CSV file. Patients will see these in your store at 
                    <span style={{ color: COLORS.green, fontWeight: 700, marginLeft: '4px' }}>{userSlug}.psx.ng</span>
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {/* SINGLE ITEM CARD */}
                  <Box 
                    onClick={() => { setShowUploadForm(!showUploadForm); setShowCsvUpload(false); }}
                    sx={{ 
                      background: 'white', 
                      borderRadius: '24px', 
                      padding: '20px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      border: '1px solid #eee',
                      transition: 'all 0.2s ease',
                      '&:hover': { transform: 'scale(0.99)', bgcolor: '#fcfcfc' }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box sx={{ 
                        width: 56, 
                        height: 56, 
                        bgcolor: '#EBF7F2', 
                        borderRadius: '16px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center' 
                      }}>
                        <Box sx={{ width: 22, height: 22, border: '2.5px solid #0F6E56', borderRadius: '4px', opacity: 0.8 }} />
                      </Box>
                      <Box>
                        <Typography sx={{ fontSize: '16px', fontWeight: 800, color: '#000', mb: 0.5 }}>
                          Add single item
                        </Typography>
                        <Typography sx={{ fontSize: '12px', color: 'rgba(0,0,0,0.3)', fontWeight: 500, maxWidth: '200px', lineHeight: 1.3 }}>
                          Add one medicine at a time with image, price and stock details.
                        </Typography>
                      </Box>
                    </Box>
                    <Typography sx={{ fontSize: '18px', color: 'rgba(0,0,0,0.15)', fontWeight: 200, mr: 1 }}>
                      ›
                    </Typography>
                  </Box>

                  {/* BULK UPLOAD CARD */}
                  <Box 
                    onClick={() => { setShowCsvUpload(!showCsvUpload); setShowUploadForm(false); }}
                    sx={{ 
                      background: 'white', 
                      borderRadius: '24px', 
                      padding: '20px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      border: '1px solid #eee',
                      transition: 'all 0.2s ease',
                      '&:hover': { transform: 'scale(0.99)', bgcolor: '#fcfcfc' }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box sx={{ 
                        width: 56, 
                        height: 56, 
                        bgcolor: '#FDF2F5', 
                        borderRadius: '16px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center' 
                      }}>
                        <Box sx={{ width: 22, height: 22, border: '2.5px solid #FF4D97', borderRadius: '4px', opacity: 0.8 }} />
                      </Box>
                      <Box>
                        <Typography sx={{ fontSize: '16px', fontWeight: 800, color: '#000', mb: 0.5 }}>
                          Bulk upload via CSV
                        </Typography>
                        <Typography sx={{ fontSize: '12px', color: 'rgba(0,0,0,0.3)', fontWeight: 500, maxWidth: '200px', lineHeight: 1.3 }}>
                          Upload hundreds of medicines at once using a spreadsheet file.
                        </Typography>
                      </Box>
                    </Box>
                    <Typography sx={{ fontSize: '18px', color: 'rgba(0,0,0,0.15)', fontWeight: 200, mr: 1 }}>
                      ›
                    </Typography>
                  </Box>
                </Box>

                {showUploadForm && (
                  <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} style={{ background: 'white', padding: '30px', borderRadius: '30px', marginTop: '15px', border: '1px solid #eee' }}>
                    <Typography className="fraunces" sx={{ fontSize: '18px', fontWeight: 800, color: '#0F6E56', mb: 3 }}>
                      Add a medicine
                    </Typography>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                      {/* MEDICINE NAME */}
                      <Box>
                        <Typography sx={{ fontSize: '10px', fontWeight: 800, color: 'rgba(0,0,0,0.3)', mb: 0.8, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                          MEDICINE NAME
                        </Typography>
                        <TextField 
                          fullWidth 
                          placeholder="e.g. Augmentin 625mg" 
                          name="itemName" 
                          value={formValues.itemName} 
                          onChange={handleFormChange}
                          variant="outlined"
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', bgcolor: '#F9FBFB' } }}
                        />
                      </Box>

                      {/* ACTIVE INGREDIENT */}
                      <Box>
                        <Typography sx={{ fontSize: '10px', fontWeight: 800, color: 'rgba(0,0,0,0.3)', mb: 0.8, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                          ACTIVE INGREDIENT
                        </Typography>
                        <TextField 
                          fullWidth 
                          placeholder="e.g. Amoxicillin/Clavulanate" 
                          name="activeIngredient" 
                          value={formValues.activeIngredient} 
                          onChange={handleFormChange}
                          variant="outlined"
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', bgcolor: '#F9FBFB' } }}
                        />
                      </Box>

                      {/* CATEGORY & PRICE */}
                      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                        <Box>
                          <Typography sx={{ fontSize: '10px', fontWeight: 800, color: 'rgba(0,0,0,0.3)', mb: 0.8, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                            CATEGORY
                          </Typography>
                          <Select 
                            fullWidth 
                            name="category" 
                            value={formValues.category} 
                            onChange={(e: any) => handleFormChange(e)}
                            variant="outlined"
                            sx={{ borderRadius: '12px', bgcolor: '#F9FBFB' }}
                          >
                            <MenuItem value="Analgesics">Analgesics</MenuItem>
                            <MenuItem value="Antibiotics">Antibiotics</MenuItem>
                            <MenuItem value="Antimalarials">Antimalarials</MenuItem>
                            <MenuItem value="Vitamins">Vitamins</MenuItem>
                            <MenuItem value="Others">Others</MenuItem>
                          </Select>
                        </Box>
                        <Box>
                          <Typography sx={{ fontSize: '10px', fontWeight: 800, color: 'rgba(0,0,0,0.3)', mb: 0.8, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                            PRICE (₦)
                          </Typography>
                          <TextField 
                            fullWidth 
                            type="number" 
                            name="amount" 
                            value={formValues.amount} 
                            onChange={handleFormChange}
                            variant="outlined"
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', bgcolor: '#F9FBFB' } }}
                          />
                        </Box>
                      </Box>

                      {/* DESCRIPTION / INFO */}
                      <Box>
                        <Typography sx={{ fontSize: '10px', fontWeight: 800, color: 'rgba(0,0,0,0.3)', mb: 0.8, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                          DESCRIPTION / INFO
                        </Typography>
                        <TextField 
                          fullWidth 
                          multiline 
                          rows={2} 
                          placeholder="Dosage, side effects, or administration instructions..." 
                          name="info" 
                          value={formValues.info} 
                          onChange={handleFormChange}
                          variant="outlined"
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', bgcolor: '#F9FBFB' } }}
                        />
                      </Box>

                      {/* POM TOGGLE */}
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: '#F9FBFB', p: 1.5, borderRadius: '12px', border: '1px solid #eee' }}>
                        <Typography sx={{ fontSize: '13px', fontWeight: 600, color: 'rgba(0,0,0,0.6)' }}>
                          Prescription Required (POM)
                        </Typography>
                        <Checkbox 
                          checked={formValues.POM} 
                          onChange={(e) => setFormValues(prev => ({ ...prev, POM: e.target.checked }))}
                          sx={{ color: '#0F6E56', '&.Mui-checked': { color: '#0F6E56' } }}
                        />
                      </Box>

                      {/* MEDICINE IMAGE with Functional Upload */}
                      <Box>
                        <Typography sx={{ fontSize: '10px', fontWeight: 800, color: 'rgba(0,0,0,0.3)', mb: 0.8, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                          MEDICINE IMAGE
                        </Typography>
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          accept="image/*" 
                          onChange={handleImageChange} 
                          hidden 
                        />
                        <Box 
                          onClick={() => fileInputRef.current?.click()}
                          sx={{ 
                            border: '1.5px dashed #ddd', 
                            borderRadius: '24px', 
                            py: formValues.imageUrl ? 2 : 4, 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'center', 
                            bgcolor: '#F9FBFB',
                            cursor: 'pointer',
                            overflow: 'hidden',
                            position: 'relative',
                            transition: 'all 0.2s',
                            '&:hover': { borderColor: '#0F6E56', bgcolor: '#f0f7f4' }
                          }}
                        >
                          {formValues.imageUrl ? (
                            <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                              <img 
                                src={formValues.imageUrl} 
                                style={{ width: '100px', height: '100px', objectFit: 'contain', borderRadius: '12px' }} 
                                alt="Preview" 
                              />
                              <Typography sx={{ fontSize: '11px', color: '#0F6E56', fontWeight: 700 }}>
                                Change Image
                              </Typography>
                            </Box>
                          ) : (
                            <>
                              <Box sx={{ width: 44, height: 44, bgcolor: '#EBF7F2', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1.5 }}>
                                <UploadFile sx={{ color: '#0F6E56', fontSize: 20 }} />
                              </Box>
                              <Typography sx={{ fontSize: '13px', color: 'rgba(0,0,0,0.4)', fontWeight: 500 }}>
                                Tap to upload image · <span style={{ color: '#0F6E56', fontWeight: 700 }}>Browse files</span>
                              </Typography>
                            </>
                          )}
                        </Box>
                      </Box>

                      {/* SUBMIT BUTTON */}
                      <Button 
                        fullWidth 
                        variant="contained" 
                        onClick={handleFormSubmit} 
                        disabled={isSubmitting}
                        sx={{ 
                          bgcolor: '#0F6E56', 
                          color: 'white', 
                          borderRadius: '14px', 
                          py: 1.8, 
                          fontSize: '14px', 
                          fontWeight: 700, 
                          textTransform: 'none',
                          boxShadow: 'none',
                          '&:hover': { bgcolor: '#0a5240', boxShadow: 'none' },
                          mt: 1
                        }}
                      >
                        {isSubmitting ? 'PROCESSING...' : 'ADD TO STORE'}
                      </Button>
                    </Box>
                  </motion.div>
                )}

                {showCsvUpload && (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ background: '#FDF2F5', padding: '35px', borderRadius: '30px', marginTop: '15px', border: `1.5px dashed ${COLORS.pink}`, textAlign: 'center' }}>
                    <Box sx={{ width: 44, height: 44, bgcolor: 'white', border: `1px solid ${COLORS.pinkPale}`, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                      <Box sx={{ width: 18, height: 18, border: `2.5px solid ${COLORS.pink}`, borderRadius: '4px' }} />
                    </Box>

                    <Typography sx={{ fontSize: '18px', fontWeight: 800, color: '#000', mb: 1 }}>
                      Upload CSV file
                    </Typography>
                    <Typography sx={{ fontSize: '13px', color: 'rgba(0,0,0,0.3)', fontWeight: 500, maxWidth: '280px', margin: '0 auto 25px', lineHeight: 1.5 }}>
                      Name, Active Ingredient, Category, Price required. 
                      <br/>
                      <span style={{ opacity: 0.8 }}>Image column optional — add URL or leave blank.</span>
                    </Typography>

                    <input type="file" id="bulk-stock-file" style={{ display: 'none' }} onChange={handleBulkFileUpload} />
                    <label htmlFor="bulk-stock-file">
                      <Button 
                        component="span" 
                        variant="contained" 
                        sx={{ 
                          bgcolor: COLORS.pink, 
                          color: 'white', 
                          borderRadius: '14px', 
                          px: 4, 
                          py: 1.6, 
                          fontSize: '14px', 
                          fontWeight: 700, 
                          textTransform: 'none',
                          boxShadow: 'none',
                          '&:hover': { bgcolor: '#e04585', boxShadow: 'none' }
                        }}
                      >
                        Choose CSV file
                      </Button>
                    </label>

                    {isUploading && <CircularProgress size={20} sx={{ display: 'block', margin: '20px auto', color: COLORS.pink }} />}

                    <Typography sx={{ mt: 3, fontSize: '12px', color: 'rgba(0,0,0,0.3)', fontWeight: 500 }}>
                      Need a template? 
                      <span 
                        onClick={handleDownloadSampleCsv}
                        style={{ color: COLORS.pink, fontWeight: 700, marginLeft: '5px', cursor: 'pointer', textDecoration: 'none' }}
                      >
                        Download sample CSV
                      </span>
                    </Typography>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* TAB 2: STOCK */}
            {selectedTab === 2 && (
              <motion.div key="tab2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {/* LOADING BAR */}
                <Box sx={{ height: 3, mb: 1, borderRadius: '10px', overflow: 'hidden' }}>
                  {loadingStock && <LinearProgress color="primary" sx={{ bgcolor: '#EBF7F2', '& .MuiLinearProgress-bar': { bgcolor: '#0F6E56' } }} />}
                </Box>

                {/* STATS CARDS */}
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5, mb: 2 }}>
                  {[
                    { label: 'TOTAL', value: stockStats.total, color: '#000' },
                    { label: 'PUBLISHED', value: stockStats.published, color: '#0F6E56' },
                    { label: 'ATTENTION', value: stockStats.attention, color: '#B45309' }
                  ].map((stat, idx) => (
                    <Box key={idx} sx={{ 
                      bgcolor: 'white', 
                      borderRadius: '16px', 
                      p: 1.8, 
                      textAlign: 'center', 
                      border: '1px solid #eee',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.01)'
                    }}>
                      <Typography sx={{ fontSize: '22px', fontWeight: 800, color: stat.color, mb: 0 }}>
                        {stat.value}
                      </Typography>
                      <Typography sx={{ fontSize: '9px', fontWeight: 800, color: 'rgba(0,0,0,0.25)', letterSpacing: '0.5px' }}>
                        {stat.label}
                      </Typography>
                    </Box>
                  ))}
                </Box>

                {/* SEARCH & FILTERS */}
                <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
                  <TextField 
                    fullWidth 
                    placeholder="Search medicines..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    variant="outlined"
                    sx={{ 
                      '& .MuiOutlinedInput-root': { 
                        borderRadius: '100px', 
                        bgcolor: 'white', 
                        height: '42px',
                        px: 1.8,
                        '& .MuiOutlinedInput-input': { color: 'rgba(0,0,0,0.4)', fontWeight: 500, fontSize: '13px' }
                      } 
                    }}
                  />
                  <Button 
                    variant="outlined"
                    sx={{ 
                      minWidth: '100px', 
                      height: '42px',
                      borderRadius: '100px', 
                      bgcolor: 'white', 
                      borderColor: '#eee', 
                      color: 'rgba(0,0,0,0.5)', 
                      fontWeight: 600,
                      textTransform: 'none',
                      fontSize: '13px',
                      display: 'flex',
                      gap: 0.8,
                      '&:hover': { bgcolor: '#fcfcfc', borderColor: '#ddd' }
                    }}
                  >
                    Filters
                    <ExpandMore sx={{ fontSize: 16, opacity: 0.4 }} />
                  </Button>
                </Box>


                {/* STOCK LIST CONTAINER */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pb: 4 }}>
                  {displayableStock.map((item) => {
                    const needsFix = !item.imageUrl || item.activeIngredient === 'N/A';
                    return (
                      <Box key={item._id} sx={{ bgcolor: 'white', borderRadius: '24px', p: 2, border: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, flex: 1, minWidth: 0 }}>
                          {/* IMAGE PLACEHOLDER with ATTENTION DOT */}
                          <Box sx={{ position: 'relative', width: 64, height: 64, bgcolor: '#F9FBFB', border: '1px solid #eee', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {item.imageUrl ? (
                              <img src={item.imageUrl} style={{ width: '70%', height: '70%', objectFit: 'contain' }} />
                            ) : (
                              <Box sx={{ width: 24, height: 24, border: '2px solid rgba(0,0,0,0.05)', borderRadius: '4px' }} />
                            )}
                            {needsFix && (
                              <Box sx={{ position: 'absolute', top: 5, right: 5, width: 8, height: 8, bgcolor: '#B45309', borderRadius: '50%', border: '2px solid white' }} />
                            )}
                          </Box>

                          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                            <Typography noWrap sx={{ fontSize: '16px', fontWeight: 800, color: '#000', mb: 0.2 }}>{item.itemName}</Typography>
                            <Typography noWrap sx={{ fontSize: '12px', color: 'rgba(0,0,0,0.3)', fontWeight: 500, mb: 1 }}>{item.activeIngredient}</Typography>
                            <Box sx={{ display: 'flex', gap: 0.8, mt: 0.5 }}>
                              <Chip 
                                label={needsFix ? 'Needs attention' : 'Published'} 
                                size="small" 
                                sx={{ 
                                  height: '24px', 
                                  fontSize: '10px', 
                                  fontWeight: 800, 
                                  bgcolor: needsFix ? '#FEF3C7' : '#EBF7F2', 
                                  color: needsFix ? '#B45309' : '#0F6E56',
                                  borderRadius: '8px'
                                }} 
                              />
                              <Chip label={item.category} size="small" sx={{ height: '24px', fontSize: '10px', fontWeight: 600, color: 'rgba(0,0,0,0.4)', bgcolor: '#f5f5f5', borderRadius: '8px' }} />
                            </Box>
                          </Box>
                        </Box>

                        <Box sx={{ width: 85, textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 }}>
                          <Typography sx={{ fontSize: '17px', fontWeight: 800, color: '#000', mb: 0.2, whiteSpace: 'nowrap' }}>
                            {item.amount > 0 ? `₦${Number(item.amount).toLocaleString()}` : '—'}
                          </Typography>
                          <Typography 
                            onClick={() => { setSelectedProduct(item); setTileEditData(item); }}
                            sx={{ fontSize: '13px', fontWeight: 700, color: '#FF4D97', cursor: 'pointer' }}
                          >
                            {needsFix ? 'Fix' : 'Edit'}
                          </Typography>
                        </Box>
                      </Box>
                    );
                  })}
                  
                  {stockStats.total > stockData.length && !searchQuery && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                      <Button 
                        disabled={loadingMore}
                        onClick={() => fetchInitialData(true)}
                        variant="outlined"
                        sx={{ 
                          borderRadius: '100px', 
                          textTransform: 'none', 
                          fontWeight: 700, 
                          color: '#0F6E56', 
                          borderColor: '#EBF7F2',
                          bgcolor: '#EBF7F2',
                          px: 4,
                          '&:hover': { bgcolor: '#def1ea', borderColor: '#def1ea' }
                        }}
                      >
                        {loadingMore ? 'Loading...' : `Show more (+${Math.min(12, stockStats.total - stockData.length)})`}
                      </Button>
                    </Box>
                  )}

                  {/* PUBLISH BANNER (REPOSITIONED & SLIMMED) */}
                  <Box sx={{ 
                    position: 'relative', 
                    mt: 2,
                    mb: 2,
                    mx: 'auto',
                    width: '100%',
                    bgcolor: '#0F6E56', 
                    p: 1.2, 
                    px: 2.5, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    borderRadius: '24px',
                    color: 'white',
                    boxShadow: '0 8px 30px rgba(0,110,86,0.12)'
                  }}>
                    <Box>
                      <Typography sx={{ fontSize: '14px', fontWeight: 800 }}>
                        {isStorePublished ? 'Store is LIVE' : 'Ready to publish'}
                      </Typography>
                      <Typography sx={{ fontSize: '10.5px', opacity: 0.8 }}>
                        {stockStats.published} items ready · {stockStats.attention} need fixing
                      </Typography>
                    </Box>
                    <Button 
                      variant="contained" 
                      onClick={async () => {
                        try {
                          const newStatus = !isStorePublished;
                          await axios.post('/api/stock/store-publish', { isPublished: newStatus });
                          setIsStorePublished(newStatus);
                          alert(`Store ${newStatus ? 'published' : 'unpublished'}!`);
                        } catch (e) {
                            alert('Failed to update status');
                        }
                      }}
                      sx={{ bgcolor: 'white', color: '#0F6E56', borderRadius: '10px', px: 2, py: 0.6, fontWeight: 900, textTransform: 'none', fontSize: '13px', '&:hover': { bgcolor: '#f5f5f5' } }}
                    >
                      {isStorePublished ? 'Unpublish' : 'Publish store'}
                    </Button>
                  </Box>
                </Box>

              </motion.div>
            )}
          </AnimatePresence>
        </Box>
      </Container>

      {/* PRODUCT EDITOR MODAL */}
      <Modal 
        open={!!selectedProduct} 
        onClose={() => { setSelectedProduct(null); setIsEditingTile(false); setShowSuggestions(false); }}
        slots={{
          backdrop: (props) => (
            <Box 
              {...props} 
              sx={{ 
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
                bgcolor: 'rgba(10,15,12,0.4)', backdropFilter: 'blur(12px)', zIndex: -1 
              }} 
            />
          )
        }}
        closeAfterTransition
      >
        <Fade in={!!selectedProduct}>
          <Box sx={{ 
            position: 'absolute', 
            top: '50%', 
            left: '50%', 
            transform: 'translate(-50%, -50%)', 
            width: { xs: '92%', sm: '85%', md: '800px' }, 
            bgcolor: 'rgba(255,255,255,0.98)', 
            borderRadius: '28px', 
            p: { xs: 3, sm: 5 }, 
            outline: 'none', 
            boxShadow: '0 32px 100px rgba(0,0,0,0.18)',
            border: '1px solid rgba(255,255,255,0.5)',
            maxHeight: { xs: '65vh', sm: '58vh' },
            overflowY: 'auto'
          }}>
            {tileEditData && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', alignItems: 'center', gap: 1 }}>
                  <Typography className="fraunces" sx={{ fontWeight: 900, fontSize: { xs: '18px', sm: '22px' }, color: 'var(--black)', letterSpacing: '-0.3px', whiteSpace: 'nowrap' }}>Refine <em style={{ color: COLORS.pink }}>SKU</em></Typography>
                  <Box sx={{ display: 'flex', gap: { xs: 1, sm: 1.5 }, alignItems: 'center', ml: 'auto' }}>
                    {isEditingTile ? (
                      <Button variant="contained" onClick={() => handleSave(tileEditData._id!)} sx={{ borderRadius: '100px', background: COLORS.pink, px: { xs: 1.5, sm: 2.5 }, py: 0.8, fontSize: { xs: '10px', sm: '11px' }, fontWeight: 800, textTransform: 'uppercase', minWidth: 'auto' }}>SAVE</Button>
                    ) : (
                      <Button variant="outlined" onClick={() => setIsEditingTile(true)} sx={{ borderRadius: '100px', color: 'var(--black)', borderColor: 'var(--black)', px: { xs: 1.5, sm: 2.5 }, py: 0.8, fontSize: { xs: '10px', sm: '11px' }, fontWeight: 800, textTransform: 'uppercase', minWidth: 'auto' }}>EDIT DETAILS</Button>
                    )}
                    <IconButton onClick={() => setSelectedProduct(null)} sx={{ bgcolor: COLORS.bg, width: { xs: 28, sm: 32 }, height: { xs: 28, sm: 32 } }}><Close sx={{ fontSize: { xs: 14, sm: 16 } }} /></IconButton>
                  </Box>
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '320px 1fr' }, gap: '50px' }}>
                  <Box>
                    <Box sx={{ 
                      width: '100%', 
                      aspectRatio: '1/1', 
                      background: '#f9f9f9', 
                      borderRadius: '30px', 
                      overflow: 'hidden', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      border: `1.5px solid ${COLORS.border}`
                    }}>
                      <img src={tileEditData.imageUrl || '/placeholder.png'} style={{ width: '85%', height: '85%', objectFit: 'contain' }} />
                    </Box>
                    <Button 
                      fullWidth 
                      variant="contained" 
                      sx={{ 
                        mt: 2, 
                        borderRadius: '14px', 
                        background: COLORS.greenPale, 
                        color: COLORS.green, 
                        fontWeight: 800, 
                        py: 1.2, 
                        fontSize: '11px',
                        boxShadow: 'none',
                        '&:hover': { background: COLORS.green, color: 'white' } 
                      }} 
                      onClick={() => handleEnrich(tileEditData._id!)} 
                      disabled={enrichingId === tileEditData._id}
                    >
                      {enrichingId === tileEditData._id ? <CircularProgress size={16} /> : '✨ AI Refinement'}
                    </Button>
                  </Box>

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <TextField label="Medication Name" fullWidth variant="outlined" value={tileEditData.itemName} onChange={e => setTileEditData({...tileEditData, itemName: e.target.value})} disabled={!isEditingTile} InputProps={{ sx: { borderRadius: '16px' } }} />
                    <TextField label="Active Ingredient" fullWidth variant="outlined" value={tileEditData.activeIngredient} onChange={e => setTileEditData({...tileEditData, activeIngredient: e.target.value})} disabled={!isEditingTile} InputProps={{ sx: { borderRadius: '16px' } }} />
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                      <TextField label="Price (₦)" type="number" fullWidth variant="outlined" value={tileEditData.amount} onChange={e => setTileEditData({...tileEditData, amount: Number(e.target.value)})} disabled={!isEditingTile} InputProps={{ sx: { borderRadius: '16px' } }} />
                      <TextField label="Category" fullWidth variant="outlined" value={tileEditData.category} onChange={e => setTileEditData({...tileEditData, category: e.target.value})} disabled={!isEditingTile} InputProps={{ sx: { borderRadius: '16px' } }} />
                    </Box>
                    
                    <Box sx={{ background: '#fafafa', padding: '30px', borderRadius: '30px', display: 'flex', flexDirection: 'column', gap: '15px', border: `1.5px solid ${COLORS.border}` }}>
                        <Typography sx={{ fontSize: '10px', fontWeight: 900, color: COLORS.sub, letterSpacing: '1.5px', marginBottom: '5px', textTransform: 'uppercase' }}>VISIBILITY & COMPLIANCE</Typography>
                        <FormControlLabel control={<Checkbox checked={tileEditData.isPublished} onChange={e => e.target.checked ? handlePublish(tileEditData._id!) : handleUnpublish(tileEditData._id!)} color="success" />} label={<span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--black)' }}>Live on Storefront</span>} />
                        <FormControlLabel control={<Checkbox checked={tileEditData.POM} onChange={e => setTileEditData({...tileEditData, POM: e.target.checked})} disabled={!isEditingTile} color="error" />} label={<span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--black)' }}>Prescription Required (POM)</span>} />
                    </Box>
                  </Box>
                </Box>
              </Box>
            )}
          </Box>
        </Fade>
      </Modal>
    </Box>
  );
}
