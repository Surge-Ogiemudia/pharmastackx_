import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { dbConnect } from '@/lib/mongoConnect';
import Post from '@/models/Post';
import SubscribeModal from '@/components/SubscribeModal';
import ArticleInteractions from '@/components/ArticleInteractions';

export const revalidate = 60;

async function getPost(slug: string) {
    await dbConnect();
    const post = await Post.findOne({ slug, status: 'published' }).lean();
    if (!post) return null;
    return JSON.parse(JSON.stringify(post));
}

export async function generateStaticParams() {
    await dbConnect();
    const posts = await Post.find({ status: 'published' }).select('slug').lean();
    return posts.map((p: any) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    const post = await getPost(slug);
    if (!post) return { title: 'Article not found | PSX Pulse' };

    const excerpt = post.blocks?.find((b: any) => b.type === 'paragraph')?.content?.slice(0, 160) || post.content?.slice(0, 160) || '';
    const image = post.blocks?.find((b: any) => b.type === 'image')?.content || post.imageUrl;

    return {
        title: `${post.title} | PSX Pulse`,
        description: excerpt,
        alternates: {
            canonical: `https://pharmastackx.com/pulse/${slug}`,
        },
        openGraph: {
            title: post.title,
            description: excerpt,
            type: 'article',
            publishedTime: post.createdAt,
            authors: [post.author?.name],
            siteName: 'PharmaStackX',
            ...(image ? { images: [{ url: image, alt: post.title }] } : {}),
        },
        twitter: {
            card: 'summary_large_image',
            title: post.title,
            description: excerpt,
            ...(image ? { images: [image] } : {}),
        },
    };
}

function getYoutubeId(url: string) {
    return url.split('v=')[1]?.split('&')[0] || url.split('/').pop() || '';
}

function renderBlock(block: any, index: number) {
    switch (block.type) {
        case 'paragraph':
            return <p key={index} style={{ lineHeight: 1.85, fontSize: '16px', color: '#2d2d2d', margin: '0 0 20px', textAlign: 'justify' }}>{block.content}</p>;
        case 'heading':
            return <h2 key={index} style={{ fontFamily: 'var(--font-fraunces), serif', fontWeight: 800, fontSize: 'clamp(20px, 4vw, 26px)', color: '#1a1a1a', margin: '40px 0 16px', paddingBottom: '8px', borderBottom: '2px solid rgba(15,110,86,0.15)' }}>{block.content}</h2>;
        case 'image':
            return (
                <div key={index} style={{ margin: '32px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#f8f9fa', borderRadius: '16px', padding: '16px' }}>
                    <img src={block.content} alt={block.caption || ''} style={{ maxHeight: '320px', maxWidth: '100%', objectFit: 'contain', borderRadius: '10px' }} />
                    {block.caption && <p style={{ margin: '12px 0 0', fontSize: '13px', color: '#999', fontStyle: 'italic', textAlign: 'center' }}>{block.caption}</p>}
                </div>
            );
        case 'video': {
            const videoId = getYoutubeId(block.content);
            return (
                <div key={index} style={{ margin: '32px 0' }}>
                    <div style={{ position: 'relative', paddingTop: '56.25%', borderRadius: '16px', overflow: 'hidden', background: '#000' }}>
                        <iframe style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
                            src={`https://www.youtube.com/embed/${videoId}`}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                    </div>
                    {block.caption && <p style={{ margin: '10px 0 0', fontSize: '13px', color: '#999', fontStyle: 'italic', textAlign: 'center' }}>{block.caption}</p>}
                </div>
            );
        }
        case 'quote':
            return (
                <blockquote key={index} style={{ margin: '32px 0', padding: '16px 24px', borderLeft: '4px solid #0f6e56', background: 'rgba(15,110,86,0.04)', borderRadius: '0 12px 12px 0' }}>
                    <p style={{ fontFamily: 'var(--font-fraunces), serif', fontStyle: 'italic', fontSize: '20px', color: '#1a1a1a', lineHeight: 1.6, margin: 0, fontWeight: 600 }}>&ldquo;{block.content}&rdquo;</p>
                </blockquote>
            );
        default:
            return null;
    }
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const post = await getPost(slug);
    if (!post) notFound();

    const wordCount = [
        ...(post.blocks?.filter((b: any) => ['paragraph', 'heading', 'quote'].includes(b.type)).map((b: any) => b.content) || []),
        post.content || ''
    ].join(' ').split(/\s+/).length;
    const readTime = Math.max(1, Math.ceil(wordCount / 200));

    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: post.title,
        description: post.blocks?.find((b: any) => b.type === 'paragraph')?.content?.slice(0, 160) || post.content?.slice(0, 160),
        image: post.blocks?.find((b: any) => b.type === 'image')?.content || post.imageUrl,
        datePublished: post.createdAt,
        dateModified: post.updatedAt,
        author: { '@type': 'Person', name: post.author?.name },
        publisher: { '@type': 'Organization', name: 'PharmaStackX', url: 'https://pharmastackx.com' },
        mainEntityOfPage: { '@type': 'WebPage', '@id': `https://pharmastackx.com/pulse/${post.slug}` },
    };

    return (
        <div style={{ minHeight: '100vh', background: '#fff', fontFamily: 'var(--font-sora), sans-serif' }}>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

            {/* Header */}
            <div style={{ background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.06)', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
                <Link href="/pulse" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', color: '#555', fontSize: '14px', fontWeight: 600 }}>
                    <span>←</span> <span>PSX Pulse</span>
                </Link>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <SubscribeModal />
                    <Link href="/" style={{ textDecoration: 'none', background: '#0f6e56', color: '#fff', padding: '8px 20px', borderRadius: '20px', fontSize: '13px', fontWeight: 700 }}>
                        Open App
                    </Link>
                </div>
            </div>

            {/* Article */}
            <article style={{ maxWidth: '720px', margin: '0 auto', padding: '40px 20px 80px' }}>
                {/* Meta */}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
                    <span style={{ background: 'rgba(15,110,86,0.08)', color: '#0f6e56', fontSize: '11px', fontWeight: 700, padding: '4px 12px', borderRadius: '20px', textTransform: 'uppercase' }}>{post.category}</span>
                    <span style={{ color: '#bbb', fontSize: '13px' }}>{readTime} min read</span>
                    <span style={{ color: '#bbb', fontSize: '13px' }}>{new Date(post.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                </div>

                {/* Title */}
                <h1 style={{ fontFamily: 'var(--font-fraunces), serif', fontSize: 'clamp(28px, 6vw, 40px)', fontWeight: 900, letterSpacing: '-1px', lineHeight: 1.15, color: '#1a1a1a', margin: '0 0 12px' }}>
                    {post.title}
                </h1>

                {/* Author */}
                <p style={{ color: '#999', fontSize: '13px', margin: '0 0 32px' }}>By {post.author?.name}</p>

                <hr style={{ border: 'none', borderTop: '1px solid rgba(0,0,0,0.08)', marginBottom: '32px' }} />

                {/* Body */}
                {post.blocks && post.blocks.length > 0
                    ? post.blocks.map((block: any, i: number) => renderBlock(block, i))
                    : (
                        <>
                            {post.youtubeUrl && (() => {
                                const videoId = getYoutubeId(post.youtubeUrl);
                                return (
                                    <div style={{ position: 'relative', paddingTop: '56.25%', borderRadius: '16px', overflow: 'hidden', background: '#000', marginBottom: '28px' }}>
                                        <iframe style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
                                            src={`https://www.youtube.com/embed/${videoId}`}
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                                    </div>
                                );
                            })()}
                            {!post.youtubeUrl && post.imageUrl && (
                                <div style={{ margin: '0 0 28px', display: 'flex', justifyContent: 'center', background: '#f8f9fa', borderRadius: '16px', padding: '16px' }}>
                                    <img src={post.imageUrl} alt={post.title} style={{ maxHeight: '260px', maxWidth: '100%', objectFit: 'contain', borderRadius: '10px' }} />
                                </div>
                            )}
                            <p style={{ lineHeight: 1.85, fontSize: '16px', color: '#2d2d2d', whiteSpace: 'pre-wrap', textAlign: 'justify' }}>{post.content}</p>
                        </>
                    )
                }

                <hr style={{ border: 'none', borderTop: '1px solid rgba(0,0,0,0.08)', margin: '48px 0 32px' }} />

                <ArticleInteractions
                    slug={post.slug}
                    initialViews={post.views || 0}
                    initialLikes={post.likes || 0}
                    initialShares={post.shares || 0}
                    showViews={post.showViews || false}
                    showLikes={post.showLikes || false}
                    showComments={post.showComments || false}
                    showShares={post.showShares || false}
                />

                {/* CTA */}
                <div style={{ background: 'rgba(15,110,86,0.05)', borderRadius: '20px', padding: '32px', textAlign: 'center' }}>
                    <h3 style={{ fontFamily: 'var(--font-fraunces), serif', fontWeight: 800, fontSize: '20px', margin: '0 0 8px', color: '#1a1a1a' }}>
                        {post.linkedMedicines?.length ? `Looking for ${post.linkedMedicines[0]}?` : 'Find the medicines in this article'}
                    </h3>
                    <p style={{ color: '#888', fontSize: '14px', margin: '0 0 20px' }}>
                        Verified pharmacists across Nigeria are ready to help.
                    </p>
                    <Link
                        href={post.linkedMedicines?.length
                            ? `/?view=orderMedicines&search=${encodeURIComponent(post.linkedMedicines[0])}`
                            : '/?view=orderMedicines'}
                        style={{ display: 'inline-block', textDecoration: 'none', background: '#0f6e56', color: '#fff', padding: '12px 36px', borderRadius: '12px', fontWeight: 700, fontSize: '15px' }}
                    >
                        Find Meds on PharmaStackX
                    </Link>
                </div>
            </article>
        </div>
    );
}
