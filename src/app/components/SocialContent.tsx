'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Button, IconButton, CircularProgress,
         Dialog, DialogTitle, DialogContent, DialogActions, TextField } from '@mui/material';
import { ChevronLeft, ChevronRight, FileDownload, IosShare, Lock, CheckCircle } from '@mui/icons-material';
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
];
const ACCENTS = ['#1DB88A', '#A78BFA', '#FCD34D', '#22D3EE'];
const LABELS  = ['Medicine Spotlight', 'Health Awareness', 'Low Stock Alert', 'Human Moment'];
const ICONS   = ['💊', '🌿', '⚠️', '🤝'];
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
              {post ? 'Image unavailable' : LABELS[idx % 4]}
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
function OnboardingScreen({ tone, setTone, showPrices, setShowPrices, onStart }: {
  tone: string; setTone: (v: string) => void;
  showPrices: string; setShowPrices: (v: string) => void;
  onStart: () => void;
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
        {LABELS.map((label, i) => (
          <Box key={i} sx={{ minWidth: 98, height: 114, borderRadius: '14px', flexShrink: 0, background: GRADIENTS[i], position: 'relative', overflow: 'hidden', border: `1px solid rgba(255,255,255,0.08)` }}>
            <Box sx={{ position: 'absolute', inset: 0, backgroundImage: `repeating-linear-gradient(rgba(255,255,255,0.04) 1px,transparent 1px,transparent 28px),repeating-linear-gradient(90deg,rgba(255,255,255,0.04) 1px,transparent 1px,transparent 28px)` }} />
            <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', p: 1.5, background: 'linear-gradient(to top,rgba(0,0,0,0.5) 0%,transparent 60%)' }}>
              <Typography sx={{ fontSize: '20px', mb: 0.5 }}>{ICONS[i]}</Typography>
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
      <Button fullWidth onClick={onStart} sx={{ bgcolor: GREEN, color: '#fff', borderRadius: '14px', textTransform: 'none', fontFamily: FONT, fontWeight: 700, fontSize: '16px', py: 1.9, boxShadow: `0 0 32px ${GREEN}55`, '&:hover': { bgcolor: '#0a5a45' } }}>
        Generate today's post ✦
      </Button>
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

// ── Main component ────────────────────────────────────────────────────────────
export default function SocialContent() {
  const { user } = useSession();

  const [appState,    setAppState]   = useState<AppState>('loading');
  const [tone,        setTone]       = useState('warm');
  const [showPrices,  setShowPrices] = useState('yes');
  const [selectedDate, setSelectedDate] = useState<Date>(() => { const d = new Date(); d.setHours(0,0,0,0); return d; });
  const [allPosts,    setAllPosts]   = useState<DailyPost[]>([]); // all posts this week
  const [generating,  setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState(0);

  // Regen modal state
  const [regenModalOpen, setRegenModal]   = useState(false);
  const [regenReason,    setRegenReason]  = useState('');
  const [regenError,     setRegenError]   = useState('');
  const [regenerating,   setRegenerating] = useState(false);
  const [marking,        setMarking]      = useState(false);
  const [captionExpanded, setCaptionExp]  = useState(false);

  const pharmacyName = user?.businessName || 'Pharmacy';
  const pharmacyUrl  = user?.username ? `pharmastackx.com/${user.username}` : 'pharmastackx.com';

  // Post for the selected date
  const todaysPost = allPosts.find(p => {
    const pd = new Date(p.scheduledDate); pd.setHours(0,0,0,0);
    const sd = new Date(selectedDate);    sd.setHours(0,0,0,0);
    return pd.getTime() === sd.getTime();
  }) ?? null;

  const slotIdx      = slotForDate(selectedDate);
  const weekCount    = weekPostCount(allPosts, selectedDate);
  const weekLimitHit = weekCount >= 4;

  const fetchWeekPosts = useCallback(async (refDate: Date) => {
    if (!user?._id) return;
    const res = await axios.get(`/api/social/manage?pharmacyId=${user._id}&date=${toYMD(refDate)}`);
    setAllPosts(res.data.weekPosts || []);
    return res.data;
  }, [user?._id]);

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
    const oldMon = getMondayLocal(selectedDate).getTime();
    const newMon = getMondayLocal(nd).getTime();
    setSelectedDate(nd);
    if (newMon !== oldMon) fetchWeekPosts(nd);
  };

  const handleGenerate = async (dateOverride?: Date) => {
    if (!user?._id || generating) return;
    const targetDate = dateOverride ?? selectedDate;
    setGenerating(true);
    setGenProgress(0);
    setCaptionExp(false);

    // Animate progress bar while waiting
    const interval = setInterval(() => setGenProgress(p => Math.min(p + 4, 88)), 800);

    try {
      const res = await axios.post('/api/social/generate-post', {
        pharmacyId:    user._id,
        scheduledDate: toYMD(targetDate),
        category:      LABELS[slotForDate(targetDate)],
        tone,
        showPrices:    showPrices === 'yes',
      });
      if (res.data.post) {
        setAllPosts(prev => {
          // Replace post for that date if it exists, otherwise append
          const filtered = prev.filter(p => {
            const pd = new Date(p.scheduledDate); pd.setHours(0,0,0,0);
            const td = new Date(targetDate);      td.setHours(0,0,0,0);
            return pd.getTime() !== td.getTime();
          });
          return [...filtered, res.data.post];
        });
        setAppState('active');
      }
    } catch (e) {
      console.error('Generate failed:', e);
    } finally {
      clearInterval(interval);
      setGenProgress(100);
      setTimeout(() => { setGenerating(false); setGenProgress(0); }, 400);
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
        <OnboardingScreen key="ob" tone={tone} setTone={setTone} showPrices={showPrices} setShowPrices={setShowPrices} onStart={() => handleGenerate(selectedDate)} />
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
        <IconButton onClick={() => changeDate(-1)} size="small" sx={{ bgcolor: CARD, color: TEXT, borderRadius: '10px', width: 36, height: 36, border: `1px solid ${BORD}` }}><ChevronLeft sx={{ fontSize: 20 }} /></IconButton>
        <Box sx={{ textAlign: 'center' }}>
          <Typography sx={{ fontFamily: MONO, fontSize: '9px', color: MUTED, letterSpacing: '1px', textTransform: 'uppercase' }}>{selectedDate.toLocaleDateString('default', { weekday: 'long' })}</Typography>
          <Typography sx={{ fontFamily: FONT, fontSize: '17px', fontWeight: 700, color: TEXT }}>{fmtDate(selectedDate)}</Typography>
        </Box>
        <IconButton onClick={() => changeDate(1)} size="small" sx={{ bgcolor: CARD, color: TEXT, borderRadius: '10px', width: 36, height: 36, border: `1px solid ${BORD}` }}><ChevronRight sx={{ fontSize: 20 }} /></IconButton>
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
                    <Typography sx={{ fontFamily: FONT, fontSize: '14px', fontWeight: 700, color: TEXT, mb: 0.5 }}>{LABELS[slotIdx]}</Typography>
                    <Typography sx={{ fontFamily: FONT, fontSize: '12px', color: MUTED, mb: 2.5 }}>
                      {weekLimitHit ? "You've used all 4 posts this week." : "No post generated for this day yet."}
                    </Typography>
                    {!weekLimitHit && (
                      <Button onClick={() => handleGenerate(selectedDate)}
                        sx={{ bgcolor: GREEN, color: '#fff', borderRadius: '12px', textTransform: 'none', fontFamily: FONT, fontWeight: 700, fontSize: '14px', px: 3, py: 1.3, boxShadow: `0 4px 18px ${GREEN}44` }}>
                        Generate post ✦
                      </Button>
                    )}
                  </Box>
                )}
              </Box>
            </Box>
          </motion.div>
        </AnimatePresence>
      </Box>

      <LockedSection />

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
    </Box>
  );
}
