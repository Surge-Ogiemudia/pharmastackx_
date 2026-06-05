'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Button, IconButton, CircularProgress,
         Dialog, DialogTitle, DialogContent, DialogActions, TextField } from '@mui/material';
import { ChevronLeft, ChevronRight, FileDownload, IosShare, Lock, CheckCircle, Settings, AutoAwesome, Delete } from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from '@/context/SessionProvider';
import axios from 'axios';

// ── Design tokens ─────────────────────────────────────────────────────────────
const BG    = '#080D0B';
const CARD  = '#141F1A';
const GREEN = '#0F6E56';
const GBRI  = '#1DB88A';
const TEXT  = '#E8F0EC';
const MUTED = 'rgba(232,240,236,0.45)';
const BORD  = 'rgba(255,255,255,0.07)';
const FONT  = "var(--font-bricolage), 'Poppins', sans-serif";
const MONO  = "var(--font-dm-mono), 'Courier New', monospace";

const GRADIENTS = [
  'linear-gradient(135deg, #0F6E56 0%, #052418 100%)',
  'linear-gradient(135deg, #5B21B6 0%, #1E0845 100%)',
  'linear-gradient(135deg, #B45309 0%, #431407 100%)',
  'linear-gradient(135deg, #0E7490 0%, #042933 100%)',
  'linear-gradient(135deg, #7C3AED 0%, #2D1260 100%)',
  'linear-gradient(135deg, #BE185D 0%, #4C0519 100%)',
];
const ACCENTS = ['#1DB88A', '#A78BFA', '#FCD34D', '#22D3EE', '#C4B5FD', '#FB7185'];
const ICONS   = ['💊', '🌿', '⚠️', '🤝', '✨', '🏥'];
const SPARKLES = ['✨', '⭐', '💫', '✦', '✧'];

const PRO_FEATURES = [
  { icon: '🎥', name: 'Video Reels',    desc: 'Auto-scripted reels'  },
  { icon: '🎠', name: 'Carousel Posts', desc: 'Multi-slide posts'     },
  { icon: '⚡', name: 'Auto-posting',   desc: 'Schedule & publish'    },
  { icon: '📊', name: 'Analytics',      desc: 'Reach & engagement'    },
];

type AppState = 'loading' | 'onboarding' | 'active';

interface DailyPost {
  _id: string;
  scheduledDate: string;
  caption: string;
  hashtags: string[];
  imageUrl: string;
  status: 'pending_review' | 'ready_to_post' | 'posted' | 'flagged';
  regenCount: number;
  category?: string;
  isSpecialRequest?: boolean;
  specialRequestPrompt?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getMondayLocal(d: Date): Date {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  const day = date.getDay();
  date.setDate(date.getDate() + (day === 0 ? -6 : 1 - day));
  return date;
}
function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function fmtDate(d: Date): string {
  const today = new Date(); today.setHours(0,0,0,0);
  const diff  = Math.round((new Date(d).setHours(0,0,0,0) - today.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return d.toLocaleDateString('default', { weekday: 'short', month: 'short', day: 'numeric' });
}
function fmtDay(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('default', { weekday: 'short', month: 'short', day: 'numeric' });
}
// Which category slot does a date fall into (0-3) based on day-of-week
function slotForDate(d: Date): number {
  const day = d.getDay(); // 0=Sun,1=Mon...6=Sat
  if (day === 1) return 0; // Mon → Medicine Spotlight
  if (day === 3) return 1; // Wed → Health Awareness
  if (day === 5) return 2; // Fri → Low Stock Alert
  if (day === 6) return 3; // Sat → Human Moment
  return 0; // fallback
}
// Counts posts created in the Mon–Sun week of the given date
function weekPostCount(posts: DailyPost[], refDate: Date): number {
  const mon = getMondayLocal(refDate).getTime();
  const sun = mon + 7 * 86400000;
  return posts.filter(p => {
    const t = new Date(p.scheduledDate).getTime();
    return t >= mon && t < sun;
  }).length;
}

// ── Post Graphic ──────────────────────────────────────────────────────────────
function PostGraphic({ post, idx, name, url }: { post: DailyPost | null; idx: number; name: string; url: string }) {
  const NOISE = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E\")";
  const GRID  = `repeating-linear-gradient(rgba(255,255,255,0.035) 1px,transparent 1px,transparent 44px),repeating-linear-gradient(90deg,rgba(255,255,255,0.035) 1px,transparent 1px,transparent 44px)`;
  return (
    <Box sx={{ position: 'relative', width: '100%', aspectRatio: '1/1', borderRadius: '16px', overflow: 'hidden', background: GRADIENTS[idx % 4], flexShrink: 0 }}>
      <Box sx={{ position: 'absolute', inset: 0, zIndex: 1, backgroundImage: GRID }} />
      <Box sx={{ position: 'absolute', inset: 0, zIndex: 1, backgroundImage: NOISE }} />
      {post?.imageUrl
        ? <Box component="img" src={post.imageUrl} sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 2 }} />
        : <Box sx={{ position: 'absolute', inset: 0, zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1.5 }}>
            <Typography sx={{ fontSize: '52px' }}>{ICONS[idx % 4]}</Typography>
            <Typography sx={{ fontFamily: FONT, fontSize: '11px', color: 'rgba(255,255,255,0.5)', textAlign: 'center', px: 3 }}>
              {post ? 'Image unavailable' : ''}
            </Typography>
          </Box>
      }
      <Box sx={{ position: 'absolute', inset: 0, zIndex: 3, background: 'linear-gradient(to bottom,rgba(0,0,0,0.42) 0%,transparent 30%,transparent 62%,rgba(0,0,0,0.62) 100%)' }} />
      <Typography sx={{ position: 'absolute', top: 14, left: 14, zIndex: 4, fontFamily: MONO, fontSize: '9px', color: 'rgba(255,255,255,0.65)', letterSpacing: '0.8px', textTransform: 'uppercase' }}>{name}</Typography>
      <Typography sx={{ position: 'absolute', bottom: 14, right: 14, zIndex: 4, fontFamily: MONO, fontSize: '8px', color: 'rgba(255,255,255,0.4)' }}>{url}</Typography>
      {post?.scheduledDate && (
        <Box sx={{ position: 'absolute', top: 12, right: 12, zIndex: 4, bgcolor: 'rgba(0,0,0,0.52)', backdropFilter: 'blur(8px)', borderRadius: '8px', px: 1, py: 0.4, border: '1px solid rgba(255,255,255,0.14)' }}>
          <Typography sx={{ fontFamily: MONO, fontSize: '9px', color: '#fff', fontWeight: 500 }}>{fmtDay(post.scheduledDate)}</Typography>
        </Box>
      )}
    </Box>
  );
}

// ── Onboarding ────────────────────────────────────────────────────────────────
function OnboardingScreen({ tone, setTone, showPrices, setShowPrices, onStart, generating, progress, categories }: {
  tone: string; setTone: (v: string) => void;
  showPrices: string; setShowPrices: (v: string) => void;
  onStart: () => void; generating: boolean; progress: number;
  categories: string[];
}) {
  const RadioRow = ({ val, label, selected, onSelect }: any) => (
    <Box onClick={() => onSelect(val)} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1, p: '10px 14px', borderRadius: '12px', cursor: 'pointer', border: `1px solid ${selected === val ? GREEN : BORD}`, bgcolor: selected === val ? `${GREEN}1A` : 'transparent', transition: 'all 0.15s' }}>
      <Box sx={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${selected === val ? GREEN : 'rgba(255,255,255,0.22)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {selected === val && <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: GREEN }} />}
      </Box>
      <Typography sx={{ fontFamily: FONT, fontSize: '14px', color: selected === val ? TEXT : MUTED }}>{label}</Typography>
    </Box>
  );
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.35 }}
      style={{ padding: '24px 20px 48px', minHeight: '100vh', background: BG }}>
      <Box sx={{ position: 'relative', height: 72, mb: 0.5, overflow: 'hidden' }}>
        {SPARKLES.map((s, i) => (
          <motion.div key={i} style={{ position: 'absolute', left: `${10 + i * 19}%`, top: `${8 + (i % 2) * 32}%`, fontSize: 22, userSelect: 'none' }}
            animate={{ y: [0, -10, 0], opacity: [0.55, 1, 0.55] }} transition={{ duration: 2 + i * 0.35, repeat: Infinity, delay: i * 0.28 }}>{s}</motion.div>
        ))}
      </Box>
      <Typography sx={{ fontFamily: FONT, fontSize: '28px', fontWeight: 800, color: TEXT, lineHeight: 1.15, mb: 1.5 }}>Your pharmacy,<br />on social media.</Typography>
      <Typography sx={{ fontFamily: FONT, fontSize: '14px', color: MUTED, lineHeight: 1.65, mb: 3 }}>
        Generate a branded post for any day — up to 4 per week. Tap generate and it's ready to share in under a minute.
      </Typography>
      <Box sx={{ display: 'flex', gap: 1.5, overflowX: 'auto', pb: 1.5, mb: 3.5, mx: -2.5, px: 2.5, '&::-webkit-scrollbar': { display: 'none' } }}>
        {(categories.length > 0 ? categories : ['Your post style']).map((label, i) => (
          <Box key={i} sx={{ minWidth: 98, height: 114, borderRadius: '14px', flexShrink: 0, background: GRADIENTS[i % GRADIENTS.length], position: 'relative', overflow: 'hidden', border: `1px solid rgba(255,255,255,0.08)` }}>
            <Box sx={{ position: 'absolute', inset: 0, backgroundImage: `repeating-linear-gradient(rgba(255,255,255,0.04) 1px,transparent 1px,transparent 28px),repeating-linear-gradient(90deg,rgba(255,255,255,0.04) 1px,transparent 1px,transparent 28px)` }} />
            <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', p: 1.5, background: 'linear-gradient(to top,rgba(0,0,0,0.5) 0%,transparent 60%)' }}>
              <Typography sx={{ fontSize: '20px', mb: 0.5 }}>{ICONS[i % ICONS.length]}</Typography>
              <Typography sx={{ fontFamily: FONT, fontSize: '10px', fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>{label}</Typography>
            </Box>
          </Box>
        ))}
      </Box>
      <Box sx={{ mb: 2.5 }}>
        <Typography sx={{ fontFamily: MONO, fontSize: '10px', color: MUTED, letterSpacing: '1px', textTransform: 'uppercase', mb: 1.5 }}>Preferred tone</Typography>
        {[{ val: 'warm', label: 'Warm and friendly' }, { val: 'professional', label: 'Professional and clinical' }, { val: 'bold', label: 'Bold and energetic' }].map(o => <RadioRow key={o.val} {...o} selected={tone} onSelect={setTone} />)}
      </Box>
      <Box sx={{ mb: 4 }}>
        <Typography sx={{ fontFamily: MONO, fontSize: '10px', color: MUTED, letterSpacing: '1px', textTransform: 'uppercase', mb: 1.5 }}>Show prices on posts?</Typography>
        {[{ val: 'yes', label: 'Yes, include pricing' }, { val: 'no', label: 'No, keep it general' }].map(o => <RadioRow key={o.val} {...o} selected={showPrices} onSelect={setShowPrices} />)}
      </Box>
      <Box sx={{ position: 'relative', borderRadius: '14px', overflow: 'hidden' }}>
        {/* Progress fill behind the button */}
        {generating && (
          <motion.div
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            style={{ position: 'absolute', top: 0, left: 0, height: '100%', background: `linear-gradient(90deg, #0a5a45, ${GBRI})`, zIndex: 0 }}
          />
        )}
        <Button
          fullWidth
          onClick={!generating ? onStart : undefined}
          disabled={generating}
          sx={{
            position: 'relative', zIndex: 1,
            bgcolor: generating ? '#0a5a45' : GREEN,
            color: '#fff', borderRadius: '14px',
            textTransform: 'none', fontFamily: FONT, fontWeight: 700, fontSize: '16px', py: 1.9,
            boxShadow: generating ? 'none' : `0 0 32px ${GREEN}55`,
            '&:disabled': { color: '#fff', bgcolor: 'transparent' },
            transition: 'box-shadow 0.3s',
          }}
        >
          {generating
            ? `Generating your post… ${progress}%`
            : 'Generate today\'s post ✦'}
        </Button>
      </Box>
    </motion.div>
  );
}

// ── Locked Section ────────────────────────────────────────────────────────────
function LockedSection() {
  return (
    <Box sx={{ px: 2, pt: 1, pb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <Lock sx={{ fontSize: 13, color: MUTED }} />
        <Typography sx={{ fontFamily: MONO, fontSize: '10px', color: MUTED, letterSpacing: '1px', textTransform: 'uppercase' }}>Pro features</Typography>
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mb: 1.5 }}>
        {PRO_FEATURES.map((f, i) => (
          <Box key={i} sx={{ bgcolor: CARD, borderRadius: '14px', p: 1.5, border: `1px solid ${BORD}`, opacity: 0.65 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
              <Typography sx={{ fontSize: '22px' }}>{f.icon}</Typography>
              <Lock sx={{ fontSize: 13, color: 'rgba(255,255,255,0.18)' }} />
            </Box>
            <Typography sx={{ fontFamily: FONT, fontSize: '13px', fontWeight: 700, color: TEXT }}>{f.name}</Typography>
            <Typography sx={{ fontFamily: FONT, fontSize: '11px', color: MUTED }}>{f.desc}</Typography>
          </Box>
        ))}
      </Box>
      <Box sx={{ borderRadius: '14px', p: 2, background: 'linear-gradient(135deg,#1E3A5F 0%,#0F1F3A 100%)', border: '1px solid rgba(59,130,246,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Box>
          <Typography sx={{ fontFamily: FONT, fontSize: '14px', fontWeight: 700, color: '#93C5FD' }}>Upgrade to Social Pro</Typography>
          <Typography sx={{ fontFamily: FONT, fontSize: '12px', color: 'rgba(147,197,253,0.55)' }}>Unlock all 4 premium features</Typography>
        </Box>
        <Button sx={{ bgcolor: '#2563EB', color: '#fff', borderRadius: '10px', textTransform: 'none', fontFamily: FONT, fontWeight: 700, fontSize: '12px', px: 2, py: 0.8, flexShrink: 0 }}>Upgrade</Button>
      </Box>
    </Box>
  );
}

// ── Admin Prompt Panel ────────────────────────────────────────────────────────

const MOCK_EXAMPLES: Record<string, { label: string; prompt: string }> = {
  'Medicine Spotlight': {
    label: 'Editorial flat-lay (example)',
    prompt: `A single amber prescription bottle with a clean white label stands centered on a rich forest-green surface. Shot from a 45-degree elevated angle. Soft natural light from upper-left casts a gentle shadow to the right. Beside the bottle, exactly three small white circular pills arranged in a loose diagonal. Background is solid deep green with a barely-visible subtle grid texture. Ultra-clean, premium editorial product photography. No cluttered shelves, no multiple products, no stock photography look. Negative space fills 40% of the frame. Pharmacy name as small elegant text bottom-left. 1:1 square format.`,
  },
  'Health Awareness': {
    label: 'Human connection portrait (example)',
    prompt: `Close-up of warm dark-skinned hands — one elderly, one young — gently clasped together on a soft cream fabric surface. Warm golden afternoon light. Shallow depth of field, background softly blurred into warm amber tones. Small sprig of green leaves placed deliberately in the lower-left corner. Emotion: care, trust, generational health. No medical equipment, no clinical setting. Documentary warmth, intimate framing. Nigerian context — dark skin tones, local story. Pharmacy name as soft text upper-right. 1:1 square format.`,
  },
  'Low Stock Alert': {
    label: 'Bold graphic announcement (example)',
    prompt: `Bold typographic poster composition. Stark dark background. A single product silhouette centered with dramatic spotlight illumination. Three bold horizontal amber/orange bars slice behind the product creating urgency and visual tension. High contrast. No photographic realism — pure graphic design energy. The composition breathes: 30% product, 70% bold negative space. Feels like a luxury fashion brand announcing a limited drop. Dynamic, modern, editorial. Pharmacy name bottom-center in small caps. 1:1 square format.`,
  },
  'Human Moment': {
    label: 'Candid pharmacy scene (example)',
    prompt: `Candid street-level scene at a pharmacy counter in Lagos. A pharmacist in a neat white coat leans slightly forward, speaking warmly to a middle-aged woman in a colourful ankara blouse. Both in frame, genuine eye contact. Pharmacy interior visible but softly blurred. Warm fluorescent lighting with natural light from a side window. Not posed, not stock. Colour grade: warm, slightly lifted shadows, rich Nigerian skin tones. Pharmacy name watermarked subtly lower-right. 1:1 square format.`,
  },
};

function AdminPromptPanel({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [dbCategories,   setDbCategories]   = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [prompts,        setPrompts]        = useState<any[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isNewMonth,      setIsNewMonth]      = useState(false);
  const [calEvents,       setCalEvents]       = useState<any[]>([]);
  const [calTab,          setCalTab]          = useState(false); // show calendar tab
  const [calName,         setCalName]         = useState('');
  const [calMonth,        setCalMonth]        = useState('');
  const [calDay,          setCalDay]          = useState('');
  const [calCategory,     setCalCategory]     = useState('');
  const [calSubmitting,   setCalSubmitting]   = useState(false);
  const [label,          setLabel]          = useState('');
  const [basePrompt,     setBasePrompt]     = useState('');
  const [submitting,     setSubmitting]     = useState(false);
  const [submitMsg,      setSubmitMsg]      = useState('');
  const [showExample,    setShowExample]    = useState(false);

  const loadCategories = async () => {
    const [catRes, calRes] = await Promise.all([
      axios.get('/api/admin/social-prompts/categories'),
      axios.get('/api/admin/health-calendar'),
    ]);
    const cats: string[] = catRes.data.categories || [];
    setDbCategories(cats);
    setCalEvents(calRes.data.events || []);
    if (cats.length > 0 && !activeCategory) setActiveCategory(cats[0]);
  };

  const loadPrompts = async (cat: string) => {
    if (!cat) return;
    setLoading(true);
    try {
      const res = await axios.get(`/api/admin/social-prompts?category=${encodeURIComponent(cat)}`);
      setPrompts(res.data.prompts || []);
    } catch { setPrompts([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadCategories(); }, []);
  useEffect(() => { if (activeCategory) loadPrompts(activeCategory); }, [activeCategory]);

  const effectiveCategory = activeCategory === '__new__' ? newCategoryName.trim() : activeCategory;

  const handleSubmit = async () => {
    if (!label.trim() || !basePrompt.trim() || !effectiveCategory) return;
    setSubmitting(true);
    setSubmitMsg('Generating 10 composition variations with Gemini…');
    try {
      await axios.post('/api/admin/social-prompts', { adminId: userId, category: effectiveCategory, label: label.trim(), basePrompt: basePrompt.trim(), isNewMonth });
      setLabel(''); setBasePrompt(''); setNewCategoryName('');
      setSubmitMsg('✓ Saved and variations generated.');
      await loadCategories();
      setActiveCategory(effectiveCategory);
      setTimeout(() => setSubmitMsg(''), 3000);
    } catch (e: any) {
      setSubmitMsg(`Error: ${e?.response?.data?.message || 'Failed'}`);
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (promptId: string) => {
    await axios.delete('/api/admin/social-prompts', { data: { promptId, adminId: userId } });
    setPrompts(prev => prev.filter(p => p._id !== promptId));
  };

  const example = MOCK_EXAMPLES[activeCategory];

  return (
    <Box sx={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1300, display: 'flex', flexDirection: 'column', bgcolor: '#08100D' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 2, borderBottom: `1px solid ${BORD}`, flexShrink: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AutoAwesome sx={{ fontSize: 16, color: '#A78BFA' }} />
          <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '15px', color: TEXT }}>Image Prompt Manager</Typography>
        </Box>
        <Button onClick={onClose} sx={{ color: MUTED, textTransform: 'none', fontFamily: FONT, fontSize: '13px', minWidth: 0 }}>Close</Button>
      </Box>

      {/* Category tabs — dynamic from DB + "New theme" tab */}
      <Box sx={{ display: 'flex', gap: 0.5, px: 2, py: 1.5, overflowX: 'auto', flexShrink: 0, '&::-webkit-scrollbar': { display: 'none' } }}>
        {dbCategories.map(cat => (
          <Box key={cat} onClick={() => setActiveCategory(cat)} sx={{ px: 1.5, py: 0.6, borderRadius: '20px', cursor: 'pointer', flexShrink: 0, bgcolor: activeCategory === cat ? '#A78BFA22' : CARD, border: `1px solid ${activeCategory === cat ? '#A78BFA55' : BORD}` }}>
            <Typography sx={{ fontFamily: MONO, fontSize: '10px', color: activeCategory === cat ? '#A78BFA' : MUTED, whiteSpace: 'nowrap' }}>{cat}</Typography>
          </Box>
        ))}
        <Box onClick={() => setActiveCategory('__new__')} sx={{ px: 1.5, py: 0.6, borderRadius: '20px', cursor: 'pointer', flexShrink: 0, bgcolor: activeCategory === '__new__' ? '#A78BFA22' : CARD, border: `1px solid ${activeCategory === '__new__' ? '#A78BFA55' : BORD}` }}>
          <Typography sx={{ fontFamily: MONO, fontSize: '10px', color: activeCategory === '__new__' ? '#A78BFA' : MUTED, whiteSpace: 'nowrap' }}>+ New theme</Typography>
        </Box>
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', px: 2, pb: 6, WebkitOverflowScrolling: 'touch' }}>

        {/* Existing prompts */}
        <Typography sx={{ fontFamily: MONO, fontSize: '10px', color: MUTED, letterSpacing: '1px', textTransform: 'uppercase', mb: 1.5 }}>
          Active prompts ({loading ? '…' : prompts.filter(p => p.isActive).length})
        </Typography>

        {!loading && prompts.filter(p => p.isActive).length === 0 && (
          <Box sx={{ p: 2, borderRadius: '12px', bgcolor: CARD, border: `1px dashed ${BORD}`, mb: 2 }}>
            <Typography sx={{ fontFamily: FONT, fontSize: '12px', color: MUTED, textAlign: 'center' }}>
              No prompts yet for this category. Add one below.
            </Typography>
          </Box>
        )}

        {prompts.filter(p => p.isActive).map(p => (
          <Box key={p._id} sx={{ p: 1.5, borderRadius: '12px', bgcolor: CARD, border: `1px solid ${BORD}`, mb: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
              <Typography sx={{ fontFamily: FONT, fontSize: '13px', fontWeight: 700, color: TEXT }}>{p.label}</Typography>
              <IconButton size="small" onClick={() => handleDelete(p._id)} sx={{ color: '#FF6B6B', p: 0.3, ml: 1 }}>
                <Delete sx={{ fontSize: 15 }} />
              </IconButton>
            </Box>
            <Typography sx={{ fontFamily: FONT, fontSize: '11px', color: MUTED, lineHeight: 1.5, mb: 0.5 }}>
              {p.basePrompt.slice(0, 120)}…
            </Typography>
            <Typography sx={{ fontFamily: MONO, fontSize: '10px', color: '#A78BFA' }}>
              {p.variations?.length || 0} composition variations generated
            </Typography>
          </Box>
        ))}

        {/* Divider */}
        <Box sx={{ my: 2.5, borderTop: `1px solid ${BORD}` }} />

        {/* Add new prompt */}
        <Typography sx={{ fontFamily: MONO, fontSize: '10px', color: MUTED, letterSpacing: '1px', textTransform: 'uppercase', mb: 1.5 }}>Add new prompt</Typography>

        {/* Example toggle */}
        <Box onClick={() => setShowExample(v => !v)} sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 1.5, cursor: 'pointer' }}>
          <Typography sx={{ fontFamily: MONO, fontSize: '10px', color: '#A78BFA' }}>
            {showExample ? '▲ Hide example' : '▼ See example prompt for this category'}
          </Typography>
        </Box>

        {showExample && example && (
          <Box sx={{ p: 1.5, borderRadius: '12px', bgcolor: '#1a0a3a', border: '1px solid rgba(167,139,250,0.2)', mb: 2 }}>
            <Typography sx={{ fontFamily: FONT, fontSize: '11px', fontWeight: 700, color: '#A78BFA', mb: 0.5 }}>{example.label}</Typography>
            <Typography sx={{ fontFamily: FONT, fontSize: '11px', color: 'rgba(232,240,236,0.6)', lineHeight: 1.6 }}>{example.prompt}</Typography>
            <Button size="small" onClick={() => { setLabel(example.label.replace(' (example)', '')); setBasePrompt(example.prompt); setShowExample(false); }}
              sx={{ mt: 1, color: '#A78BFA', textTransform: 'none', fontFamily: FONT, fontSize: '11px', fontWeight: 600, p: 0 }}>
              Use as starting point →
            </Button>
          </Box>
        )}

        {activeCategory === '__new__' && (
          <TextField fullWidth size="small" placeholder="Theme name, e.g. 'Staff Moments' or 'Seasonal Promotions'"
            value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)}
            sx={{ mb: 1.5, '& .MuiOutlinedInput-root': { borderRadius: '12px', fontSize: '13px', bgcolor: CARD, color: TEXT, '& fieldset': { borderColor: '#A78BFA55' }, '&.Mui-focused fieldset': { borderColor: '#A78BFA' } }, '& .MuiInputBase-input': { color: TEXT, '&::placeholder': { color: MUTED } } }} />
        )}

        <TextField fullWidth size="small" placeholder="Short label, e.g. 'Minimal flat-lay v2'"
          value={label} onChange={e => setLabel(e.target.value)}
          sx={{ mb: 1.5, '& .MuiOutlinedInput-root': { borderRadius: '12px', fontSize: '13px', bgcolor: CARD, color: TEXT, '& fieldset': { borderColor: BORD }, '&.Mui-focused fieldset': { borderColor: '#A78BFA' } }, '& .MuiInputBase-input': { color: TEXT, '&::placeholder': { color: MUTED } } }} />

        <TextField fullWidth multiline rows={6} size="small"
          placeholder="Write your master prompt here. Be specific about composition, lighting, style, subject, mood. Avoid generic descriptions. The more specific, the better the output."
          value={basePrompt} onChange={e => setBasePrompt(e.target.value)}
          sx={{ mb: 1.5, '& .MuiOutlinedInput-root': { borderRadius: '12px', fontSize: '12px', bgcolor: CARD, color: TEXT, '& fieldset': { borderColor: BORD }, '&.Mui-focused fieldset': { borderColor: '#A78BFA' } }, '& .MuiInputBase-input': { color: TEXT, lineHeight: 1.7, '&::placeholder': { color: MUTED } } }} />

        {submitMsg && (
          <Typography sx={{ fontFamily: FONT, fontSize: '12px', color: submitMsg.startsWith('✓') ? GBRI : '#FF6B6B', mb: 1.5 }}>{submitMsg}</Typography>
        )}

        {/* New Month toggle */}
        <Box onClick={() => setIsNewMonth(v => !v)} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, p: '10px 14px', borderRadius: '12px', cursor: 'pointer', border: `1px solid ${isNewMonth ? '#FCD34D55' : BORD}`, bgcolor: isNewMonth ? 'rgba(252,211,77,0.08)' : 'transparent', transition: 'all 0.15s' }}>
          <Box sx={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${isNewMonth ? '#FCD34D' : 'rgba(255,255,255,0.22)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {isNewMonth && <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#FCD34D' }} />}
          </Box>
          <Box>
            <Typography sx={{ fontFamily: FONT, fontSize: '13px', color: isNewMonth ? '#FCD34D' : MUTED }}>Use for New Month posts</Typography>
            <Typography sx={{ fontFamily: FONT, fontSize: '11px', color: MUTED, lineHeight: 1.4 }}>Any week containing the 1st of a month will use this prompt</Typography>
          </Box>
        </Box>

        <Button fullWidth disabled={!label.trim() || !basePrompt.trim() || submitting || !effectiveCategory} onClick={handleSubmit}
          sx={{ bgcolor: '#7C3AED', color: '#fff', borderRadius: '12px', textTransform: 'none', fontFamily: FONT, fontWeight: 700, fontSize: '14px', py: 1.4, '&:hover': { bgcolor: '#6D28D9' }, '&:disabled': { opacity: 0.5 } }}>
          {submitting ? <><CircularProgress size={14} sx={{ color: '#fff', mr: 1 }} /> Generating variations…</> : 'Save & Generate 10 Variations ✦'}
        </Button>

        <Typography sx={{ fontFamily: FONT, fontSize: '11px', color: MUTED, mt: 1.5, lineHeight: 1.6, textAlign: 'center' }}>
          Gemini will generate 10 composition variants from your prompt. The system randomly picks one per pharmacy post and injects brand colours, name, and location automatically.
        </Typography>

        {/* ── Health Calendar ──────────────────────────────────────── */}
        <Box sx={{ mt: 3, pt: 2.5, borderTop: `1px solid ${BORD}` }}>
          <Box onClick={() => setCalTab(v => !v)} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', mb: calTab ? 2 : 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography sx={{ fontSize: '16px' }}>🗓</Typography>
              <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '14px', color: TEXT }}>Health Calendar</Typography>
              <Box sx={{ px: 1, py: 0.2, borderRadius: '8px', bgcolor: 'rgba(34,211,238,0.12)', border: '1px solid rgba(34,211,238,0.25)' }}>
                <Typography sx={{ fontFamily: MONO, fontSize: '10px', color: '#22D3EE' }}>{calEvents.filter(e => e.isActive).length} events</Typography>
              </Box>
            </Box>
            <Typography sx={{ fontFamily: MONO, fontSize: '12px', color: MUTED }}>{calTab ? '▲' : '▼'}</Typography>
          </Box>

          {calTab && (
            <>
              {calEvents.length === 0 && (
                <Typography sx={{ fontFamily: FONT, fontSize: '12px', color: MUTED, mb: 2 }}>No special days added yet.</Typography>
              )}
              {calEvents.map(e => (
                <Box key={e._id} sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.2, borderRadius: '10px', bgcolor: CARD, border: `1px solid ${BORD}`, mb: 1 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontFamily: FONT, fontSize: '13px', fontWeight: 600, color: TEXT }}>{e.name}</Typography>
                    <Typography sx={{ fontFamily: MONO, fontSize: '10px', color: MUTED }}>
                      {['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][e.month]} {e.day} · {e.category}
                    </Typography>
                  </Box>
                  <IconButton size="small" onClick={async () => {
                    await axios.delete('/api/admin/health-calendar', { data: { eventId: e._id, adminId: userId } });
                    setCalEvents(prev => prev.filter(x => x._id !== e._id));
                  }} sx={{ color: '#FF6B6B', p: 0.3 }}>
                    <Delete sx={{ fontSize: 15 }} />
                  </IconButton>
                </Box>
              ))}

              <Typography sx={{ fontFamily: MONO, fontSize: '10px', color: MUTED, letterSpacing: '1px', textTransform: 'uppercase', mt: 2, mb: 1.5 }}>Add special day</Typography>

              <TextField fullWidth size="small" placeholder="e.g. World Health Day"
                value={calName} onChange={e => setCalName(e.target.value)}
                sx={{ mb: 1, '& .MuiOutlinedInput-root': { borderRadius: '12px', fontSize: '13px', bgcolor: CARD, color: TEXT, '& fieldset': { borderColor: BORD }, '&.Mui-focused fieldset': { borderColor: '#22D3EE' } }, '& .MuiInputBase-input': { color: TEXT } }} />

              <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <TextField size="small" placeholder="Month (1-12)" type="number" value={calMonth} onChange={e => setCalMonth(e.target.value)}
                  sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: '12px', fontSize: '13px', bgcolor: CARD, color: TEXT, '& fieldset': { borderColor: BORD } }, '& .MuiInputBase-input': { color: TEXT } }} />
                <TextField size="small" placeholder="Day (1-31)" type="number" value={calDay} onChange={e => setCalDay(e.target.value)}
                  sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: '12px', fontSize: '13px', bgcolor: CARD, color: TEXT, '& fieldset': { borderColor: BORD } }, '& .MuiInputBase-input': { color: TEXT } }} />
              </Box>

              <Box sx={{ mb: 1.5 }}>
                <Typography sx={{ fontFamily: MONO, fontSize: '10px', color: MUTED, mb: 0.8 }}>Use which prompt category?</Typography>
                <Box sx={{ display: 'flex', gap: 0.8, flexWrap: 'wrap' }}>
                  {dbCategories.map(cat => (
                    <Box key={cat} onClick={() => setCalCategory(cat)} sx={{ px: 1.2, py: 0.5, borderRadius: '10px', cursor: 'pointer', bgcolor: calCategory === cat ? 'rgba(34,211,238,0.12)' : CARD, border: `1px solid ${calCategory === cat ? 'rgba(34,211,238,0.3)' : BORD}` }}>
                      <Typography sx={{ fontFamily: MONO, fontSize: '10px', color: calCategory === cat ? '#22D3EE' : MUTED }}>{cat}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>

              <Button fullWidth disabled={!calName.trim() || !calMonth || !calDay || !calCategory || calSubmitting}
                onClick={async () => {
                  setCalSubmitting(true);
                  try {
                    const res = await axios.post('/api/admin/health-calendar', { adminId: userId, name: calName.trim(), month: Number(calMonth), day: Number(calDay), category: calCategory });
                    setCalEvents(prev => [...prev, res.data.event]);
                    setCalName(''); setCalMonth(''); setCalDay(''); setCalCategory('');
                  } catch(e) { console.error(e); }
                  finally { setCalSubmitting(false); }
                }}
                sx={{ bgcolor: 'rgba(34,211,238,0.15)', color: '#22D3EE', borderRadius: '12px', textTransform: 'none', fontFamily: FONT, fontWeight: 700, fontSize: '13px', py: 1.2, border: '1px solid rgba(34,211,238,0.3)', '&:disabled': { opacity: 0.5 } }}>
                {calSubmitting ? <CircularProgress size={14} sx={{ color: '#22D3EE', mr: 1 }} /> : null}
                Add to Calendar ✦
              </Button>
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function SocialContent() {
  const { user } = useSession();

  const [appState,    setAppState]   = useState<AppState>('loading');
  const [categories,  setCategories] = useState<string[]>([]);
  const [tone,        setTone]       = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('social_tone') || 'warm' : 'warm'));
  const [showPrices,  setShowPrices] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('social_show_prices') || 'yes' : 'yes'));
  const [settingsOpen,    setSettingsOpen]    = useState(false);
  const [adminPanelOpen,  setAdminPanelOpen]  = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(() => { const d = new Date(); d.setHours(0,0,0,0); return d; });
  const [allPosts,    setAllPosts]   = useState<DailyPost[]>([]); // all posts this week
  const [generating,  setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const [imageError,  setImageError]  = useState<string | null>(null);

  // Special request state
  const [specialModalOpen,  setSpecialModal]   = useState(false);
  const [specialBrief,      setSpecialBrief]   = useState('');
  const [specialImages,     setSpecialImages]  = useState<Array<{ data: string; mimeType: string; preview: string }>>([]);
  const [generatingSpecial, setGenSpecial]     = useState(false);
  const [specialProgress,   setSpecialProgress]= useState(0);

  // Regen modal state
  const [regenModalOpen, setRegenModal]   = useState(false);
  const [regenReason,    setRegenReason]  = useState('');
  const [regenError,     setRegenError]   = useState('');
  const [regenerating,   setRegenerating] = useState(false);
  const [marking,        setMarking]      = useState(false);
  const [captionExpanded, setCaptionExp]  = useState(false);

  const pharmacyName = user?.businessName || 'Pharmacy';
  const pharmacyUrl  = user?.slug ? `${user.slug}.psx.ng` : 'psx.ng';

  // Split regular posts from special requests
  const regularPosts = allPosts.filter(p => !p.isSpecialRequest);
  const specialPost  = allPosts.find(p => p.isSpecialRequest) ?? null;

  // Post for the selected date (regular posts only)
  const todaysPost = regularPosts.find(p => {
    const pd = new Date(p.scheduledDate); pd.setHours(0,0,0,0);
    const sd = new Date(selectedDate);    sd.setHours(0,0,0,0);
    return pd.getTime() === sd.getTime();
  }) ?? null;

  // Use the post's stored category to determine visual slot; fallback to date-based index
  const postCategory = todaysPost?.category || '';
  const slotIdx      = postCategory && categories.length > 0
    ? Math.max(0, categories.indexOf(postCategory)) % GRADIENTS.length
    : slotForDate(selectedDate) % GRADIENTS.length;
  // Regular post count only (special request is separate)
  const weekCount    = regularPosts.length;
  const weekLimitHit = weekCount >= 4;
  const todayMidnight = new Date(); todayMidnight.setHours(0,0,0,0);
  const isPastDate   = selectedDate.getTime() < todayMidnight.getTime();

  const saveTone = (v: string) => { setTone(v); localStorage.setItem('social_tone', v); };
  const saveShowPrices = (v: string) => { setShowPrices(v); localStorage.setItem('social_show_prices', v); };

  const fetchWeekPosts = useCallback(async (refDate: Date) => {
    if (!user?._id) return;
    const res = await axios.get(`/api/social/manage?pharmacyId=${user._id}&date=${toYMD(refDate)}`);
    setAllPosts(res.data.weekPosts || []);
    return res.data;
  }, [user?._id]);

  // Fetch active categories from admin prompts
  useEffect(() => {
    axios.get('/api/admin/social-prompts/categories')
      .then(res => setCategories(res.data.categories || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!user?._id) return;
    fetchWeekPosts(selectedDate).then(data => {
      const hasPosts = (data?.weekPosts?.length ?? 0) > 0;
      setAppState(hasPosts ? 'active' : 'onboarding');
    }).catch(() => setAppState('onboarding'));
  }, [user?._id]);

  // Re-fetch when date changes to a different week
  const changeDate = (days: number) => {
    const nd = new Date(selectedDate);
    nd.setDate(nd.getDate() + days);
    setCaptionExp(false);
    setImageError(null);
    const oldMon = getMondayLocal(selectedDate).getTime();
    const newMon = getMondayLocal(nd).getTime();
    setSelectedDate(nd);
    if (newMon !== oldMon) { setAllPosts([]); fetchWeekPosts(nd); }
  };

  const handleGenerate = async (dateOverride?: Date) => {
    if (!user?._id || generating) return;
    const targetDate = dateOverride ?? selectedDate;
    setGenerating(true);
    setGenProgress(0);
    setCaptionExp(false);

    // Animate progress bar while waiting
    const interval = setInterval(() => setGenProgress(p => Math.min(p + 4, 88)), 800);
    setImageError(null);

    try {
      const res = await axios.post('/api/social/generate-post', {
        pharmacyId:    user._id,
        scheduledDate: toYMD(targetDate),
        tone,
        showPrices:    showPrices === 'yes',
      });
      // Refresh categories in case a new one was created
      axios.get('/api/admin/social-prompts/categories')
        .then(r => setCategories(r.data.categories || []))
        .catch(() => {});
      if (res.data.post) {
        setAllPosts(prev => {
          const filtered = prev.filter(p => {
            const pd = new Date(p.scheduledDate); pd.setHours(0,0,0,0);
            const td = new Date(targetDate);      td.setHours(0,0,0,0);
            return pd.getTime() !== td.getTime();
          });
          return [...filtered, res.data.post];
        });
        if (res.data.imageError) setImageError(res.data.imageError);
        setAppState('active');
      }
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? e?.message ?? 'Unknown error';
      setImageError(`Request failed: ${msg}`);
    } finally {
      clearInterval(interval);
      setGenProgress(100);
      setTimeout(() => { setGenerating(false); setGenProgress(0); }, 400);
    }
  };

  const handleSpecialImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(0, 3 - specialImages.length);
    for (const file of files) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        const base64  = dataUrl.split(',')[1];
        setSpecialImages(prev => [...prev, { data: base64, mimeType: file.type, preview: dataUrl }]);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerateSpecial = async () => {
    if (!user?._id || !specialBrief.trim()) return;
    setGenSpecial(true); setSpecialProgress(0);
    const interval = setInterval(() => setSpecialProgress(p => Math.min(p + 3, 88)), 900);
    try {
      const res = await axios.post('/api/social/generate-special-post', {
        pharmacyId:  user._id,
        customPrompt: specialBrief.trim(),
        attachments:  specialImages.map(({ data, mimeType }) => ({ data, mimeType })),
      });
      if (res.data.post) {
        setAllPosts(prev => [...prev.filter(p => !p.isSpecialRequest), res.data.post]);
        setSpecialModal(false);
        setSpecialBrief('');
        setSpecialImages([]);
      }
    } catch (e: any) {
      console.error('Special post failed:', e?.response?.data?.message || e);
    } finally {
      clearInterval(interval);
      setSpecialProgress(100);
      setTimeout(() => { setGenSpecial(false); setSpecialProgress(0); }, 400);
    }
  };

  const handleMarkAsPosted = async (postId: string) => {
    setMarking(true);
    await axios.put('/api/social/manage', { postId, status: 'posted' });
    setAllPosts(prev => prev.map(p => p._id === postId ? { ...p, status: 'posted' as const } : p));
    setMarking(false);
  };

  const handleRegenerate = async (postId: string, reason: string) => {
    const res = await axios.post('/api/social/regenerate-post', { postId, reason });
    setAllPosts(prev => prev.map(p => p._id === postId ? { ...p, ...res.data.post } : p));
  };

  const handleDownload = (post: DailyPost) => {
    if (!post.imageUrl) return;
    const a = document.createElement('a'); a.href = post.imageUrl; a.download = 'post.jpg'; a.click();
  };

  const handleShare = async (post: DailyPost) => {
    const text = `${post.caption}\n\n${(post.hashtags || []).map(h => `#${h}`).join(' ')}`;
    try {
      if (post.imageUrl && navigator.canShare) {
        const r    = await fetch(post.imageUrl);
        const blob = await r.blob();
        const file = new File([blob], 'post.jpg', { type: 'image/jpeg' });
        if (navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text }); return; }
      }
      await navigator.share({ text });
    } catch { navigator.clipboard.writeText(text).catch(() => {}); }
  };

  if (appState === 'loading') {
    return <Box sx={{ minHeight: '100vh', bgcolor: BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CircularProgress sx={{ color: GREEN }} /></Box>;
  }

  if (appState === 'onboarding') {
    return (
      <AnimatePresence mode="wait">
        <OnboardingScreen key="ob" tone={tone} setTone={saveTone} showPrices={showPrices} setShowPrices={saveShowPrices} onStart={() => handleGenerate(selectedDate)} generating={generating} progress={genProgress} categories={categories} />
      </AnimatePresence>
    );
  }

  // ── Active view ──────────────────────────────────────────────────────────────
  const isPosted  = todaysPost?.status === 'posted';
  const regenLeft = Math.max(0, 2 - (todaysPost?.regenCount ?? 0));

  return (
    <Box sx={{ bgcolor: BG, minHeight: '100vh' }}>
      {/* Date carousel */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, pt: 2.5, pb: 2 }}>
        <IconButton onClick={() => changeDate(-1)} disabled={isPastDate} size="small" sx={{ bgcolor: CARD, color: isPastDate ? 'rgba(255,255,255,0.15)' : TEXT, borderRadius: '10px', width: 36, height: 36, border: `1px solid ${BORD}` }}><ChevronLeft sx={{ fontSize: 20 }} /></IconButton>
        <Box sx={{ textAlign: 'center' }}>
          <Typography sx={{ fontFamily: MONO, fontSize: '9px', color: MUTED, letterSpacing: '1px', textTransform: 'uppercase' }}>{selectedDate.toLocaleDateString('default', { weekday: 'long' })}</Typography>
          <Typography sx={{ fontFamily: FONT, fontSize: '17px', fontWeight: 700, color: TEXT }}>{fmtDate(selectedDate)}</Typography>
        </Box>
        <IconButton onClick={() => changeDate(1)} size="small" sx={{ bgcolor: CARD, color: TEXT, borderRadius: '10px', width: 36, height: 36, border: `1px solid ${BORD}` }}><ChevronRight sx={{ fontSize: 20 }} /></IconButton>
      </Box>

      {/* Settings gear — top right */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', px: 2, mb: 0.5, mt: -1 }}>
        <Box onClick={() => setSettingsOpen(true)} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer', px: 1.2, py: 0.5, borderRadius: '8px', border: `1px solid ${BORD}`, bgcolor: CARD }}>
          <Settings sx={{ fontSize: 13, color: MUTED }} />
          <Typography sx={{ fontFamily: MONO, fontSize: '10px', color: MUTED }}>Post settings</Typography>
        </Box>
      </Box>

      {/* Week usage pill */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
        <Box sx={{ px: 1.5, py: 0.4, borderRadius: '20px', bgcolor: weekLimitHit ? 'rgba(255,80,80,0.12)' : `${GREEN}18`, border: `1px solid ${weekLimitHit ? 'rgba(255,80,80,0.3)' : `${GREEN}35`}` }}>
          <Typography sx={{ fontFamily: MONO, fontSize: '10px', color: weekLimitHit ? '#FF6B6B' : GREEN, fontWeight: 600 }}>
            {weekLimitHit ? 'Weekly limit reached (4/4)' : `${weekCount}/4 posts this week`}
          </Typography>
        </Box>
      </Box>

      {/* Post card */}
      <Box sx={{ px: 2, mb: 2 }}>
        <AnimatePresence mode="wait">
          <motion.div key={toYMD(selectedDate)} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.18 }}>
            <Box sx={{ bgcolor: CARD, borderRadius: '20px', overflow: 'hidden', border: `1px solid ${BORD}` }}>

              {/* Progress bar while generating */}
              {generating && (
                <Box sx={{ height: 3 }}>
                  <motion.div animate={{ width: `${genProgress}%` }} transition={{ duration: 0.5, ease: 'easeOut' }}
                    style={{ height: '100%', background: `linear-gradient(90deg,${GREEN},${GBRI})` }} />
                </Box>
              )}

              <Box sx={{ p: 1.5, pb: 0 }}>
                <PostGraphic post={generating ? null : todaysPost} idx={slotIdx} name={pharmacyName} url={pharmacyUrl} />
              </Box>

              <Box sx={{ p: 2 }}>
                {/* Image error log — shown whenever image generation failed */}
                {!generating && imageError && !todaysPost?.imageUrl && (
                  <Box sx={{ mb: 2, p: 1.5, borderRadius: '10px', bgcolor: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.25)' }}>
                    <Typography sx={{ fontFamily: MONO, fontSize: '10px', fontWeight: 700, color: '#FF6B6B', mb: 0.5, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                      ⚠ Image generation failed
                    </Typography>
                    <Typography sx={{ fontFamily: MONO, fontSize: '11px', color: 'rgba(255,140,140,0.85)', lineHeight: 1.6, wordBreak: 'break-word' }}>
                      {imageError}
                    </Typography>
                  </Box>
                )}

                {generating ? (
                  /* Loading state */
                  <Box sx={{ py: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
                    <CircularProgress size={22} sx={{ color: GREEN }} />
                    <Typography sx={{ fontFamily: FONT, fontSize: '13px', color: MUTED }}>Generating your post…</Typography>
                  </Box>
                ) : todaysPost ? (
                  /* Post exists */
                  <>
                    {/* Status + platforms */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
                      <Box sx={{ px: 1.2, py: 0.3, borderRadius: '6px', bgcolor: isPosted ? `${GBRI}22` : `${GREEN}22`, border: `1px solid ${isPosted ? `${GBRI}40` : `${GREEN}40`}` }}>
                        <Typography sx={{ fontFamily: MONO, fontSize: '10px', fontWeight: 600, color: isPosted ? GBRI : GREEN }}>{isPosted ? '✓ Posted' : 'Ready'}</Typography>
                      </Box>
                      {['Instagram', 'Facebook'].map(pl => (
                        <Box key={pl} sx={{ px: 1, py: 0.3, borderRadius: '6px', border: `1px solid ${BORD}` }}>
                          <Typography sx={{ fontFamily: MONO, fontSize: '10px', color: MUTED }}>{pl}</Typography>
                        </Box>
                      ))}
                    </Box>

                    {/* Caption */}
                    <Box sx={{ mb: 1.5 }}>
                      <Typography sx={{ fontFamily: FONT, fontSize: '13px', color: TEXT, lineHeight: 1.65 }}>
                        {captionExpanded || (todaysPost.caption?.length ?? 0) <= 110 ? todaysPost.caption : `${todaysPost.caption?.slice(0, 110)}...`}
                      </Typography>
                      {(todaysPost.caption?.length ?? 0) > 110 && (
                        <Typography onClick={() => setCaptionExp(v => !v)} sx={{ fontFamily: FONT, fontSize: '12px', color: GREEN, fontWeight: 600, cursor: 'pointer', mt: 0.5, display: 'inline-block' }}>
                          {captionExpanded ? 'Show less' : 'Read more'}
                        </Typography>
                      )}
                    </Box>

                    {/* Hashtags */}
                    {(todaysPost.hashtags?.length ?? 0) > 0 && (
                      <Typography sx={{ fontFamily: MONO, fontSize: '11px', color: ACCENTS[slotIdx], mb: 2, wordBreak: 'break-word' }}>
                        {todaysPost.hashtags.map(h => `#${h}`).join(' ')}
                      </Typography>
                    )}

                    {/* Download / Share */}
                    <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
                      <Button disabled={!todaysPost.imageUrl} onClick={() => handleDownload(todaysPost)} startIcon={<FileDownload sx={{ fontSize: 16 }} />}
                        sx={{ flex: 1, bgcolor: 'rgba(255,255,255,0.06)', color: TEXT, borderRadius: '12px', textTransform: 'none', fontFamily: FONT, fontSize: '13px', fontWeight: 600, py: 1.1, border: `1px solid ${BORD}` }}>
                        Download
                      </Button>
                      <Button onClick={() => handleShare(todaysPost)} startIcon={<IosShare sx={{ fontSize: 16 }} />}
                        sx={{ flex: 1, bgcolor: GREEN, color: '#fff', borderRadius: '12px', textTransform: 'none', fontFamily: FONT, fontSize: '13px', fontWeight: 700, py: 1.1, boxShadow: `0 4px 18px ${GREEN}44` }}>
                        Share
                      </Button>
                    </Box>

                    {/* Regenerate */}
                    {!isPosted && (
                      regenLeft === 0
                        ? <Box sx={{ mb: 1.5, p: 1.2, borderRadius: '10px', bgcolor: 'rgba(255,255,255,0.04)', border: `1px solid ${BORD}`, textAlign: 'center' }}>
                            <Typography sx={{ fontFamily: FONT, fontSize: '12px', color: MUTED }}>Regeneration limit reached for today.</Typography>
                          </Box>
                        : <Button fullWidth onClick={() => { setRegenError(''); setRegenModal(true); }}
                            sx={{ mb: 1.5, bgcolor: 'rgba(255,80,80,0.08)', color: '#FF6B6B', border: '1px solid rgba(255,80,80,0.2)', borderRadius: '12px', textTransform: 'none', fontFamily: FONT, fontSize: '13px', fontWeight: 600, py: 1.1 }}>
                            Regenerate ({regenLeft} left)
                          </Button>
                    )}

                    {/* Mark as posted */}
                    <Button fullWidth disabled={isPosted || marking} onClick={() => handleMarkAsPosted(todaysPost._id)}
                      sx={{ bgcolor: isPosted ? `${GBRI}18` : 'rgba(255,255,255,0.04)', color: isPosted ? GBRI : MUTED, border: `1px solid ${isPosted ? `${GBRI}40` : BORD}`, borderRadius: '12px', textTransform: 'none', fontFamily: FONT, fontSize: '13px', fontWeight: 600, py: 1.3, '&:hover:not(:disabled)': { bgcolor: `${GREEN}18`, color: GREEN, borderColor: `${GREEN}45` } }}>
                      {marking ? <CircularProgress size={16} sx={{ color: GREEN }} /> : isPosted ? '✓ Marked as posted' : 'Mark as posted'}
                    </Button>
                  </>
                ) : (
                  /* No post for this day */
                  <Box sx={{ py: 2.5, textAlign: 'center' }}>
                    <Typography sx={{ fontFamily: FONT, fontSize: '14px', fontWeight: 700, color: TEXT, mb: 0.5 }}>
                      {categories[slotIdx] || 'Social Post'}
                    </Typography>
                    <Typography sx={{ fontFamily: FONT, fontSize: '12px', color: MUTED, mb: 2.5 }}>
                      {weekLimitHit ? "You've used all 4 posts this week." : "No post generated for this day yet."}
                    </Typography>
                    {!weekLimitHit && !isPastDate && (
                      <Button onClick={() => handleGenerate(selectedDate)}
                        sx={{ bgcolor: GREEN, color: '#fff', borderRadius: '12px', textTransform: 'none', fontFamily: FONT, fontWeight: 700, fontSize: '14px', px: 3, py: 1.3, boxShadow: `0 4px 18px ${GREEN}44` }}>
                        Generate post ✦
                      </Button>
                    )}
                    {isPastDate && (
                      <Typography sx={{ fontFamily: MONO, fontSize: '11px', color: MUTED }}>
                        Posts can only be generated from today onwards.
                      </Typography>
                    )}
                  </Box>
                )}
              </Box>
            </Box>
          </motion.div>
        </AnimatePresence>
      </Box>

      {/* ── Special Request Card ────────────────────────────────────────── */}
      <Box sx={{ px: 2, pb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ fontSize: '16px' }}>✦</Typography>
            <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '14px', color: TEXT }}>Special Request</Typography>
          </Box>
          <Box sx={{ px: 1.2, py: 0.3, borderRadius: '20px', bgcolor: specialPost ? `${GREEN}18` : 'rgba(255,255,255,0.06)', border: `1px solid ${specialPost ? `${GREEN}35` : BORD}` }}>
            <Typography sx={{ fontFamily: MONO, fontSize: '10px', color: specialPost ? GREEN : MUTED }}>{specialPost ? '1/1 this week' : '0/1 this week'}</Typography>
          </Box>
        </Box>

        <Box sx={{ bgcolor: CARD, borderRadius: '20px', border: `1px solid ${BORD}`, overflow: 'hidden' }}>
          {generatingSpecial && (
            <Box sx={{ height: 3 }}>
              <motion.div animate={{ width: `${specialProgress}%` }} transition={{ duration: 0.5 }}
                style={{ height: '100%', background: `linear-gradient(90deg,#7C3AED,#A78BFA)` }} />
            </Box>
          )}

          {specialPost ? (
            <Box sx={{ p: 1.5, pb: 0 }}>
              <PostGraphic post={specialPost} idx={4} name={pharmacyName} url={pharmacyUrl} />
            </Box>
          ) : (
            <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, py: 3 }}>
              <Typography sx={{ fontFamily: FONT, fontSize: '13px', color: MUTED, textAlign: 'center', lineHeight: 1.6 }}>
                Write your own brief — a promotion, event, or anything specific to your pharmacy.
              </Typography>
            </Box>
          )}

          {specialPost && (
            <Box sx={{ p: 2 }}>
              {/* Brief used */}
              <Box sx={{ mb: 1.5, p: 1.2, borderRadius: '10px', bgcolor: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)' }}>
                <Typography sx={{ fontFamily: MONO, fontSize: '10px', color: '#A78BFA', mb: 0.3 }}>Your brief</Typography>
                <Typography sx={{ fontFamily: FONT, fontSize: '12px', color: MUTED, lineHeight: 1.5 }}>{specialPost.specialRequestPrompt}</Typography>
              </Box>

              {specialPost.caption && (
                <Typography sx={{ fontFamily: FONT, fontSize: '13px', color: TEXT, lineHeight: 1.65, mb: 1.5 }}>{specialPost.caption}</Typography>
              )}
              {(specialPost.hashtags?.length ?? 0) > 0 && (
                <Typography sx={{ fontFamily: MONO, fontSize: '11px', color: '#A78BFA', mb: 2 }}>{specialPost.hashtags.map(h => `#${h}`).join(' ')}</Typography>
              )}

              <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
                <Button disabled={!specialPost.imageUrl} onClick={() => handleDownload(specialPost)}
                  startIcon={<FileDownload sx={{ fontSize: 16 }} />}
                  sx={{ flex: 1, bgcolor: 'rgba(255,255,255,0.06)', color: TEXT, borderRadius: '12px', textTransform: 'none', fontFamily: FONT, fontSize: '13px', fontWeight: 600, py: 1.1, border: `1px solid ${BORD}` }}>
                  Download
                </Button>
                <Button onClick={() => handleShare(specialPost)}
                  startIcon={<IosShare sx={{ fontSize: 16 }} />}
                  sx={{ flex: 1, bgcolor: '#7C3AED', color: '#fff', borderRadius: '12px', textTransform: 'none', fontFamily: FONT, fontSize: '13px', fontWeight: 700, py: 1.1 }}>
                  Share
                </Button>
              </Box>

              {specialPost.status !== 'posted' && (
                (specialPost.regenCount ?? 0) >= 2
                  ? <Box sx={{ mb: 1.5, p: 1.2, borderRadius: '10px', bgcolor: 'rgba(255,255,255,0.04)', border: `1px solid ${BORD}`, textAlign: 'center' }}>
                      <Typography sx={{ fontFamily: FONT, fontSize: '12px', color: MUTED }}>Regeneration limit reached for today.</Typography>
                    </Box>
                  : <Button fullWidth onClick={() => { setRegenError(''); setRegenModal(true); }}
                      sx={{ mb: 1.5, bgcolor: 'rgba(255,80,80,0.08)', color: '#FF6B6B', border: '1px solid rgba(255,80,80,0.2)', borderRadius: '12px', textTransform: 'none', fontFamily: FONT, fontSize: '13px', fontWeight: 600, py: 1.1 }}>
                      Regenerate ({2 - (specialPost.regenCount ?? 0)} left)
                    </Button>
              )}

              <Button fullWidth disabled={specialPost.status === 'posted'} onClick={() => handleMarkAsPosted(specialPost._id)}
                sx={{ bgcolor: specialPost.status === 'posted' ? `${GBRI}18` : 'rgba(255,255,255,0.04)', color: specialPost.status === 'posted' ? GBRI : MUTED, border: `1px solid ${specialPost.status === 'posted' ? `${GBRI}40` : BORD}`, borderRadius: '12px', textTransform: 'none', fontFamily: FONT, fontSize: '13px', fontWeight: 600, py: 1.3 }}>
                {specialPost.status === 'posted' ? '✓ Marked as posted' : 'Mark as posted'}
              </Button>
            </Box>
          )}

          {!specialPost && !generatingSpecial && (
            <Box sx={{ px: 2, pb: 2 }}>
              <Button fullWidth onClick={() => setSpecialModal(true)}
                sx={{ bgcolor: '#7C3AED', color: '#fff', borderRadius: '12px', textTransform: 'none', fontFamily: FONT, fontWeight: 700, fontSize: '14px', py: 1.4, boxShadow: '0 4px 20px rgba(124,58,237,0.4)' }}>
                Create Special Post ✦
              </Button>
            </Box>
          )}
        </Box>
      </Box>

      <LockedSection />

      {/* Special Request Modal */}
      {specialModalOpen && (
        <Dialog open onClose={() => !generatingSpecial && setSpecialModal(false)}
          PaperProps={{ sx: { borderRadius: '20px', bgcolor: CARD, border: `1px solid ${BORD}`, p: 0.5, m: 2, width: '100%' } }}>
          <DialogTitle sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '16px', color: TEXT }}>
            ✦ Special Request
          </DialogTitle>
          <DialogContent sx={{ pb: 1 }}>
            <Box sx={{ p: 1.5, borderRadius: '12px', bgcolor: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)', mb: 2 }}>
              <Typography sx={{ fontFamily: MONO, fontSize: '10px', color: '#A78BFA', mb: 0.5 }}>Example brief</Typography>
              <Typography sx={{ fontFamily: FONT, fontSize: '12px', color: 'rgba(232,240,236,0.6)', lineHeight: 1.6, fontStyle: 'italic' }}>
                "We're celebrating our 5th anniversary this Saturday — create a festive post announcing 20% off all vitamins this weekend only. Keep it exciting and colourful."
              </Typography>
            </Box>

            <TextField autoFocus fullWidth multiline rows={4} size="small"
              placeholder="Describe exactly what you want — a promotion, event, new arrival, health campaign, anything specific to your pharmacy this week..."
              value={specialBrief} onChange={e => setSpecialBrief(e.target.value)}
              sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: '12px', fontSize: '13px', bgcolor: '#0F1C17', color: TEXT, '& fieldset': { borderColor: BORD }, '&.Mui-focused fieldset': { borderColor: '#7C3AED' } }, '& .MuiInputBase-input': { color: TEXT, lineHeight: 1.7 } }} />

            <Typography sx={{ fontFamily: MONO, fontSize: '10px', color: MUTED, letterSpacing: '1px', textTransform: 'uppercase', mb: 1 }}>
              Reference images (optional, up to 3)
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: specialImages.length > 0 ? 1.5 : 0 }}>
              {specialImages.map((img, i) => (
                <Box key={i} sx={{ position: 'relative', width: 64, height: 64, borderRadius: '10px', overflow: 'hidden', border: `1px solid ${BORD}` }}>
                  <Box component="img" src={img.preview} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <Box onClick={() => setSpecialImages(prev => prev.filter((_, j) => j !== i))}
                    sx={{ position: 'absolute', top: 2, right: 2, width: 18, height: 18, borderRadius: '50%', bgcolor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <Typography sx={{ fontSize: '10px', color: '#fff', lineHeight: 1 }}>✕</Typography>
                  </Box>
                </Box>
              ))}
              {specialImages.length < 3 && (
                <Button component="label" sx={{ width: 64, height: 64, borderRadius: '10px', border: `1px dashed ${BORD}`, color: MUTED, minWidth: 0, flexDirection: 'column', gap: 0.3 }}>
                  <Typography sx={{ fontSize: '18px', lineHeight: 1 }}>+</Typography>
                  <Typography sx={{ fontFamily: MONO, fontSize: '8px', color: MUTED }}>Image</Typography>
                  <input type="file" accept="image/*" hidden multiple onChange={handleSpecialImageUpload} />
                </Button>
              )}
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
            <Button onClick={() => { setSpecialModal(false); setSpecialBrief(''); setSpecialImages([]); }}
              sx={{ color: MUTED, textTransform: 'none', fontFamily: FONT }}>Cancel</Button>
            <Button disabled={!specialBrief.trim() || generatingSpecial} onClick={handleGenerateSpecial}
              sx={{ bgcolor: '#7C3AED', color: '#fff', textTransform: 'none', fontFamily: FONT, fontWeight: 700, borderRadius: '10px', px: 2.5, '&:disabled': { opacity: 0.5 } }}>
              {generatingSpecial ? <><CircularProgress size={14} sx={{ color: '#fff', mr: 1 }} />Generating…</> : 'Generate Post ✦'}
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Regen modal */}
      {regenModalOpen && (
        <Dialog open onClose={() => !regenerating && setRegenModal(false)}
          PaperProps={{ sx: { borderRadius: '18px', bgcolor: CARD, border: `1px solid ${BORD}`, p: 0.5, m: 2 } }}>
          <DialogTitle sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '16px', color: TEXT }}>Why regenerate this post?</DialogTitle>
          <DialogContent>
            <Typography sx={{ fontFamily: FONT, fontSize: '13px', color: MUTED, mb: 2 }}>
              {regenLeft} regeneration{regenLeft === 1 ? '' : 's'} remaining today.
            </Typography>
            <TextField autoFocus fullWidth multiline rows={3} size="small"
              placeholder="e.g. Too much text, wrong colour, mention malaria instead..."
              value={regenReason} onChange={e => { setRegenReason(e.target.value); setRegenError(''); }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', fontSize: '13px', bgcolor: '#0F1C17', color: TEXT, '& fieldset': { borderColor: BORD }, '&.Mui-focused fieldset': { borderColor: GREEN } }, '& .MuiInputBase-input': { color: TEXT } }} />
            {regenError && <Typography sx={{ fontFamily: FONT, fontSize: '12px', color: '#FF6B6B', mt: 1 }}>{regenError}</Typography>}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
            <Button onClick={() => { setRegenModal(false); setRegenReason(''); }} disabled={regenerating} sx={{ color: MUTED, textTransform: 'none', fontFamily: FONT }}>Cancel</Button>
            <Button disabled={!regenReason.trim() || regenerating}
              onClick={async () => {
                if (!todaysPost) return;
                setRegenerating(true);
                try { await handleRegenerate(todaysPost._id, regenReason); setRegenModal(false); setRegenReason(''); }
                catch (err: any) { setRegenError(err?.response?.data?.message || 'Regeneration failed.'); }
                finally { setRegenerating(false); }
              }}
              sx={{ bgcolor: '#c0392b', color: '#fff', textTransform: 'none', fontFamily: FONT, fontWeight: 700, borderRadius: '10px', px: 2.5, '&:disabled': { opacity: 0.5 } }}>
              {regenerating ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : 'Regenerate'}
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Admin floating button — only visible to admin role */}
      {user?.role === 'admin' && (
        <Box
          onClick={() => setAdminPanelOpen(true)}
          sx={{ position: 'fixed', bottom: 90, right: 16, zIndex: 999, display: 'flex', alignItems: 'center', gap: 0.8, px: 1.5, py: 0.8, borderRadius: '20px', bgcolor: '#1a0a3a', border: '1px solid rgba(167,139,250,0.35)', cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}
        >
          <AutoAwesome sx={{ fontSize: 13, color: '#A78BFA' }} />
          <Typography sx={{ fontFamily: MONO, fontSize: '10px', color: '#A78BFA', fontWeight: 600, letterSpacing: '0.5px' }}>Prompts</Typography>
        </Box>
      )}

      {/* Admin prompt panel */}
      {adminPanelOpen && user?.role === 'admin' && (
        <AdminPromptPanel userId={String(user._id)} onClose={() => setAdminPanelOpen(false)} />
      )}

      {/* Settings modal */}
      {settingsOpen && (
        <Dialog open onClose={() => setSettingsOpen(false)}
          PaperProps={{ sx: { borderRadius: '20px', bgcolor: CARD, border: `1px solid ${BORD}`, p: 0.5, m: 2, width: '100%' } }}>
          <DialogTitle sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '16px', color: TEXT }}>Post Settings</DialogTitle>
          <DialogContent sx={{ pb: 1 }}>
            <Typography sx={{ fontFamily: MONO, fontSize: '10px', color: MUTED, letterSpacing: '1px', textTransform: 'uppercase', mb: 1.5 }}>Preferred tone</Typography>
            {[
              { val: 'warm',         label: 'Warm and friendly'        },
              { val: 'professional', label: 'Professional and clinical' },
              { val: 'bold',         label: 'Bold and energetic'        },
            ].map(opt => (
              <Box key={opt.val} onClick={() => saveTone(opt.val)} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1, p: '10px 14px', borderRadius: '12px', cursor: 'pointer', border: `1px solid ${tone === opt.val ? GREEN : BORD}`, bgcolor: tone === opt.val ? `${GREEN}1A` : 'transparent', transition: 'all 0.15s' }}>
                <Box sx={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${tone === opt.val ? GREEN : 'rgba(255,255,255,0.22)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {tone === opt.val && <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: GREEN }} />}
                </Box>
                <Typography sx={{ fontFamily: FONT, fontSize: '14px', color: tone === opt.val ? TEXT : MUTED }}>{opt.label}</Typography>
              </Box>
            ))}

            <Typography sx={{ fontFamily: MONO, fontSize: '10px', color: MUTED, letterSpacing: '1px', textTransform: 'uppercase', mb: 1.5, mt: 2.5 }}>Show prices on posts?</Typography>
            {[
              { val: 'yes', label: 'Yes, include pricing' },
              { val: 'no',  label: 'No, keep it general'  },
            ].map(opt => (
              <Box key={opt.val} onClick={() => saveShowPrices(opt.val)} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1, p: '10px 14px', borderRadius: '12px', cursor: 'pointer', border: `1px solid ${showPrices === opt.val ? GREEN : BORD}`, bgcolor: showPrices === opt.val ? `${GREEN}1A` : 'transparent', transition: 'all 0.15s' }}>
                <Box sx={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${showPrices === opt.val ? GREEN : 'rgba(255,255,255,0.22)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {showPrices === opt.val && <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: GREEN }} />}
                </Box>
                <Typography sx={{ fontFamily: FONT, fontSize: '14px', color: showPrices === opt.val ? TEXT : MUTED }}>{opt.label}</Typography>
              </Box>
            ))}
            <Typography sx={{ fontFamily: FONT, fontSize: '11px', color: MUTED, mt: 2, lineHeight: 1.5 }}>Changes apply to the next post you generate.</Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button fullWidth onClick={() => setSettingsOpen(false)} sx={{ bgcolor: GREEN, color: '#fff', borderRadius: '12px', textTransform: 'none', fontFamily: FONT, fontWeight: 700, fontSize: '14px', py: 1.3 }}>Done</Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
}
