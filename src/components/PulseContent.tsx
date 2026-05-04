import React, { useState, useEffect } from 'react';
import SubscribeModal from './SubscribeModal';
import {
    Box,
    Typography,
    Grid,
    Card,
    CardContent,
    CardMedia,
    CircularProgress,
    Button,
    Chip,
    Divider
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import axios from 'axios';

interface Block {
    type: 'paragraph' | 'heading' | 'image' | 'video' | 'quote';
    content: string;
    caption?: string;
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
    linkedMedicines?: string[];
    status: 'draft' | 'published';
    author: { name: string };
    createdAt: string;
}

interface PulseContentProps {
    onBack: () => void;
    onFindMeds: (query?: string) => void;
}

const getCoverImage = (post: Post): string => {
    if (post.blocks?.length) {
        const img = post.blocks.find(b => b.type === 'image');
        if (img?.content) return img.content;
    }
    return post.imageUrl || 'https://images.unsplash.com/photo-1576091160550-217359f42f4c?auto=format&fit=crop&q=80';
};

const getExcerpt = (post: Post): string => {
    if (post.blocks?.length) {
        const para = post.blocks.find(b => b.type === 'paragraph');
        if (para?.content) return para.content;
    }
    return post.content || '';
};

const getReadTime = (post: Post): number => {
    let text = '';
    if (post.blocks?.length) {
        text = post.blocks.filter(b => ['paragraph', 'heading', 'quote'].includes(b.type)).map(b => b.content).join(' ');
    } else {
        text = post.content || '';
    }
    return Math.max(1, Math.ceil(text.split(/\s+/).length / 200));
};

const PulseContent = ({ onBack, onFindMeds }: PulseContentProps) => {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPost, setSelectedPost] = useState<Post | null>(null);
    const [medSheet, setMedSheet] = useState(false);
    const [availableMeds, setAvailableMeds] = useState<string[]>([]);

    useEffect(() => { fetchPosts(); }, []);

    const fetchPosts = async () => {
        try {
            const res = await axios.get('/api/posts?status=published');
            setPosts(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('Failed to fetch pulse posts:', err);
        } finally {
            setLoading(false);
        }
    };

    const getYoutubeId = (url: string) =>
        url.split('v=')[1]?.split('&')[0] || url.split('/').pop() || '';

    const renderBlock = (block: Block, index: number) => {
        switch (block.type) {
            case 'paragraph':
                return (
                    <Typography key={index} variant="body1" className="sora" sx={{ lineHeight: 1.85, fontSize: { xs: '15px', sm: '16px' }, color: '#2d2d2d', mb: 3, textAlign: 'justify' }}>
                        {block.content}
                    </Typography>
                );
            case 'heading':
                return (
                    <Typography key={index} className="fraunces" variant="h5" sx={{ fontWeight: 800, color: 'var(--black)', mt: 5, mb: 2, fontSize: { xs: '20px', sm: '24px' }, borderBottom: '2px solid rgba(15,110,86,0.15)', pb: 1 }}>
                        {block.content}
                    </Typography>
                );
            case 'image':
                return (
                    <Box key={index} sx={{ my: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', bgcolor: '#f8f9fa', borderRadius: '20px', p: 2 }}>
                        <Box
                            component="img"
                            src={block.content}
                            sx={{ height: { xs: '220px', sm: '300px' }, maxWidth: '100%', borderRadius: '12px', display: 'block', objectFit: 'contain' }}
                        />
                        {block.caption && (
                            <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', color: 'var(--gray)', mt: 1.5, fontStyle: 'italic', fontSize: '13px' }}>
                                {block.caption}
                            </Typography>
                        )}
                    </Box>
                );
            case 'video': {
                const videoId = getYoutubeId(block.content);
                return (
                    <Box key={index} sx={{ my: 4 }}>
                        <Box sx={{ position: 'relative', pt: '56.25%', borderRadius: '16px', overflow: 'hidden', bgcolor: '#000' }}>
                            <iframe
                                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
                                src={`https://www.youtube.com/embed/${videoId}`}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        </Box>
                        {block.caption && (
                            <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', color: 'var(--gray)', mt: 1.5, fontStyle: 'italic', fontSize: '13px' }}>
                                {block.caption}
                            </Typography>
                        )}
                    </Box>
                );
            }
            case 'quote':
                return (
                    <Box key={index} sx={{ my: 4, px: { xs: 2, sm: 4 }, py: 3, borderLeft: '4px solid var(--green)', bgcolor: 'rgba(15,110,86,0.04)', borderRadius: '0 16px 16px 0' }}>
                        <Typography variant="body1" className="fraunces" sx={{ fontStyle: 'italic', fontSize: { xs: '17px', sm: '20px' }, color: '#1a1a1a', lineHeight: 1.6, fontWeight: 600 }}>
                            &ldquo;{block.content}&rdquo;
                        </Typography>
                    </Box>
                );
            default:
                return null;
        }
    };

    const renderLegacyDetail = (post: Post) => (
        <>
            {post.youtubeUrl && (() => {
                const videoId = getYoutubeId(post.youtubeUrl!);
                return (
                    <Box sx={{ position: 'relative', pt: '56.25%', mb: 4, borderRadius: '16px', overflow: 'hidden', bgcolor: '#000' }}>
                        <iframe style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
                            src={`https://www.youtube.com/embed/${videoId}`}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                    </Box>
                );
            })()}
            {!post.youtubeUrl && post.imageUrl && (
                <Box sx={{ my: 4, display: 'flex', justifyContent: 'center', bgcolor: '#f8f9fa', borderRadius: '20px', p: 2 }}>
                    <Box component="img" src={post.imageUrl} sx={{ height: { xs: '220px', sm: '300px' }, maxWidth: '100%', objectFit: 'contain', borderRadius: '12px', display: 'block' }} />
                </Box>
            )}
            <Typography className="sora" variant="body1" sx={{ lineHeight: 1.85, whiteSpace: 'pre-wrap', fontSize: { xs: '15px', sm: '16px' }, color: '#2d2d2d', textAlign: 'justify' }}>
                {post.content}
            </Typography>
        </>
    );

    return (
        <AnimatePresence mode="wait">
            {!selectedPost ? (
                <Box
                    component={motion.div}
                    key="list"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', overflowY: 'auto', overflowX: 'hidden', px: { xs: 2, sm: 4 }, pt: { xs: 10, sm: 12 }, pb: { xs: 12, sm: 8 } }}
                >
                    <div className="back-btn" onClick={onBack} style={{ marginBottom: '16px' }}>
                        <div className="back-arrow">←</div>
                        <span>Dashboard</span>
                    </div>

                    <Box sx={{ mb: 4, textAlign: 'center', maxWidth: '800px', mx: 'auto' }}>
                        <Typography className="fraunces" variant="h4" sx={{ fontWeight: 900, color: 'var(--black)', letterSpacing: '-1.5px', mb: 1 }}>
                            PSX <em style={{ color: 'var(--green)', fontStyle: 'italic' }}>Pulse</em>
                        </Typography>
                        <Typography variant="body1" className="sora" sx={{ color: 'var(--gray)', fontWeight: 300, mb: 2 }}>
                            Real-time trends, pharmacist insights, and health vlogs.
                        </Typography>
                        <SubscribeModal />
                    </Box>

                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}><CircularProgress sx={{ color: 'var(--green)' }} /></Box>
                    ) : (
                        <Box sx={{ maxWidth: '1200px', mx: 'auto', width: '100%' }}>
                            {/* Featured first post */}
                            {posts.length > 0 && (
                                <Box
                                    onClick={() => setSelectedPost(posts[0])}
                                    sx={{ cursor: 'pointer', mb: 3, borderRadius: '24px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 4px 24px rgba(0,0,0,0.04)', display: { xs: 'block', sm: 'flex' }, transition: 'all 0.3s', '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 12px 32px rgba(15,110,86,0.10)' } }}
                                >
                                    <Box sx={{ bgcolor: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: { xs: 220, sm: 260 }, width: { xs: '100%', sm: '42%' }, flexShrink: 0, p: 2 }}>
                                        <Box component="img" src={getCoverImage(posts[0])} sx={{ maxWidth: '100%', maxHeight: { xs: 200, sm: 240 }, objectFit: 'contain', borderRadius: '16px' }} />
                                    </Box>
                                    <Box sx={{ p: { xs: 2.5, sm: 3 }, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                        <Box sx={{ display: 'flex', gap: 1, mb: 1.5, alignItems: 'center' }}>
                                            <Chip label={posts[0].category} size="small" sx={{ height: 20, fontSize: '10px', bgcolor: 'rgba(15,110,86,0.08)', color: 'var(--green)', fontWeight: 700, textTransform: 'uppercase' }} />
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'var(--gray)' }}>
                                                <AccessTimeIcon sx={{ fontSize: 12 }} />
                                                <Typography variant="caption" sx={{ fontSize: '10px' }}>{getReadTime(posts[0])} min read</Typography>
                                            </Box>
                                        </Box>
                                        <Typography className="fraunces" variant="h5" sx={{ fontWeight: 900, mb: 1.5, lineHeight: 1.2, color: 'var(--black)', fontSize: { xs: '20px', sm: '24px' } }}>
                                            {posts[0].title}
                                        </Typography>
                                        <Typography variant="body2" className="sora" sx={{ color: 'var(--gray)', mb: 2.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontSize: '13px', lineHeight: 1.6 }}>
                                            {getExcerpt(posts[0])}
                                        </Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <Typography variant="caption" sx={{ color: 'var(--gray)', fontSize: '11px' }}>
                                                {new Date(posts[0].createdAt).toLocaleDateString()}
                                            </Typography>
                                            <Box sx={{ display: 'flex', alignItems: 'center', color: 'var(--green)', fontWeight: 700, gap: 0.5, fontSize: '13px' }}>
                                                Read More <ArrowForwardIcon sx={{ fontSize: 16 }} />
                                            </Box>
                                        </Box>
                                    </Box>
                                </Box>
                            )}

                            {/* Rest as grid */}
                            {posts.length > 1 && (
                                <Grid container spacing={{ xs: 2, sm: 3 }} sx={{ width: '100%' }}>
                                    {posts.slice(1).map(post => (
                                        <Grid item xs={12} sm={6} md={4} key={post._id}>
                                            <Card
                                                onClick={() => setSelectedPost(post)}
                                                sx={{ borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.05)', cursor: 'pointer', transition: 'all 0.3s', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 12px 28px rgba(15,110,86,0.09)' } }}
                                            >
                                                <Box sx={{ bgcolor: '#f8f9fa', display: 'flex', justifyContent: 'center', alignItems: 'center', height: 180, overflow: 'hidden', p: 2 }}>
                                                    <CardMedia component="img" sx={{ height: '100%', width: '100%', objectFit: 'contain' }} image={getCoverImage(post)} alt={post.title} />
                                                </Box>
                                                <CardContent sx={{ flexGrow: 1, p: '16px !important', display: 'flex', flexDirection: 'column' }}>
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, alignItems: 'center' }}>
                                                        <Chip label={post.category} size="small" sx={{ height: 18, fontSize: '9px', bgcolor: 'rgba(15,110,86,0.06)', color: 'var(--green)', fontWeight: 700, textTransform: 'uppercase' }} />
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'var(--gray)' }}>
                                                            <AccessTimeIcon sx={{ fontSize: 11 }} />
                                                            <Typography variant="caption" sx={{ fontSize: '10px' }}>{getReadTime(post)} min</Typography>
                                                        </Box>
                                                    </Box>
                                                    <Typography className="fraunces" variant="h6" sx={{ fontWeight: 800, mb: 1, lineHeight: 1.2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontSize: '15px' }}>
                                                        {post.title}
                                                    </Typography>
                                                    <Typography variant="body2" className="sora" sx={{ color: 'var(--gray)', mb: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontSize: '11px', lineHeight: 1.5 }}>
                                                        {getExcerpt(post)}
                                                    </Typography>
                                                    <Box sx={{ mt: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                        <Typography variant="caption" sx={{ color: 'var(--gray)', fontSize: '10px' }}>
                                                            {new Date(post.createdAt).toLocaleDateString()}
                                                        </Typography>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', color: 'var(--green)', fontWeight: 700, gap: 0.5, fontSize: '12px' }}>
                                                            Read More <ArrowForwardIcon sx={{ fontSize: 14 }} />
                                                        </Box>
                                                    </Box>
                                                </CardContent>
                                            </Card>
                                        </Grid>
                                    ))}
                                </Grid>
                            )}
                        </Box>
                    )}
                </Box>
            ) : (
                <Box
                    component={motion.div}
                    key="detail"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', bgcolor: '#fff', zIndex: 10, px: { xs: 2, sm: 4 }, pt: { xs: 10, sm: 12 }, pb: { xs: 12, sm: 8 }, overflowY: 'auto', overflowX: 'hidden' }}
                >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: '24px' }}>
                        <div className="back-btn" onClick={() => setSelectedPost(null)} style={{ margin: 0 }}>
                            <div className="back-arrow">←</div>
                            <span>Back to Pulse feed</span>
                        </div>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <SubscribeModal />
                        <Button
                            size="small"
                            onClick={() => {
                                const url = `${window.location.origin}/pulse/${selectedPost.slug}`;
                                if (navigator.share) {
                                    navigator.share({ title: selectedPost.title, url });
                                } else {
                                    navigator.clipboard.writeText(url);
                                }
                            }}
                            sx={{ borderRadius: '20px', textTransform: 'none', fontSize: '12px', fontWeight: 700, color: 'var(--green)', border: '1px solid rgba(15,110,86,0.2)', px: 2, '&:hover': { bgcolor: 'rgba(15,110,86,0.05)' } }}
                        >
                            Share ↗
                        </Button>
                        </Box>
                    </Box>

                    <Box sx={{ maxWidth: '720px', mx: 'auto' }}>
                        {/* Category + meta */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
                            <Chip label={selectedPost.category} size="small" sx={{ bgcolor: 'rgba(15,110,86,0.08)', color: 'var(--green)', fontWeight: 700, textTransform: 'uppercase', fontSize: '11px' }} />
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'var(--gray)' }}>
                                <AccessTimeIcon sx={{ fontSize: 13 }} />
                                <Typography variant="caption" sx={{ fontSize: '12px' }}>{getReadTime(selectedPost)} min read</Typography>
                            </Box>
                            <Typography variant="caption" sx={{ color: 'var(--gray)', fontSize: '12px' }}>
                                {new Date(selectedPost.createdAt).toLocaleDateString()}
                            </Typography>
                        </Box>

                        {/* Title */}
                        <Typography className="fraunces" variant="h4" sx={{ fontWeight: 900, color: 'var(--black)', mb: 1.5, lineHeight: 1.15, fontSize: { xs: '26px', sm: '34px' } }}>
                            {selectedPost.title}
                        </Typography>

                        {/* Author */}
                        <Typography className="sora" variant="body2" sx={{ color: 'var(--gray)', mb: 4, fontSize: '13px' }}>
                            By {selectedPost.author.name}
                        </Typography>

                        <Divider sx={{ mb: 4 }} />

                        {/* Body */}
                        {selectedPost.blocks && selectedPost.blocks.length > 0
                            ? selectedPost.blocks.map((block, i) => renderBlock(block, i))
                            : renderLegacyDetail(selectedPost)
                        }

                        <Divider sx={{ mt: 6, mb: 4 }} />

                        {/* CTA */}
                        <Box sx={{ p: { xs: 3, sm: 4 }, borderRadius: '24px', bgcolor: 'rgba(15,110,86,0.05)', textAlign: 'center', mb: 4 }}>
                            <Typography variant="h6" className="fraunces" sx={{ fontWeight: 800, mb: 1 }}>
                                Interested in this topic?
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'var(--gray)', mb: 3 }}>
                                Our verified pharmacists are ready to provide the meds and advice mentioned in this article.
                            </Typography>
                            <Button
                                variant="contained"
                                onClick={() => {
                                    const meds = selectedPost.linkedMedicines?.filter(m => m.trim());
                                    if (meds && meds.length > 0) {
                                        setAvailableMeds([...meds]);
                                        setMedSheet(true);
                                    } else {
                                        onFindMeds();
                                    }
                                }}
                                sx={{ bgcolor: 'var(--green)', borderRadius: '12px', px: 6, py: 1.5, textTransform: 'none', fontWeight: 700 }}
                            >
                                Find Meds Now
                            </Button>
                        </Box>
                    </Box>
                </Box>
            )}

            {/* Medicine selection sheet */}
            <AnimatePresence>
                {medSheet && (
                    <>
                        {/* Backdrop */}
                        <Box
                            component={motion.div}
                            key="backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setMedSheet(false)}
                            sx={{ position: 'fixed', inset: 0, bgcolor: 'rgba(0,0,0,0.4)', zIndex: 100 }}
                        />
                        {/* Sheet */}
                        <Box
                            component={motion.div}
                            key="sheet"
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                            sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, bgcolor: '#fff', borderRadius: '24px 24px 0 0', zIndex: 101, p: 3, pb: '100px', boxShadow: '0 -8px 40px rgba(0,0,0,0.15)' }}
                        >
                            {/* Handle */}
                            <Box sx={{ width: 40, height: 4, bgcolor: '#e0e0e0', borderRadius: 2, mx: 'auto', mb: 3 }} />

                            <Typography className="fraunces" variant="h6" sx={{ fontWeight: 900, mb: 0.5 }}>
                                Search for a medicine
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'var(--gray)', mb: 3, fontSize: '13px' }}>
                                Tap a medicine below to find it. Remove any you're not interested in.
                            </Typography>

                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 3 }}>
                                {availableMeds.map(med => (
                                    <Box
                                        key={med}
                                        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: '14px 16px', borderRadius: '14px', border: '1.5px solid rgba(15,110,86,0.15)', bgcolor: 'rgba(15,110,86,0.02)', cursor: 'pointer', transition: 'all 0.15s', '&:hover': { bgcolor: 'rgba(15,110,86,0.06)', borderColor: 'var(--green)' } }}
                                        onClick={() => { setMedSheet(false); onFindMeds(med); }}
                                    >
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'var(--green)', flexShrink: 0 }} />
                                            <Typography sx={{ fontWeight: 600, fontSize: '15px', color: 'var(--black)' }}>{med}</Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Typography sx={{ fontSize: '12px', color: 'var(--green)', fontWeight: 700 }}>Search →</Typography>
                                            <Box
                                                component="span"
                                                onClick={e => { e.stopPropagation(); setAvailableMeds(prev => prev.filter(m => m !== med)); }}
                                                sx={{ ml: 1, width: 22, height: 22, borderRadius: '50%', bgcolor: 'rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', color: '#888', cursor: 'pointer', '&:hover': { bgcolor: 'rgba(255,0,0,0.1)', color: '#e53935' } }}
                                            >
                                                ✕
                                            </Box>
                                        </Box>
                                    </Box>
                                ))}
                                {availableMeds.length === 0 && (
                                    <Typography sx={{ textAlign: 'center', color: 'var(--gray)', py: 2, fontSize: '13px' }}>
                                        No medicines selected.
                                    </Typography>
                                )}
                            </Box>

                            <Button fullWidth variant="outlined" onClick={() => setMedSheet(false)} sx={{ borderRadius: '12px', textTransform: 'none', fontWeight: 600, color: 'var(--gray)', borderColor: 'rgba(0,0,0,0.15)' }}>
                                Cancel
                            </Button>
                        </Box>
                    </>
                )}
            </AnimatePresence>
        </AnimatePresence>
    );
};

export default PulseContent;
