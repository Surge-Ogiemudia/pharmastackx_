import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import Post from '@/models/Post';
import User from '@/models/User';
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
            return NextResponse.json(post);
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

        return NextResponse.json(posts);
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
        const { title, content, category, imageUrl, youtubeUrl, linkedPharmacy, linkedProduct, seoKeywords, status, authorName } = body;

        if (!title || !content || !category) {
            return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
        }

        const slug = createSlug(title);
        const newPost = new Post({
            title,
            content,
            category,
            imageUrl,
            youtubeUrl,
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
        const { id, authorName, ...updateData } = body;

        if (!id) return NextResponse.json({ message: 'Missing post ID' }, { status: 400 });

        if (updateData.title) {
            updateData.slug = createSlug(updateData.title);
        }

        if (authorName) {
            updateData['author.name'] = authorName;
        }

        if (updateData.linkedPharmacy === "") updateData.linkedPharmacy = null;
        if (updateData.linkedProduct === "") updateData.linkedProduct = null;

        const updatedPost = await Post.findByIdAndUpdate(id, updateData, { new: true });
        if (!updatedPost) return NextResponse.json({ message: 'Post not found' }, { status: 404 });

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
