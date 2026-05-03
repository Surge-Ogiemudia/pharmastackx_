'use client';
import { useState } from 'react';
import SubscribeForm from './SubscribeForm';

export default function SubscribeModal() {
    const [open, setOpen] = useState(false);

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                style={{
                    background: 'transparent',
                    border: '1.5px solid #0f6e56',
                    color: '#0f6e56',
                    padding: '7px 18px',
                    borderRadius: '20px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                }}
            >
                Subscribe
            </button>

            {open && (
                <div
                    onClick={() => setOpen(false)}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 1000,
                        background: 'rgba(0,0,0,0.45)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '20px',
                    }}
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        style={{
                            background: '#fff',
                            borderRadius: '24px',
                            padding: '32px',
                            width: '100%',
                            maxWidth: '460px',
                            position: 'relative',
                        }}
                    >
                        <button
                            onClick={() => setOpen(false)}
                            style={{
                                position: 'absolute', top: '16px', right: '16px',
                                background: 'rgba(0,0,0,0.06)', border: 'none',
                                borderRadius: '50%', width: '32px', height: '32px',
                                cursor: 'pointer', fontSize: '16px', color: '#555',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                        >
                            ×
                        </button>
                        <SubscribeForm onSuccess={() => setOpen(false)} />
                    </div>
                </div>
            )}
        </>
    );
}
