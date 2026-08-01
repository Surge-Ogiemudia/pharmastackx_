import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import User from '@/models/User';
import Product from '@/models/Product';
import SocialPost from '@/models/SocialPost';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: Request) {
  try {
    await dbConnect();

    const body = await req.json();
    const { pharmacy_slug, pillar, customPrompt } = body;

    if (!pharmacy_slug) {
      return NextResponse.json({ success: false, error: 'Pharmacy slug is required' }, { status: 400 });
    }

    const user = await User.findOne({ slug: pharmacy_slug });
    if (!user) {
      return NextResponse.json({ success: false, error: 'Pharmacy user not found' }, { status: 404 });
    }

    // Determine Token Cost based on Pillar
    // Pillar 2 (Education Carousel) costs 3 tokens, others cost 1
    const tokenCost = pillar === 'education' ? 3 : 1;

    // Check & Handle Weekly Token Reset (7 Days)
    const now = new Date();
    let socialTokens = user.socialTokens || {
      weeklyTokens: 4,
      lastTokenReset: now,
      extraTokens: 0
    };

    const lastReset = socialTokens.lastTokenReset ? new Date(socialTokens.lastTokenReset) : now;
    const daysSinceReset = (now.getTime() - lastReset.getTime()) / (1000 * 3600 * 24);
    if (daysSinceReset >= 7) {
      socialTokens.weeklyTokens = 4;
      socialTokens.lastTokenReset = now;
    }

    const availableTokens = (socialTokens.weeklyTokens || 0) + (socialTokens.extraTokens || 0);

    if (availableTokens < tokenCost) {
      return NextResponse.json({
        success: false,
        error: `Insufficient tokens. This generation costs ${tokenCost} token(s), but you only have ${availableTokens} remaining.`,
        availableTokens
      }, { status: 402 });
    }

    // Fetch Products from pharmacy's inventory for contextual generation
    const products = await Product.find({ slug: pharmacy_slug, isPublished: true, amount: { $gt: 0 } })
      .sort({ quantity: -1, amount: -1 })
      .limit(15)
      .lean();

    const businessName = user.businessName || 'Our Pharmacy';
    const storeUrl = `${pharmacy_slug}.psx.ng`;

    // Connect to Google Gemini API
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
    let postTitle = '';
    let caption = '';
    let hashtags: string[] = [];
    let imageUrls: string[] = [];
    let featuredProducts: Array<{ name: string; price: number; image?: string }> = [];

    const randomSeed = Math.floor(Math.random() * 1000000);

    const createAiImageUrl = (promptText: string, seed: number) => {
      const sanitized = encodeURIComponent(`high end studio graphic design, photorealistic, 8k resolution, minimalist commercial product advertising, ${promptText}`);
      return `https://image.pollinations.ai/prompt/${sanitized}?width=1080&height=1080&seed=${seed}&nologo=true`;
    };

    if (apiKey) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ 
          model: 'gemini-2.0-flash',
          generationConfig: { responseMimeType: 'application/json' }
        });

        const inventorySummary = products.map(p => `- ${p.itemName} (Price: ₦${p.amount})`).join('\n');

        const systemPrompt = `You are an elite Social Media Manager & Graphic Designer for a Nigerian Pharmacy named "${businessName}". 
Store URL: https://${storeUrl}
Selected Content Pillar: "${pillar}"
User Custom Instruction: "${customPrompt || 'None'}"

Available Top In-Stock Products in Pharmacy Inventory:
${inventorySummary || 'General Pharmaceuticals and Skincare'}

Generate a JSON object matching this schema strictly:
{
  "title": "Short catchy post title with emoji",
  "caption": "Engaging, professional, highly relatable social media caption formatted with line breaks, emojis, and clear CTA to shop at https://${storeUrl}",
  "hashtags": ["#Hashtag1", "#Hashtag2", "#Hashtag3"],
  "imagePrompts": ["Detailed visual prompt describing a premium 8k graphic design advert image for slide 1"],
  "featuredProductNames": ["Exact product name from inventory if applicable"]
}

Guidelines:
- If pillar is "education", provide 3 slides content in caption and 3 distinct imagePrompts for a 3-slide carousel.
- Keep the tone warm, authoritative, medical yet accessible.
- Emphasize real-life value and genuine products available at ${businessName}.`;

        const result = await model.generateContent(systemPrompt);
        const jsonText = result.response.text();
        const aiData = JSON.parse(jsonText);

        postTitle = aiData.title || `${pillar.toUpperCase()} Highlight`;
        caption = aiData.caption || `Discover quality healthcare products at ${businessName}! Visit https://${storeUrl}`;
        hashtags = aiData.hashtags || ['#Health', '#Pharmacy', `#${pharmacy_slug}`];

        const promptsArray = Array.isArray(aiData.imagePrompts) && aiData.imagePrompts.length > 0 
          ? aiData.imagePrompts 
          : [`sleek medical product advertisement for ${businessName}`];

        imageUrls = promptsArray.map((promptStr: string, idx: number) => 
          createAiImageUrl(promptStr, randomSeed + idx)
        );

        if (Array.isArray(aiData.featuredProductNames)) {
          featuredProducts = products
            .filter(p => aiData.featuredProductNames.includes(p.itemName))
            .map(p => ({ name: p.itemName, price: p.amount, image: p.imageUrl }));
        }

      } catch (geminiError) {
        console.error('Gemini API Error, falling back to smart templates:', geminiError);
      }
    }

    // Fallback template logic if Gemini API call fails or key missing
    if (!caption) {
      const featured = products[0] || { itemName: 'Health Supplement', amount: 2500 };
      postTitle = `🌿 ${businessName} Featured Spotlight`;
      caption = `✨ Priority Healthcare at ${businessName}!\n\n` +
        `Discover genuine medicines and wellness essentials available today.\n\n` +
        `🛒 Order online now: https://${storeUrl}`;
      hashtags = ['#PharmacyCare', '#HealthLiving', `#${pharmacy_slug}`];
      imageUrls = [createAiImageUrl(`pharmaceutical product display on modern green counter`, randomSeed)];
      featuredProducts = [{ name: featured.itemName, price: featured.amount, image: featured.imageUrl }];
    }

    // Deduct Tokens
    const currentWeekly = socialTokens.weeklyTokens ?? 4;
    const currentExtra = socialTokens.extraTokens ?? 0;

    if (currentWeekly >= tokenCost) {
      socialTokens.weeklyTokens = currentWeekly - tokenCost;
    } else {
      const remainder = tokenCost - currentWeekly;
      socialTokens.weeklyTokens = 0;
      socialTokens.extraTokens = Math.max(0, currentExtra - remainder);
    }

    user.socialTokens = socialTokens;
    await user.save();

    // Save Social Post
    const newPost = await SocialPost.create({
      pharmacySlug: pharmacy_slug,
      pillar,
      title: postTitle,
      caption,
      imageUrls,
      hashtags,
      productLink: `https://${storeUrl}`,
      featuredProducts,
      tokenCost
    });

    return NextResponse.json({
      success: true,
      post: newPost,
      remainingTokens: (user.socialTokens.weeklyTokens || 0) + (user.socialTokens.extraTokens || 0),
      socialTokens: user.socialTokens
    });

  } catch (error: any) {
    console.error('Error in /api/social/generate:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
