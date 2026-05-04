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
    trackView?: boolean; // only true for the first mount on the actual article page
}

interface Comment {
    _id: string;
    name: string;
    content: string;
    createdAt: string;
}

const btn: React.CSSProperties = {
    background: 'transparent',
    border: '1.5px solid rgba(0,0,0,0.1)',
    borderRadius: '20px',
    padding: '6px 14px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 600,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontFamily: 'inherit',
    transition: 'all 0.15s',
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
        const alreadyLiked = localStorage.getItem(`psx_liked_${slug}`) === '1';
        setLiked(alreadyLiked);

        if (showComments) {
            fetch(`/api/pulse/comments?slug=${slug}`)
                .then(r => r.json())
                .then(data => Array.isArray(data) && setComments(data))
                .catch(() => {});
        }
    }, [slug, trackView, showComments]);

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

    const anyVisible = showViews || showLikes || showShares || showComments;
    if (!anyVisible) return null;

    return (
        <div style={{ marginTop: '32px' }}>
            {/* Stats / action bar */}
            {(showViews || showLikes || showShares) && (
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: showComments ? '28px' : '0' }}>
                    {showViews && (
                        <span style={{ ...btn, cursor: 'default', color: '#888', borderColor: 'rgba(0,0,0,0.07)' }}>
                            👁 {initialViews.toLocaleString()} views
                        </span>
                    )}
                    {showLikes && (
                        <button
                            onClick={handleLike}
                            style={{ ...btn, color: liked ? '#e91e8c' : '#555', borderColor: liked ? 'rgba(233,30,140,0.3)' : 'rgba(0,0,0,0.1)', background: liked ? 'rgba(233,30,140,0.05)' : 'transparent' }}
                        >
                            {liked ? '♥' : '♡'} {likes.toLocaleString()} {likes === 1 ? 'like' : 'likes'}
                        </button>
                    )}
                    {showShares && (
                        <button onClick={handleShare} style={{ ...btn, color: '#0f6e56', borderColor: 'rgba(15,110,86,0.2)' }}>
                            ↗ {shares.toLocaleString()} {shares === 1 ? 'share' : 'shares'}
                        </button>
                    )}
                </div>
            )}

            {/* Comments section */}
            {showComments && (
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#1a1a1a' }}>
                            Comments {comments.length > 0 && <span style={{ color: '#888', fontWeight: 400 }}>({comments.length})</span>}
                        </h3>
                        <button onClick={() => setShowForm(f => !f)} style={{ ...btn, color: '#0f6e56', borderColor: 'rgba(15,110,86,0.25)' }}>
                            {showForm ? '✕ Cancel' : '+ Leave a comment'}
                        </button>
                    </div>

                    {submitStatus === 'success' && (
                        <div style={{ background: 'rgba(15,110,86,0.08)', borderRadius: '12px', padding: '12px 16px', marginBottom: '16px', fontSize: '14px', color: '#0f6e56', fontWeight: 600 }}>
                            ✓ {submitMsg}
                        </div>
                    )}

                    {showForm && (
                        <form onSubmit={handleComment} style={{ background: '#f8f9fa', borderRadius: '16px', padding: '20px', marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <input
                                type="text" placeholder="Your name *" value={name} required
                                onChange={e => setName(e.target.value)}
                                style={{ padding: '10px 14px', borderRadius: '10px', border: '1.5px solid rgba(0,0,0,0.1)', fontSize: '14px', fontFamily: 'inherit', outline: 'none' }}
                            />
                            <textarea
                                placeholder="Write your comment…" value={commentText} required rows={4}
                                onChange={e => setCommentText(e.target.value)}
                                style={{ padding: '10px 14px', borderRadius: '10px', border: '1.5px solid rgba(0,0,0,0.1)', fontSize: '14px', fontFamily: 'inherit', outline: 'none', resize: 'vertical' }}
                            />
                            {submitStatus === 'error' && (
                                <p style={{ margin: 0, color: '#e53935', fontSize: '13px' }}>{submitMsg}</p>
                            )}
                            <button
                                type="submit" disabled={submitStatus === 'loading'}
                                style={{ alignSelf: 'flex-end', background: '#0f6e56', color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 24px', fontSize: '14px', fontWeight: 700, cursor: submitStatus === 'loading' ? 'not-allowed' : 'pointer', opacity: submitStatus === 'loading' ? 0.7 : 1, fontFamily: 'inherit' }}
                            >
                                {submitStatus === 'loading' ? 'Submitting…' : 'Submit'}
                            </button>
                        </form>
                    )}

                    {comments.length === 0 ? (
                        <p style={{ color: '#aaa', fontSize: '14px', textAlign: 'center', padding: '24px 0' }}>No comments yet. Be the first!</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {comments.map(c => (
                                <div key={c._id} style={{ background: '#f8f9fa', borderRadius: '14px', padding: '16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                        <span style={{ fontWeight: 700, fontSize: '14px', color: '#1a1a1a' }}>{c.name}</span>
                                        <span style={{ fontSize: '12px', color: '#bbb' }}>
                                            {new Date(c.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </span>
                                    </div>
                                    <p style={{ margin: 0, fontSize: '14px', color: '#444', lineHeight: 1.6 }}>{c.content}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
