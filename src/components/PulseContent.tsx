import React, { useState, useEffect } from 'react';
import { 
    Box, 
    Typography, 
    Container, 
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
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import axios from 'axios';
import { useRouter } from 'next/navigation';

interface Post {
    _id: string;
    title: string;
    content: string;
    category: string;
    slug: string;
    imageUrl?: string;
    youtubeUrl?: string;
    status: 'draft' | 'published';
    author: { name: string };
    createdAt: string;
}

interface PulseContentProps {
    onBack: () => void;
    onFindMeds: () => void;
}

const PulseContent = ({ onBack, onFindMeds }: PulseContentProps) => {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPost, setSelectedPost] = useState<Post | null>(null);
    const router = useRouter();

    useEffect(() => {
        fetchPosts();
    }, []);

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

    const handlePostClick = (post: Post) => {
        setSelectedPost(post);
    };

    const handleBackToFeed = () => {
        setSelectedPost(null);
    };

    const renderVideo = (url: string) => {
        const videoId = url.split('v=')[1]?.split('&')[0] || url.split('/').pop();
        return (
            <Box sx={{ position: 'relative', pt: '56.25%', mb: 4, borderRadius: '24px', overflow: 'hidden', bgcolor: '#000' }}>
                <iframe
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
                    src={`https://www.youtube.com/embed/${videoId}`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                />
            </Box>
        );
    };

    return (
        <AnimatePresence mode="wait">
            {!selectedPost ? (
                <Box
                    component={motion.div}
                    key="list"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    sx={{ 
                        position: 'absolute', 
                        top: 0, 
                        left: 0, 
                        width: '100%', 
                        height: '100%', 
                        overflowY: 'auto',
                        p: { xs: 2, sm: 4 },
                        pt: { xs: 10, sm: 12 },
                        pb: { xs: 12, sm: 8 }
                    }}
                >
                    <div className="back-btn" onClick={onBack} style={{ marginBottom: '16px' }}>
                        <div className="back-arrow">←</div>
                        <span>Dashboard</span>
                    </div>

                    <Box sx={{ mb: 4, textAlign: 'center', maxWidth: '800px', mx: 'auto' }}>
                        <Typography className="fraunces" variant="h4" sx={{ fontWeight: 900, color: 'var(--black)', letterSpacing: '-1.5px', mb: 1 }}>
                            PSX <em style={{ color: 'var(--green)', fontStyle: 'italic' }}>Pulse</em>
                        </Typography>
                        <Typography variant="body1" className="sora" sx={{ color: 'var(--gray)', fontWeight: 300 }}>
                            Real-time trends, pharmacist insights, and health vlogs.
                        </Typography>
                    </Box>

                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}><CircularProgress sx={{ color: 'var(--green)' }} /></Box>
                    ) : (
                        <Grid container spacing={4} sx={{ maxWidth: '1200px', mx: 'auto' }}>
                            {posts.map((post) => (
                                <Grid item xs={12} md={6} lg={4} key={post._id}>
                                    <Card 
                                        onClick={() => handlePostClick(post)}
                                        sx={{ 
                                            borderRadius: '24px', 
                                            boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
                                            border: '1px solid rgba(0,0,0,0.05)',
                                            cursor: 'pointer',
                                            transition: 'all 0.3s ease',
                                            height: '100%',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            overflow: 'hidden',
                                            '&:hover': { transform: 'translateY(-5px)', boxShadow: '0 12px 30px rgba(15, 110, 86, 0.08)' }
                                        }}
                                    >
                                        <Box sx={{ bgcolor: '#fdfdfd', p: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                            <CardMedia
                                                component="img"
                                                sx={{ 
                                                    height: 180, 
                                                    width: 'auto',
                                                    maxWidth: '100%',
                                                    objectFit: 'contain',
                                                    borderRadius: '16px'
                                                }}
                                                image={post.imageUrl || 'https://images.unsplash.com/photo-1576091160550-217359f42f4c?auto=format&fit=crop&q=80'}
                                                alt={post.title}
                                            />
                                        </Box>
                                        <CardContent sx={{ flexGrow: 1, p: '20px !important', display: 'flex', flexDirection: 'column' }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, alignItems: 'center' }}>
                                                <Chip label={post.category} size="small" sx={{ height: 20, fontSize: '10px', bgcolor: 'rgba(15, 110, 86, 0.06)', color: 'var(--green)', fontWeight: 700, textTransform: 'uppercase' }} />
                                                <Typography variant="caption" sx={{ color: 'var(--gray)', fontSize: '10px' }}>
                                                    {new Date(post.createdAt).toLocaleDateString()}
                                                </Typography>
                                            </Box>
                                            <Typography className="fraunces" variant="h6" sx={{ fontWeight: 800, mb: 1, lineHeight: 1.2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: '2.4em' }}>
                                                {post.title}
                                            </Typography>
                                            <Typography variant="body2" className="sora" sx={{ color: 'var(--gray)', mb: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontSize: '11px', lineHeight: 1.5 }}>
                                                {post.content}
                                            </Typography>
                                            <Box sx={{ mt: 'auto', display: 'flex', alignItems: 'center', color: 'var(--green)', fontWeight: 700, gap: 1, fontSize: '13px' }}>
                                                Read More <ArrowForwardIcon sx={{ fontSize: 16 }} />
                                            </Box>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            ))}
                        </Grid>
                    )}
                </Box>
            ) : (
                <Box 
                    component={motion.div}
                    key="detail"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    sx={{ 
                        position: 'absolute', 
                        top: 0, 
                        left: 0, 
                        width: '100%', 
                        height: '100%', 
                        bgcolor: '#fff', 
                        zIndex: 10, 
                        p: { xs: 2, sm: 4 }, 
                        pt: { xs: 10, sm: 12 }, 
                        pb: { xs: 12, sm: 8 }, 
                        overflowY: 'auto' 
                    }}
                >
                    <div className="back-btn" onClick={handleBackToFeed} style={{ marginBottom: '16px' }}>
                        <div className="back-arrow">←</div>
                        <span>Back to Pulse feed</span>
                    </div>

                    <Box sx={{ maxWidth: '800px', mx: 'auto', mt: 2 }}>
                        <Typography className="fraunces" variant="h4" sx={{ fontWeight: 900, color: 'var(--black)', mb: 2, fontSize: { xs: '24px', sm: '32px' } }}>
                            {selectedPost.title}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
                            <Chip label={selectedPost.category} variant="outlined" />
                            <Typography className="sora" variant="body2" sx={{ color: 'var(--gray)' }}>
                                By {selectedPost.author.name} · {new Date(selectedPost.createdAt).toLocaleDateString()}
                            </Typography>
                        </Box>

                        {selectedPost.youtubeUrl && renderVideo(selectedPost.youtubeUrl)}

                        {!selectedPost.youtubeUrl && (
                            <Box 
                                component="img" 
                                src={selectedPost.imageUrl || 'https://images.unsplash.com/photo-1576091160550-217359f42f4c?auto=format&fit=crop&q=80'} 
                                sx={{ 
                                    float: { xs: 'none', sm: 'left' },
                                    width: { xs: '100%', sm: '340px' },
                                    height: { xs: '300px', sm: '380px' },
                                    borderRadius: '24px', 
                                    mr: { sm: 4 }, 
                                    mb: { xs: 4, sm: 2 }, 
                                    objectFit: 'cover',
                                    boxShadow: '0 20px 40px rgba(0,0,0,0.06)',
                                    display: 'block',
                                    border: '1px solid rgba(0,0,0,0.05)'
                                }}
                            />
                        )}

                        <Typography 
                            className="sora" 
                            variant="body1" 
                            sx={{ 
                                lineHeight: 1.6, 
                                whiteSpace: 'pre-wrap', 
                                fontSize: { xs: '14px', sm: '16px' }, 
                                color: '#333',
                                mb: 6,
                                textAlign: 'justify'
                            }}
                        >
                            {selectedPost.content}
                        </Typography>

                        <Box sx={{ sx: { clear: 'both' } }} />

                        <Divider sx={{ mb: 4 }} />

                        <Box sx={{ p: 4, borderRadius: '24px', bgcolor: 'rgba(15, 110, 86, 0.05)', textAlign: 'center' }}>
                            <Typography variant="h6" className="fraunces" sx={{ fontWeight: 800, mb: 1 }}>
                                Interested in this topic?
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'var(--gray)', mb: 3 }}>
                                Our verified pharmacists are ready to provide the meds and advice mentioned in this article.
                            </Typography>
                            <Button 
                                variant="contained" 
                                onClick={onFindMeds}
                                sx={{ bgcolor: 'var(--green)', borderRadius: '12px', px: 6, py: 1.5, textTransform: 'none', fontWeight: 700 }}
                            >
                                Find Meds Now
                            </Button>
                        </Box>
                    </Box>
                </Box>
            )}
        </AnimatePresence>
    );
};

export default PulseContent;
