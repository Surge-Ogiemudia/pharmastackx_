import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { dbConnect } from '@/lib/mongoConnect';
import DailyPost from '@/models/DailyPost';
import User from '@/models/User';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

function extractFirstJSON(text: string): string | null {
  const start = text.indexOf('{');
  if (start === -1) return null;
  let depth = 0, inString = false, escape = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\' && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) return text.slice(start, i + 1); }
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const { postId, reason } = await req.json();

    if (!postId || !reason) return NextResponse.json({ message: 'Missing fields' }, { status: 400 });

    const post = await DailyPost.findById(postId);
    if (!post) return NextResponse.json({ message: 'Post not found' }, { status: 404 });

    const pharmacy = await User.findById(post.pharmacyId);
    if (!pharmacy) return NextResponse.json({ message: 'User not found' }, { status: 404 });

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ message: 'GEMINI_API_KEY not configured' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    // AI Context string
    const brandKitContext = pharmacy.brandKit?.tagline ? `Tagline: ${pharmacy.brandKit.tagline}` : '';
    const contactContext = `Address: ${pharmacy.businessAddress || 'N/A'}, Phone: ${pharmacy.phoneNumber || 'N/A'}, City: ${pharmacy.city || 'N/A'}`;
    const photosContext = pharmacy.socialPhotos?.filter((p: any) => p.description).map((p: any) => p.description).join(', ') || 'No photos available';
    
    const baseContext = `You are designing a post for a Nigerian pharmacy named "${pharmacy.businessName}". 
Contact Info: ${contactContext}. 
${brandKitContext}
Known physical store context from photos: ${photosContext}.`;

    // 1. Generate new caption
    const txtModel = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });
    const txtPrompt = `${baseContext}
The user rejected the previous draft for the following reason: "${reason}".
Write a new short, engaging caption and provide an array of hashtags. Ensure you address their reason for rejection.
Return ONLY a JSON object with a "caption" string and "hashtags" array of strings.`;
    
    const txtRes = await txtModel.generateContent(txtPrompt);
    const txtJsonStr = extractFirstJSON(txtRes.response.text());
    
    let caption = post.caption;
    let hashtags = post.hashtags;
    if (txtJsonStr) {
      const tData = JSON.parse(txtJsonStr);
      caption = tData.caption || caption;
      hashtags = tData.hashtags || hashtags;
    }

    // 2. Generate new image
    let imageUrl = post.imageUrl;
    try {
      const imgModel = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-image' });
      const imgPrompt = `Design a stunning 1:1 social media post for Nigerian pharmacy "${pharmacy.businessName}". 
Context: ${contactContext}.
The user rejected the previous image because: "${reason}". Address this reason carefully. Make it clean and professional.`;
      
      const imgRes = await (imgModel as any).generateContent({
        contents: [{ role: 'user', parts: [{ text: imgPrompt }] }],
        generationConfig: { responseModalities: ['image'] },
      });
      const imgPart = imgRes.response.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
      if (imgPart?.inlineData) {
        imageUrl = `data:${imgPart.inlineData.mimeType};base64,${imgPart.inlineData.data}`;
      }
    } catch (imgErr) {
      console.error('Image gen failed during regeneration', imgErr);
    }

    post.caption = caption;
    post.hashtags = hashtags;
    post.imageUrl = imageUrl;
    post.status = 'ready_to_post';
    await post.save();

    return NextResponse.json({ success: true, post });
  } catch (error) {
    console.error('API /api/social/regenerate-post error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
