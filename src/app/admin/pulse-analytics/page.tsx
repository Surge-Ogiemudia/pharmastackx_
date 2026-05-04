'use client';
import { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress, Chip, Divider } from '@mui/material';

interface PostStat {
    _id: string;
    title: string;
    slug: string;
    category: string;
    views: number;
    likes: number;
    shares: number;
    comments: number;
    pendingComments: number;
    showViews: boolean;
    showLikes: boolean;
    showComments: boolean;
    showShares: boolean;
    createdAt: string;
}

interface AnalyticsData {
    subscribers: number;
    totalViews: number;
    totalLikes: number;
    totalShares: number;
    totalComments: number;
    pendingComments: number;
    posts: PostStat[];
    dailyViews: { date: string; count: number }[];
}

interface AdminComment {
    _id: string;
    postSlug: string;
    name: string;
    content: string;
    approved: boolean;
    createdAt: string;
}

type Period = '7' | '30' | 'all';

function sumViews(daily: { date: string; count: number }[], days: number) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    return daily.filter(d => d.date >= cutoffStr).reduce((s, d) => s + d.count, 0);
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
    return (
        <button
            onClick={() => onChange(!value)}
            style={{
                background: value ? 'rgba(15,110,86,0.1)' : 'rgba(0,0,0,0.05)',
                border: `1.5px solid ${value ? 'rgba(15,110,86,0.3)' : 'rgba(0,0,0,0.1)'}`,
                borderRadius: '20px',
                padding: '3px 12px',
                fontSize: '11px',
                fontWeight: 700,
                color: value ? '#0f6e56' : '#999',
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.15s',
            }}
        >
            {label} {value ? 'ON' : 'OFF'}
        </button>
    );
}

export default function PulseAnalyticsPage() {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState<Period>('7');
    const [pendingComments, setPendingComments] = useState<AdminComment[]>([]);
    const [activeTab, setActiveTab] = useState<'overview' | 'posts' | 'comments'>('overview');

    useEffect(() => {
        fetch('/api/admin/pulse-analytics')
            .then(r => r.json())
            .then(d => { setData(d); setLoading(false); })
            .catch(() => setLoading(false));
        fetch('/api/admin/comments')
            .then(r => r.json())
            .then(d => Array.isArray(d) && setPendingComments(d.filter((c: AdminComment) => !c.approved)));
    }, []);

    const toggleSetting = async (postId: string, field: string, value: boolean) => {
        setData(prev => prev ? {
            ...prev,
            posts: prev.posts.map(p => p._id === postId ? { ...p, [field]: value } : p),
        } : prev);
        await fetch('/api/admin/pulse-analytics', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ postId, field, value }),
        });
    };

    const moderateComment = async (id: string, approved: boolean) => {
        await fetch('/api/admin/comments', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, approved }),
        });
        setPendingComments(prev => prev.filter(c => c._id !== id));
        if (data) setData(prev => prev ? { ...prev, pendingComments: prev.pendingComments - 1 } : prev);
    };

    const deleteComment = async (id: string) => {
        await fetch(`/api/admin/comments?id=${id}`, { method: 'DELETE' });
        setPendingComments(prev => prev.filter(c => c._id !== id));
    };

    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}><CircularProgress /></Box>;
    }

    if (!data) {
        return <Box sx={{ p: 4 }}><Typography color="error">Failed to load analytics.</Typography></Box>;
    }

    const viewsInPeriod = period === 'all' ? data.totalViews : sumViews(data.dailyViews, parseInt(period));
    const maxDay = Math.max(...data.dailyViews.map(d => d.count), 1);
    const recentDays = [...data.dailyViews].sort((a, b) => a.date.localeCompare(b.date)).slice(-14);

    const card = (label: string, value: number | string, sub?: string, accent?: string) => (
        <Box sx={{ background: '#fff', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.07)', p: '20px 24px', flex: '1 1 140px', minWidth: 0 }}>
            <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.5 }}>{label}</Typography>
            <Typography sx={{ fontSize: '28px', fontWeight: 900, color: accent || '#1a1a1a', letterSpacing: '-1px', lineHeight: 1 }}>{value}</Typography>
            {sub && <Typography sx={{ fontSize: '12px', color: '#aaa', mt: 0.5 }}>{sub}</Typography>}
        </Box>
    );

    const tabStyle = (t: string) => ({
        background: activeTab === t ? '#0f6e56' : 'transparent',
        color: activeTab === t ? '#fff' : '#666',
        border: '1.5px solid',
        borderColor: activeTab === t ? '#0f6e56' : 'rgba(0,0,0,0.1)',
        borderRadius: '20px',
        padding: '7px 20px',
        fontSize: '13px',
        fontWeight: 700,
        cursor: 'pointer',
        fontFamily: 'inherit',
        transition: 'all 0.15s',
    } as React.CSSProperties);

    return (
        <Box sx={{ maxWidth: '1100px', mx: 'auto', pb: 8 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                <Typography className="fraunces" variant="h5" sx={{ fontWeight: 900, letterSpacing: '-0.5px' }}>
                    PSX Pulse Analytics
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    {(['overview', 'posts', 'comments'] as const).map(t => (
                        <button key={t} style={tabStyle(t)} onClick={() => setActiveTab(t)}>
                            {t.charAt(0).toUpperCase() + t.slice(1)}
                            {t === 'comments' && data.pendingComments > 0 && (
                                <span style={{ marginLeft: '6px', background: '#e91e8c', color: '#fff', borderRadius: '10px', padding: '1px 7px', fontSize: '10px' }}>
                                    {data.pendingComments}
                                </span>
                            )}
                        </button>
                    ))}
                </Box>
            </Box>

            {activeTab === 'overview' && (
                <>
                    {/* Summary cards */}
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
                        {card('Subscribers', data.subscribers, 'confirmed')}
                        {card('Total Views', data.totalViews.toLocaleString())}
                        {card('Total Likes', data.totalLikes.toLocaleString(), undefined, '#e91e8c')}
                        {card('Total Shares', data.totalShares.toLocaleString(), undefined, '#0f6e56')}
                        {card('Comments', data.totalComments, `${data.pendingComments} pending`)}
                    </Box>

                    {/* Daily views chart */}
                    <Box sx={{ background: '#fff', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.07)', p: 3, mb: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                            <Typography sx={{ fontWeight: 800, fontSize: '15px' }}>
                                Site Visits — <span style={{ color: '#0f6e56' }}>{viewsInPeriod.toLocaleString()}</span>
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                {(['7', '30', 'all'] as Period[]).map(p => (
                                    <button key={p} onClick={() => setPeriod(p)} style={{
                                        background: period === p ? '#0f6e56' : 'transparent',
                                        color: period === p ? '#fff' : '#888',
                                        border: '1.5px solid',
                                        borderColor: period === p ? '#0f6e56' : 'rgba(0,0,0,0.1)',
                                        borderRadius: '14px', padding: '4px 12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                                    }}>
                                        {p === 'all' ? 'All time' : `${p}d`}
                                    </button>
                                ))}
                            </Box>
                        </Box>
                        {recentDays.length === 0 ? (
                            <Typography sx={{ color: '#aaa', textAlign: 'center', py: 3, fontSize: '14px' }}>No visit data yet.</Typography>
                        ) : (
                            <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '80px' }}>
                                {recentDays.map(d => (
                                    <Box key={d.date} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', height: '100%', justifyContent: 'flex-end' }} title={`${d.date}: ${d.count} visits`}>
                                        <Box sx={{ width: '100%', bgcolor: '#0f6e56', borderRadius: '3px 3px 0 0', opacity: 0.8, height: `${Math.max(4, (d.count / maxDay) * 70)}px` }} />
                                    </Box>
                                ))}
                            </Box>
                        )}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                            {recentDays.length > 0 && <>
                                <Typography sx={{ fontSize: '10px', color: '#ccc' }}>{recentDays[0]?.date}</Typography>
                                <Typography sx={{ fontSize: '10px', color: '#ccc' }}>{recentDays[recentDays.length - 1]?.date}</Typography>
                            </>}
                        </Box>
                    </Box>
                </>
            )}

            {activeTab === 'posts' && (
                <Box sx={{ background: '#fff', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.07)', overflow: 'hidden' }}>
                    <Box sx={{ overflowX: 'auto' }}>
                        <Box sx={{ minWidth: '700px' }}>
                    <Box sx={{ p: '16px 20px', borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'grid', gridTemplateColumns: '1fr 60px 60px 60px 60px 200px', gap: 1, alignItems: 'center' }}>
                        {['Post', 'Views', 'Likes', 'Shares', 'Cmts', 'Public visibility toggles'].map(h => (
                            <Typography key={h} sx={{ fontSize: '10px', fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</Typography>
                        ))}
                    </Box>
                    {data.posts.length === 0 ? (
                        <Typography sx={{ p: 4, textAlign: 'center', color: '#aaa', fontSize: '14px' }}>No published posts yet.</Typography>
                    ) : data.posts.map((post, i) => (
                        <Box key={post._id}>
                            {i > 0 && <Divider />}
                            <Box sx={{ p: '14px 20px', display: 'grid', gridTemplateColumns: '1fr 60px 60px 60px 60px 200px', gap: 1, alignItems: 'center' }}>
                                <Box>
                                    <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#1a1a1a', lineHeight: 1.3 }}>{post.title}</Typography>
                                    <Chip label={post.category} size="small" sx={{ mt: 0.5, height: 16, fontSize: '9px', bgcolor: 'rgba(15,110,86,0.06)', color: '#0f6e56', fontWeight: 700 }} />
                                </Box>
                                <Typography sx={{ fontSize: '13px', fontWeight: 600 }}>{(post.views || 0).toLocaleString()}</Typography>
                                <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#e91e8c' }}>{post.likes || 0}</Typography>
                                <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#0f6e56' }}>{post.shares || 0}</Typography>
                                <Typography sx={{ fontSize: '13px', fontWeight: 600 }}>
                                    {post.comments || 0}{(post.pendingComments || 0) > 0 && <span style={{ color: '#e91e8c', fontSize: '10px', marginLeft: '3px' }}>+{post.pendingComments}</span>}
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                    <Toggle label="Views" value={!!post.showViews} onChange={v => toggleSetting(post._id, 'showViews', v)} />
                                    <Toggle label="Likes" value={!!post.showLikes} onChange={v => toggleSetting(post._id, 'showLikes', v)} />
                                    <Toggle label="Cmts" value={!!post.showComments} onChange={v => toggleSetting(post._id, 'showComments', v)} />
                                    <Toggle label="Shares" value={!!post.showShares} onChange={v => toggleSetting(post._id, 'showShares', v)} />
                                </Box>
                            </Box>
                        </Box>
                    ))}
                        </Box>
                    </Box>
                </Box>
            )}

            {activeTab === 'comments' && (
                <Box>
                    {pendingComments.length === 0 ? (
                        <Box sx={{ background: '#fff', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.07)', p: 4, textAlign: 'center' }}>
                            <Typography sx={{ color: '#aaa', fontSize: '14px' }}>No pending comments.</Typography>
                        </Box>
                    ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {pendingComments.map(c => (
                                <Box key={c._id} sx={{ background: '#fff', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.07)', p: 3 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, flexWrap: 'wrap', gap: 1 }}>
                                        <Box>
                                            <Typography sx={{ fontWeight: 800, fontSize: '14px' }}>{c.name}</Typography>
                                            <Typography sx={{ fontSize: '11px', color: '#aaa' }}>
                                                on <span style={{ color: '#0f6e56' }}>/pulse/{c.postSlug}</span> · {new Date(c.createdAt).toLocaleDateString()}
                                            </Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', gap: 1 }}>
                                            <button onClick={() => moderateComment(c._id, true)} style={{ background: '#0f6e56', color: '#fff', border: 'none', borderRadius: '10px', padding: '6px 16px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                                                Approve
                                            </button>
                                            <button onClick={() => deleteComment(c._id)} style={{ background: 'rgba(229,57,53,0.1)', color: '#e53935', border: 'none', borderRadius: '10px', padding: '6px 16px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                                                Delete
                                            </button>
                                        </Box>
                                    </Box>
                                    <Typography sx={{ fontSize: '14px', color: '#444', lineHeight: 1.6, background: '#f8f9fa', borderRadius: '10px', p: '10px 14px' }}>
                                        {c.content}
                                    </Typography>
                                </Box>
                            ))}
                        </Box>
                    )}
                </Box>
            )}
        </Box>
    );
}
