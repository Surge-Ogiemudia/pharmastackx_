'use client';
import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, TextField, IconButton, CircularProgress, Chip } from '@mui/material';
import { Add, Delete, Save } from '@mui/icons-material';

const NIGERIAN_STATES = [
    'Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno',
    'Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','FCT','Gombe','Imo',
    'Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara','Lagos','Nasarawa',
    'Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto','Taraba','Yobe','Zamfara'
];

export default function TopContactsContent() {
    const [selectedState, setSelectedState] = useState('Lagos');
    const [contacts, setContacts] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState('');
    const [draft, setDraft] = useState({ name: '', phone: '', address: '', coordsInput: '' });
    const [coordsError, setCoordsError] = useState('');

    const parseCoordsInput = (raw: string): { lng: number; lat: number } | null => {
        const cleaned = raw.trim().replace(/[()]/g, '');
        const parts = cleaned.split(',').map(p => parseFloat(p.trim()));
        if (parts.length !== 2 || parts.some(isNaN)) return null;
        const [lat, lng] = parts; // Google Maps copies as "lat, lng"
        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
        return { lat, lng };
    };

    useEffect(() => {
        fetchContacts();
    }, [selectedState]);

    const fetchContacts = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/top-contacts?state=${encodeURIComponent(selectedState)}`);
            if (res.ok) {
                const data = await res.json();
                setContacts(data.contacts || []);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleAddContact = () => {
        setCoordsError('');
        if (!draft.name.trim() || !draft.phone.trim()) return;
        if (contacts.length >= 10) return;

        let phone = draft.phone.trim().replace(/\s+/g, '');
        if (phone.startsWith('0')) phone = '234' + phone.slice(1);
        if (phone.startsWith('+')) phone = phone.slice(1);

        let coordinates: number[] | undefined = undefined;
        if (draft.coordsInput.trim()) {
            const parsed = parseCoordsInput(draft.coordsInput);
            if (!parsed) {
                setCoordsError('Invalid coordinates. Paste directly from Google Maps (e.g. 6.5244, 3.3792)');
                return;
            }
            coordinates = [parsed.lng, parsed.lat]; // Store as [lng, lat] — GeoJSON
        }

        setContacts(prev => [...prev, {
            name: draft.name.trim(),
            phone,
            address: draft.address.trim(),
            coordinates,
            isActive: true
        }]);
        setDraft({ name: '', phone: '', address: '', coordsInput: '' });
        setCoordsError('');
    };

    const handleRemove = (index: number) => {
        setContacts(prev => prev.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        setSaving(true);
        setMsg('');
        try {
            const res = await fetch('/api/admin/top-contacts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ state: selectedState, contacts })
            });
            if (res.ok) {
                setMsg('Contacts saved.');
                setTimeout(() => setMsg(''), 3000);
            } else {
                setMsg('Failed to save.');
            }
        } catch (e) {
            setMsg('Network error.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Box sx={{ fontFamily: 'Sora, sans-serif', pb: 4 }}>
            <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                <span style={{ fontSize: '28px' }}>📱</span>
                <Box>
                    <Typography sx={{ fontSize: '20px', fontWeight: 800, color: '#1a1a1a' }}>Top Contacts</Typography>
                    <Typography sx={{ fontSize: '13px', color: '#888' }}>
                        Up to 10 WhatsApp contacts per state. These receive instant WhatsApp alerts on new requests.
                    </Typography>
                </Box>
                {msg && (
                    <Typography sx={{ ml: 'auto', fontSize: '12px', color: '#0F6E56', bgcolor: 'rgba(15,110,86,0.1)', px: 2, py: 0.5, borderRadius: '12px' }}>
                        ✓ {msg}
                    </Typography>
                )}
            </Box>

            {/* State selector */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
                {NIGERIAN_STATES.map(state => (
                    <Chip
                        key={state}
                        label={state}
                        onClick={() => setSelectedState(state)}
                        sx={{
                            fontSize: '11px',
                            height: '24px',
                            fontWeight: selectedState === state ? 700 : 400,
                            bgcolor: selectedState === state ? '#0F6E56' : 'rgba(0,0,0,0.06)',
                            color: selectedState === state ? '#fff' : '#444',
                            cursor: 'pointer',
                            '&:hover': { bgcolor: selectedState === state ? '#0B5E4A' : 'rgba(0,0,0,0.1)' }
                        }}
                    />
                ))}
            </Box>

            {/* Contact list */}
            <Box sx={{ bgcolor: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '16px', p: 2, mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography sx={{ fontSize: '14px', fontWeight: 700 }}>
                        {selectedState} — {contacts.length}/10 contacts
                    </Typography>
                    <Button
                        onClick={handleSave}
                        disabled={saving}
                        variant="contained"
                        startIcon={<Save />}
                        size="small"
                        sx={{ bgcolor: '#0F6E56', '&:hover': { bgcolor: '#0B5E4A' }, borderRadius: '8px', textTransform: 'none', fontWeight: 700, fontFamily: 'Sora, sans-serif' }}
                    >
                        {saving ? 'Saving...' : 'Save'}
                    </Button>
                </Box>

                {loading ? (
                    <Box sx={{ textAlign: 'center', py: 3 }}><CircularProgress size={24} sx={{ color: '#0F6E56' }} /></Box>
                ) : contacts.length === 0 ? (
                    <Typography sx={{ fontSize: '13px', color: '#888', fontStyle: 'italic', py: 2 }}>
                        No contacts for {selectedState} yet.
                    </Typography>
                ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {contacts.map((c, i) => (
                            <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1.5, bgcolor: 'rgba(0,0,0,0.02)', borderRadius: '10px' }}>
                                <Box sx={{ flex: 1 }}>
                                    <Typography sx={{ fontSize: '13px', fontWeight: 700 }}>{c.name}</Typography>
                                    <Typography sx={{ fontSize: '11px', color: '#888' }}>+{c.phone}</Typography>
                                    {c.address && (
                                        <Typography sx={{ fontSize: '11px', color: '#aaa' }}>📍 {c.address}</Typography>
                                    )}
                                    {c.coordinates && (
                                        <Typography sx={{ fontSize: '10px', color: '#0F6E56', fontFamily: 'monospace' }}>
                                            {c.coordinates[1].toFixed(4)}, {c.coordinates[0].toFixed(4)}
                                        </Typography>
                                    )}
                                </Box>
                                {c.userId && (
                                    <Chip label="App User" size="small" sx={{ fontSize: '10px', bgcolor: '#F0FDF4', color: '#166534' }} />
                                )}
                                <IconButton size="small" onClick={() => handleRemove(i)} sx={{ color: '#d32f2f' }}>
                                    <Delete fontSize="small" />
                                </IconButton>
                            </Box>
                        ))}
                    </Box>
                )}
            </Box>

            {contacts.length < 10 && (
                <Box sx={{ bgcolor: '#fff', border: '1px dashed #ccc', borderRadius: '16px', p: 2 }}>
                    <Typography sx={{ fontSize: '13px', fontWeight: 700, mb: 1.5 }}>Add Contact</Typography>

                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                        <TextField
                            size="small"
                            label="Name"
                            value={draft.name}
                            onChange={(e) => setDraft(prev => ({ ...prev, name: e.target.value }))}
                            sx={{ flex: 1, minWidth: 140 }}
                            InputProps={{ sx: { fontSize: '13px', fontFamily: 'Sora, sans-serif' } }}
                            InputLabelProps={{ sx: { fontSize: '13px', fontFamily: 'Sora, sans-serif' } }}
                        />
                        <TextField
                            size="small"
                            label="WhatsApp Number"
                            value={draft.phone}
                            onChange={(e) => setDraft(prev => ({ ...prev, phone: e.target.value }))}
                            sx={{ flex: 1, minWidth: 160 }}
                            InputProps={{ sx: { fontSize: '13px', fontFamily: 'Sora, sans-serif' } }}
                            InputLabelProps={{ sx: { fontSize: '13px', fontFamily: 'Sora, sans-serif' } }}
                        />
                    </Box>

                    <TextField
                        size="small"
                        label="Address (optional)"
                        value={draft.address}
                        onChange={(e) => setDraft(prev => ({ ...prev, address: e.target.value }))}
                        fullWidth
                        sx={{ mb: 1 }}
                        InputProps={{ sx: { fontSize: '13px', fontFamily: 'Sora, sans-serif' } }}
                        InputLabelProps={{ sx: { fontSize: '13px', fontFamily: 'Sora, sans-serif' } }}
                    />

                    <TextField
                        size="small"
                        label="Coordinates (paste from Google Maps)"
                        value={draft.coordsInput}
                        onChange={(e) => { setDraft(prev => ({ ...prev, coordsInput: e.target.value })); setCoordsError(''); }}
                        fullWidth
                        error={!!coordsError}
                        helperText={coordsError || 'Right-click any location on Google Maps → "Copy coordinates" → paste here'}
                        sx={{ mb: 1.5 }}
                        InputProps={{ sx: { fontSize: '13px', fontFamily: 'monospace' } }}
                        InputLabelProps={{ sx: { fontSize: '13px', fontFamily: 'Sora, sans-serif' } }}
                    />

                    <Button
                        onClick={handleAddContact}
                        disabled={!draft.name.trim() || !draft.phone.trim()}
                        variant="contained"
                        startIcon={<Add />}
                        sx={{
                            bgcolor: '#0F6E56',
                            '&:hover': { bgcolor: '#0B5E4A' },
                            '&.Mui-disabled': { bgcolor: '#eee' },
                            borderRadius: '8px',
                            textTransform: 'none',
                            fontWeight: 700,
                            fontFamily: 'Sora, sans-serif'
                        }}
                    >
                        Add Contact
                    </Button>
                </Box>
            )}
        </Box>
    );
}
