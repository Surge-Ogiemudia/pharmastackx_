import React, { useState, useEffect } from 'react';
import { 
    Box, 
    Typography, 
    TextField, 
    Button, 
    Autocomplete, 
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

interface Post {
    _id: string;
    title: string;
    content: string;
    category: string;
    slug: string;
    imageUrl?: string;
    youtubeUrl?: string;
    status: 'draft' | 'published';
    linkedPharmacy?: string;
    linkedProduct?: string;
    seoKeywords?: string[];
    author: {
        name: string;
        id: string;
    };
    createdAt: string;
}

const BlogCenter = () => {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [editingPost, setEditingPost] = useState<Post | null>(null);
    const [activeTab, setActiveTab] = useState<'manage' | 'insights'>('manage');
    const [insights, setInsights] = useState<any[]>([]);

    // Form State
    const [formData, setFormData] = useState({
        title: '',
        category: '',
        content: '',
        imageUrl: '',
        youtubeUrl: '',
        status: 'draft',
        linkedPharmacy: '',
        linkedProduct: '',
        seoKeywords: '',
        authorName: ''
    });

    // Options for Pickers
    const [pharmacies, setPharmacies] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);

    useEffect(() => {
        fetchPosts();
        fetchOptions();
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
            // Handle both enriched object and raw array responses
            const data = res.data?.insights || res.data;
            setInsights(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to fetch pulse insights:', err);
        }
    };

    const fetchOptions = async () => {
        try {
            // Fetch Pharmacies - using verified pharmacies endpoint
            const userRes = await axios.get('/api/pharmacies?all=true');
            if (userRes.data?.pharmacies && Array.isArray(userRes.data.pharmacies)) {
                setPharmacies(userRes.data.pharmacies);
            }

            // Fetch Products
            const prodRes = await axios.get('/api/products?limit=100');
            if (prodRes.data?.success && Array.isArray(prodRes.data.data)) {
                setProducts(prodRes.data.data);
            }
        } catch (err) {
            console.error('Failed to fetch options for blog:', err);
        }
    };

    const handleOpen = (post: Post | null = null, prefillTitle?: string) => {
        if (post) {
            setEditingPost(post);
            setFormData({
                title: post.title,
                category: post.category,
                content: post.content,
                imageUrl: post.imageUrl || '',
                youtubeUrl: post.youtubeUrl || '',
                status: post.status,
                linkedPharmacy: post.linkedPharmacy || '',
                linkedProduct: post.linkedProduct || '',
                seoKeywords: (post.seoKeywords || []).join(', '),
                authorName: post.author?.name || ''
            });
        } else {
            setEditingPost(null);
            setFormData({
                title: prefillTitle || '',
                category: '',
                content: '',
                imageUrl: '',
                youtubeUrl: '',
                status: 'draft',
                linkedPharmacy: '',
                linkedProduct: '',
                seoKeywords: '',
                authorName: ''
            });
        }
        setOpen(true);
    };

    const handleSave = async () => {
        const payload = {
            ...formData,
            id: editingPost?._id,
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
            {/* Header Area */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <Typography className="fraunces" variant="h4" sx={{ fontWeight: 900, color: 'var(--black)' }}>
                    PSX <em style={{ color: 'var(--green)' }}>Pulse</em>
                </Typography>
                <Button 
                    variant="contained" 
                    startIcon={<AddIcon />}
                    onClick={() => handleOpen()}
                    sx={{ 
                        borderRadius: '16px', 
                        bgcolor: 'var(--green)', 
                        textTransform: 'none',
                        fontWeight: 700,
                        px: 3,
                        '&:hover': { bgcolor: '#0b5643' }
                    }}
                >
                    Create Post
                </Button>
            </Box>

            {/* Horizontal Pill Tabs - Matching User Example */}
            <Box sx={{ display: 'flex', gap: 1.5, mb: 4, overflowX: 'auto', py: 1 }}>
                <Button
                    onClick={() => setActiveTab('manage')}
                    sx={{
                        borderRadius: '20px',
                        px: 3,
                        py: 1,
                        textTransform: 'none',
                        fontWeight: 700,
                        fontSize: '1rem',
                        bgcolor: activeTab === 'manage' ? 'rgba(15, 110, 86, 0.1)' : 'transparent',
                        color: activeTab === 'manage' ? 'var(--green)' : 'var(--gray)',
                        border: activeTab === 'manage' ? 'none' : '1px solid rgba(0,0,0,0.08)',
                        '&:hover': { bgcolor: 'rgba(15, 110, 86, 0.05)' }
                    }}
                >
                    Manage
                </Button>
                <Button
                    onClick={() => setActiveTab('insights')}
                    sx={{
                        borderRadius: '20px',
                        px: 3,
                        py: 1,
                        textTransform: 'none',
                        fontWeight: 700,
                        fontSize: '1rem',
                        bgcolor: activeTab === 'insights' ? 'rgba(15, 110, 86, 0.1)' : 'transparent',
                        color: activeTab === 'insights' ? 'var(--green)' : 'var(--gray)',
                        border: activeTab === 'insights' ? 'none' : '1px solid rgba(0,0,0,0.08)',
                        '&:hover': { bgcolor: 'rgba(15, 110, 86, 0.05)' }
                    }}
                >
                    Trends 📈
                </Button>
            </Box>

            {/* View Switcher */}
            {activeTab === 'insights' ? (
                <Box sx={{ mb: 6 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {insights.length === 0 && !loading && (
                            <Typography variant="body2" sx={{ color: 'var(--gray)', py: 6, textAlign: 'center' }}>
                                No recent search spikes detected yet.
                            </Typography>
                        )}
                        {insights.map((trend, idx) => (
                            <Box 
                                key={trend._id || idx} 
                                className="glass-card" 
                                sx={{ 
                                    p: { xs: 1.5, sm: 2.5 }, 
                                    borderLeft: '4px solid var(--green)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    gap: 1
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.5, sm: 3 }, flexGrow: 1, overflow: 'hidden' }}>
                                    <Typography variant="h5" sx={{ fontWeight: 900, color: 'var(--green)', minWidth: { xs: '30px', sm: '40px' } }}>#{idx + 1}</Typography>
                                    <div style={{ overflow: 'hidden' }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                                            <Typography sx={{ fontWeight: 800, fontSize: { xs: '1rem', sm: '1.2rem' }, color: 'var(--black)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {trend._id}
                                            </Typography>
                                            <Chip 
                                                label={trend.label} 
                                                size="small" 
                                                sx={{ 
                                                    height: '18px', 
                                                    fontSize: '0.6rem', 
                                                    fontWeight: 900, 
                                                    bgcolor: trend.type === 'spike' ? 'rgba(255, 77, 77, 0.1)' : 'rgba(15, 110, 86, 0.1)',
                                                    color: trend.type === 'spike' ? '#ff4d4d' : 'var(--green)' 
                                                }} 
                                            />
                                        </Box>
                                        <Typography variant="caption" sx={{ color: 'var(--gray)', display: 'block' }}>
                                            {trend.type === 'inventory' ? `Category: ${trend.category}` : `${trend.count} targeted searches`}
                                        </Typography>
                                    </div>
                                </Box>
                                <Button 
                                    variant="outlined" 
                                    startIcon={<AddIcon />}
                                    onClick={() => handleOpen(null, `Understanding ${trend._id}: Usage & Health Tips`)}
                                    sx={{ 
                                        borderRadius: '12px', 
                                        textTransform: 'none',
                                        fontWeight: 700,
                                        color: 'var(--green)',
                                        minWidth: 'fit-content',
                                        px: { xs: 1, sm: 2 },
                                        borderColor: 'rgba(15, 110, 86, 0.2)',
                                        '&:hover': { borderColor: 'var(--green)', bgcolor: 'rgba(15, 110, 86, 0.05)' },
                                        '& .MuiButton-startIcon': { mr: { xs: 0, sm: 0.5 } }
                                    }}
                                >
                                    <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Draft</Box>
                                </Button>
                            </Box>
                        ))}
                    </Box>
                </Box>
            ) : (
                <Box>
                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}><CircularProgress sx={{ color: 'var(--green)' }} /></Box>
                    ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {posts.length === 0 && (
                                <Typography sx={{ textAlign: 'center', color: 'var(--gray)', py: 6 }}>
                                    No articles published yet. Click "Create Post" or use a trend suggestion!
                                </Typography>
                            )}
                            {posts.map(post => (
                                <div key={post._id} className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px' }}>
                                    <div>
                                        <Typography sx={{ fontWeight: 700, fontSize: '18px' }}>{post.title}</Typography>
                                        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                                            <Chip label={post.category} size="small" />
                                            <Chip 
                                                label={post.status} 
                                                size="small" 
                                                color={post.status === 'published' ? 'success' : 'default'}
                                                variant="outlined" 
                                            />
                                            <Typography variant="caption" sx={{ color: 'var(--gray)', ml: 1 }}>
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
                sx={{ 
                    zIndex: 10001, // Stay above BottomNav (9999)
                    '& .MuiDialog-container': {
                        alignItems: 'center',
                        pb: { xs: '100px', md: '120px' } // Lift it up from the bottom nav
                    }
                }}
                PaperProps={{ 
                    sx: { 
                        borderRadius: '24px', 
                        p: 1,
                        maxHeight: '75vh', // More constrained
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                    } 
                }}
            >
                <DialogTitle className="fraunces" sx={{ fontWeight: 900 }}>{editingPost ? 'Edit Post' : 'New Article'}</DialogTitle>
                <DialogContent sx={{ maxHeight: '55vh', overflowY: 'auto' }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 2 }}>
                        <TextField 
                            label="Title" 
                            fullWidth 
                            value={formData.title}
                            onChange={(e) => setFormData({...formData, title: e.target.value})}
                        />
                        <TextField 
                            label="Category" 
                            fullWidth 
                            value={formData.category}
                            placeholder="e.g. Health Tips, Pharmacist Spotlight, Trends"
                            onChange={(e) => setFormData({...formData, category: e.target.value})}
                        />
                        <TextField 
                            label="Display Author Name" 
                            fullWidth 
                            value={formData.authorName}
                            placeholder="e.g. Dr. Pharma, Admin, Healthcare Team"
                            onChange={(e) => setFormData({...formData, authorName: e.target.value})}
                        />
                        <TextField 
                            label="Article Content" 
                            fullWidth 
                            multiline 
                            rows={8}
                            value={formData.content}
                            onChange={(e) => setFormData({...formData, content: e.target.value})}
                        />
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <TextField 
                                label="Cover Image URL" 
                                fullWidth 
                                value={formData.imageUrl}
                                onChange={(e) => setFormData({...formData, imageUrl: e.target.value})}
                            />
                            <TextField 
                                label="YouTube URL (Optional)" 
                                fullWidth 
                                value={formData.youtubeUrl}
                                onChange={(e) => setFormData({...formData, youtubeUrl: e.target.value})}
                            />
                        </Box>
                        
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <Autocomplete
                                {...({
                                    fullWidth: true,
                                    options: pharmacies,
                                    getOptionLabel: (option: any) => option.businessName || 'Unknown Pharmacy',
                                    value: pharmacies.find(p => p._id === formData.linkedPharmacy) || null,
                                    isOptionEqualToValue: (option: any, value: any) => option._id === value._id,
                                    disablePortal: true,
                                    PopperProps: { sx: { zIndex: 10002 } },
                                    renderOption: (props: any, option: any) => (
                                        <li {...props} key={option._id}>
                                            {option.businessName}
                                        </li>
                                    ),
                                    onChange: (_: any, newValue: any) => setFormData({...formData, linkedPharmacy: newValue?._id || ''}),
                                    renderInput: (params: any) => <TextField {...params} label="Link Pharmacy" />
                                } as any)}
                            />
                            <Autocomplete
                                {...({
                                    fullWidth: true,
                                    options: products,
                                    getOptionLabel: (option: any) => option.name || 'Unknown Item',
                                    value: products.find(p => p.id === formData.linkedProduct) || null,
                                    isOptionEqualToValue: (option: any, value: any) => option.id === value.id,
                                    disablePortal: true,
                                    PopperProps: { sx: { zIndex: 10002 } },
                                    renderOption: (props: any, option: any) => (
                                        <li {...props} key={option.id}>
                                            {option.name}
                                        </li>
                                    ),
                                    onChange: (_: any, newValue: any) => setFormData({...formData, linkedProduct: newValue?.id || ''}),
                                    renderInput: (params: any) => <TextField {...params} label="Link Product" />
                                } as any)}
                            />
                        </Box>

                        <TextField 
                            label="SEO Keywords (comma separated)" 
                            fullWidth 
                            value={formData.seoKeywords}
                            onChange={(e) => setFormData({...formData, seoKeywords: e.target.value})}
                        />

                        <TextField
                            select
                            label="Status"
                            value={formData.status}
                            onChange={(e) => setFormData({...formData, status: e.target.value})}
                            fullWidth
                            SelectProps={{ MenuProps: { sx: { zIndex: 10002 } } }}
                        >
                            <MenuItem value="draft">Draft</MenuItem>
                            <MenuItem value="published">Published</MenuItem>
                        </TextField>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={() => setOpen(false)} sx={{ color: 'var(--gray)' }}>Cancel</Button>
                    <Button 
                        variant="contained" 
                        onClick={handleSave} 
                        sx={{ bgcolor: 'var(--green)', borderRadius: '12px', px: 4, '&:hover': { bgcolor: '#0b5643' } }}
                    >
                        Save Post
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default BlogCenter;
