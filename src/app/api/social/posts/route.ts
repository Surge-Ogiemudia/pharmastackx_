import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import User from '@/models/User';
import SocialPost from '@/models/SocialPost';

export async function GET(req: Request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug');

    if (!slug) {
      return NextResponse.json({ success: false, error: 'Slug parameter is required' }, { status: 400 });
    }

    const user = await User.findOne({ slug });
    if (!user) {
      return NextResponse.json({ success: false, error: 'Pharmacy not found' }, { status: 404 });
    }

    // Check & Handle Weekly Token Reset (7 Days)
    const now = new Date();
    let socialTokens = user.socialTokens || {
      weeklyTokens: 4,
      lastTokenReset: now,
      extraTokens: 0
    };

    const daysSinceReset = (now.getTime() - new Date(socialTokens.lastTokenReset).getTime()) / (1000 * 3600 * 24);
    if (daysSinceReset >= 7) {
      socialTokens.weeklyTokens = 4;
      socialTokens.lastTokenReset = now;
      user.socialTokens = socialTokens;
      await user.save();
    }

    const posts = await SocialPost.find({ pharmacySlug: slug })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return NextResponse.json({
      success: true,
      subdomain: `${slug}.psx.ng`,
      socialTokens: {
        weeklyTokens: socialTokens.weeklyTokens ?? 4,
        extraTokens: socialTokens.extraTokens ?? 0,
        totalAvailable: (socialTokens.weeklyTokens ?? 4) + (socialTokens.extraTokens ?? 0),
        lastTokenReset: socialTokens.lastTokenReset
      },
      posts: posts.map(p => ({
        id: p._id.toString(),
        pillar: p.pillar,
        title: p.title,
        caption: p.caption,
        imageUrls: p.imageUrls,
        hashtags: p.hashtags,
        productLink: p.productLink,
        featuredProducts: p.featuredProducts,
        tokenCost: p.tokenCost,
        createdAt: p.createdAt
      }))
    });

  } catch (error: any) {
    console.error('Error in /api/social/posts:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
