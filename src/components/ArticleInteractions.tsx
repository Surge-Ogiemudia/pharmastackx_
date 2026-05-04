'use client';
import { useEffect, useState } from 'react';

interface Props {
    slug: string;
    initialViews: number;
    initialLikes: number;
    initialShares: number;
    showViews: boolean;
    showLikes: boolean;
    showComments: boolean;
    showShares: boolean;
    trackView?: boolean;
}

interface Comment {
    _id: string;
    name: string;
    content: string;
    createdAt: string;
}

const actionBtn: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '14px',
    fontWeight: 600,
    fontFamily: 'inherit',
    padding: '8px 0',
    color: '#555',
    transition: 'color 0.15s',
};

export default function ArticleInteractions({
    slug, initialViews, initialLikes, initialShares,
    showViews, showLikes, showComments, showShares, trackView = true,
}: Props) {
    const [likes, setLikes] = useState(initialLikes);
    const [shares, setShares] = useState(initialShares);
    const [liked, setLiked] = useState(false);
    const [comments, setComments] = useState<Comment[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [name, setName] = useState('');
    const [commentText, setCommentText] = useState('');
    const [submitStatus, setSubmitStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [submitMsg, setSubmitMsg] = useState('');

    useEffect(() => {
        if (trackView) {
            fetch('/api/pulse/track', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'view', slug }),
            }).catch(() => {});
        }
        setLiked(localStorage.getItem(`psx_liked_${slug}`) === '1');

        fetch(`/api/pulse/comments?slug=${slug}`)
            .then(r => r.json())
            .then(data => Array.isArray(data) && setComments(data))
            .catch(() => {});
    }, [slug, trackView]);

    const handleLike = () => {
        const action = liked ? 'unlike' : 'like';
        setLikes(prev => prev + (liked ? -1 : 1));
        setLiked(prev => !prev);
        if (liked) localStorage.removeItem(`psx_liked_${slug}`);
        else localStorage.setItem(`psx_liked_${slug}`, '1');
        fetch('/api/pulse/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, slug }),
        }).catch(() => {});
    };

    const handleShare = () => {
        const url = `${window.location.origin}/pulse/${slug}`;
        if (navigator.share) {
            navigator.share({ url }).catch(() => {});
        } else {
            navigator.clipboard.writeText(url).catch(() => {});
        }
        setShares(prev => prev + 1);
        fetch('/api/pulse/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'share', slug }),
        }).catch(() => {});
    };

    const handleComment = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitStatus('loading');
        try {
            const res = await fetch('/api/pulse/comments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ slug, name, content: commentText }),
            });
            const data = await res.json();
            if (res.ok) {
                setSubmitStatus('success');
                setSubmitMsg(data.message);
                setName('');
                setCommentText('');
                setShowForm(false);
            } else {
                setSubmitStatus('error');
                setSubmitMsg(data.message);
            }
        } catch {
            setSubmitStatus('error');
            setSubmitMsg('Something went wrong. Try again.');
        }
    };

    return (
        <div style={{ marginTop: '32px' }}>
            {/* View count — only if admin toggled on */}
            {showViews && (
                <p style={{ fontSize: '12px', color: '#aaa', margin: '0 0 16px' }}>
                    👁 {initialViews.toLocaleString()} views
                </p>
            )}

            {/* Action bar — always visible */}
            <div style={{ display: 'flex', gap: '24px', alignItems: 'center', borderTop: '1px solid rgba(0,0,0,0.07)', borderBottom: '1px solid rgba(0,0,0,0.07)', padding: '4px 0', marginBottom: '28px' }}>
                {/* Like */}
                <button
                    onClick={handleLike}
                    style={{ ...actionBtn, color: liked ? '#e91e8c' : '#555' }}
                    title={liked ? 'Unlike' : 'Like'}
                >
                    <span style={{ fontSize: '18px' }}>{liked ? '♥' : '♡'}</span>
                    {showLikes && (
                        <span style={{ fontSize: '13px', color: liked ? '#e91e8c' : '#888' }}>
                            {likes.toLocaleString()}
                        </span>
                    )}
                </button>

                {/* Comment */}
                <button
                    onClick={() => setShowForm(f => !f)}
                    style={{ ...actionBtn, color: showForm ? '#0f6e56' : '#555' }}
                    title="Comment"
                >
                    <span style={{ fontSize: '18px' }}>💬</span>
                    {showComments && (
                        <span style={{ fontSize: '13px', color: '#888' }}>
                            {comments.length.toLocaleString()}
                        </span>
                    )}
                </button>

                {/* Share */}
                <button onClick={handleShare} style={{ ...actionBtn }} title="Share">
                    <span style={{ fontSize: '18px' }}>↗</span>
                    {showShares && (
                        <span style={{ fontSize: '13px', color: '#888' }}>
                            {shares.toLocaleString()}
                        </span>
                    )}
                </button>
            </div>

            {/* Comment form */}
            {showForm && (
                <form onSubmit={handleComment} style={{ background: '#f8f9fa', borderRadius: '16px', padding: '20px', marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#1a1a1a' }}>Leave a comment</h4>
                    <input
                        type="text" placeholder="Your name *" value={name} required
                        onChange={e => setName(e.target.value)}
                        style={{ padding: '10px 14px', borderRadius: '10px', border: '1.5px solid rgba(0,0,0,0.1)', fontSize: '14px', fontFamily: 'inherit', outline: 'none', background: '#fff' }}
                    />
                    <textarea
                        placeholder="Write your comment…" value={commentText} required rows={4}
                        onChange={e => setCommentText(e.target.value)}
                        style={{ padding: '10px 14px', borderRadius: '10px', border: '1.5px solid rgba(0,0,0,0.1)', fontSize: '14px', fontFamily: 'inherit', outline: 'none', resize: 'vertical', background: '#fff' }}
                    />
                    {submitStatus === 'error' && (
                        <p style={{ margin: 0, color: '#e53935', fontSize: '13px' }}>{submitMsg}</p>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                        <button type="button" onClick={() => setShowForm(false)} style={{ background: 'transparent', border: '1.5px solid rgba(0,0,0,0.1)', borderRadius: '10px', padding: '9px 20px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', color: '#666' }}>
                            Cancel
                        </button>
                        <button type="submit" disabled={submitStatus === 'loading'} style={{ background: '#0f6e56', color: '#fff', border: 'none', borderRadius: '10px', padding: '9px 24px', fontSize: '13px', fontWeight: 700, cursor: submitStatus === 'loading' ? 'not-allowed' : 'pointer', opacity: submitStatus === 'loading' ? 0.7 : 1, fontFamily: 'inherit' }}>
                            {submitStatus === 'loading' ? 'Submitting…' : 'Submit'}
                        </button>
                    </div>
                </form>
            )}

            {submitStatus === 'success' && (
                <div style={{ background: 'rgba(15,110,86,0.08)', borderRadius: '12px', padding: '12px 16px', marginBottom: '20px', fontSize: '14px', color: '#0f6e56', fontWeight: 600 }}>
                    ✓ {submitMsg}
                </div>
            )}

            {/* Approved comments — always shown */}
            {comments.length > 0 && (
                <div>
                    <h4 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 800, color: '#1a1a1a' }}>
                        Comments{showComments && <span style={{ color: '#888', fontWeight: 400 }}> ({comments.length})</span>}
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {comments.map(c => (
                            <div key={c._id} style={{ background: '#f8f9fa', borderRadius: '14px', padding: '14px 16px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                    <span style={{ fontWeight: 700, fontSize: '13px', color: '#1a1a1a' }}>{c.name}</span>
                                    <span style={{ fontSize: '11px', color: '#ccc' }}>
                                        {new Date(c.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </span>
                                </div>
                                <p style={{ margin: 0, fontSize: '14px', color: '#444', lineHeight: 1.6 }}>{c.content}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
