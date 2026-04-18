'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogContent,
  CircularProgress,
  Chip,
} from '@mui/material';
import {
  CheckCircle,
  ErrorOutline,
  TwoWheeler,
  PhoneInTalk,
  HourglassTop,
} from '@mui/icons-material';

type DeliveryStatus =
  | { type: 'notifying' }
  | { type: 'waiting'; agentCount: number }
  | { type: 'confirmed'; agentName: string; agentPhone: string }
  | { type: 'failed'; reason: string };

const FRIENDLY_ERRORS: Record<string, string> = {
  'No accepted quote': "We couldn't find a confirmed pharmacy quote linked to this order. Please contact support.",
  'Missing coordinates for pickup': "We couldn't locate your pharmacy's pickup point. Our team will assign a rider manually.",
  'No delivery agents available in state': "No riders are registered in your area yet. We'll assign one manually and notify you.",
  'No active delivery agents available': "All nearby riders are currently offline. We'll notify you as soon as one becomes available.",
};

function mapError(raw: string): string {
  for (const [key, msg] of Object.entries(FRIENDLY_ERRORS)) {
    if (raw.includes(key)) return msg;
  }
  return "Something went wrong reaching our delivery network. Your order is saved and our team will follow up.";
}

const POLL_INTERVAL_MS = 4000;
const MAX_POLL_MS = 90_000;

interface Props {
  open: boolean;
  requestId: string;
  onDone: () => void;
}

export default function DeliveryStatusModal({ open, requestId, onDone }: Props) {
  const [status, setStatus] = useState<DeliveryStatus>({ type: 'notifying' });
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const pollStartRef = useRef<number>(0);
  const didNotifyRef = useRef(false);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const startPolling = (reqId: string) => {
    pollStartRef.current = Date.now();
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/delivery-status?requestId=${reqId}`);
        const data = await res.json();

        if (data.status === 'confirmed') {
          stopPolling();
          setStatus({ type: 'confirmed', agentName: data.agentName, agentPhone: data.agentPhone });
        } else if (Date.now() - pollStartRef.current > MAX_POLL_MS) {
          stopPolling();
        }
      } catch {
        // silent — keep polling
      }
    }, POLL_INTERVAL_MS);
  };

  useEffect(() => {
    if (!open || !requestId || didNotifyRef.current) return;
    didNotifyRef.current = true;

    const notify = async () => {
      try {
        const res = await fetch('/api/notify-delivery-agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requestId }),
        });
        const data = await res.json();

        if (!res.ok) {
          setStatus({ type: 'failed', reason: mapError(data.error || '') });
        } else {
          setStatus({ type: 'waiting', agentCount: data.dispatched ?? 0 });
          startPolling(requestId);
        }
      } catch {
        setStatus({ type: 'failed', reason: "Couldn't connect to our delivery network. Your order is saved — we'll follow up." });
      }
    };

    notify();

    return () => {
      stopPolling();
    };
  }, [open, requestId]);

  useEffect(() => {
    if (!open) {
      stopPolling();
      didNotifyRef.current = false;
      setStatus({ type: 'notifying' });
    }
  }, [open]);

  return (
    <Dialog
      open={open}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '24px',
          overflow: 'hidden',
          background: '#fff',
        },
      }}
    >
      <DialogContent sx={{ p: 0 }}>
        {status.type === 'notifying' && <NotifyingView />}
        {status.type === 'waiting' && <WaitingView agentCount={status.agentCount} onLeave={onDone} />}
        {status.type === 'confirmed' && <ConfirmedView agentName={status.agentName} agentPhone={status.agentPhone} onDone={onDone} />}
        {status.type === 'failed' && <FailedView reason={status.reason} onDone={onDone} />}
      </DialogContent>
    </Dialog>
  );
}

/* ─── Notifying ─── */
function NotifyingView() {
  return (
    <Box sx={{ p: 5, textAlign: 'center' }}>
      <Box sx={{ position: 'relative', display: 'inline-flex', mb: 3 }}>
        <CircularProgress size={80} thickness={2} sx={{ color: '#006D5B' }} />
        <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <TwoWheeler sx={{ fontSize: 34, color: '#006D5B' }} />
        </Box>
      </Box>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: '#1a1a1a' }}>
        Finding your rider
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Connecting to our delivery network...
      </Typography>
    </Box>
  );
}

/* ─── Waiting ─── */
function WaitingView({ agentCount, onLeave }: { agentCount: number; onLeave: () => void }) {
  return (
    <Box sx={{ p: 5, textAlign: 'center' }}>
      <Box
        sx={{
          width: 80, height: 80, borderRadius: '50%',
          bgcolor: '#e8f5e9', display: 'flex', alignItems: 'center',
          justifyContent: 'center', mx: 'auto', mb: 3,
          animation: 'pulse 1.8s ease-in-out infinite',
          '@keyframes pulse': {
            '0%, 100%': { transform: 'scale(1)', opacity: 1 },
            '50%': { transform: 'scale(1.08)', opacity: 0.85 },
          },
        }}
      >
        <HourglassTop sx={{ fontSize: 38, color: '#006D5B' }} />
      </Box>

      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: '#1a1a1a' }}>
        Riders have been contacted!
      </Typography>

      {agentCount > 0 && (
        <Chip
          label={`${agentCount} rider${agentCount > 1 ? 's' : ''} notified via WhatsApp`}
          size="small"
          sx={{ bgcolor: '#e8f5e9', color: '#006D5B', fontWeight: 600, mb: 2 }}
        />
      )}

      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Waiting for a rider to confirm your delivery.
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 4 }}>
        You'll receive a notification once someone accepts.
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Button
          variant="contained"
          onClick={onLeave}
          sx={{
            background: 'linear-gradient(135deg, #006D5B, #004D40)',
            borderRadius: '12px',
            textTransform: 'none',
            fontWeight: 600,
            py: 1.3,
          }}
        >
          Go to my orders
        </Button>
        <Typography variant="caption" color="text.secondary">
          This page will update automatically if you stay
        </Typography>
      </Box>
    </Box>
  );
}

/* ─── Confirmed ─── */
function ConfirmedView({ agentName, agentPhone, onDone }: { agentName: string; agentPhone: string; onDone: () => void }) {
  return (
    <Box sx={{ p: 5, textAlign: 'center' }}>
      <Box
        sx={{
          width: 80, height: 80, borderRadius: '50%',
          bgcolor: '#e8f5e9', display: 'flex', alignItems: 'center',
          justifyContent: 'center', mx: 'auto', mb: 3,
        }}
      >
        <CheckCircle sx={{ fontSize: 48, color: '#006D5B' }} />
      </Box>

      <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5, color: '#1a1a1a' }}>
        Rider confirmed!
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Your delivery is on its way.
      </Typography>

      <Box
        sx={{
          border: '1.5px solid #006D5B',
          borderRadius: '16px',
          p: 2.5,
          mb: 4,
          textAlign: 'left',
          background: '#f7fbfa',
        }}
      >
        <Typography variant="caption" sx={{ color: '#006D5B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Your Rider
        </Typography>
        <Typography variant="h6" sx={{ fontWeight: 700, mt: 0.5, mb: 0.5 }}>
          {agentName}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PhoneInTalk sx={{ fontSize: 16, color: '#006D5B' }} />
          <Typography variant="body2" sx={{ fontWeight: 600 }}>{agentPhone}</Typography>
        </Box>
      </Box>

      <Button
        variant="contained"
        fullWidth
        onClick={onDone}
        sx={{
          background: 'linear-gradient(135deg, #006D5B, #004D40)',
          borderRadius: '12px',
          textTransform: 'none',
          fontWeight: 600,
          py: 1.3,
        }}
      >
        View my orders
      </Button>
    </Box>
  );
}

/* ─── Failed ─── */
function FailedView({ reason, onDone }: { reason: string; onDone: () => void }) {
  return (
    <Box sx={{ p: 5, textAlign: 'center' }}>
      <Box
        sx={{
          width: 80, height: 80, borderRadius: '50%',
          bgcolor: '#fff3f3', display: 'flex', alignItems: 'center',
          justifyContent: 'center', mx: 'auto', mb: 3,
        }}
      >
        <ErrorOutline sx={{ fontSize: 44, color: '#d32f2f' }} />
      </Box>

      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: '#1a1a1a' }}>
        Couldn't reach a rider
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4, lineHeight: 1.6 }}>
        {reason}
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Button
          variant="contained"
          onClick={onDone}
          sx={{
            background: 'linear-gradient(135deg, #006D5B, #004D40)',
            borderRadius: '12px',
            textTransform: 'none',
            fontWeight: 600,
            py: 1.3,
          }}
        >
          Go to my orders
        </Button>
        <Button
          variant="text"
          href="https://wa.me/2349000000000"
          target="_blank"
          sx={{ textTransform: 'none', color: '#006D5B', fontWeight: 600 }}
        >
          Contact support
        </Button>
      </Box>
    </Box>
  );
}
