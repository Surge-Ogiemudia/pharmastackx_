'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import { CheckCircle, TwoWheeler, PhoneInTalk, ErrorOutline, Store } from '@mui/icons-material';

type Step =
  | 'payment_confirmed'
  | 'notifying_pharmacist'
  | 'notifying_rider'
  | 'rider_waiting'
  | 'rider_confirmed'
  | 'pickup_ready'
  | 'failed';

interface Props {
  requestId: string;
  deliveryOption: 'standard' | 'express' | 'pickup';
  deliveryState: string;
  patientName: string;
  total: number;
  items: { name: string; qty: number; price: number }[];
  onDone: () => void;
}

const POLL_INTERVAL_MS = 4000;
const MAX_POLL_MS = 90_000;

export default function PostPaymentFlow({ requestId, deliveryOption, deliveryState, patientName, total, items, onDone }: Props) {
  const [step, setStep] = useState<Step>('payment_confirmed');
  const [agentCount, setAgentCount] = useState(0);
  const [agentName, setAgentName] = useState('');
  const [agentPhone, setAgentPhone] = useState('');
  const [failReason, setFailReason] = useState('');
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const pollStartRef = useRef(0);
  const didRunRef = useRef(false);

  const stopPolling = () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };

  const startPolling = (reqId: string) => {
    pollStartRef.current = Date.now();
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/delivery-status?requestId=${reqId}`);
        const data = await res.json();
        if (data.status === 'confirmed') {
          stopPolling();
          setAgentName(data.agentName);
          setAgentPhone(data.agentPhone);
          setStep('rider_confirmed');
        } else if (Date.now() - pollStartRef.current > MAX_POLL_MS) {
          stopPolling();
        }
      } catch { /* keep polling */ }
    }, POLL_INTERVAL_MS);
  };

  useEffect(() => {
    if (didRunRef.current) return;
    didRunRef.current = true;

    // Step 1 → Step 2 after 1s
    const t1 = setTimeout(() => setStep('notifying_pharmacist'), 1000);

    // Step 2 → Step 3 after 2.5s, then trigger backend calls
    const t2 = setTimeout(async () => {
      if (deliveryOption === 'pickup') {
        setStep('pickup_ready');
      } else {
        setStep('notifying_rider');
      }

      // Fire admin notification (fire-and-forget)
      fetch('/api/notify-purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientName, deliveryState, deliveryOption, total, items, requestId }),
      }).catch(console.error);

      // Fire delivery agent notification (only if delivery)
      if (deliveryOption !== 'pickup') {
        try {
          const res = await fetch('/api/notify-delivery-agent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requestId }),
          });
          const data = await res.json();
          if (!res.ok) {
            setFailReason(friendlyError(data.error || ''));
            setStep('failed');
          } else {
            setAgentCount(data.dispatched ?? 0);
            setStep('rider_waiting');
            startPolling(requestId);
          }
        } catch {
          setFailReason("Couldn't reach our delivery network. Your order is saved — we'll follow up.");
          setStep('failed');
        }
      }
    }, 2500);

    return () => { clearTimeout(t1); clearTimeout(t2); stopPolling(); };
  }, []);

  return (
    <Box sx={{
      position: 'fixed', inset: 0,
      bgcolor: 'rgba(255,255,255,0.98)',
      zIndex: 2000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      p: 3,
    }}>
      <Box sx={{ maxWidth: 400, width: '100%', textAlign: 'center' }}>
        {step === 'payment_confirmed' && <StepView icon={<CheckCircle sx={{ fontSize: 64, color: '#0F6E56' }} />} title="Payment confirmed!" subtitle="Your payment was received successfully." spinning={false} />}
        {step === 'notifying_pharmacist' && <StepView icon={<CheckCircle sx={{ fontSize: 64, color: '#0F6E56' }} />} title="Notifying your pharmacist..." subtitle="Letting them know your order is confirmed." spinning={true} />}
        {step === 'notifying_rider' && <StepView icon={<TwoWheeler sx={{ fontSize: 64, color: '#0F6E56' }} />} title="Contacting a rider..." subtitle={`Finding a rider in ${deliveryState || 'your area'}. You will receive a call shortly.`} spinning={true} />}
        {step === 'rider_waiting' && <WaitingView agentCount={agentCount} onLeave={onDone} />}
        {step === 'rider_confirmed' && <ConfirmedView agentName={agentName} agentPhone={agentPhone} onDone={onDone} />}
        {step === 'pickup_ready' && <PickupView onDone={onDone} />}
        {step === 'failed' && <FailedView reason={failReason} onDone={onDone} />}
      </Box>
    </Box>
  );
}

function StepView({ icon, title, subtitle, spinning }: { icon: React.ReactNode; title: string; subtitle: string; spinning: boolean }) {
  return (
    <Box>
      <Box sx={{ position: 'relative', display: 'inline-flex', mb: 3 }}>
        {spinning && <CircularProgress size={88} thickness={2} sx={{ color: '#0F6E56', position: 'absolute', top: -12, left: -12 }} />}
        {icon}
      </Box>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, fontFamily: 'var(--font-sora)' }}>{title}</Typography>
      <Typography variant="body2" color="text.secondary">{subtitle}</Typography>
    </Box>
  );
}

function WaitingView({ agentCount, onLeave }: { agentCount: number; onLeave: () => void }) {
  return (
    <Box>
      <Box sx={{ width: 80, height: 80, borderRadius: '50%', bgcolor: '#e8f5e9', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 3, animation: 'pulse 1.8s ease-in-out infinite', '@keyframes pulse': { '0%,100%': { transform: 'scale(1)' }, '50%': { transform: 'scale(1.08)' } } }}>
        <TwoWheeler sx={{ fontSize: 38, color: '#0F6E56' }} />
      </Box>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Rider contacted!</Typography>
      {agentCount > 0 && <Typography variant="caption" sx={{ display: 'block', color: '#0F6E56', fontWeight: 600, mb: 1 }}>{agentCount} rider{agentCount > 1 ? 's' : ''} notified via WhatsApp</Typography>}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>You will receive a call shortly once a rider accepts.</Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 4 }}>You can leave — we'll notify you when a rider confirms.</Typography>
      <button onClick={onLeave} style={{ width: '100%', padding: '14px', background: '#0F6E56', color: 'white', border: 'none', borderRadius: '14px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>
        Go to my orders
      </button>
    </Box>
  );
}

function ConfirmedView({ agentName, agentPhone, onDone }: { agentName: string; agentPhone: string; onDone: () => void }) {
  return (
    <Box>
      <Box sx={{ width: 80, height: 80, borderRadius: '50%', bgcolor: '#e8f5e9', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 3 }}>
        <CheckCircle sx={{ fontSize: 48, color: '#0F6E56' }} />
      </Box>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>Rider confirmed!</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>Your delivery is on the way.</Typography>
      <Box sx={{ border: '1.5px solid #0F6E56', borderRadius: '16px', p: 2.5, mb: 4, textAlign: 'left', bgcolor: '#f7fbfa' }}>
        <Typography variant="caption" sx={{ color: '#0F6E56', fontWeight: 700, textTransform: 'uppercase' }}>Your Rider</Typography>
        <Typography variant="h6" sx={{ fontWeight: 700, mt: 0.5, mb: 0.5 }}>{agentName}</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PhoneInTalk sx={{ fontSize: 16, color: '#0F6E56' }} />
          <Typography variant="body2" sx={{ fontWeight: 600 }}>{agentPhone}</Typography>
        </Box>
      </Box>
      <button onClick={onDone} style={{ width: '100%', padding: '14px', background: '#0F6E56', color: 'white', border: 'none', borderRadius: '14px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>
        View my orders
      </button>
    </Box>
  );
}

function PickupView({ onDone }: { onDone: () => void }) {
  return (
    <Box>
      <Box sx={{ width: 80, height: 80, borderRadius: '50%', bgcolor: '#e8f5e9', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 3 }}>
        <Store sx={{ fontSize: 44, color: '#0F6E56' }} />
      </Box>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>You're all set!</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>Your pharmacist has been notified. Head to the pharmacy to pick up your order.</Typography>
      <button onClick={onDone} style={{ width: '100%', padding: '14px', background: '#0F6E56', color: 'white', border: 'none', borderRadius: '14px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>
        View my orders
      </button>
    </Box>
  );
}

function FailedView({ reason, onDone }: { reason: string; onDone: () => void }) {
  return (
    <Box>
      <Box sx={{ width: 80, height: 80, borderRadius: '50%', bgcolor: '#fff3f3', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 3 }}>
        <ErrorOutline sx={{ fontSize: 44, color: '#d32f2f' }} />
      </Box>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Couldn't reach a rider</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4, lineHeight: 1.6 }}>{reason}</Typography>
      <button onClick={onDone} style={{ width: '100%', padding: '14px', background: '#0F6E56', color: 'white', border: 'none', borderRadius: '14px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>
        Go to my orders
      </button>
    </Box>
  );
}

function friendlyError(raw: string): string {
  if (raw.includes('No accepted quote')) return "We couldn't find a confirmed pharmacy quote. Our team will assign a rider manually.";
  if (raw.includes('Missing coordinates')) return "We couldn't locate your pharmacy's pickup point. Our team will assign a rider manually.";
  if (raw.includes('No delivery agents')) return "No riders are registered in your area yet. We'll assign one and notify you.";
  return "Something went wrong reaching our delivery network. Your order is saved and our team will follow up.";
}
