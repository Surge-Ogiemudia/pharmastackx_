'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, IconButton, TextField, Avatar, CircularProgress } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import MedicationIcon from '@mui/icons-material/Medication';
import { useSession } from '@/context/SessionProvider';

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'ai' | 'pharmacist';
    timestamp: Date;
}

export default function AskRxChat({ open, onClose }: { open: boolean, onClose: () => void }) {
    const { user } = useSession();
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState<'ai' | 'escalated' | 'resolved'>('ai');
    const [consultationId, setConsultationId] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Initial Load: Fetch existing consultation
    useEffect(() => {
        if (open && user) {
            fetchConsultation();
        }
    }, [open, user]);

    // Polling for pharmacist responses if escalated
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (open && status === 'escalated' && consultationId) {
            interval = setInterval(fetchConsultation, 5000);
        }
        return () => clearInterval(interval);
    }, [open, status, consultationId]);

    const fetchConsultation = async () => {
        try {
            const res = await fetch('/api/consultations');
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
                // Get the most recent active one
                const latest = data[0]; 
                setConsultationId(latest._id);
                setStatus(latest.status);
                setMessages(latest.messages.map((m: any, i: number) => ({
                    id: i.toString(),
                    text: m.text,
                    sender: m.sender,
                    timestamp: new Date(m.timestamp)
                })));
            } else if (messages.length === 0) {
                // Default first message if brand new
                setMessages([{ 
                    id: 'welcome', 
                    text: "Hi! I'm your Rx Expert. Ask me anything about your medications, side effects, or dosages.", 
                    sender: 'ai', 
                    timestamp: new Date() 
                }]);
            }
        } catch (err) {
            console.error("Fetch consultation err:", err);
        }
    };

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async () => {
        if (!inputValue.trim() || !user) return;

        const text = inputValue;
        setInputValue('');
        
        // Optimistic update
        const tempId = Date.now().toString();
        setMessages(prev => [...prev, { id: tempId, text, sender: 'user', timestamp: new Date() }]);
        setIsLoading(true);

        try {
            const res = await fetch('/api/ai/ask-rx', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text, userId: user._id || (user as any).id, consultationId })
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                console.error("AskRx API Error:", errorData);
                throw new Error(errorData.error || 'API request failed');
            }

            const data = await res.json();
            if (data.text) {
                setMessages(prev => [...prev, { 
                    id: Date.now().toString(), 
                    text: data.text, 
                    sender: 'ai', 
                    timestamp: new Date() 
                }]);
                if (data.status) setStatus(data.status);
                if (data.consultationId) setConsultationId(data.consultationId);
            } else {
                throw new Error('Empty response');
            }
        } catch (err) {
            console.error("Send err:", err);
            setMessages(prev => [...prev, { 
                id: Date.now().toString(), 
                text: "I'm having trouble connecting to my knowledge base right now. Please try again or wait for a pharmacist.", 
                sender: 'ai', 
                timestamp: new Date() 
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {open && (
                <Box
                    component={motion.div}
                    initial={{ opacity: 0, y: 20, scale: 0.9, transformOrigin: 'bottom right' }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.9 }}
                    sx={{
                        position: 'fixed',
                        bottom: { xs: 80, sm: 100 },
                        right: { xs: 16, sm: 24 },
                        width: { xs: 'calc(100% - 32px)', sm: 360 },
                        height: 500,
                        maxHeight: '70vh',
                        bgcolor: '#fff',
                        borderRadius: '24px',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
                        display: 'flex',
                        flexDirection: 'column',
                        zIndex: 2000,
                        overflow: 'hidden',
                        border: '1px solid rgba(0,0,0,0.05)'
                    }}
                >
                    {/* Header */}
                    <Box sx={{ p: 2, bgcolor: status === 'escalated' ? '#B45309' : '#0F6E56', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'background 0.3s' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 32, height: 32 }}>
                                {status === 'escalated' ? '👨‍⚕️' : <MedicationIcon sx={{ fontSize: 18 }} />}
                            </Avatar>
                            <Box>
                                <Typography sx={{ fontWeight: 800, fontSize: '14px', lineHeight: 1.2 }}>
                                    {status === 'escalated' ? 'Pharmacist' : 'Ask Rx'}
                                </Typography>
                                <Typography sx={{ fontSize: '10px', opacity: 0.8 }}>
                                    {status === 'escalated' ? 'Head Office Online' : 'Medicine Expert AI'}
                                </Typography>
                            </Box>
                        </Box>
                        <IconButton onClick={onClose} size="small" sx={{ color: '#fff' }}>
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    </Box>

                    {/* Chat Area */}
                    <Box 
                        ref={scrollRef} 
                        sx={{ 
                            flexGrow: 1, 
                            p: 2, 
                            overflowY: 'auto', 
                            display: 'flex', 
                            flexDirection: 'column', 
                            gap: 2, 
                            bgcolor: '#fafafa',
                            '&::-webkit-scrollbar': {
                                width: '6px',
                            },
                            '&::-webkit-scrollbar-track': {
                                background: '#f1f1f1',
                            },
                            '&::-webkit-scrollbar-thumb': {
                                background: '#0F6E56',
                                borderRadius: '10px',
                            },
                            '&::-webkit-scrollbar-thumb:hover': {
                                background: '#0B5E4A',
                            },
                        }}
                    >
                        {messages.map((m) => (
                            <Box 
                                key={m.id} 
                                sx={{ 
                                    alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
                                    maxWidth: '85%',
                                    p: 1.5,
                                    borderRadius: m.sender === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                                    bgcolor: m.sender === 'user' ? '#0F6E56' : (m.sender === 'pharmacist' ? '#FFFBEB' : '#fff'),
                                    color: m.sender === 'user' ? '#fff' : '#333',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                                    border: m.sender === 'user' ? 'none' : (m.sender === 'pharmacist' ? '1px solid #FDE68A' : '1px solid rgba(0,0,0,0.08)')
                                }}
                            >
                                {m.sender === 'pharmacist' && <Typography sx={{ fontSize: '10px', fontWeight: 700, color: '#B45309', mb: 0.5 }}>PHARMACIST</Typography>}
                                <Typography sx={{ fontSize: '13px', lineHeight: 1.5 }}>{m.text}</Typography>
                                <Typography sx={{ fontSize: '9px', opacity: 0.5, textAlign: 'right', mt: 0.5 }}>
                                    {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </Typography>
                            </Box>
                        ))}
                        {isLoading && (
                            <Box sx={{ alignSelf: 'flex-start', bgcolor: '#fff', p: 1.5, borderRadius: '16px 16px 16px 4px', border: '1px solid rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 1 }}>
                                <CircularProgress size={14} sx={{ color: '#0F6E56' }} />
                                <Typography sx={{ fontSize: '12px', color: '#666', fontWeight: 500 }}>Rx Expert is thinking...</Typography>
                            </Box>
                        )}
                        {status === 'escalated' && !isLoading && (
                            <Typography sx={{ fontSize: '11px', color: '#B45309', textAlign: 'center', p: 1, bgcolor: '#FFFBEB', borderRadius: '12px' }}>
                                A pharmacist has been notified and will respond here soon.
                            </Typography>
                        )}
                    </Box>

                    {/* Input Area */}
                    <Box sx={{ p: 2, bgcolor: '#fff', borderTop: '1px solid rgba(0,0,0,0.05)', display: 'flex', gap: 1 }}>
                        <TextField
                            fullWidth
                            variant="standard"
                            placeholder={!user ? "Login to chat..." : "Type a message..."}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                            disabled={!user || isLoading}
                            InputProps={{ disableUnderline: true, sx: { fontSize: '14px', px: 1 } }}
                        />
                        <IconButton 
                            onClick={handleSend} 
                            disabled={!inputValue.trim() || !user || isLoading}
                            sx={{ bgcolor: '#0F6E56', color: '#fff', '&:hover': { bgcolor: '#0B5E4A' }, '&.Mui-disabled': { bgcolor: '#eee' } }}
                        >
                            <SendIcon fontSize="small" />
                        </IconButton>
                    </Box>
                </Box>
            )}
        </AnimatePresence>
    );
}
