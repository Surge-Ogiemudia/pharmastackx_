import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { dbConnect } from '@/lib/mongoConnect';
import DailyPost from '@/models/DailyPost';
import User from '@/models/User';
import ContentPlan from '@/models/ContentPlan';
import { uploadBase64ToBlob } from '@/lib/uploadToBlob';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const { postId } = await req.json();
    if (!postId) return NextResponse.json({ message: 'Missing postId' }, { status: 400 });

    const post = await DailyPost.findById(postId);
    if (!post) return NextResponse.json({ message: 'Post not found' }, { status: 404 });

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ message: 'GEMINI_API_KEY not configured' }, { status: 500 });
    }

    const pharmacy = await User.findById(post.pharmacyId);
    if (!pharmacy) return NextResponse.json({ message: 'User not found' }, { status: 404 });

    // Get topic from content plan schedule
    const plan = await ContentPlan.findOne({ pharmacyId: post.pharmacyId, status: 'active' }).sort({ createdAt: -1 });
    const scheduledDate = new Date(post.scheduledDate);
    const topicItem = plan?.schedule.find((s: any) => {
      const sd = new Date(s.date);
      return sd.getUTCDate()  === scheduledDate.getUTCDate()  &&
             sd.getUTCMonth() === scheduledDate.getUTCMonth() &&
             sd.getUTCFullYear() === scheduledDate.getUTCFullYear();
    });
    const topic = topicItem?.topic || post.caption?.slice(0, 60) || 'Pharmacy health tip';

    const brandKitContext = pharmacy.brandKit?.tagline ? `Tagline: ${pharmacy.brandKit.tagline}` : '';
    const contactContext  = `Address: ${pharmacy.businessAddress || 'N/A'}, Phone: ${pharmacy.phoneNumber || 'N/A'}, City: ${pharmacy.city || 'N/A'}`;
    const baseContext = `Pharmacy: "${pharmacy.businessName || 'Pharmacy'}", ${contactContext}. ${brandKitContext}`;

    const genAI    = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const imgModel = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-image' });

    const imgRes = await (imgModel as any).generateContent({
      contents: [{ role: 'user', parts: [{ text: `${baseContext}\nDesign a stunning 1:1 social media post. Topic: ${topic}. Clean, professional, pharmacy branding.` }] }],
      generationConfig: { responseModalities: ['image'] },
    });

    const imgPart = imgRes.response.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
    if (!imgPart?.inlineData) {
      return NextResponse.json({ message: 'No image returned by model', post }, { status: 200 });
    }

    const imageUrl = await uploadBase64ToBlob(
      imgPart.inlineData.data,
      imgPart.inlineData.mimeType,
      `social/${pharmacy._id}/post-${postId}.jpg`
    );

    if (imageUrl) {
      post.imageUrl = imageUrl;
      await post.save();
    }

    return NextResponse.json({ success: true, post });
  } catch (error) {
    console.error('generate-image error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
