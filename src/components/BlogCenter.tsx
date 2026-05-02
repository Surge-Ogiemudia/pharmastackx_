import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    TextField,
    Button,
    CircularProgress,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    MenuItem,
    Chip
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import axios from 'axios';

interface Block {
    type: 'paragraph' | 'heading' | 'image' | 'video' | 'quote';
    content: string;
    caption: string;
}

interface Post {
    _id: string;
    title: string;
    content: string;
    category: string;
    slug: string;
    imageUrl?: string;
    youtubeUrl?: string;
    blocks?: Block[];
    status: 'draft' | 'published';
    linkedPharmacy?: string;
    linkedProduct?: string;
    seoKeywords?: string[];
    author: { name: string; id: string };
    createdAt: string;
}

const BLOCK_TYPES: { type: Block['type']; label: string; color: string; placeholder: string }[] = [
    { type: 'paragraph', label: 'Text', color: '#555', placeholder: 'Write a paragraph...' },
    { type: 'heading', label: 'Heading', color: '#1976d2', placeholder: 'Section heading...' },
    { type: 'image', label: 'Image', color: '#0f6e56', placeholder: 'Paste image URL...' },
    { type: 'video', label: 'Video', color: '#e53935', placeholder: 'Paste YouTube URL...' },
    { type: 'quote', label: 'Quote', color: '#f59e0b', placeholder: 'Memorable quote or key point...' },
];

const emptyBlock = (type: Block['type']): Block => ({ type, content: '', caption: '' });

const BlogCenter = () => {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [editingPost, setEditingPost] = useState<Post | null>(null);
    const [activeTab, setActiveTab] = useState<'manage' | 'insights'>('manage');
    const [insights, setInsights] = useState<any[]>([]);

    const [formData, setFormData] = useState({
        title: '',
        category: '',
        imageUrl: '',
        status: 'draft',
        seoKeywords: '',
        authorName: ''
    });
    const [blocks, setBlocks] = useState<Block[]>([emptyBlock('paragraph')]);
    const [linkedMedicines, setLinkedMedicines] = useState<string[]>([]);
    const [medicineInput, setMedicineInput] = useState('');


    useEffect(() => {
        fetchPosts();
        fetchInsights();
    }, []);

    const fetchPosts = async () => {
        try {
            setLoading(true);
            const res = await axios.get('/api/posts');
            setPosts(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('Failed to fetch posts:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchInsights = async () => {
        try {
            const res = await axios.get('/api/admin/pulse/insights');
            const data = res.data?.insights || res.data;
            setInsights(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to fetch pulse insights:', err);
        }
    };

    const handleOpen = (post: Post | null = null, prefillTitle?: string) => {
        if (post) {
            setEditingPost(post);
            setFormData({
                title: post.title,
                category: post.category,
                imageUrl: post.imageUrl || '',
                status: post.status,
                seoKeywords: (post.seoKeywords || []).join(', '),
                authorName: post.author?.name || ''
            });
            setLinkedMedicines(post.linkedMedicines || []);
            if (post.blocks && post.blocks.length > 0) {
                setBlocks(post.blocks.map(b => ({ ...b, caption: b.caption || '' })));
            } else {
                const converted: Block[] = [];
                if (post.youtubeUrl) converted.push({ type: 'video', content: post.youtubeUrl, caption: '' });
                if (post.content) converted.push({ type: 'paragraph', content: post.content, caption: '' });
                setBlocks(converted.length > 0 ? converted : [emptyBlock('paragraph')]);
            }
        } else {
            setEditingPost(null);
            setFormData({
                title: prefillTitle || '',
                category: '',
                imageUrl: '',
                status: 'draft',
                seoKeywords: '',
                authorName: ''
            });
            setLinkedMedicines([]);
            setBlocks([emptyBlock('paragraph')]);
        }
        setOpen(true);
    };

    const addBlock = (type: Block['type']) => {
        setBlocks(prev => [...prev, emptyBlock(type)]);
    };

    const updateBlock = (index: number, updates: Partial<Block>) => {
        setBlocks(prev => prev.map((b, i) => i === index ? { ...b, ...updates } : b));
    };

    const removeBlock = (index: number) => {
        setBlocks(prev => prev.filter((_, i) => i !== index));
    };

    const moveBlock = (index: number, dir: -1 | 1) => {
        const next = index + dir;
        if (next < 0 || next >= blocks.length) return;
        setBlocks(prev => {
            const arr = [...prev];
            [arr[index], arr[next]] = [arr[next], arr[index]];
            return arr;
        });
    };

    const addMedicine = () => {
        const name = medicineInput.trim();
        if (name && !linkedMedicines.includes(name)) {
            setLinkedMedicines(prev => [...prev, name]);
        }
        setMedicineInput('');
    };

    const handleSave = async () => {
        const payload = {
            ...formData,
            id: editingPost?._id,
            blocks,
            linkedMedicines,
            content: blocks.find(b => b.type === 'paragraph')?.content || '',
            seoKeywords: formData.seoKeywords.split(',').map(k => k.trim()).filter(k => k)
        };
        try {
            if (editingPost) {
                await axios.put('/api/posts', payload);
            } else {
                await axios.post('/api/posts', payload);
            }
            fetchPosts();
            setOpen(false);
        } catch (err) {
            alert('Failed to save post. Check console.');
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Delete this post?')) return;
        try {
            await axios.delete(`/api/posts?id=${id}`);
            fetchPosts();
        } catch (err) {
            alert('Failed to delete post.');
        }
    };

    return (
        <Box className="sora" sx={{ p: 2, pb: 8 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <Typography className="fraunces" variant="h4" sx={{ fontWeight: 900, color: 'var(--black)' }}>
                    PSX <em style={{ color: 'var(--green)' }}>Pulse</em>
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpen()}
                    sx={{ borderRadius: '16px', bgcolor: 'var(--green)', textTransform: 'none', fontWeight: 700, px: 3, '&:hover': { bgcolor: '#0b5643' } }}
                >
                    Create Post
                </Button>
            </Box>

            <Box sx={{ display: 'flex', gap: 1.5, mb: 4, overflowX: 'auto', py: 1 }}>
                {(['manage', 'insights'] as const).map(tab => (
                    <Button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        sx={{
                            borderRadius: '20px', px: 3, py: 1, textTransform: 'none', fontWeight: 700, fontSize: '1rem',
                            bgcolor: activeTab === tab ? 'rgba(15,110,86,0.1)' : 'transparent',
                            color: activeTab === tab ? 'var(--green)' : 'var(--gray)',
                            border: activeTab === tab ? 'none' : '1px solid rgba(0,0,0,0.08)',
                            '&:hover': { bgcolor: 'rgba(15,110,86,0.05)' }
                        }}
                    >
                        {tab === 'manage' ? 'Manage' : 'Trends 📈'}
                    </Button>
                ))}
            </Box>

            {activeTab === 'insights' ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {insights.length === 0 && !loading && (
                        <Typography variant="body2" sx={{ color: 'var(--gray)', py: 6, textAlign: 'center' }}>
                            No recent search spikes detected yet.
                        </Typography>
                    )}
                    {insights.map((trend, idx) => (
                        <Box key={trend._id || idx} className="glass-card" sx={{ p: { xs: 1.5, sm: 2.5 }, borderLeft: '4px solid var(--green)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.5, sm: 3 }, flexGrow: 1, overflow: 'hidden' }}>
                                <Typography variant="h5" sx={{ fontWeight: 900, color: 'var(--green)', minWidth: { xs: '30px', sm: '40px' } }}>#{idx + 1}</Typography>
                                <div style={{ overflow: 'hidden' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                                        <Typography sx={{ fontWeight: 800, fontSize: { xs: '1rem', sm: '1.2rem' }, color: 'var(--black)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {trend._id}
                                        </Typography>
                                        <Chip label={trend.label} size="small" sx={{ height: '18px', fontSize: '0.6rem', fontWeight: 900, bgcolor: trend.type === 'spike' ? 'rgba(255,77,77,0.1)' : 'rgba(15,110,86,0.1)', color: trend.type === 'spike' ? '#ff4d4d' : 'var(--green)' }} />
                                    </Box>
                                    <Typography variant="caption" sx={{ color: 'var(--gray)', display: 'block' }}>
                                        {trend.type === 'inventory' ? `Category: ${trend.category}` : `${trend.count} targeted searches`}
                                    </Typography>
                                </div>
                            </Box>
                            <Button variant="outlined" startIcon={<AddIcon />} onClick={() => handleOpen(null, `Understanding ${trend._id}: Usage & Health Tips`)}
                                sx={{ borderRadius: '12px', textTransform: 'none', fontWeight: 700, color: 'var(--green)', minWidth: 'fit-content', px: { xs: 1, sm: 2 }, borderColor: 'rgba(15,110,86,0.2)', '&:hover': { borderColor: 'var(--green)', bgcolor: 'rgba(15,110,86,0.05)' }, '& .MuiButton-startIcon': { mr: { xs: 0, sm: 0.5 } } }}>
                                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Draft</Box>
                            </Button>
                        </Box>
                    ))}
                </Box>
            ) : (
                <Box>
                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}><CircularProgress sx={{ color: 'var(--green)' }} /></Box>
                    ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {posts.length === 0 && (
                                <Typography sx={{ textAlign: 'center', color: 'var(--gray)', py: 6 }}>
                                    No articles yet. Click "Create Post" or use a trend suggestion!
                                </Typography>
                            )}
                            {posts.map(post => (
                                <div key={post._id} className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px' }}>
                                    <div>
                                        <Typography sx={{ fontWeight: 700, fontSize: '18px' }}>{post.title}</Typography>
                                        <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                                            <Chip label={post.category} size="small" />
                                            <Chip label={post.status} size="small" color={post.status === 'published' ? 'success' : 'default'} variant="outlined" />
                                            {post.blocks && post.blocks.length > 0 && (
                                                <Chip label={`${post.blocks.length} blocks`} size="small" sx={{ bgcolor: 'rgba(15,110,86,0.06)', color: 'var(--green)', fontSize: '10px' }} />
                                            )}
                                            <Typography variant="caption" sx={{ color: 'var(--gray)' }}>
                                                {new Date(post.createdAt).toLocaleDateString()}
                                            </Typography>
                                        </Box>
                                    </div>
                                    <Box>
                                        <IconButton onClick={() => handleOpen(post)} sx={{ color: 'var(--green)' }}><EditIcon /></IconButton>
                                        <IconButton onClick={() => handleDelete(post._id)} sx={{ color: '#ff4d4d' }}><DeleteIcon /></IconButton>
                                    </Box>
                                </div>
                            ))}
                        </Box>
                    )}
                </Box>
            )}

            <Dialog
                open={open}
                onClose={() => setOpen(false)}
                maxWidth="md"
                fullWidth
                sx={{ zIndex: 10001, '& .MuiDialog-container': { alignItems: 'center', pb: { xs: '80px', md: '100px' } } }}
                PaperProps={{ sx: { borderRadius: '24px', p: 1, maxHeight: '82vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' } }}
            >
                <DialogTitle className="fraunces" sx={{ fontWeight: 900 }}>{editingPost ? 'Edit Post' : 'New Article'}</DialogTitle>
                <DialogContent sx={{ overflowY: 'auto' }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 2 }}>

                        {/* Meta fields */}
                        <TextField label="Title" fullWidth value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <TextField label="Category" fullWidth value={formData.category} placeholder="e.g. Health Tips, Trends" onChange={e => setFormData({ ...formData, category: e.target.value })} />
                            <TextField label="Display Author" fullWidth value={formData.authorName} placeholder="e.g. Dr. Pharma" onChange={e => setFormData({ ...formData, authorName: e.target.value })} />
                        </Box>
                        <TextField label="Cover Image URL (card thumbnail)" fullWidth value={formData.imageUrl} onChange={e => setFormData({ ...formData, imageUrl: e.target.value })} />

                        {/* Block Editor */}
                        <Box>
                            <Typography variant="caption" sx={{ color: 'var(--gray)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, mb: 1.5, display: 'block' }}>
                                Article Body
                            </Typography>

                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                {blocks.map((block, index) => {
                                    const cfg = BLOCK_TYPES.find(t => t.type === block.type)!;
                                    return (
                                        <Box key={index} sx={{ border: `1.5px solid ${cfg.color}22`, borderLeft: `4px solid ${cfg.color}`, borderRadius: '12px', p: 1.5, bgcolor: `${cfg.color}05` }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                                <TextField
                                                    select
                                                    size="small"
                                                    value={block.type}
                                                    onChange={e => updateBlock(index, { type: e.target.value as Block['type'] })}
                                                    sx={{ minWidth: 110, '& .MuiOutlinedInput-root': { borderRadius: '8px', fontSize: '12px' } }}
                                                    SelectProps={{ MenuProps: { sx: { zIndex: 10002 } } }}
                                                >
                                                    {BLOCK_TYPES.map(t => (
                                                        <MenuItem key={t.type} value={t.type} sx={{ fontSize: '13px' }}>{t.label}</MenuItem>
                                                    ))}
                                                </TextField>
                                                <Box sx={{ display: 'flex', gap: 0.5, ml: 'auto' }}>
                                                    <IconButton size="small" onClick={() => moveBlock(index, -1)} disabled={index === 0} sx={{ fontSize: '14px', p: 0.5 }}>↑</IconButton>
                                                    <IconButton size="small" onClick={() => moveBlock(index, 1)} disabled={index === blocks.length - 1} sx={{ fontSize: '14px', p: 0.5 }}>↓</IconButton>
                                                    <IconButton size="small" onClick={() => removeBlock(index)} sx={{ color: '#ff4d4d', p: 0.5 }}><DeleteIcon sx={{ fontSize: 16 }} /></IconButton>
                                                </Box>
                                            </Box>
                                            <TextField
                                                fullWidth
                                                size="small"
                                                multiline={block.type === 'paragraph' || block.type === 'quote'}
                                                rows={block.type === 'paragraph' ? 4 : block.type === 'quote' ? 2 : 1}
                                                placeholder={cfg.placeholder}
                                                value={block.content}
                                                onChange={e => updateBlock(index, { content: e.target.value })}
                                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', fontSize: '13px' } }}
                                            />
                                            {(block.type === 'image' || block.type === 'video') && (
                                                <TextField
                                                    fullWidth
                                                    size="small"
                                                    placeholder="Caption (optional)"
                                                    value={block.caption}
                                                    onChange={e => updateBlock(index, { caption: e.target.value })}
                                                    sx={{ mt: 1, '& .MuiOutlinedInput-root': { borderRadius: '8px', fontSize: '12px' } }}
                                                />
                                            )}
                                        </Box>
                                    );
                                })}
                            </Box>

                            {/* Add Block Buttons */}
                            <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
                                {BLOCK_TYPES.map(t => (
                                    <Button
                                        key={t.type}
                                        size="small"
                                        onClick={() => addBlock(t.type)}
                                        sx={{
                                            borderRadius: '20px', textTransform: 'none', fontSize: '12px', fontWeight: 600,
                                            border: `1px solid ${t.color}44`, color: t.color,
                                            px: 1.5, py: 0.5,
                                            '&:hover': { bgcolor: `${t.color}11` }
                                        }}
                                    >
                                        + {t.label}
                                    </Button>
                                ))}
                            </Box>
                        </Box>

                        {/* Linked Medicines */}
                        <Box>
                            <Typography variant="caption" sx={{ color: 'var(--gray)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, mb: 1.5, display: 'block' }}>
                                Linked Medicines
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <TextField
                                    size="small"
                                    fullWidth
                                    placeholder="Type medicine name and press Enter"
                                    value={medicineInput}
                                    onChange={e => setMedicineInput(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addMedicine(); } }}
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                                />
                                <Button onClick={addMedicine} variant="outlined" sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700, color: 'var(--green)', borderColor: 'rgba(15,110,86,0.3)', whiteSpace: 'nowrap', '&:hover': { borderColor: 'var(--green)', bgcolor: 'rgba(15,110,86,0.05)' } }}>
                                    + Add
                                </Button>
                            </Box>
                            {linkedMedicines.length > 0 && (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1.5 }}>
                                    {linkedMedicines.map(med => (
                                        <Chip
                                            key={med}
                                            label={med}
                                            onDelete={() => setLinkedMedicines(prev => prev.filter(m => m !== med))}
                                            size="small"
                                            sx={{ bgcolor: 'rgba(15,110,86,0.08)', color: 'var(--green)', fontWeight: 600, '& .MuiChip-deleteIcon': { color: 'rgba(15,110,86,0.5)' } }}
                                        />
                                    ))}
                                </Box>
                            )}
                        </Box>
                        <TextField label="SEO Keywords (comma separated)" fullWidth value={formData.seoKeywords} onChange={e => setFormData({ ...formData, seoKeywords: e.target.value })} />
                        <TextField select label="Status" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} fullWidth SelectProps={{ MenuProps: { sx: { zIndex: 10002 } } }}>
                            <MenuItem value="draft">Draft</MenuItem>
                            <MenuItem value="published">Published</MenuItem>
                        </TextField>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={() => setOpen(false)} sx={{ color: 'var(--gray)' }}>Cancel</Button>
                    <Button variant="contained" onClick={handleSave} sx={{ bgcolor: 'var(--green)', borderRadius: '12px', px: 4, '&:hover': { bgcolor: '#0b5643' } }}>
                        Save Post
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default BlogCenter;
