'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Button, IconButton, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from '@mui/material';
import {
  ChevronLeft, ChevronRight, FileDownload, IosShare,
  Lock, CheckCircle,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from '@/context/SessionProvider';
import axios from 'axios';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw     = atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

async function requestAndSavePush(pharmacyId: string): Promise<void> {
  try {
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) return;
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;
    const reg = await navigator.serviceWorker.ready;
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) return;
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey) as unknown as ArrayBuffer,
    });
    await axios.post('/api/notifications/subscribe', { pharmacyId, subscription: subscription.toJSON() });
  } catch (err) {
    console.warn('Push subscription failed (non-fatal):', err);
  }
}

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
const GEN_STEPS = [
  'Reading inventory from POS',
  'Checking health awareness calendar',
  'Generating branded graphics',
  'Writing captions in your tone',
  'Scheduling your weekly plan',
];
const PRO_FEATURES = [
  { icon: '🎥', name: 'Video Reels',     desc: 'Auto-scripted reels'   },
  { icon: '🎠', name: 'Carousel Posts',  desc: 'Multi-slide posts'      },
  { icon: '⚡', name: 'Auto-posting',    desc: 'Schedule & publish'     },
  { icon: '📊', name: 'Analytics',       desc: 'Reach & engagement'     },
];

type AppState = 'loading' | 'onboarding' | 'generating' | 'active' | 'complete';

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
function getMondayLocal(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return d;
}

function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function fmtRange(mon: Date): string {
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  const o: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${mon.toLocaleDateString('default', o)} – ${sun.toLocaleDateString('default', o)}`;
}

function fmtDay(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('default', { weekday: 'short', month: 'short', day: 'numeric' });
}

// ── PostGraphic ───────────────────────────────────────────────────────────────
function PostGraphic({ post, idx, name, url }: {
  post: DailyPost | null; idx: number; name: string; url: string;
}) {
  const NOISE = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E\")";
  const GRID  = `repeating-linear-gradient(rgba(255,255,255,0.035) 1px,transparent 1px,transparent 44px),repeating-linear-gradient(90deg,rgba(255,255,255,0.035) 1px,transparent 1px,transparent 44px)`;

  return (
    <Box sx={{
      position: 'relative', width: '100%', aspectRatio: '1/1',
      borderRadius: '16px', overflow: 'hidden', background: GRADIENTS[idx % 4], flexShrink: 0,
    }}>
      <Box sx={{ position: 'absolute', inset: 0, zIndex: 1, backgroundImage: GRID }} />
      <Box sx={{ position: 'absolute', inset: 0, zIndex: 1, backgroundImage: NOISE }} />

      {post?.imageUrl ? (
        <Box component="img" src={post.imageUrl}
          sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 2 }} />
      ) : (
        <Box sx={{ position: 'absolute', inset: 0, zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1.5 }}>
          <Typography sx={{ fontSize: '52px' }}>{ICONS[idx % 4]}</Typography>
          <Typography sx={{ fontFamily: FONT, fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.6)', textAlign: 'center', px: 3, lineHeight: 1.4 }}>
            {post ? 'Image generation failed — tap to retry' : LABELS[idx % 4]}
          </Typography>
        </Box>
      )}

      {/* Vignette */}
      <Box sx={{
        position: 'absolute', inset: 0, zIndex: 3,
        background: 'linear-gradient(to bottom,rgba(0,0,0,0.42) 0%,transparent 30%,transparent 62%,rgba(0,0,0,0.62) 100%)',
      }} />

      {/* Pharmacy name top-left */}
      <Typography sx={{ position: 'absolute', top: 14, left: 14, zIndex: 4, fontFamily: MONO, fontSize: '9px', fontWeight: 500, color: 'rgba(255,255,255,0.65)', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
        {name}
      </Typography>

      {/* URL bottom-right */}
      <Typography sx={{ position: 'absolute', bottom: 14, right: 14, zIndex: 4, fontFamily: MONO, fontSize: '8px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.3px' }}>
        {url}
      </Typography>

      {/* Date badge top-right */}
      {post?.scheduledDate && (
        <Box sx={{ position: 'absolute', top: 12, right: 12, zIndex: 4, bgcolor: 'rgba(0,0,0,0.52)', backdropFilter: 'blur(8px)', borderRadius: '8px', px: 1, py: 0.4, border: '1px solid rgba(255,255,255,0.14)' }}>
          <Typography sx={{ fontFamily: MONO, fontSize: '9px', color: '#fff', fontWeight: 500 }}>
            {fmtDay(post.scheduledDate)}
          </Typography>
        </Box>
      )}
    </Box>
  );
}

// ── State 1 — Onboarding ──────────────────────────────────────────────────────
function OnboardingScreen({ tone, setTone, showPrices, setShowPrices, onStart }: {
  tone: string; setTone: (v: string) => void;
  showPrices: string; setShowPrices: (v: string) => void;
  onStart: () => void;
}) {
  const toneOpts = [
    { val: 'warm',         label: 'Warm and friendly'       },
    { val: 'professional', label: 'Professional and clinical' },
    { val: 'bold',         label: 'Bold and energetic'       },
  ];
  const priceOpts = [
    { val: 'yes', label: 'Yes, include pricing'  },
    { val: 'no',  label: 'No, keep it general'   },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.35 }}
      style={{ padding: '24px 20px 48px', minHeight: '100vh', background: BG }}
    >
      {/* Floating sparkles */}
      <Box sx={{ position: 'relative', height: 72, mb: 0.5, overflow: 'hidden' }}>
        {SPARKLES.map((s, i) => (
          <motion.div key={i}
            style={{ position: 'absolute', left: `${10 + i * 19}%`, top: `${8 + (i % 2) * 32}%`, fontSize: 22, userSelect: 'none' }}
            animate={{ y: [0, -10, 0], opacity: [0.55, 1, 0.55] }}
            transition={{ duration: 2 + i * 0.35, repeat: Infinity, delay: i * 0.28 }}
          >{s}</motion.div>
        ))}
      </Box>

      <Typography sx={{ fontFamily: FONT, fontSize: '28px', fontWeight: 800, color: TEXT, lineHeight: 1.15, mb: 1.5 }}>
        Your pharmacy,<br />on social media.
      </Typography>
      <Typography sx={{ fontFamily: FONT, fontSize: '14px', color: MUTED, lineHeight: 1.65, mb: 3 }}>
        We generate 4 posts a week — Mon, Wed, Fri, Sat — pulling directly from your inventory. Health tips, product spotlights, and more. All branded, ready to share.
      </Typography>

      {/* Post type horizontal scroll */}
      <Box sx={{ display: 'flex', gap: 1.5, overflowX: 'auto', pb: 1.5, mb: 3.5, mx: -2.5, px: 2.5, '&::-webkit-scrollbar': { display: 'none' } }}>
        {LABELS.map((label, i) => (
          <Box key={i} sx={{
            minWidth: 98, height: 114, borderRadius: '14px', flexShrink: 0,
            background: GRADIENTS[i], position: 'relative', overflow: 'hidden',
            border: `1px solid rgba(255,255,255,0.08)`,
          }}>
            <Box sx={{
              position: 'absolute', inset: 0,
              backgroundImage: `repeating-linear-gradient(rgba(255,255,255,0.04) 1px,transparent 1px,transparent 28px),repeating-linear-gradient(90deg,rgba(255,255,255,0.04) 1px,transparent 1px,transparent 28px)`,
            }} />
            <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', p: 1.5, background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 60%)' }}>
              <Typography sx={{ fontSize: '20px', mb: 0.5 }}>{ICONS[i]}</Typography>
              <Typography sx={{ fontFamily: FONT, fontSize: '10px', fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>{label}</Typography>
            </Box>
          </Box>
        ))}
      </Box>

      {/* Tone */}
      <Box sx={{ mb: 2.5 }}>
        <Typography sx={{ fontFamily: MONO, fontSize: '10px', color: MUTED, letterSpacing: '1px', textTransform: 'uppercase', mb: 1.5 }}>
          Preferred tone
        </Typography>
        {toneOpts.map(opt => (
          <Box key={opt.val} onClick={() => setTone(opt.val)} sx={{
            display: 'flex', alignItems: 'center', gap: 1.5, mb: 1,
            p: '10px 14px', borderRadius: '12px', cursor: 'pointer',
            border: `1px solid ${tone === opt.val ? GREEN : BORD}`,
            bgcolor: tone === opt.val ? `${GREEN}1A` : 'transparent',
            transition: 'all 0.15s',
          }}>
            <Box sx={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${tone === opt.val ? GREEN : 'rgba(255,255,255,0.22)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {tone === opt.val && <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: GREEN }} />}
            </Box>
            <Typography sx={{ fontFamily: FONT, fontSize: '14px', color: tone === opt.val ? TEXT : MUTED }}>{opt.label}</Typography>
          </Box>
        ))}
      </Box>

      {/* Show prices */}
      <Box sx={{ mb: 4 }}>
        <Typography sx={{ fontFamily: MONO, fontSize: '10px', color: MUTED, letterSpacing: '1px', textTransform: 'uppercase', mb: 1.5 }}>
          Show prices on posts?
        </Typography>
        {priceOpts.map(opt => (
          <Box key={opt.val} onClick={() => setShowPrices(opt.val)} sx={{
            display: 'flex', alignItems: 'center', gap: 1.5, mb: 1,
            p: '10px 14px', borderRadius: '12px', cursor: 'pointer',
            border: `1px solid ${showPrices === opt.val ? GREEN : BORD}`,
            bgcolor: showPrices === opt.val ? `${GREEN}1A` : 'transparent',
            transition: 'all 0.15s',
          }}>
            <Box sx={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${showPrices === opt.val ? GREEN : 'rgba(255,255,255,0.22)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {showPrices === opt.val && <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: GREEN }} />}
            </Box>
            <Typography sx={{ fontFamily: FONT, fontSize: '14px', color: showPrices === opt.val ? TEXT : MUTED }}>{opt.label}</Typography>
          </Box>
        ))}
      </Box>

      <Button fullWidth onClick={onStart} sx={{
        bgcolor: GREEN, color: '#fff', borderRadius: '14px',
        textTransform: 'none', fontFamily: FONT, fontWeight: 700, fontSize: '16px', py: 1.9,
        boxShadow: `0 0 32px ${GREEN}55`,
        '&:hover': { bgcolor: '#0a5a45', boxShadow: `0 0 44px ${GREEN}77` },
        transition: 'all 0.2s',
      }}>
        Generate my first week's content ✦
      </Button>
    </motion.div>
  );
}

// ── State 2 — Generating ──────────────────────────────────────────────────────
function GeneratingScreen({ currentStep }: { currentStep: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ minHeight: '100vh', background: BG, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px' }}
    >
      {/* Pulsing icon */}
      <Box sx={{ position: 'relative', mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <motion.div
          animate={{ scale: [1, 1.6, 1], opacity: [0.35, 0.12, 0.35] }}
          transition={{ duration: 2.2, repeat: Infinity }}
          style={{ position: 'absolute', width: 96, height: 96, borderRadius: '50%', background: `radial-gradient(circle, ${GREEN}80, transparent 70%)` }}
        />
        <motion.div
          animate={{ scale: [1, 1.07, 1] }}
          transition={{ duration: 1.4, repeat: Infinity }}
          style={{ width: 64, height: 64, borderRadius: '50%', background: GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', position: 'relative' }}
        >
          ✦
        </motion.div>
      </Box>

      <Typography sx={{ fontFamily: FONT, fontSize: '24px', fontWeight: 800, color: TEXT, mb: 0.5, textAlign: 'center' }}>
        Building your content plan.
      </Typography>
      <Typography sx={{ fontFamily: FONT, fontSize: '13px', color: MUTED, mb: 4.5, textAlign: 'center' }}>
        This takes about 20–30 seconds
      </Typography>

      <Box sx={{ width: '100%', maxWidth: 340, display: 'flex', flexDirection: 'column', gap: 1 }}>
        {GEN_STEPS.map((step, i) => {
          const isDone   = currentStep > i;
          const isActive = currentStep === i;
          return (
            <motion.div key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: isDone || isActive ? 1 : 0.3, x: 0 }}
              transition={{ delay: i * 0.06, duration: 0.3 }}
            >
              <Box sx={{
                display: 'flex', alignItems: 'center', gap: 1.5,
                p: 1.5, borderRadius: '12px',
                bgcolor: isActive ? `${GREEN}18` : 'transparent',
                border: `1px solid ${isActive ? `${GREEN}40` : 'transparent'}`,
                transition: 'all 0.3s',
              }}>
                <Box sx={{ width: 22, height: 22, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {isDone ? (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 320 }}>
                      <CheckCircle sx={{ color: GBRI, fontSize: 20 }} />
                    </motion.div>
                  ) : isActive ? (
                    <CircularProgress size={16} sx={{ color: GREEN }} />
                  ) : (
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.15)', mx: 'auto' }} />
                  )}
                </Box>
                <Typography sx={{
                  fontFamily: FONT, fontSize: '14px',
                  color: isDone ? GBRI : isActive ? TEXT : MUTED,
                  fontWeight: isDone || isActive ? 600 : 400,
                  transition: 'color 0.3s',
                }}>
                  {step}
                </Typography>
              </Box>
            </motion.div>
          );
        })}
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
        <Typography sx={{ fontFamily: MONO, fontSize: '10px', color: MUTED, letterSpacing: '1px', textTransform: 'uppercase' }}>
          Pro features
        </Typography>
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

      <Box sx={{
        borderRadius: '14px', p: 2,
        background: 'linear-gradient(135deg, #1E3A5F 0%, #0F1F3A 100%)',
        border: '1px solid rgba(59,130,246,0.22)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1,
      }}>
        <Box>
          <Typography sx={{ fontFamily: FONT, fontSize: '14px', fontWeight: 700, color: '#93C5FD' }}>
            Upgrade to Social Pro
          </Typography>
          <Typography sx={{ fontFamily: FONT, fontSize: '12px', color: 'rgba(147,197,253,0.55)' }}>
            Unlock all 4 premium features
          </Typography>
        </Box>
        <Button sx={{
          bgcolor: '#2563EB', color: '#fff', borderRadius: '10px',
          textTransform: 'none', fontFamily: FONT, fontWeight: 700, fontSize: '12px',
          px: 2, py: 0.8, flexShrink: 0, '&:hover': { bgcolor: '#1D4ED8' },
        }}>
          Upgrade
        </Button>
      </Box>
    </Box>
  );
}

// ── State 3 — Active Week View ────────────────────────────────────────────────
function ActiveWeekView({ posts, weekOffset, onWeekChange, onMarkAsPosted, onDownload, onShare, onRegenerate, pharmacyName, pharmacyUrl }: {
  posts: DailyPost[];
  weekOffset: number;
  onWeekChange: (n: number) => void;
  onMarkAsPosted: (id: string) => void;
  onDownload: (p: DailyPost) => void;
  onShare: (p: DailyPost) => void;
  onRegenerate: (postId: string, reason: string) => Promise<void>;
  pharmacyName: string;
  pharmacyUrl: string;
}) {
  const [activeIdx, setActiveIdx]         = useState(0);
  const [captionExpanded, setCaptionExp]  = useState(false);
  const [marking, setMarking]             = useState(false);
  const [regenerating, setRegenerating]   = useState(false);
  const [regenError, setRegenError]       = useState('');
  const [regenReason, setRegenReason]     = useState('');
  const [regenModalOpen, setRegenModal]   = useState(false);

  // Jump to first non-posted on posts change
  useEffect(() => {
    const first = posts.findIndex(p => p.status !== 'posted');
    setActiveIdx(first >= 0 ? first : 0);
    setCaptionExp(false);
  }, [posts]);

  const navigateTo = (idx: number) => { setActiveIdx(idx); setCaptionExp(false); };

  const monday    = getMondayLocal(new Date());
  monday.setDate(monday.getDate() + weekOffset * 7);
  const weekRange = fmtRange(monday);
  const post      = posts[activeIdx] ?? null;
  const isPosted  = post?.status === 'posted';

  const handleMark = async () => {
    if (!post || marking || isPosted) return;
    setMarking(true);
    await onMarkAsPosted(post._id);
    setMarking(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ background: BG, minHeight: '100vh' }}
    >
      {/* Week navigator */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, pt: 2.5, pb: 2 }}>
        <IconButton onClick={() => onWeekChange(weekOffset - 1)} size="small"
          sx={{ bgcolor: CARD, color: TEXT, borderRadius: '10px', width: 36, height: 36, border: `1px solid ${BORD}` }}>
          <ChevronLeft sx={{ fontSize: 20 }} />
        </IconButton>
        <Box sx={{ textAlign: 'center' }}>
          <Typography sx={{ fontFamily: MONO, fontSize: '9px', color: MUTED, letterSpacing: '1px', textTransform: 'uppercase' }}>Week</Typography>
          <Typography sx={{ fontFamily: FONT, fontSize: '15px', fontWeight: 700, color: TEXT }}>{weekRange}</Typography>
        </Box>
        <IconButton onClick={() => onWeekChange(weekOffset + 1)} size="small"
          sx={{ bgcolor: CARD, color: TEXT, borderRadius: '10px', width: 36, height: 36, border: `1px solid ${BORD}` }}>
          <ChevronRight sx={{ fontSize: 20 }} />
        </IconButton>
      </Box>

      {/* Progress dots */}
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 0.75, mb: 2.5 }}>
        {[0, 1, 2, 3].map(i => {
          const p = posts[i];
          const isA = i === activeIdx;
          const done = p?.status === 'posted';
          return (
            <motion.div key={i} onClick={() => navigateTo(i)}
              animate={{ width: isA ? 24 : 8 }}
              transition={{ type: 'spring', stiffness: 450, damping: 30 }}
              style={{ height: 8, borderRadius: 4, cursor: 'pointer', backgroundColor: done ? GBRI : isA ? GREEN : 'rgba(255,255,255,0.18)' }}
            />
          );
        })}
      </Box>

      {/* Post card */}
      <Box sx={{ px: 2, mb: 2 }}>
        <AnimatePresence mode="wait">
          <motion.div key={activeIdx}
            initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.18 }}
          >
            <Box sx={{ bgcolor: CARD, borderRadius: '20px', overflow: 'hidden', border: `1px solid ${BORD}` }}>
              {/* Graphic */}
              <Box sx={{ p: 1.5, pb: 0 }}>
                <PostGraphic post={post} idx={activeIdx} name={pharmacyName} url={pharmacyUrl} />
              </Box>

              <Box sx={{ p: 2 }}>
                {/* Status + platform badges */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
                  <Box sx={{ px: 1.2, py: 0.3, borderRadius: '6px', bgcolor: isPosted ? `${GBRI}22` : `${GREEN}22`, border: `1px solid ${isPosted ? `${GBRI}40` : `${GREEN}40`}` }}>
                    <Typography sx={{ fontFamily: MONO, fontSize: '10px', fontWeight: 600, color: isPosted ? GBRI : GREEN, letterSpacing: '0.4px' }}>
                      {isPosted ? '✓ Posted' : post?.status === 'ready_to_post' ? 'Ready' : post ? 'Needs Review' : 'Pending'}
                    </Typography>
                  </Box>
                  {['Instagram', 'Facebook'].map(pl => (
                    <Box key={pl} sx={{ px: 1, py: 0.3, borderRadius: '6px', border: `1px solid ${BORD}` }}>
                      <Typography sx={{ fontFamily: MONO, fontSize: '10px', color: MUTED }}>{pl}</Typography>
                    </Box>
                  ))}
                </Box>

                {/* Caption */}
                {post?.caption ? (
                  <Box sx={{ mb: 1.5 }}>
                    <Typography sx={{ fontFamily: FONT, fontSize: '13px', color: TEXT, lineHeight: 1.65 }}>
                      {captionExpanded || post.caption.length <= 110 ? post.caption : `${post.caption.slice(0, 110)}...`}
                    </Typography>
                    {post.caption.length > 110 && (
                      <Typography onClick={() => setCaptionExp(v => !v)}
                        sx={{ fontFamily: FONT, fontSize: '12px', color: GREEN, fontWeight: 600, cursor: 'pointer', mt: 0.5, display: 'inline-block' }}>
                        {captionExpanded ? 'Show less' : 'Read more'}
                      </Typography>
                    )}
                  </Box>
                ) : (
                  <Typography sx={{ fontFamily: FONT, fontSize: '13px', color: MUTED, py: 2, textAlign: 'center' }}>
                    Post not yet generated for this day.
                  </Typography>
                )}

                {/* Hashtags */}
                {(post?.hashtags?.length ?? 0) > 0 && (
                  <Typography sx={{ fontFamily: MONO, fontSize: '11px', color: ACCENTS[activeIdx % 4], mb: 2, wordBreak: 'break-word' }}>
                    {post!.hashtags.map(h => `#${h}`).join(' ')}
                  </Typography>
                )}

                {/* Download / Share */}
                <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
                  <Button disabled={!post} onClick={() => post && onDownload(post)}
                    startIcon={<FileDownload sx={{ fontSize: 16 }} />}
                    sx={{ flex: 1, bgcolor: 'rgba(255,255,255,0.06)', color: TEXT, borderRadius: '12px', textTransform: 'none', fontFamily: FONT, fontSize: '13px', fontWeight: 600, py: 1.1, border: `1px solid ${BORD}`, '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}>
                    Download
                  </Button>
                  <Button disabled={!post} onClick={() => post && onShare(post)}
                    startIcon={<IosShare sx={{ fontSize: 16 }} />}
                    sx={{ flex: 1, bgcolor: GREEN, color: '#fff', borderRadius: '12px', textTransform: 'none', fontFamily: FONT, fontSize: '13px', fontWeight: 700, py: 1.1, boxShadow: `0 4px 18px ${GREEN}44`, '&:hover': { bgcolor: '#0a5a45' } }}>
                    Share
                  </Button>
                </Box>

                {/* Regenerate */}
                {post && !isPosted && (
                  (post.regenCount ?? 0) >= 2 ? (
                    <Box sx={{ mb: 1.5, p: 1.2, borderRadius: '10px', bgcolor: 'rgba(255,255,255,0.04)', border: `1px solid ${BORD}`, textAlign: 'center' }}>
                      <Typography sx={{ fontFamily: FONT, fontSize: '12px', color: MUTED }}>
                        Regeneration limit reached for today.
                      </Typography>
                    </Box>
                  ) : (
                    <Button fullWidth onClick={() => { setRegenError(''); setRegenModal(true); }} sx={{
                      mb: 1.5, bgcolor: 'rgba(255,80,80,0.08)', color: '#FF6B6B',
                      border: '1px solid rgba(255,80,80,0.2)', borderRadius: '12px',
                      textTransform: 'none', fontFamily: FONT, fontSize: '13px', fontWeight: 600, py: 1.1,
                      '&:hover': { bgcolor: 'rgba(255,80,80,0.14)' },
                    }}>
                      Regenerate ({2 - (post.regenCount ?? 0)} left)
                    </Button>
                  )
                )}

                {/* Mark as posted */}
                <Button fullWidth disabled={!post || isPosted || marking} onClick={handleMark} sx={{
                  bgcolor: isPosted ? `${GBRI}18` : 'rgba(255,255,255,0.04)',
                  color: isPosted ? GBRI : MUTED,
                  border: `1px solid ${isPosted ? `${GBRI}40` : BORD}`,
                  borderRadius: '12px', textTransform: 'none', fontFamily: FONT, fontSize: '13px', fontWeight: 600, py: 1.3,
                  transition: 'all 0.2s',
                  '&:hover:not(:disabled)': { bgcolor: `${GREEN}18`, color: GREEN, borderColor: `${GREEN}45` },
                }}>
                  {marking ? <CircularProgress size={16} sx={{ color: GREEN }} /> : isPosted ? '✓ Marked as posted' : 'Mark as posted'}
                </Button>

                {/* Regen modal — only mounted when open to prevent scroll side-effects */}
                {regenModalOpen && <Dialog open={regenModalOpen} onClose={() => !regenerating && setRegenModal(false)}
                  PaperProps={{ sx: { borderRadius: '18px', bgcolor: CARD, border: `1px solid ${BORD}`, p: 0.5, m: 2 } }}>
                  <DialogTitle sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '16px', color: TEXT }}>
                    Why regenerate this post?
                  </DialogTitle>
                  <DialogContent>
                    <Typography sx={{ fontFamily: FONT, fontSize: '13px', color: MUTED, mb: 2 }}>
                      Your feedback helps the AI improve the next version. {2 - (post?.regenCount ?? 0)} regeneration{2 - (post?.regenCount ?? 0) === 1 ? '' : 's'} remaining today.
                    </Typography>
                    <TextField autoFocus fullWidth multiline rows={3} size="small"
                      placeholder="e.g. Too much text, wrong colour, mention malaria instead..."
                      value={regenReason}
                      onChange={e => { setRegenReason(e.target.value); setRegenError(''); }}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', fontSize: '13px', bgcolor: '#0F1C17', color: TEXT, '& fieldset': { borderColor: BORD }, '&:hover fieldset': { borderColor: GREEN }, '&.Mui-focused fieldset': { borderColor: GREEN } }, '& .MuiInputBase-input': { color: TEXT } }}
                    />
                    {regenError && (
                      <Typography sx={{ fontFamily: FONT, fontSize: '12px', color: '#FF6B6B', mt: 1 }}>{regenError}</Typography>
                    )}
                  </DialogContent>
                  <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
                    <Button onClick={() => { setRegenModal(false); setRegenReason(''); setRegenError(''); }}
                      disabled={regenerating}
                      sx={{ color: MUTED, textTransform: 'none', fontFamily: FONT, fontWeight: 600 }}>
                      Cancel
                    </Button>
                    <Button
                      disabled={!regenReason.trim() || regenerating}
                      onClick={async () => {
                        if (!post || !regenReason.trim()) return;
                        setRegenerating(true);
                        try {
                          await onRegenerate(post._id, regenReason);
                          setRegenModal(false);
                          setRegenReason('');
                        } catch (err: any) {
                          setRegenError(err?.response?.data?.message || 'Regeneration failed. Please try again.');
                        } finally {
                          setRegenerating(false);
                        }
                      }}
                      sx={{ bgcolor: '#c0392b', color: '#fff', textTransform: 'none', fontFamily: FONT, fontWeight: 700, borderRadius: '10px', px: 2.5, '&:hover': { bgcolor: '#922b21' }, '&:disabled': { opacity: 0.5 } }}>
                      {regenerating ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : 'Regenerate Post'}
                    </Button>
                  </DialogActions>
                </Dialog>}
              </Box>
            </Box>
          </motion.div>
        </AnimatePresence>
      </Box>

      {/* Post navigation arrows */}
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1.5, mb: 3.5 }}>
        <IconButton disabled={activeIdx === 0} onClick={() => navigateTo(activeIdx - 1)}
          sx={{ bgcolor: CARD, color: activeIdx === 0 ? 'rgba(255,255,255,0.14)' : TEXT, borderRadius: '12px', border: `1px solid ${BORD}` }}>
          <ChevronLeft />
        </IconButton>
        <Typography sx={{ fontFamily: MONO, fontSize: '12px', color: MUTED, minWidth: 40, textAlign: 'center' }}>
          {activeIdx + 1} / {Math.max(posts.length, 4)}
        </Typography>
        <IconButton disabled={activeIdx >= 3} onClick={() => navigateTo(activeIdx + 1)}
          sx={{ bgcolor: CARD, color: activeIdx >= 3 ? 'rgba(255,255,255,0.14)' : TEXT, borderRadius: '12px', border: `1px solid ${BORD}` }}>
          <ChevronRight />
        </IconButton>
      </Box>

      <LockedSection />
    </motion.div>
  );
}

// ── State 4 — Complete ────────────────────────────────────────────────────────
function CompleteScreen({ posts, onBack }: { posts: DailyPost[]; onBack: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
      style={{ minHeight: '100vh', background: BG, padding: '52px 24px 48px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
    >
      <motion.div
        animate={{ y: [0, -14, 0] }}
        transition={{ duration: 1.1, repeat: Infinity, type: 'spring', stiffness: 110 }}
        style={{ fontSize: 68, marginBottom: 20 }}
      >🏆</motion.div>

      <Typography sx={{ fontFamily: FONT, fontSize: '34px', fontWeight: 800, color: TEXT, mb: 0.5, textAlign: 'center', lineHeight: 1.1 }}>
        Perfect <span style={{ color: GREEN }}>week.</span>
      </Typography>
      <Typography sx={{ fontFamily: FONT, fontSize: '14px', color: MUTED, mb: 4, textAlign: 'center' }}>
        All 4 posts published this week
      </Typography>

      {/* Summary card */}
      <Box sx={{ width: '100%', bgcolor: CARD, borderRadius: '20px', border: `1px solid ${BORD}`, overflow: 'hidden', mb: 3 }}>
        {posts.slice(0, 4).map((p, i) => (
          <Box key={p._id} sx={{
            display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.5,
            borderBottom: i < Math.min(posts.length, 4) - 1 ? `1px solid ${BORD}` : 'none',
          }}>
            <Box sx={{ width: 38, height: 38, borderRadius: '10px', flexShrink: 0, background: GRADIENTS[i % 4], display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography sx={{ fontSize: '18px' }}>{ICONS[i % 4]}</Typography>
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontFamily: FONT, fontSize: '13px', fontWeight: 600, color: TEXT }}>{LABELS[i % 4]}</Typography>
              <Typography sx={{ fontFamily: MONO, fontSize: '10px', color: MUTED }}>{fmtDay(p.scheduledDate)}</Typography>
            </Box>
            <CheckCircle sx={{ color: GBRI, fontSize: 20 }} />
          </Box>
        ))}
      </Box>

      {/* Notice */}
      <Box sx={{ width: '100%', p: 1.5, borderRadius: '12px', mb: 3, bgcolor: `${GREEN}18`, border: `1px solid ${GREEN}35`, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography sx={{ fontSize: '16px' }}>🗓️</Typography>
        <Typography sx={{ fontFamily: FONT, fontSize: '13px', color: GREEN }}>
          Next week's posts arrive Monday
        </Typography>
      </Box>

      <Button fullWidth onClick={onBack} sx={{
        bgcolor: CARD, color: TEXT, borderRadius: '14px',
        textTransform: 'none', fontFamily: FONT, fontWeight: 600, fontSize: '14px',
        py: 1.6, border: `1px solid ${BORD}`, '&:hover': { bgcolor: '#1e2f28' },
      }}>
        Back to dashboard
      </Button>
    </motion.div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function SocialContent() {
  const { user } = useSession();

  const [appState,   setAppState]   = useState<AppState>('loading');
  const [activePlan, setActivePlan] = useState<any>(null);
  const [tone,       setTone]       = useState('warm');
  const [showPrices, setShowPrices] = useState('yes');
  const [genStep,    setGenStep]    = useState(0);
  const [weekOffset, setWeekOffset] = useState(0);
  const [posts,      setPosts]      = useState<DailyPost[]>([]);

  const pharmacyName = user?.businessName || 'Pharmacy';
  const pharmacyUrl  = user?.username ? `pharmastackx.com/${user.username}` : 'pharmastackx.com';

  const fetchWeek = useCallback(async (offset: number) => {
    if (!user?._id) return null;
    const base = getMondayLocal(new Date());
    base.setDate(base.getDate() + offset * 7);
    const res = await axios.get(`/api/social/manage?pharmacyId=${user._id}&date=${toYMD(base)}`);
    return res.data as { activePlan: any; weekPosts: DailyPost[] };
  }, [user?._id]);

  // Initial load
  useEffect(() => {
    if (!user?._id) return;
    fetchWeek(0).then(data => {
      if (!data) { setAppState('onboarding'); return; }
      const wp: DailyPost[] = data.weekPosts || [];
      setPosts(wp);
      setActivePlan(data.activePlan);
      if (!data.activePlan) {
        setAppState('onboarding');
      } else if (wp.length >= 4 && wp.every(p => p.status === 'posted')) {
        setAppState('complete');
      } else {
        setAppState('active');
      }
    }).catch(() => setAppState('onboarding'));
  }, [user?._id]);

  // Week navigation re-fetch
  const [prevOffset, setPrevOffset] = useState(0);
  useEffect(() => {
    if (appState !== 'active' || weekOffset === prevOffset) return;
    setPrevOffset(weekOffset);
    fetchWeek(weekOffset).then(data => {
      if (data) setPosts(data.weekPosts || []);
    });
  }, [weekOffset, appState]);

  const handleGeneratePlan = async () => {
    setAppState('generating');
    setGenStep(0);
    // Request push permission in background — does not block the UI
    if (user?._id) requestAndSavePush(user._id).catch(console.warn);

    // Steps 1,2,4,5 animate on a timer; step 3 (images) waits for real API progress
    const stepDelays = [700, 1100, 0, 1400, 700]; // step 3 duration is real
    setTimeout(() => setGenStep(1), 700);
    setTimeout(() => setGenStep(2), 1800);

    try {
      const monday = getMondayLocal(new Date());

      // Step 1+2: generate plan + captions (fast, ~10s)
      const planRes = await axios.post('/api/social/generate-plan', {
        pharmacyId: user!._id,
        date:       toYMD(monday),
        tone,
        showPrices: showPrices === 'yes',
      });

      const postIds: string[] = planRes.data.postIds || [];

      // Step 3: generate images in parallel (one serverless call per post)
      setGenStep(3);
      await Promise.allSettled(
        postIds.map(id => axios.post('/api/social/generate-image', { postId: id }))
      );

      // Step 4+5: wrap up
      setGenStep(4);
      await new Promise(r => setTimeout(r, 800));
      setGenStep(5);
      await new Promise(r => setTimeout(r, 600));

      const data = await fetchWeek(0);
      if (data) { setPosts(data.weekPosts || []); setActivePlan(data.activePlan); }
    } catch (e) {
      console.error(e);
    }

    setAppState('active');
  };

  const handleMarkAsPosted = async (postId: string) => {
    await axios.put('/api/social/manage', { postId, status: 'posted' });
    const updated = posts.map(p => p._id === postId ? { ...p, status: 'posted' as const } : p);
    setPosts(updated);
    if (updated.length >= 4 && updated.every(p => p.status === 'posted')) {
      setTimeout(() => setAppState('complete'), 700);
    }
  };

  const handleRegenerate = async (postId: string, reason: string) => {
    const res = await axios.post('/api/social/regenerate-post', { postId, reason });
    const updated = res.data.post as DailyPost;
    setPosts(prev => prev.map(p => p._id === postId ? { ...p, ...updated } : p));
  };

  const handleDownload = (post: DailyPost) => {
    if (!post.imageUrl) return;
    const a = document.createElement('a');
    a.href = post.imageUrl; a.download = 'social-post.jpg'; a.click();
  };

  const handleShare = async (post: DailyPost) => {
    const text = `${post.caption}\n\n${(post.hashtags || []).map(h => `#${h}`).join(' ')}`;
    try {
      if (post.imageUrl && navigator.canShare) {
        const r = await fetch(post.imageUrl);
        const blob = await r.blob();
        const file = new File([blob], 'post.jpg', { type: 'image/jpeg' });
        if (navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text }); return; }
      }
      await navigator.share({ text });
    } catch { navigator.clipboard.writeText(text).catch(() => {}); }
  };

  if (appState === 'loading') {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress sx={{ color: GREEN }} />
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: BG, minHeight: '100vh' }}>
      <AnimatePresence mode="wait">
        {appState === 'onboarding' && (
          <OnboardingScreen key="ob"
            tone={tone} setTone={setTone}
            showPrices={showPrices} setShowPrices={setShowPrices}
            onStart={handleGeneratePlan}
          />
        )}
        {appState === 'generating' && (
          <GeneratingScreen key="gen" currentStep={genStep} />
        )}
        {appState === 'active' && (
          <ActiveWeekView key="active"
            posts={posts}
            weekOffset={weekOffset}
            onWeekChange={setWeekOffset}
            onMarkAsPosted={handleMarkAsPosted}
            onDownload={handleDownload}
            onShare={handleShare}
            onRegenerate={handleRegenerate}
            pharmacyName={pharmacyName}
            pharmacyUrl={pharmacyUrl}
          />
        )}
        {appState === 'complete' && (
          <CompleteScreen key="complete"
            posts={posts}
            onBack={() => { setWeekOffset(1); setAppState('active'); }}
          />
        )}
      </AnimatePresence>
    </Box>
  );
}
