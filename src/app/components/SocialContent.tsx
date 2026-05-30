'use client';

import React, { useState, useRef } from 'react';
import { Box, Typography, Button, TextField, CircularProgress, Chip } from '@mui/material';
import { Add, Delete, AutoAwesome, Share, ExpandMore, ExpandLess } from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from '@/context/SessionProvider';
import axios from 'axios';

const PHOTO_TAGS = ['staff', 'store', 'product', 'event', 'other'] as const;
type PhotoTag = typeof PHOTO_TAGS[number];

const POST_CATEGORIES = [
  { id: 'health_tip',        label: 'Health Tip',        emoji: '💊' },
  { id: 'product_spotlight', label: 'Product Spotlight', emoji: '🔦' },
  { id: 'ailment_awareness', label: 'Ailment Awareness', emoji: '🩺' },
  { id: 'public_health_day', label: 'Health Day',        emoji: '🌍' },
  { id: 'new_stock',         label: 'New Stock',         emoji: '📦' },
  { id: 'promo_offer',       label: 'Promo / Offer',     emoji: '🏷️' },
  { id: 'staff_spotlight',   label: 'Staff Spotlight',   emoji: '👤' },
  { id: 'public_holiday',    label: 'Public Holiday',    emoji: '🎉' },
  { id: 'birthday',          label: 'Birthday',          emoji: '🎂' },
  { id: 'health_advice',     label: 'Health Advice',     emoji: '📋' },
  { id: 'did_you_know',      label: 'Did You Know',      emoji: '💡' },
  { id: 'seasonal_tip',      label: 'Seasonal Tip',      emoji: '🌧️' },
] as const;

const G = '#0F6E56';
const P = '#C84B8F';
const BORDER = '1px solid rgba(0,0,0,0.06)';

interface GeneratedContent {
  caption: string;
  hashtags: string[];
}

interface SocialPhoto { url: string; tag: PhotoTag; uploadedAt?: string; }

// ── resize + base64 encode (used for photo library uploads) ────────────────
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

// ───────────────────────────────────────────────────────────────────────────
export default function SocialContent() {
  const { user, refreshSession } = useSession();

  // Brand kit
  const [brandPrimary, setBrandPrimary] = useState<string>(user?.brandKit?.primaryColor || G);
  const [brandSecondary, setBrandSecondary] = useState<string>(user?.brandKit?.secondaryColor || P);
  const [tagline, setTagline] = useState<string>(user?.brandKit?.tagline || '');
  const [logoUrl, setLogoUrl] = useState<string>(user?.brandKit?.logoUrl || '');
  const [savingBrand, setSavingBrand] = useState(false);
  const [brandKitOpen, setBrandKitOpen] = useState(false);

  // Photo library
  const [photos, setPhotos] = useState<SocialPhoto[]>((user?.socialPhotos as SocialPhoto[]) || []);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Content Plan & Review
  const [activeTab, setActiveTab] = useState<'images' | 'videos'>('images');
  const [todaysPost, setTodaysPost] = useState<any>(null);
  const [tomorrowsPost, setTomorrowsPost] = useState<any>(null);
  const [activePlan, setActivePlan] = useState<any>(null);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [updatingPost, setUpdatingPost] = useState(false);
  const [shared, setShared] = useState(false);

  React.useEffect(() => {
    if (!user?._id) return;
    axios.get(`/api/social/manage?pharmacyId=${user._id}`).then(res => {
      setTodaysPost(res.data.todaysPost);
      setTomorrowsPost(res.data.tomorrowsPost);
      setActivePlan(res.data.activePlan || res.data.pendingPlan);
    }).catch(console.error).finally(() => setLoadingPlan(false));
  }, [user?._id]);

  const handleApprove = async (postId: string) => {
    setUpdatingPost(true);
    try {
      const res = await axios.put('/api/social/manage', { postId, status: 'ready_to_post' });
      setTomorrowsPost(res.data.post);
    } catch(e) { console.error(e); }
    finally { setUpdatingPost(false); }
  };

  const handleFlag = async (postId: string) => {
    setUpdatingPost(true);
    try {
      const res = await axios.put('/api/social/manage', { postId, status: 'flagged' });
      setTomorrowsPost(res.data.post);
    } catch(e) { console.error(e); }
    finally { setUpdatingPost(false); }
  };

  // ── Brand kit save ───────────────────────────────────────────────────────
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

  // ── Logo upload ──────────────────────────────────────────────────────────
  const logoInputRef = useRef<HTMLInputElement>(null);
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { data, contentType, filename } = await encodeImage(file);
    const res = await axios.post('/api/social/photos', { data, contentType, filename, tag: 'other' });
    setLogoUrl(res.data.url);
  };

  // ── Photo upload ─────────────────────────────────────────────────────────
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []) as File[];
    if (!files.length) return;
    setUploadingPhoto(true);
    try {
      for (const file of files) {
        const { data, contentType, filename } = await encodeImage(file);
        const res = await axios.post('/api/social/photos', { data, contentType, filename, tag: 'other' });
        setPhotos(prev => [{ url: res.data.url, tag: 'other', uploadedAt: new Date().toISOString() }, ...prev]);
      }
    } finally { setUploadingPhoto(false); if (photoInputRef.current) photoInputRef.current.value = ''; }
  };

  const handleDeletePhoto = async (url: string) => {
    await axios.delete('/api/social/photos', { data: { url } });
    setPhotos(prev => prev.filter(p => p.url !== url));
  };

  const updatePhotoTag = (url: string, tag: PhotoTag) => {
    setPhotos(prev => prev.map(p => p.url === url ? { ...p, tag } : p));
  };

  // ── Post / share ─────────────────────────────────────────────────────────
  const handlePost = async (post: any) => {
    if (!post || !post.imageUrl) return;
    const text = `${post.caption}nn${(post.hashtags || []).map((h: string) => `#${h}`).join(' ')}`;

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

  // ── Shared styles ─────────────────────────────────────────────────────────
  const cardSx = { bgcolor: '#fff', borderRadius: '20px', p: 2.5, border: BORDER, mb: 2 };
  const sectionLabelSx = { fontSize: '9px', fontWeight: 800, color: 'rgba(0,0,0,0.3)', letterSpacing: '1px', textTransform: 'uppercase', mb: 1.5 };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* ── BRAND KIT ─────────────────────────────────────────────────── */}
      <Box sx={cardSx}>
        <Box
          onClick={() => setBrandKitOpen(o => !o)}
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}
        >
          <Typography sx={{ ...sectionLabelSx, mb: 0 }}>Brand Kit</Typography>
          {brandKitOpen ? <ExpandLess sx={{ fontSize: '18px', color: 'rgba(0,0,0,0.3)' }} /> : <ExpandMore sx={{ fontSize: '18px', color: 'rgba(0,0,0,0.3)' }} />}
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

                {/* Colors */}
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

                {/* Logo */}
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

                {/* Tagline */}
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

                {/* ── PHOTO LIBRARY ─────────────────────────────────────── */}
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
                      <input ref={photoInputRef} type="file" accept="image/*" multiple hidden onChange={handlePhotoUpload} />
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
                      <input type="file" accept="image/*" multiple hidden onChange={handlePhotoUpload} />
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

      {/* ── SUB-NAVIGATION TABS ───────────────────────────────────────── */}
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

      {/* ── IMAGES TAB ────────────────────────────────────────────────── */}
      {activeTab === 'images' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          
          {loadingPlan ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress size={24} sx={{ color: G }} /></Box>
          ) : (
            <>
              {/* 1. Action Required (Today's Post) */}
              {todaysPost && todaysPost.status === 'ready_to_post' && (
                <Box sx={cardSx}>
                  <Typography sx={{...sectionLabelSx, color: G, display: 'flex', alignItems: 'center', gap: 0.5}}>🔥 Today's Post is Ready</Typography>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Box sx={{ width: '100px', height: '100px', borderRadius: '12px', overflow: 'hidden', flexShrink: 0, bgcolor: '#f0f0ee' }}>
                      {todaysPost.imageUrl && <img src={todaysPost.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ fontSize: '12px', color: '#222', lineHeight: 1.5, mb: 1 }}>
                        {todaysPost.caption?.length > 80 ? todaysPost.caption.substring(0, 80) + '...' : todaysPost.caption}
                      </Typography>
                      <Button
                        fullWidth
                        onClick={() => handlePost(todaysPost)}
                        startIcon={<Share sx={{ fontSize: '16px' }} />}
                        sx={{ bgcolor: shared ? '#2e7d5a' : G, color: '#fff', borderRadius: '10px', textTransform: 'none', fontWeight: 700, fontSize: '12px', py: 0.8, boxShadow: 'none' }}
                      >
                        {shared ? 'Copied & Saved' : 'Post This'}
                      </Button>
                    </Box>
                  </Box>
                </Box>
              )}

              {/* 2. Review Tomorrow's Post */}
              {tomorrowsPost && tomorrowsPost.status === 'pending_review' && (
                <Box sx={{ ...cardSx, border: `2px solid ${P}40` }}>
                  <Typography sx={{...sectionLabelSx, color: P}}>👀 Review Tomorrow's Post</Typography>
                  <Box sx={{ aspectRatio: '1/1', borderRadius: '12px', overflow: 'hidden', bgcolor: '#f0f0ee', mb: 1.5 }}>
                    {tomorrowsPost.imageUrl && <img src={tomorrowsPost.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                  </Box>
                  <Typography sx={{ fontSize: '12px', color: '#222', lineHeight: 1.6, mb: 0.5 }}>{tomorrowsPost.caption}</Typography>
                  <Typography sx={{ fontSize: '11px', color: G, fontWeight: 600, mb: 2 }}>
                    {(tomorrowsPost.hashtags || []).map((h: string) => `#${h}`).join(' ')}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      fullWidth
                      onClick={() => handleFlag(tomorrowsPost._id)}
                      disabled={updatingPost}
                      sx={{ bgcolor: '#fceaea', color: '#c0392b', borderRadius: '10px', textTransform: 'none', fontWeight: 600, fontSize: '12px', py: 1 }}
                    >
                      Flag / Reject
                    </Button>
                    <Button
                      fullWidth
                      onClick={() => handleApprove(tomorrowsPost._id)}
                      disabled={updatingPost}
                      sx={{ bgcolor: G, color: '#fff', borderRadius: '10px', textTransform: 'none', fontWeight: 700, fontSize: '12px', py: 1 }}
                    >
                      Approve
                    </Button>
                  </Box>
                </Box>
              )}

              {tomorrowsPost && tomorrowsPost.status === 'ready_to_post' && (
                <Box sx={{ ...cardSx, bgcolor: '#f5fbf7', border: 'none' }}>
                  <Typography sx={{ fontSize: '12px', fontWeight: 600, color: G, textAlign: 'center' }}>✅ Tomorrow's post is approved and ready.</Typography>
                </Box>
              )}

              {/* 3. Monthly Strategy */}
              <Box sx={cardSx}>
                <Typography sx={sectionLabelSx}>Monthly Strategy</Typography>
                {activePlan ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {activePlan.schedule.slice(0, 5).map((item: any, i: number) => (
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
                      <Typography sx={{ fontSize: '11px', color: G, fontWeight: 600, textAlign: 'center', mt: 1, cursor: 'pointer' }}>View all {activePlan.schedule.length} topics</Typography>
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
          <Box sx={cardSx}>
            <Typography sx={sectionLabelSx}>Generate Video</Typography>
            <Box sx={{ py: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
              <Typography sx={{ fontSize: '32px' }}>🎬</Typography>
              <Typography sx={{ fontSize: '14px', fontWeight: 700, color: '#333' }}>AI Video Generation</Typography>
              <Typography sx={{ fontSize: '12px', color: 'rgba(0,0,0,0.4)' }}>Coming soon in the next update.</Typography>
            </Box>
          </Box>
          
          <Box sx={cardSx}>
            <Typography sx={sectionLabelSx}>Today's Video Idea</Typography>
            {todaysPost && todaysPost.type === 'video_idea' && todaysPost.videoIdeaText ? (
              <Typography sx={{ fontSize: '13px', color: '#222', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {todaysPost.videoIdeaText}
              </Typography>
            ) : (
              <Typography sx={{ fontSize: '12px', color: 'rgba(0,0,0,0.4)' }}>No video assigned for today. Check back tomorrow!</Typography>
            )}
          </Box>
        </Box>
      )}

    </Box>
  );
}
