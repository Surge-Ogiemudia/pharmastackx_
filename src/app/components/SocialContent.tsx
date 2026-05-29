'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Box, Typography, Button, TextField, CircularProgress, Chip } from '@mui/material';
import { Add, Delete, AutoAwesome, Download, Share, Edit } from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from '@/context/SessionProvider';
import axios from 'axios';

const PHOTO_TAGS = ['staff', 'store', 'product', 'event', 'other'] as const;
type PhotoTag = typeof PHOTO_TAGS[number];

const POST_CATEGORIES = [
  { id: 'health_tip',       label: 'Health Tip',          emoji: '💊' },
  { id: 'product_spotlight',label: 'Product Spotlight',   emoji: '🔦' },
  { id: 'ailment_awareness',label: 'Ailment Awareness',   emoji: '🩺' },
  { id: 'public_health_day',label: 'Health Day',          emoji: '🌍' },
  { id: 'new_stock',        label: 'New Stock',           emoji: '📦' },
  { id: 'promo_offer',      label: 'Promo / Offer',       emoji: '🏷️' },
  { id: 'staff_spotlight',  label: 'Staff Spotlight',     emoji: '👤' },
  { id: 'public_holiday',   label: 'Public Holiday',      emoji: '🎉' },
  { id: 'birthday',         label: 'Birthday',            emoji: '🎂' },
  { id: 'health_advice',    label: 'Health Advice',       emoji: '📋' },
  { id: 'did_you_know',     label: 'Did You Know',        emoji: '💡' },
  { id: 'seasonal_tip',     label: 'Seasonal Tip',        emoji: '🌧️' },
] as const;

const G = '#0F6E56';
const P = '#C84B8F';
const BORDER = '1px solid rgba(0,0,0,0.06)';

interface GeneratedContent {
  headline: string;
  caption: string;
  hashtags: string[];
  suggestedPhotoTag: PhotoTag;
  colorMood: string;
}

interface SocialPhoto { url: string; tag: PhotoTag; uploadedAt?: string; }

// ── resize + base64 encode ──────────────────────────────────────────────────
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

// ── canvas post builder ─────────────────────────────────────────────────────
async function buildPostCanvas(
  photo: SocialPhoto | null,
  content: GeneratedContent,
  pharmacyName: string,
  storeUrl: string,
  brandPrimary: string,
  brandSecondary: string,
): Promise<HTMLCanvasElement> {
  await document.fonts.ready;
  const S = 1080;
  const canvas = document.createElement('canvas');
  canvas.width = S; canvas.height = S;
  const ctx = canvas.getContext('2d')!;

  // Background
  if (photo) {
    await new Promise<void>((res, rej) => {
      const img = new Image();
      img.onload = () => {
        // objectFit: cover
        const ir = img.naturalWidth / img.naturalHeight;
        let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
        if (ir > 1) { sw = img.naturalHeight; sx = (img.naturalWidth - sw) / 2; }
        else { sh = img.naturalWidth; sy = (img.naturalHeight - sh) / 2; }
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, S, S);
        res();
      };
      img.onerror = rej;
      img.src = photo.url;
    });
    // Dark gradient overlay for readability
    const grad = ctx.createLinearGradient(0, 0, 0, S);
    grad.addColorStop(0, 'rgba(0,0,0,0.55)');
    grad.addColorStop(0.4, 'rgba(0,0,0,0.15)');
    grad.addColorStop(0.7, 'rgba(0,0,0,0.35)');
    grad.addColorStop(1, 'rgba(0,0,0,0.75)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, S, S);
  } else {
    // Solid brand gradient background
    const grad = ctx.createLinearGradient(0, 0, S, S);
    grad.addColorStop(0, brandPrimary);
    grad.addColorStop(1, brandSecondary);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, S, S);
    // subtle dot pattern
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    for (let x = 0; x < S; x += 40) for (let y = 0; y < S; y += 40) {
      ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill();
    }
  }

  const textColor = '#ffffff';

  // ── Pharmacy name (top) ────────────────────────────────────────────────
  ctx.font = '700 38px Poppins, sans-serif';
  ctx.fillStyle = textColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(pharmacyName.toUpperCase(), S / 2, 60);

  // Accent line under name
  ctx.fillStyle = brandSecondary;
  ctx.fillRect(S / 2 - 30, 108, 60, 4);

  // ── Headline (center) ──────────────────────────────────────────────────
  ctx.font = '800 72px Poppins, sans-serif';
  ctx.fillStyle = textColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const words = content.headline.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > S * 0.85) { lines.push(line); line = word; }
    else line = test;
  }
  if (line) lines.push(line);
  const lineH = 84;
  const headlineY = S / 2 - (lines.length * lineH) / 2;
  lines.forEach((l, i) => ctx.fillText(l, S / 2, headlineY + i * lineH));

  // ── Caption (below headline) ───────────────────────────────────────────
  ctx.font = '400 28px Sora, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.88)';
  const captionWords = content.caption.split(' ');
  const captionLines: string[] = [];
  let cLine = '';
  for (const w of captionWords) {
    const t = cLine ? `${cLine} ${w}` : w;
    if (ctx.measureText(t).width > S * 0.78) { captionLines.push(cLine); cLine = w; }
    else cLine = t;
  }
  if (cLine) captionLines.push(cLine);
  const captionStartY = headlineY + lines.length * lineH + 40;
  captionLines.slice(0, 3).forEach((l, i) => {
    ctx.fillText(l, S / 2, captionStartY + i * 40);
  });

  // ── Bottom bar ─────────────────────────────────────────────────────────
  // Brand color strip
  ctx.fillStyle = brandPrimary;
  ctx.fillRect(0, S - 110, S, 110);

  // Store URL
  ctx.font = '700 30px Sora, sans-serif';
  ctx.fillStyle = textColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`⊕ ${storeUrl}`, S / 2, S - 65);

  // Hashtags row (first 3)
  ctx.font = '400 20px Sora, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillText(content.hashtags.slice(0, 4).map(h => `#${h}`).join('  '), S / 2, S - 30);

  return canvas;
}

// ───────────────────────────────────────────────────────────────────────────
export default function SocialContent() {
  const { user, refreshSession } = useSession();

  // Brand kit state
  const [brandPrimary, setBrandPrimary] = useState<string>(user?.brandKit?.primaryColor || G);
  const [brandSecondary, setBrandSecondary] = useState<string>(user?.brandKit?.secondaryColor || P);
  const [tagline, setTagline] = useState<string>(user?.brandKit?.tagline || '');
  const [logoUrl, setLogoUrl] = useState<string>(user?.brandKit?.logoUrl || '');
  const [savingBrand, setSavingBrand] = useState(false);

  // Photo library state
  const [photos, setPhotos] = useState<SocialPhoto[]>((user?.socialPhotos as SocialPhoto[]) || []);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Create post state
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [postDetail, setPostDetail] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<GeneratedContent | null>(null);
  const [postPreviewUrl, setPostPreviewUrl] = useState<string | null>(null);
  const [buildingCanvas, setBuildingCanvas] = useState(false);
  const [captionCopied, setCaptionCopied] = useState(false);

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
    const files = Array.from(e.target.files || []);
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

  const updatePhotoTag = async (url: string, tag: PhotoTag) => {
    setPhotos(prev => prev.map(p => p.url === url ? { ...p, tag } : p));
    // persist via a simple approach: delete + re-add is too heavy; just update local state for now
    // Full tag persistence can be a future enhancement
  };

  // ── Generate post ────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!selectedCategory) return;
    setGenerating(true);
    setGenerated(null);
    setPostPreviewUrl(null);
    try {
      const photoTags = [...new Set(photos.map(p => p.tag))];
      const res = await axios.post('/api/ai/social-content', {
        category: selectedCategory,
        detail: postDetail || undefined,
        pharmacyName: user?.businessName || user?.username,
        storeUrl: `${user?.slug}.psx.ng`,
        tagline,
        photoTags,
      });
      setGenerated(res.data);
    } catch (e) { console.error(e); }
    finally { setGenerating(false); }
  };

  // ── Build canvas preview ─────────────────────────────────────────────────
  const buildPreview = useCallback(async () => {
    if (!generated) return;
    setBuildingCanvas(true);
    try {
      const suggestedPhoto = photos.find(p => p.tag === generated.suggestedPhotoTag) || photos[0] || null;
      const canvas = await buildPostCanvas(
        suggestedPhoto,
        generated,
        user?.businessName || user?.username || 'My Pharmacy',
        `${user?.slug}.psx.ng`,
        brandPrimary,
        brandSecondary,
      );
      setPostPreviewUrl(canvas.toDataURL('image/jpeg', 0.92));
    } finally { setBuildingCanvas(false); }
  }, [generated, photos, brandPrimary, brandSecondary, user]);

  // Auto-build preview when content is generated
  React.useEffect(() => { if (generated) buildPreview(); }, [generated]);

  // ── Download ─────────────────────────────────────────────────────────────
  const handleDownload = async () => {
    if (!postPreviewUrl || !generated) return;
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile && navigator.canShare) {
      const res = await fetch(postPreviewUrl);
      const blob = await res.blob();
      const file = new File([blob], 'post.jpg', { type: 'image/jpeg' });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: `${user?.businessName} — Post` });
        return;
      }
    }
    const a = document.createElement('a');
    a.href = postPreviewUrl;
    a.download = 'social-post.jpg';
    a.click();
  };

  // ── Copy caption ─────────────────────────────────────────────────────────
  const copyCaption = () => {
    if (!generated) return;
    const text = `${generated.caption}\n\n${generated.hashtags.map(h => `#${h}`).join(' ')}`;
    navigator.clipboard.writeText(text);
    setCaptionCopied(true);
    setTimeout(() => setCaptionCopied(false), 2000);
  };

  // ── Shared styles ─────────────────────────────────────────────────────────
  const cardSx = { bgcolor: '#fff', borderRadius: '20px', p: 2.5, border: BORDER, mb: 2 };
  const sectionLabelSx = { fontSize: '9px', fontWeight: 800, color: 'rgba(0,0,0,0.3)', letterSpacing: '1px', textTransform: 'uppercase', mb: 1.5 };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* ── BRAND KIT ─────────────────────────────────────────────────── */}
      <Box sx={cardSx}>
        <Typography sx={sectionLabelSx}>Brand Kit</Typography>

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
      </Box>

      {/* ── PHOTO LIBRARY ─────────────────────────────────────────────── */}
      <Box sx={cardSx}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <Typography sx={sectionLabelSx}>Photo Library ({photos.length})</Typography>
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
                {/* Tag chip */}
                <Box
                  sx={{ position: 'absolute', bottom: 4, left: 4, bgcolor: 'rgba(0,0,0,0.6)', borderRadius: '6px', px: 0.8, py: 0.2, cursor: 'pointer' }}
                  onClick={() => {
                    const idx = PHOTO_TAGS.indexOf(photo.tag);
                    const next = PHOTO_TAGS[(idx + 1) % PHOTO_TAGS.length];
                    updatePhotoTag(photo.url, next);
                  }}
                >
                  <Typography sx={{ fontSize: '9px', color: '#fff', fontWeight: 700, textTransform: 'capitalize' }}>{photo.tag}</Typography>
                </Box>
                {/* Delete */}
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
          sx={{ bgcolor: P, color: '#fff', borderRadius: '12px', textTransform: 'none', fontWeight: 700, fontSize: '13px', py: 1.3, boxShadow: 'none', mb: 2, '&:hover': { bgcolor: '#a8346f', boxShadow: 'none' }, '&:disabled': { bgcolor: 'rgba(0,0,0,0.1)', color: 'rgba(0,0,0,0.3)' } }}
        >
          {generating ? 'Generating...' : 'Generate post'}
        </Button>

        {/* Post preview */}
        <AnimatePresence>
          {(postPreviewUrl || buildingCanvas) && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Box sx={{ borderRadius: '16px', overflow: 'hidden', mb: 1.5, position: 'relative', aspectRatio: '1/1', bgcolor: '#f0f0ee' }}>
                {buildingCanvas ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <CircularProgress sx={{ color: G }} />
                  </Box>
                ) : (
                  <img src={postPreviewUrl!} style={{ width: '100%', display: 'block' }} />
                )}
              </Box>

              {generated && (
                <Box sx={{ bgcolor: '#f9f9f7', borderRadius: '14px', p: 1.5, mb: 1.5, border: BORDER }}>
                  <Typography sx={{ fontSize: '11px', fontWeight: 700, color: 'rgba(0,0,0,0.4)', mb: 0.5 }}>CAPTION</Typography>
                  <Typography sx={{ fontSize: '13px', color: '#222', lineHeight: 1.6, mb: 1 }}>{generated.caption}</Typography>
                  <Typography sx={{ fontSize: '11px', color: G, fontWeight: 600 }}>
                    {generated.hashtags.slice(0, 5).map(h => `#${h}`).join(' ')}
                  </Typography>
                </Box>
              )}

              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  fullWidth
                  onClick={copyCaption}
                  sx={{ bgcolor: '#f4f4f2', color: '#333', borderRadius: '12px', textTransform: 'none', fontWeight: 700, fontSize: '12px', py: 1.1, boxShadow: 'none' }}
                >
                  {captionCopied ? '✓ Copied' : 'Copy caption'}
                </Button>
                <Button
                  fullWidth
                  onClick={handleDownload}
                  startIcon={<Download sx={{ fontSize: '16px' }} />}
                  sx={{ bgcolor: G, color: '#fff', borderRadius: '12px', textTransform: 'none', fontWeight: 700, fontSize: '12px', py: 1.1, boxShadow: 'none', '&:hover': { bgcolor: '#0a5a45', boxShadow: 'none' } }}
                >
                  Save image
                </Button>
              </Box>

              {/* Regenerate */}
              <Button
                fullWidth
                onClick={handleGenerate}
                disabled={generating}
                sx={{ mt: 1, color: 'rgba(0,0,0,0.4)', textTransform: 'none', fontSize: '12px', fontWeight: 600 }}
              >
                {generating ? 'Regenerating...' : '↺ Try another version'}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </Box>

    </Box>
  );
}
