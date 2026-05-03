'use client';
import { useState } from 'react';

export default function SubscribeForm() {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('loading');
        try {
            const res = await fetch('/api/pulse/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            const data = await res.json();
            if (res.ok) {
                setStatus('success');
                setMessage(data.message);
                setEmail('');
            } else {
                setStatus('error');
                setMessage(data.message);
            }
        } catch {
            setStatus('error');
            setMessage('Something went wrong. Please try again.');
        }
    };

    return (
        <div style={{
            background: '#fff',
            border: '1px solid rgba(15,110,86,0.15)',
            borderRadius: '20px',
            padding: '36px 32px',
            textAlign: 'center',
            margin: '48px 0',
        }}>
            <p style={{ fontSize: '11px', fontWeight: 700, color: '#0f6e56', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 10px' }}>
                Stay informed
            </p>
            <h2 style={{ fontFamily: 'var(--font-fraunces), serif', fontSize: 'clamp(20px, 4vw, 26px)', fontWeight: 900, color: '#1a1a1a', margin: '0 0 8px', letterSpacing: '-0.5px' }}>
                Get PSX Pulse in your inbox
            </h2>
            <p style={{ color: '#888', fontSize: '14px', margin: '0 0 24px', lineHeight: 1.5 }}>
                Pharmacist insights, drug trends, and health updates — delivered when it matters.
            </p>

            {status === 'success' ? (
                <div style={{ background: 'rgba(15,110,86,0.08)', borderRadius: '12px', padding: '16px 24px', display: 'inline-block' }}>
                    <p style={{ margin: 0, color: '#0f6e56', fontWeight: 700, fontSize: '15px' }}>✓ {message}</p>
                </div>
            ) : (
                <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '10px', maxWidth: '420px', margin: '0 auto', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        required
                        disabled={status === 'loading'}
                        style={{
                            flex: 1, minWidth: '200px',
                            padding: '12px 18px',
                            borderRadius: '12px',
                            border: '1.5px solid rgba(0,0,0,0.12)',
                            fontSize: '14px',
                            outline: 'none',
                            fontFamily: 'inherit',
                        }}
                    />
                    <button
                        type="submit"
                        disabled={status === 'loading'}
                        style={{
                            background: '#0f6e56',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '12px',
                            padding: '12px 24px',
                            fontSize: '14px',
                            fontWeight: 700,
                            cursor: status === 'loading' ? 'not-allowed' : 'pointer',
                            opacity: status === 'loading' ? 0.7 : 1,
                            fontFamily: 'inherit',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {status === 'loading' ? 'Sending…' : 'Subscribe'}
                    </button>
                    {status === 'error' && (
                        <p style={{ width: '100%', margin: '8px 0 0', color: '#e53935', fontSize: '13px' }}>{message}</p>
                    )}
                </form>
            )}
        </div>
    );
}
