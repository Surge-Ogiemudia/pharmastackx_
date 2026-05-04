import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import Post from '@/models/Post';
import User from '@/models/User';
import Subscriber from '@/models/Subscriber';
import { transporter } from '@/lib/nodemailer';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

// Helper function to create a URL-friendly slug
const createSlug = (title: string) => {
  return title
    .toLowerCase()
    .trim()
    .replace(/ /g, '-')
    .replace(/[^\w-]+/g, '');
};

async function notifySubscribers(post: any) {
    const origin = process.env.NEXT_PUBLIC_BASE_URL || 'https://pharmastackx.com';
    const subscribers = await Subscriber.find({ confirmed: true }).select('email').lean();
    if (!subscribers.length) return;

    const excerpt = post.blocks?.find((b: any) => b.type === 'paragraph')?.content?.slice(0, 200)
        || post.content?.slice(0, 200) || '';
    const cover = post.blocks?.find((b: any) => b.type === 'image')?.content || post.imageUrl || '';
    const articleUrl = `${origin}/pulse/${post.slug}`;

    const html = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f8f8f6;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:20px;overflow:hidden;border:1px solid rgba(0,0,0,0.07);">
        <tr>
          <td style="background:#0f6e56;padding:22px 32px;">
            <h1 style="margin:0;font-size:20px;color:#fff;font-weight:800;letter-spacing:-0.5px;">
              PharmaStack<span style="color:#e91e8c">X</span> &nbsp;<em style="font-style:italic;font-weight:300;">Pulse</em>
            </h1>
          </td>
        </tr>
        ${cover ? `<tr><td style="background:#f8f9fa;padding:20px;text-align:center;"><img src="${cover}" alt="" style="max-height:200px;max-width:100%;border-radius:12px;object-fit:contain;" /></td></tr>` : ''}
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#0f6e56;text-transform:uppercase;letter-spacing:0.08em;">${post.category}</p>
            <h2 style="margin:0 0 14px;font-size:22px;color:#1a1a1a;font-weight:900;line-height:1.2;letter-spacing:-0.5px;">${post.title}</h2>
            ${excerpt ? `<p style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.65;">${excerpt}…</p>` : ''}
            <a href="${articleUrl}" style="display:inline-block;background:#0f6e56;color:#fff;text-decoration:none;padding:13px 32px;border-radius:12px;font-size:14px;font-weight:700;">
              Read Article →
            </a>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 32px;border-top:1px solid rgba(0,0,0,0.06);">
            <p style="margin:0;font-size:11px;color:#bbb;">
              © PharmaStackX &nbsp;·&nbsp;
              <a href="${origin}/pulse" style="color:#0f6e56;text-decoration:none;">Visit PSX Pulse</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    await Promise.all(
        subscribers.map(s =>
            transporter.sendMail({
                from: `"PSX Pulse" <${process.env.EMAIL_USER}>`,
                to: s.email,
                subject: `New on PSX Pulse: ${post.title}`,
                html,
            }).catch(err => console.error(`NOTIFY_SEND_ERROR ${s.email}`, err.message))
        )
    );
}

// Helper: Authorize Admin using the standard session_token
async function authorizeAdmin() {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session_token');
    if (!sessionToken || !sessionToken.value) return null;
    try {
        const payload: any = jwt.verify(sessionToken.value, JWT_SECRET);
        const user = await User.findById(payload.userId).lean();
        if (user && user.role === 'admin') return user;
        return null;
    } catch (e) {
        return null;
    }
}

export async function GET(req: NextRequest) {
    try {
        await dbConnect();
        const { searchParams } = new URL(req.url);
        
        // Supports filtering by slug for individual post view
        const slug = searchParams.get('slug');
        if (slug) {
            const post = await Post.findOne({ slug }).lean();
            if (!post) return NextResponse.json({ message: 'Post not found' }, { status: 404 });
            return NextResponse.json(post, {
                headers: { 'Cache-Control': 's-maxage=120, stale-while-revalidate=600' }
            });
        }

        const limit = parseInt(searchParams.get('limit') || '20');
        const page = parseInt(searchParams.get('page') || '1');
        const skip = (page - 1) * limit;
        const status = searchParams.get('status'); // Filter by status (e.g., 'published')

        let query: any = {};
        if (status) query.status = status;

        const posts = await Post.find(query)
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip(skip)
            .lean();

        return NextResponse.json(posts, {
            headers: { 'Cache-Control': 's-maxage=120, stale-while-revalidate=600' }
        });
    } catch (error: any) {
        console.error('API_GET_POSTS_ERROR', error);
        return NextResponse.json({ message: 'Failed to fetch posts' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const admin: any = await authorizeAdmin();
    if (!admin) return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });

    try {
        await dbConnect();
        const body = await req.json();
        const { title, content, category, imageUrl, youtubeUrl, blocks, linkedMedicines, linkedPharmacy, linkedProduct, seoKeywords, status, authorName } = body;

        if (!title || !category) {
            return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
        }

        const slug = createSlug(title);
        const newPost = new Post({
            title,
            content: content || (blocks?.find((b: any) => b.type === 'paragraph')?.content ?? ''),
            category,
            imageUrl,
            youtubeUrl,
            blocks: blocks || [],
            linkedMedicines: linkedMedicines || [],
            slug,
            author: {
                name: authorName || admin.username || 'Admin',
                id: admin._id.toString(),
            },
            ...(linkedPharmacy ? { linkedPharmacy } : {}),
            ...(linkedProduct ? { linkedProduct } : {}),
            seoKeywords,
            status: status || 'draft',
        });

        await newPost.save();
        if (newPost.status === 'published') {
            notifySubscribers(newPost).catch(err => console.error('NOTIFY_ERROR', err.message));
        }
        return NextResponse.json(newPost, { status: 201 });
    } catch (error: any) {
        console.error('API_POST_BLOG_ERROR', error);
        return NextResponse.json({ message: 'Failed to create post', error: error.message }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    const admin = await authorizeAdmin();
    if (!admin) return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });

    try {
        await dbConnect();
        const body = await req.json();
        const { id, authorName, blocks, linkedMedicines, ...updateData } = body;
        if (blocks !== undefined) updateData.blocks = blocks;
        if (linkedMedicines !== undefined) updateData.linkedMedicines = linkedMedicines;

        if (!id) return NextResponse.json({ message: 'Missing post ID' }, { status: 400 });

        if (updateData.title) {
            updateData.slug = createSlug(updateData.title);
        }

        if (authorName) {
            updateData['author.name'] = authorName;
        }

        if (updateData.linkedPharmacy === "") updateData.linkedPharmacy = null;
        if (updateData.linkedProduct === "") updateData.linkedProduct = null;

        const oldPost = await Post.findById(id).select('status').lean() as { status?: string } | null;
        const updatedPost = await Post.findByIdAndUpdate(id, updateData, { new: true });
        if (!updatedPost) return NextResponse.json({ message: 'Post not found' }, { status: 404 });

        if (updateData.status === 'published' && oldPost?.status !== 'published') {
            notifySubscribers(updatedPost).catch(err => console.error('NOTIFY_ERROR', err.message));
        }

        return NextResponse.json(updatedPost);
    } catch (error: any) {
        console.error('API_PUT_BLOG_ERROR', error);
        return NextResponse.json({ message: 'Failed to update post', error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    const admin = await authorizeAdmin();
    if (!admin) return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });

    try {
        await dbConnect();
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ message: 'Missing post ID' }, { status: 400 });

        const deletedPost = await Post.findByIdAndDelete(id);
        if (!deletedPost) return NextResponse.json({ message: 'Post not found' }, { status: 404 });

        return NextResponse.json({ message: 'Post deleted successfully' });
    } catch (error: any) {
        console.error('API_DELETE_BLOG_ERROR', error);
        return NextResponse.json({ message: 'Failed to delete post' }, { status: 500 });
    }
}
