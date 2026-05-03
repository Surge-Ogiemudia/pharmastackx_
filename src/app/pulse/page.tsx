import type { Metadata } from 'next';
import Link from 'next/link';
import { dbConnect } from '@/lib/mongoConnect';
import Post from '@/models/Post';
import SubscribeModal from './SubscribeModal';

export const revalidate = 60;

export const metadata: Metadata = {
    title: 'PSX Pulse | PharmaStackX',
    description: 'Real-time trends, pharmacist insights, and health vlogs from PharmaStackX.',
    alternates: {
        canonical: 'https://pharmastackx.com/pulse',
    },
    openGraph: {
        title: 'PSX Pulse | PharmaStackX',
        description: 'Real-time trends, pharmacist insights, and health vlogs.',
        type: 'website',
        siteName: 'PharmaStackX',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'PSX Pulse | PharmaStackX',
        description: 'Real-time trends, pharmacist insights, and health vlogs.',
    },
};

async function getPosts() {
    await dbConnect();
    const posts = await Post.find({ status: 'published' }).sort({ createdAt: -1 }).limit(20).lean();
    return JSON.parse(JSON.stringify(posts));
}

function getCoverImage(post: any): string {
    if (post.blocks?.length) {
        const img = post.blocks.find((b: any) => b.type === 'image');
        if (img?.content) return img.content;
    }
    return post.imageUrl || '';
}

function getExcerpt(post: any): string {
    if (post.blocks?.length) {
        const para = post.blocks.find((b: any) => b.type === 'paragraph');
        if (para?.content) return para.content.slice(0, 160);
    }
    return (post.content || '').slice(0, 160);
}

export default async function PulsePage({ searchParams }: { searchParams: Promise<{ subscribed?: string }> }) {
    const posts = await getPosts();
    const { subscribed } = await searchParams;

    return (
        <div style={{ minHeight: '100vh', background: '#fafaf8', fontFamily: 'var(--font-sora), sans-serif' }}>
            {/* Header */}
            <div style={{ background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.06)', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
                <Link href="/" style={{ textDecoration: 'none' }}>
                    <span style={{ fontFamily: 'var(--font-fraunces), serif', fontWeight: 900, fontSize: '20px', color: '#1a1a1a', letterSpacing: '-0.5px' }}>
                        PharmaStack<span style={{ color: '#e91e8c' }}>X</span>
                    </span>
                </Link>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <SubscribeModal />
                    <Link href="/" style={{ textDecoration: 'none', background: '#0f6e56', color: '#fff', padding: '8px 20px', borderRadius: '20px', fontSize: '13px', fontWeight: 700 }}>
                        Open App
                    </Link>
                </div>
            </div>

            {subscribed === 'true' && (
                <div style={{ background: '#0f6e56', color: '#fff', textAlign: 'center', padding: '14px 24px', fontSize: '14px', fontWeight: 600 }}>
                    🎉 You&apos;re subscribed! Welcome to PSX Pulse.
                </div>
            )}
            {subscribed === 'error' && (
                <div style={{ background: '#fff3e0', color: '#e65100', textAlign: 'center', padding: '14px 24px', fontSize: '14px', fontWeight: 600 }}>
                    That confirmation link is invalid or already used. Try subscribing again.
                </div>
            )}

            <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 20px 80px' }}>
                {/* Hero */}
                <div style={{ textAlign: 'center', marginBottom: '48px' }}>
                    <h1 style={{ fontFamily: 'var(--font-fraunces), serif', fontSize: 'clamp(36px, 8vw, 56px)', fontWeight: 900, letterSpacing: '-2px', margin: '0 0 12px', color: '#1a1a1a' }}>
                        PSX <em style={{ color: '#0f6e56', fontStyle: 'italic' }}>Pulse</em>
                    </h1>
                    <p style={{ color: '#777', fontSize: '16px', fontWeight: 300, margin: 0 }}>
                        Real-time trends, pharmacist insights, and health vlogs.
                    </p>
                </div>

                {posts.length === 0 && (
                    <p style={{ textAlign: 'center', color: '#aaa' }}>No articles published yet.</p>
                )}

                {/* Featured first post */}
                {posts.length > 0 && (() => {
                    const post = posts[0];
                    const cover = getCoverImage(post);
                    const excerpt = getExcerpt(post);
                    return (
                        <Link href={`/pulse/${post.slug}`} style={{ textDecoration: 'none' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, borderRadius: '20px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.06)', background: '#fff', marginBottom: '32px', transition: 'box-shadow 0.2s' }}>
                                {cover && (
                                    <div style={{ background: '#f8f9fa', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '24px', minHeight: '220px' }}>
                                        <img src={cover} alt={post.title} style={{ maxHeight: '200px', maxWidth: '100%', objectFit: 'contain', borderRadius: '12px' }} />
                                    </div>
                                )}
                                <div style={{ padding: '24px' }}>
                                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
                                        <span style={{ background: 'rgba(15,110,86,0.08)', color: '#0f6e56', fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '20px', textTransform: 'uppercase' }}>{post.category}</span>
                                        <span style={{ color: '#aaa', fontSize: '12px' }}>{new Date(post.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <h2 style={{ fontFamily: 'var(--font-fraunces), serif', fontSize: 'clamp(22px, 4vw, 30px)', fontWeight: 900, color: '#1a1a1a', margin: '0 0 12px', lineHeight: 1.2, letterSpacing: '-0.5px' }}>{post.title}</h2>
                                    {excerpt && <p style={{ color: '#666', fontSize: '14px', lineHeight: 1.6, margin: '0 0 16px', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as any}>{excerpt}</p>}
                                    <span style={{ color: '#0f6e56', fontWeight: 700, fontSize: '14px' }}>Read More →</span>
                                </div>
                            </div>
                        </Link>
                    );
                })()}

                {/* Grid for rest */}
                {posts.length > 1 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px' }}>
                        {posts.slice(1).map((post: any) => {
                            const cover = getCoverImage(post);
                            const excerpt = getExcerpt(post);
                            return (
                                <Link key={post._id} href={`/pulse/${post.slug}`} style={{ textDecoration: 'none' }}>
                                    <div style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.06)', background: '#fff', height: '100%', display: 'flex', flexDirection: 'column' }}>
                                        <div style={{ background: '#f8f9fa', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px', height: '160px' }}>
                                            <img src={cover || 'https://images.unsplash.com/photo-1576091160550-217359f42f4c?auto=format&fit=crop&q=80&w=400'} alt={post.title} style={{ maxHeight: '140px', maxWidth: '100%', objectFit: 'contain' }} />
                                        </div>
                                        <div style={{ padding: '16px', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ background: 'rgba(15,110,86,0.08)', color: '#0f6e56', fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '20px', textTransform: 'uppercase', display: 'inline-block', marginBottom: '10px' }}>{post.category}</span>
                                            <h3 style={{ fontFamily: 'var(--font-fraunces), serif', fontSize: '17px', fontWeight: 800, color: '#1a1a1a', margin: '0 0 8px', lineHeight: 1.25 }}>{post.title}</h3>
                                            {excerpt && <p style={{ color: '#888', fontSize: '12px', lineHeight: 1.5, margin: '0 0 12px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', flexGrow: 1 } as any}>{excerpt}</p>}
                                            <span style={{ color: '#0f6e56', fontWeight: 700, fontSize: '12px', marginTop: 'auto' }}>Read More →</span>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
