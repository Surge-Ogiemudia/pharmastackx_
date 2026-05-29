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

  // Create post
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [postDetail, setPostDetail] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<GeneratedContent | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [shared, setShared] = useState(false);

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

  // ── Generate post ────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!selectedCategory) return;
    setGenerating(true);
    setGenerated(null);
    setPreviewUrl(null);
    setGenerateError(null);

    try {
      const res = await axios.post('/api/ai/social-content', {
        category: selectedCategory,
        detail: postDetail || undefined,
        pharmacyName: user?.businessName || user?.username || 'My Pharmacy',
        storeUrl: `${user?.slug || 'pharmacy'}.psx.ng`,
        tagline,
        brandPrimary,
        brandSecondary,
      });
      const { caption, hashtags, imageData, mimeType } = res.data;
      setGenerated({ caption, hashtags });
      setPreviewUrl(`data:${mimeType};base64,${imageData}`);
    } catch (e: unknown) {
      const axiosMsg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setGenerateError(axiosMsg || (e instanceof Error ? e.message : 'Could not generate post. Please try again.'));
    } finally {
      setGenerating(false);
    }
  };

  // ── Post / share ─────────────────────────────────────────────────────────
  const handlePost = async () => {
    if (!previewUrl || !generated) return;
    const text = `${generated.caption}\n\n${generated.hashtags.map(h => `#${h}`).join(' ')}`;

    try {
      const res = await fetch(previewUrl);
      const blob = await res.blob();
      const file = new File([blob], 'post.jpg', { type: 'image/jpeg' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text });
        return;
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
    }

    // Desktop fallback: copy caption + download image
    try { navigator.clipboard.writeText(text); } catch {}
    const a = document.createElement('a');
    a.href = previewUrl;
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

      {/* ── CREATE POST ───────────────────────────────────────────────── */}
      <Box sx={cardSx}>
        <Typography sx={sectionLabelSx}>Create Post</Typography>

        {/* Category grid */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8, mb: 2 }}>
          {POST_CATEGORIES.map(cat => (
            <Chip
              key={cat.id}
              label={`${cat.emoji} ${cat.label}`}
              onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
              sx={{
                bgcolor: selectedCategory === cat.id ? G : '#f4f4f2',
                color: selectedCategory === cat.id ? '#fff' : '#333',
                fontWeight: 700,
                fontSize: '11px',
                borderRadius: '10px',
                height: '32px',
                '& .MuiChip-label': { px: 1.2 },
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            />
          ))}
        </Box>

        {/* Optional detail */}
        {selectedCategory && (
          <TextField
            fullWidth
            size="small"
            placeholder={
              selectedCategory === 'product_spotlight' ? 'Which product? (e.g. Vitamin C 1000mg)' :
              selectedCategory === 'ailment_awareness' ? 'Which ailment? (e.g. malaria, diabetes)' :
              selectedCategory === 'staff_spotlight' ? 'Staff name / role (optional)' :
              'Any extra detail? (optional)'
            }
            value={postDetail}
            onChange={e => setPostDetail(e.target.value)}
            sx={{ mb: 1.5, '& .MuiOutlinedInput-root': { borderRadius: '12px', fontSize: '13px', bgcolor: '#f9f9f7' } }}
          />
        )}

        <Button
          fullWidth
          onClick={handleGenerate}
          disabled={!selectedCategory || generating}
          startIcon={generating ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <AutoAwesome sx={{ fontSize: '16px' }} />}
          sx={{ bgcolor: P, color: '#fff', borderRadius: '12px', textTransform: 'none', fontWeight: 700, fontSize: '13px', py: 1.3, boxShadow: 'none', mb: 0, '&:hover': { bgcolor: '#a8346f', boxShadow: 'none' }, '&:disabled': { bgcolor: 'rgba(0,0,0,0.1)', color: 'rgba(0,0,0,0.3)' } }}
        >
          {generating ? 'Generating...' : generated ? 'Regenerate' : 'Generate post'}
        </Button>

        {generateError && (
          <Typography sx={{ mt: 1.5, fontSize: '12px', color: '#c0392b', textAlign: 'center', lineHeight: 1.5 }}>
            {generateError}
          </Typography>
        )}
      </Box>

      {/* ── POST PREVIEW ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {generated && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <Box sx={{ ...cardSx, p: 0, overflow: 'hidden' }}>
              {/* AI-generated image */}
              <Box sx={{ aspectRatio: '1/1', bgcolor: '#f0f0ee' }}>
                {previewUrl
                  ? <img src={previewUrl} style={{ width: '100%', display: 'block' }} />
                  : <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 200 }}>
                      <CircularProgress sx={{ color: G }} size={28} />
                    </Box>
                }
              </Box>

              {/* Caption for sharing */}
              <Box sx={{ px: 2, pt: 1.5, pb: 0.5 }}>
                <Typography sx={{ fontSize: '13px', color: '#222', lineHeight: 1.6 }}>
                  {generated.caption}
                </Typography>
                <Typography sx={{ fontSize: '11px', color: G, fontWeight: 600, mt: 0.5 }}>
                  {generated.hashtags.slice(0, 5).map(h => `#${h}`).join(' ')}
                </Typography>
              </Box>

              {/* Post button */}
              <Box sx={{ px: 2, pb: 2, pt: 1.5 }}>
                <Button
                  fullWidth
                  disabled={!previewUrl}
                  onClick={handlePost}
                  startIcon={<Share sx={{ fontSize: '16px' }} />}
                  sx={{
                    bgcolor: shared ? '#2e7d5a' : G,
                    color: '#fff',
                    borderRadius: '14px',
                    textTransform: 'none',
                    fontWeight: 700,
                    fontSize: '14px',
                    py: 1.4,
                    boxShadow: 'none',
                    transition: 'background 0.3s',
                    '&:hover': { bgcolor: '#0a5a45', boxShadow: 'none' },
                    '&:disabled': { bgcolor: 'rgba(0,0,0,0.08)', color: 'rgba(0,0,0,0.25)' },
                  }}
                >
                  {shared ? 'Caption copied + image saved' : 'Post this'}
                </Button>
              </Box>
            </Box>
          </motion.div>
        )}
      </AnimatePresence>

    </Box>
  );
}
