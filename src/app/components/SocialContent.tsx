'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Box, Typography, Button, TextField, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, IconButton } from '@mui/material';
import { Add, Delete, Share, ExpandMore, ExpandLess, ChevronLeft, ChevronRight, CalendarMonth } from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from '@/context/SessionProvider';
import axios from 'axios';

const PHOTO_TAGS = ['staff', 'store', 'product', 'event', 'other'] as const;
type PhotoTag = typeof PHOTO_TAGS[number];

const G = '#0F6E56';
const P = '#C84B8F';
const BORDER = '1px solid rgba(0,0,0,0.06)';

interface SocialPhoto { url: string; tag: PhotoTag; uploadedAt?: string; description?: string; }

async function encodeImage(file: File): Promise<{ data: string; contentType: string; filename: string }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 1200;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        const data = canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
        resolve({ data, contentType: 'image/jpeg', filename: file.name });
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export default function SocialContent() {
  const { user, refreshSession } = useSession();

  // Brand kit
  const [brandPrimary, setBrandPrimary] = useState<string>(user?.brandKit?.primaryColor || G);
  const [brandSecondary, setBrandSecondary] = useState<string>(user?.brandKit?.secondaryColor || P);
  const [tagline, setTagline] = useState<string>(user?.brandKit?.tagline || '');
  const [logoUrl, setLogoUrl] = useState<string>(user?.brandKit?.logoUrl || '');
  const [savingBrand, setSavingBrand] = useState(false);
  const [brandKitOpen, setBrandKitOpen] = useState(!user?.hasSetupBrandKit);

  // Photo library
  const [photos, setPhotos] = useState<SocialPhoto[]>((user?.socialPhotos as SocialPhoto[]) || []);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  
  // Photo upload context modal
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [photoDescription, setPhotoDescription] = useState('');

  // Content Plan & Review
  const [activeTab, setActiveTab] = useState<'images' | 'videos'>('images');
  
  // Date Carousel state
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0,0,0,0);
    return d;
  });
  
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [todaysVideoIdea, setTodaysVideoIdea] = useState<any>(null);
  const [isCaptionExpanded, setIsCaptionExpanded] = useState<boolean>(false);
  const [activePlan, setActivePlan] = useState<any>(null);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [updatingPost, setUpdatingPost] = useState(false);
  const [shared, setShared] = useState(false);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [isStrategyExpanded, setIsStrategyExpanded] = useState(false);
  
  // Reject/Regenerate Modal
  const [reasonModalOpen, setReasonModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [regeneratingPost, setRegeneratingPost] = useState(false);

  const isToday = (d: Date) => {
    const t = new Date();
    return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear();
  };

  const fetchContent = (date: Date) => {
    if (!user?._id) return;
    setLoadingPlan(true);
    
    // Format local date exactly as YYYY-MM-DD
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const dateString = `${yyyy}-${mm}-${dd}`;
    
    axios.get(`/api/social/manage?pharmacyId=${user._id}&date=${dateString}`).then(res => {
      setSelectedPost(res.data.selectedPost);
      setActivePlan(res.data.activePlan || res.data.pendingPlan);
      // We always want today's post just to extract the video idea if it exists.
      // But actually DailyPost contains videoIdeaText.
      setTodaysVideoIdea(res.data.todaysPost?.videoIdeaText || res.data.selectedPost?.videoIdeaText);

      if (!res.data.activePlan && !res.data.pendingPlan && isToday(date)) {
        setGeneratingPlan(true);
        axios.post('/api/social/generate-plan', { pharmacyId: user._id, date: dateString })
          .then(() => axios.get(`/api/social/manage?pharmacyId=${user._id}&date=${dateString}`))
          .then(refetchRes => {
            setSelectedPost(refetchRes.data.selectedPost);
            setActivePlan(refetchRes.data.activePlan || refetchRes.data.pendingPlan);
            setTodaysVideoIdea(refetchRes.data.todaysPost?.videoIdeaText || refetchRes.data.selectedPost?.videoIdeaText);
          })
          .catch(console.error)
          .finally(() => setGeneratingPlan(false));
      }
    }).catch(console.error).finally(() => setLoadingPlan(false));
  };

  useEffect(() => {
    fetchContent(selectedDate);
  }, [user?._id, selectedDate]);

  const changeDate = (days: number) => {
    const nd = new Date(selectedDate);
    nd.setDate(nd.getDate() + days);
    setSelectedDate(nd);
  };

  const handleApprove = async (postId: string) => {
    setUpdatingPost(true);
    try {
      const res = await axios.put('/api/social/manage', { postId, status: 'ready_to_post' });
      setSelectedPost(res.data.post);
    } catch(e) { console.error(e); }
    finally { setUpdatingPost(false); }
  };

  const handleRegenerateSubmit = async () => {
    if (!selectedPost || !rejectionReason.trim()) return;
    setRegeneratingPost(true);
    try {
      const res = await axios.post('/api/social/regenerate-post', { 
        postId: selectedPost._id, 
        reason: rejectionReason 
      });
      setSelectedPost(res.data.post);
      setReasonModalOpen(false);
      setRejectionReason('');
    } catch(e) { console.error(e); }
    finally { setRegeneratingPost(false); }
  };

  const saveBrandKit = async () => {
    setSavingBrand(true);
    try {
      await axios.put('/api/account', {
        brandKit: { primaryColor: brandPrimary, secondaryColor: brandSecondary, tagline, logoUrl },
      });
      if (refreshSession) await refreshSession();
    } catch (e) { console.error(e); }
    finally { setSavingBrand(false); }
  };

  const logoInputRef = useRef<HTMLInputElement>(null);
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { data, contentType, filename } = await encodeImage(file);
    const res = await axios.post('/api/social/photos', { data, contentType, filename, tag: 'other' });
    setLogoUrl(res.data.url);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []) as File[];
    if (files.length) {
      setPendingFiles(files);
    }
  };

  const confirmPhotoUpload = async () => {
    if (!pendingFiles.length || !photoDescription.trim()) return;
    setUploadingPhoto(true);
    try {
      for (const file of pendingFiles) {
        const { data, contentType, filename } = await encodeImage(file);
        const res = await axios.post('/api/social/photos', { 
          data, contentType, filename, tag: 'other', description: photoDescription 
        });
        setPhotos(prev => [{ url: res.data.url, tag: 'other', uploadedAt: new Date().toISOString(), description: photoDescription }, ...prev]);
      }
    } finally { 
      setUploadingPhoto(false); 
      setPendingFiles([]);
      setPhotoDescription('');
      if (photoInputRef.current) photoInputRef.current.value = ''; 
    }
  };

  const handleDeletePhoto = async (url: string) => {
    await axios.delete('/api/social/photos', { data: { url } });
    setPhotos(prev => prev.filter(p => p.url !== url));
  };

  const updatePhotoTag = (url: string, tag: PhotoTag) => {
    setPhotos(prev => prev.map(p => p.url === url ? { ...p, tag } : p));
  };

  const handlePost = async (post: any) => {
    if (!post || !post.imageUrl) return;
    const text = `${post.caption}\n\n${(post.hashtags || []).map((h: string) => `#${h}`).join(' ')}`;

    try {
      const res = await fetch(post.imageUrl);
      const blob = await res.blob();
      const file = new File([blob], 'post.jpg', { type: 'image/jpeg' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text });
        return;
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
    }

    try { navigator.clipboard.writeText(text); } catch {}
    const a = document.createElement('a');
    a.href = post.imageUrl;
    a.download = 'social-post.jpg';
    a.click();
    setShared(true);
    setTimeout(() => setShared(false), 3000);
  };

  const cardSx = { bgcolor: '#fff', borderRadius: '20px', p: 2.5, border: BORDER, mb: 2 };
  const sectionLabelSx = { fontSize: '9px', fontWeight: 800, color: 'rgba(0,0,0,0.3)', letterSpacing: '1px', textTransform: 'uppercase', mb: 1.5 };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

      <Box sx={{ ...cardSx, p: brandKitOpen ? 2.5 : 0, overflow: 'hidden' }}>
        <Box
          onClick={() => setBrandKitOpen(o => !o)}
          sx={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none',
            p: 2.5,
            ...(brandKitOpen ? {} : {
              background: `radial-gradient(circle at top right, ${brandPrimary}33, transparent 40%), radial-gradient(circle at bottom left, ${brandSecondary}33, transparent 40%), linear-gradient(135deg, rgba(255,255,255,0.8), rgba(255,255,255,0.4))`,
              backdropFilter: 'blur(10px)',
              borderBottom: '1px solid rgba(255,255,255,0.5)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6)',
              color: '#333',
            })
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {!brandKitOpen && (
              <Box sx={{ width: 32, height: 32, borderRadius: '50%', background: `linear-gradient(135deg, ${brandPrimary}, ${brandSecondary})`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
                <Typography sx={{ fontSize: '14px', color: '#fff' }}>✨</Typography>
              </Box>
            )}
            <Typography sx={{ ...sectionLabelSx, mb: 0, color: brandKitOpen ? 'rgba(0,0,0,0.3)' : '#111', fontWeight: brandKitOpen ? 600 : 700, letterSpacing: brandKitOpen ? '1px' : '-0.2px' }}>
              {brandKitOpen ? 'Brand Kit' : 'Your Brand Identity'}
            </Typography>
          </Box>
          {brandKitOpen ? <ExpandLess sx={{ fontSize: '18px', color: 'rgba(0,0,0,0.3)' }} /> : <ExpandMore sx={{ fontSize: '20px', color: '#666' }} />}
        </Box>

        <AnimatePresence initial={false}>
          {brandKitOpen && (
            <motion.div
              key="brand-kit-body"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: 'hidden' }}
            >
              <Box sx={{ pt: 2 }}>

                <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
                  {[
                    { label: 'Primary', value: brandPrimary, set: setBrandPrimary },
                    { label: 'Secondary', value: brandSecondary, set: setBrandSecondary },
                  ].map(({ label, value, set }) => (
                    <Box key={label} sx={{ flex: 1 }}>
                      <Typography sx={{ fontSize: '10px', fontWeight: 600, color: 'rgba(0,0,0,0.4)', mb: 0.5 }}>{label}</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: '#f9f9f7', borderRadius: '12px', p: 1, border: BORDER }}>
                        <Box
                          component="label"
                          sx={{ width: 28, height: 28, borderRadius: '8px', bgcolor: value, cursor: 'pointer', flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
                        >
                          <input type="color" value={value} onChange={e => set(e.target.value)} style={{ opacity: 0, width: 0, height: 0 }} />
                        </Box>
                        <Typography sx={{ fontSize: '11px', fontWeight: 700, fontFamily: 'monospace', color: '#333' }}>{value}</Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>

                <Typography sx={{ fontSize: '10px', fontWeight: 600, color: 'rgba(0,0,0,0.4)', mb: 0.5 }}>Logo</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                  {logoUrl ? (
                    <Box sx={{ width: 56, height: 56, borderRadius: '12px', overflow: 'hidden', border: BORDER, flexShrink: 0 }}>
                      <img src={logoUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </Box>
                  ) : (
                    <Box sx={{ width: 56, height: 56, borderRadius: '12px', bgcolor: brandPrimary, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: '16px', fontFamily: 'Poppins, sans-serif' }}>
                        {(user?.businessName || user?.username || 'P').charAt(0).toUpperCase()}
                      </Typography>
                    </Box>
                  )}
                  <Button
                    component="label"
                    size="small"
                    sx={{ bgcolor: '#f4f4f2', color: '#333', borderRadius: '10px', textTransform: 'none', fontSize: '12px', fontWeight: 600, px: 1.5, py: 0.8, boxShadow: 'none' }}
                  >
                    {logoUrl ? 'Change logo' : 'Upload logo'}
                    <input ref={logoInputRef} type="file" accept="image/*" hidden onChange={handleLogoUpload} />
                  </Button>
                  {logoUrl && (
                    <Button size="small" onClick={() => setLogoUrl('')} sx={{ color: '#999', textTransform: 'none', fontSize: '12px', minWidth: 0, p: 0.5 }}>
                      Remove
                    </Button>
                  )}
                </Box>

                <Typography sx={{ fontSize: '10px', fontWeight: 600, color: 'rgba(0,0,0,0.4)', mb: 0.5 }}>Tagline</Typography>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="e.g. Your health, our priority"
                  value={tagline}
                  onChange={e => setTagline(e.target.value)}
                  sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: '12px', fontSize: '13px', bgcolor: '#f9f9f7' } }}
                />

                <Button
                  fullWidth
                  onClick={saveBrandKit}
                  disabled={savingBrand}
                  sx={{ bgcolor: G, color: '#fff', borderRadius: '12px', textTransform: 'none', fontWeight: 700, fontSize: '13px', py: 1.2, boxShadow: 'none', '&:hover': { bgcolor: '#0a5a45', boxShadow: 'none' } }}
                >
                  {savingBrand ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : 'Save brand kit'}
                </Button>

                <Box sx={{ mt: 2.5, pt: 2, borderTop: BORDER }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                    <Typography sx={{ ...sectionLabelSx, mb: 0 }}>Photo Library ({photos.length})</Typography>
                    <Button
                      component="label"
                      size="small"
                      disabled={uploadingPhoto}
                      startIcon={uploadingPhoto ? <CircularProgress size={12} /> : <Add sx={{ fontSize: '16px' }} />}
                      sx={{ bgcolor: G, color: '#fff', borderRadius: '10px', textTransform: 'none', fontWeight: 700, fontSize: '11px', px: 1.5, py: 0.7, boxShadow: 'none', minWidth: 0 }}
                    >
                      Add photos
                      <input ref={photoInputRef} type="file" accept="image/*" multiple hidden onChange={handleFileSelect} />
                    </Button>
                  </Box>

                  {photos.length === 0 ? (
                    <Box
                      component="label"
                      sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1, border: '2px dashed rgba(0,0,0,0.1)', borderRadius: '16px', py: 4, cursor: 'pointer' }}
                    >
                      <Typography sx={{ fontSize: '28px' }}>📸</Typography>
                      <Typography sx={{ fontSize: '13px', fontWeight: 600, color: 'rgba(0,0,0,0.4)' }}>Add photos to your library</Typography>
                      <Typography sx={{ fontSize: '11px', color: 'rgba(0,0,0,0.3)' }}>Staff, store, products — anything</Typography>
                      <input type="file" accept="image/*" multiple hidden onChange={handleFileSelect} />
                    </Box>
                  ) : (
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
                      {photos.map((photo) => (
                        <Box key={photo.url} sx={{ position: 'relative', aspectRatio: '1/1', borderRadius: '12px', overflow: 'hidden', bgcolor: '#f0f0ee' }}>
                          <img src={photo.url} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                          <Box
                            sx={{ position: 'absolute', bottom: 4, left: 4, bgcolor: 'rgba(0,0,0,0.6)', borderRadius: '6px', px: 0.8, py: 0.2, cursor: 'pointer' }}
                            onClick={() => {
                              const idx = PHOTO_TAGS.indexOf(photo.tag);
                              updatePhotoTag(photo.url, PHOTO_TAGS[(idx + 1) % PHOTO_TAGS.length]);
                            }}
                          >
                            <Typography sx={{ fontSize: '9px', color: '#fff', fontWeight: 700, textTransform: 'capitalize' }}>{photo.tag}</Typography>
                          </Box>
                          <Box
                            onClick={() => handleDeletePhoto(photo.url)}
                            sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'rgba(0,0,0,0.5)', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                          >
                            <Delete sx={{ fontSize: '12px', color: '#fff' }} />
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  )}
                </Box>

              </Box>
            </motion.div>
          )}
        </AnimatePresence>
      </Box>

      {/* ── TABS ──────────────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <Button
          onClick={() => setActiveTab('images')}
          sx={{ flex: 1, py: 1.2, borderRadius: '12px', textTransform: 'none', fontWeight: 700, fontSize: '13px', bgcolor: activeTab === 'images' ? G : '#fff', color: activeTab === 'images' ? '#fff' : 'rgba(0,0,0,0.5)', border: activeTab === 'images' ? 'none' : BORDER }}
        >
          Designed Post (Images)
        </Button>
        <Button
          onClick={() => setActiveTab('videos')}
          sx={{ flex: 1, py: 1.2, borderRadius: '12px', textTransform: 'none', fontWeight: 700, fontSize: '13px', bgcolor: activeTab === 'videos' ? G : '#fff', color: activeTab === 'videos' ? '#fff' : 'rgba(0,0,0,0.5)', border: activeTab === 'videos' ? 'none' : BORDER }}
        >
          Video Post
        </Button>
      </Box>

      {/* ── DATE CAROUSEL ─────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: '#fff', p: 1.5, borderRadius: '16px', border: BORDER, mb: 2 }}>
        <IconButton onClick={() => changeDate(-1)} size="small" sx={{ bgcolor: '#f4f4f2' }}><ChevronLeft sx={{ color: '#333' }} /></IconButton>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CalendarMonth sx={{ fontSize: '16px', color: G }} />
          <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#333' }}>
            {isToday(selectedDate) ? 'Today' : selectedDate.toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' })}
          </Typography>
        </Box>
        <IconButton onClick={() => changeDate(1)} size="small" sx={{ bgcolor: '#f4f4f2' }}><ChevronRight sx={{ color: '#333' }} /></IconButton>
      </Box>

      {/* ── IMAGES TAB ────────────────────────────────────────────────── */}
      {activeTab === 'images' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

          {loadingPlan ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress size={24} sx={{ color: G }} /></Box>
          ) : (
            <>
              {selectedPost ? (
                <Box sx={{ ...cardSx, border: selectedPost.status === 'pending_review' ? `2px solid ${P}40` : BORDER }}>
                  {selectedPost.status === 'ready_to_post' && (
                    <Typography sx={{...sectionLabelSx, color: G, display: 'flex', alignItems: 'center', gap: 0.5}}>✅ Ready to Post</Typography>
                  )}
                  {selectedPost.status === 'pending_review' && (
                    <Typography sx={{...sectionLabelSx, color: P, display: 'flex', alignItems: 'center', gap: 0.5}}>👀 Needs Review</Typography>
                  )}

                  <Box sx={{ display: 'flex', gap: 2, flexDirection: selectedPost.status === 'pending_review' ? 'column' : 'row' }}>
                    <Box sx={{ width: selectedPost.status === 'pending_review' ? '100%' : '100px', height: selectedPost.status === 'pending_review' ? 'auto' : '100px', aspectRatio: selectedPost.status === 'pending_review' ? '1/1' : 'auto', borderRadius: '12px', overflow: 'hidden', flexShrink: 0, bgcolor: '#f0f0ee' }}>
                      {selectedPost.imageUrl && <img src={selectedPost.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                    </Box>
                    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <Box sx={{ mb: 1 }}>
                        <Typography sx={{ fontSize: '12px', color: '#222', lineHeight: 1.5 }}>
                          {selectedPost.status === 'pending_review' 
                            ? selectedPost.caption 
                            : (isCaptionExpanded || selectedPost.caption?.length <= 80 
                                ? selectedPost.caption 
                                : `${selectedPost.caption?.substring(0, 80)}...`)}
                          
                          {selectedPost.status !== 'pending_review' && selectedPost.caption?.length > 80 && (
                            <Typography 
                              component="span" 
                              onClick={() => setIsCaptionExpanded(!isCaptionExpanded)}
                              sx={{ color: G, fontWeight: 700, cursor: 'pointer', ml: 0.5 }}
                            >
                              {isCaptionExpanded ? 'Show less' : 'Read more'}
                            </Typography>
                          )}
                        </Typography>
                      </Box>
                      
                      <Typography sx={{ fontSize: '11px', color: G, fontWeight: 600, mb: 2 }}>
                        {(selectedPost.hashtags || []).map((h: string) => `#${h}`).join(' ')}
                      </Typography>
                      
                      <Box sx={{ mt: 'auto', display: 'flex', gap: 1 }}>
                        {selectedPost.status === 'ready_to_post' && (
                          <>
                            {isToday(selectedDate) && (
                               <Button
                               onClick={() => setReasonModalOpen(true)}
                               sx={{ flex: 1, bgcolor: '#fceaea', color: '#c0392b', borderRadius: '10px', textTransform: 'none', fontWeight: 600, fontSize: '12px', py: 0.8, boxShadow: 'none' }}
                             >
                               Regenerate
                             </Button>
                            )}
                            <Button
                              onClick={() => handlePost(selectedPost)}
                              startIcon={<Share sx={{ fontSize: '16px' }} />}
                              sx={{ flex: 1, bgcolor: shared ? '#2e7d5a' : G, color: '#fff', borderRadius: '10px', textTransform: 'none', fontWeight: 700, fontSize: '12px', py: 0.8, boxShadow: 'none' }}
                            >
                              {shared ? 'Copied' : 'Share'}
                            </Button>
                          </>
                        )}
                        {selectedPost.status === 'pending_review' && (
                          <>
                            <Button
                              fullWidth
                              onClick={() => setReasonModalOpen(true)}
                              disabled={updatingPost}
                              sx={{ bgcolor: '#fceaea', color: '#c0392b', borderRadius: '10px', textTransform: 'none', fontWeight: 600, fontSize: '12px', py: 1 }}
                            >
                              Flag / Reject
                            </Button>
                            <Button
                              fullWidth
                              onClick={() => handleApprove(selectedPost._id)}
                              disabled={updatingPost}
                              sx={{ bgcolor: G, color: '#fff', borderRadius: '10px', textTransform: 'none', fontWeight: 700, fontSize: '12px', py: 1 }}
                            >
                              Approve
                            </Button>
                          </>
                        )}
                      </Box>
                    </Box>
                  </Box>
                </Box>
              ) : (
                <Typography sx={{ fontSize: '12px', color: 'rgba(0,0,0,0.4)', textAlign: 'center', py: 3 }}>No post scheduled for this date.</Typography>
              )}

              <Box sx={cardSx}>
                <Typography sx={sectionLabelSx}>Monthly Strategy</Typography>
                {generatingPlan ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4, gap: 2 }}>
                    <CircularProgress size={24} sx={{ color: G }} />
                    <Typography sx={{ fontSize: '12px', color: 'rgba(0,0,0,0.5)' }}>Generating your personalized 30-day strategy...</Typography>
                  </Box>
                ) : activePlan ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {activePlan.schedule.slice(0, isStrategyExpanded ? 30 : 5).map((item: any, i: number) => (
                      <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, bgcolor: '#f9f9f7', borderRadius: '10px' }}>
                        <Box sx={{ width: 32, height: 32, borderRadius: '8px', bgcolor: item.type === 'image' ? G : P, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
                          {item.type === 'image' ? '📸' : '🎥'}
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#333' }}>{item.category}</Typography>
                          <Typography sx={{ fontSize: '10px', color: 'rgba(0,0,0,0.5)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>{item.topic}</Typography>
                        </Box>
                        <Typography sx={{ fontSize: '10px', fontWeight: 700, color: 'rgba(0,0,0,0.3)' }}>
                          {new Date(item.date).getDate()} {new Date(item.date).toLocaleString('default', { month: 'short' })}
                        </Typography>
                      </Box>
                    ))}
                    {activePlan.schedule.length > 5 && (
                      <Typography 
                        onClick={() => setIsStrategyExpanded(!isStrategyExpanded)}
                        sx={{ fontSize: '11px', color: G, fontWeight: 600, textAlign: 'center', mt: 1, cursor: 'pointer', transition: '0.2s', '&:hover': { opacity: 0.7 } }}
                      >
                        {isStrategyExpanded ? 'Collapse Strategy' : `View all ${activePlan.schedule.length} topics`}
                      </Typography>
                    )}
                  </Box>
                ) : (
                  <Typography sx={{ fontSize: '12px', color: 'rgba(0,0,0,0.4)', textAlign: 'center', py: 3 }}>No active plan. System will generate one shortly.</Typography>
                )}
              </Box>
            </>
          )}
        </Box>
      )}

      {/* ── VIDEOS TAB ────────────────────────────────────────────────── */}
      {activeTab === 'videos' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {loadingPlan ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress size={24} sx={{ color: G }} /></Box>
          ) : (
            <Box sx={cardSx}>
              <Typography sx={sectionLabelSx}>Video Script for {isToday(selectedDate) ? 'Today' : selectedDate.toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' })}</Typography>
              {selectedPost?.videoIdeaText ? (
                <Typography sx={{ fontSize: '13px', color: '#222', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {selectedPost.videoIdeaText}
                </Typography>
              ) : (
                <Typography sx={{ fontSize: '12px', color: 'rgba(0,0,0,0.4)' }}>No video assigned for this date.</Typography>
              )}
            </Box>
          )}
          
          <Box sx={cardSx}>
            <Typography sx={sectionLabelSx}>Generate Video</Typography>
            <Box sx={{ py: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
              <Typography sx={{ fontSize: '32px' }}>🎬</Typography>
              <Typography sx={{ fontSize: '14px', fontWeight: 700, color: '#333' }}>AI Video Generation</Typography>
              <Typography sx={{ fontSize: '12px', color: 'rgba(0,0,0,0.4)' }}>Coming soon in the next update.</Typography>
            </Box>
          </Box>
        </Box>
      )}

      {/* Modals */}
      <Dialog open={pendingFiles.length > 0} onClose={() => setPendingFiles([])} PaperProps={{ sx: { borderRadius: '16px', p: 1 } }}>
        <DialogTitle sx={{ fontSize: '14px', fontWeight: 700 }}>Describe this photo</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: '12px', color: 'rgba(0,0,0,0.5)', mb: 2 }}>
            Tell our intelligence a little bit about what's in this photo so it can use it accurately for your content generation.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            size="small"
            placeholder="e.g. Storefront during Christmas, Dr. Ade giving advice..."
            value={photoDescription}
            onChange={(e) => setPhotoDescription(e.target.value)}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', fontSize: '13px' } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingFiles([])} sx={{ color: '#666', textTransform: 'none', fontWeight: 600 }}>Cancel</Button>
          <Button onClick={confirmPhotoUpload} disabled={!photoDescription.trim() || uploadingPhoto} sx={{ bgcolor: G, color: '#fff', textTransform: 'none', fontWeight: 600, borderRadius: '8px', '&:hover': { bgcolor: '#0a5a45' } }}>
            {uploadingPhoto ? 'Uploading...' : 'Upload & Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={reasonModalOpen} onClose={() => setReasonModalOpen(false)} PaperProps={{ sx: { borderRadius: '16px', p: 1 } }}>
        <DialogTitle sx={{ fontSize: '14px', fontWeight: 700 }}>Why are you rejecting this?</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: '12px', color: 'rgba(0,0,0,0.5)', mb: 2 }}>
            Tell our intelligence a reason why you're rejecting or redesigning this post, so it can improve the next one.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            multiline
            rows={3}
            size="small"
            placeholder="e.g. Too much text, change the color, mention malaria instead..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', fontSize: '13px' } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReasonModalOpen(false)} sx={{ color: '#666', textTransform: 'none', fontWeight: 600 }}>Cancel</Button>
          <Button onClick={handleRegenerateSubmit} disabled={!rejectionReason.trim() || regeneratingPost} sx={{ bgcolor: '#c0392b', color: '#fff', textTransform: 'none', fontWeight: 600, borderRadius: '8px', '&:hover': { bgcolor: '#922b21' } }}>
            {regeneratingPost ? 'Regenerating...' : 'Regenerate Post'}
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}
