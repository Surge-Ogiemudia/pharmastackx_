import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import User from '@/models/User';
import Product from '@/models/Product';
import SocialPost from '@/models/SocialPost';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Gemini image generation can take 15-30s; Vercel's default is 10s
export const maxDuration = 60;

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

    // Fetch recent posts for anti-repetition
    const recentPosts = await SocialPost.find({ pharmacySlug: pharmacy_slug })
      .sort({ createdAt: -1 })
      .limit(3)
      .lean();
    const recentTopics = recentPosts.map((p) => p.topic || p.title).filter(Boolean);

    const businessName = user.businessName || 'Our Pharmacy';
    const storeUrl = `${pharmacy_slug}.psx.ng`;

    // Connect to Google Gemini API
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
    let postTitle = '';
    let generatedTopic = '';
    let caption = '';
    let hashtags: string[] = [];
    let imageUrls: string[] = [];
    let featuredProducts: Array<{ name: string; price: number; image?: string }> = [];

    const randomSeed = Math.floor(Math.random() * 1000000);

    const createAiImageUrl = async (promptText: string, seed: number) => {
      if (apiKey) {
        try {
          const enrichedPrompt = `Design a high-end, premium quality social media graphic design advertisement for a pharmacy. It should look like a professional Canva template or agency design. The composition should be visually stunning and ready for Instagram. Context: ${promptText}`;
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: enrichedPrompt }] }] })
          });
          const data = await response.json();
          const base64Data = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
          const mimeType = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.mimeType || 'image/jpeg';
          
          if (base64Data) {
            return `data:${mimeType};base64,${base64Data}`;
          }
        } catch (err: any) {
          console.error('Gemini Image API Error:', err?.message || err);
        }
      }
      const sanitized = encodeURIComponent(`high end studio graphic design, photorealistic, 8k resolution, minimalist commercial product advertising, ${promptText}`);
      return `https://image.pollinations.ai/prompt/${sanitized}?width=1080&height=1080&seed=${seed}&nologo=true`;
    };

    if (apiKey) {
      const genAI = new GoogleGenerativeAI(apiKey);
      const candidateModels = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];

      const inventorySummary = products.map(p => `- ${p.itemName} (Price: ₦${p.amount})`).join('\n');

      const brandTone = user.brandContext?.tone || 'Warm, authoritative, medical yet accessible';
      const brandAudience = user.brandContext?.audience || 'General pharmacy customers';
      const brandVisuals = user.brandContext?.visualStyle || 'Clean, premium Canva-style agency design';
      
      const dayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });

      const systemPrompt = `You are the dedicated creative director and Social Media Manager for a Nigerian Pharmacy named "${businessName}".
Store URL: https://${storeUrl}
Target Audience: ${brandAudience}
Brand Tone/Voice: ${brandTone}
Visual Identity: ${brandVisuals}

Today is ${dayName}.
Selected Content Strategy: "${pillar}"
User Custom Instruction: "${customPrompt || 'None'}"

CRITICAL ANTI-REPETITION RULE: 
You MUST NOT repeat these topics that were covered in the last 3 posts: ${recentTopics.join(', ') || 'None'}.

Available Top In-Stock Products in Pharmacy Inventory:
${inventorySummary || 'General Pharmaceuticals and Skincare'}

Generate a JSON object matching this schema strictly:
{
  "title": "Short catchy post title with emoji",
  "topic": "A 2-3 word summary of the exact specific topic of this post (e.g. 'Malaria Prevention', 'Vitamin C Spotlight')",
  "caption": "Engaging, highly relatable social media caption written strictly in the Brand Tone. Use line breaks, emojis, and clear CTA to shop at https://${storeUrl}",
  "hashtags": ["#Hashtag1", "#Hashtag2", "#Hashtag3"],
  "imagePrompts": ["Detailed visual prompt describing a premium 8k graphic design advert image that strictly follows the Visual Identity."],
  "featuredProductNames": ["Exact product name from inventory if applicable"]
}

Guidelines:
- If strategy is "education" or carousel, provide 3 distinct imagePrompts.
- Emphasize real-life value and genuine products available at ${businessName}.
- Keep it highly relevant to the Nigerian context.`;

      for (const modelName of candidateModels) {
        try {
          const model = genAI.getGenerativeModel({ 
            model: modelName,
            generationConfig: { responseMimeType: 'application/json' }
          });

          const result = await model.generateContent(systemPrompt);
          const jsonText = result.response.text();
          const aiData = JSON.parse(jsonText);

          postTitle = aiData.title || `${pillar.toUpperCase()} Highlight`;
          generatedTopic = aiData.topic || postTitle;
          caption = aiData.caption || `Discover quality healthcare products at ${businessName}! Visit https://${storeUrl}`;
          hashtags = aiData.hashtags || ['#Health', '#Pharmacy', `#${pharmacy_slug}`];

          const promptsArray = Array.isArray(aiData.imagePrompts) && aiData.imagePrompts.length > 0 
            ? aiData.imagePrompts 
            : [`sleek medical product advertisement for ${businessName}, ${brandVisuals}`];

          imageUrls = await Promise.all(promptsArray.map((promptStr: string, idx: number) => 
            createAiImageUrl(promptStr, randomSeed + idx)
          ));

          if (Array.isArray(aiData.featuredProductNames)) {
            featuredProducts = products
              .filter(p => aiData.featuredProductNames.includes(p.itemName))
              .map(p => ({ name: p.itemName, price: p.amount, image: p.imageUrl }));
          }

          // Successfully generated with modelName! Break loop.
          break;

        } catch (geminiError: any) {
          console.error(`Gemini API Error with model ${modelName}:`, geminiError.message);
        }
      }
    }

    // Fallback template logic if Gemini API call fails or key missing
    if (!caption) {
      const featured = products[0] || { itemName: 'Health Supplement', amount: 2500 };
      postTitle = 'Store Highlight';
      caption = `Looking for the best ${featured.itemName}? We have it in stock for just ₦${featured.amount}!\n\n` +
          `Discover genuine medicines and wellness essentials available today.\n\n` +
          `🛒 Order online now: https://${storeUrl}`;
      hashtags = ['#PharmacyCare', '#HealthLiving', `#${pharmacy_slug}`];
      imageUrls = [await createAiImageUrl(`pharmaceutical product display on modern green counter`, randomSeed)];
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

    // Extract ObjectIds for featured products
    const featuredProductIds = products
      .filter(p => featuredProducts.some(fp => fp.name === p.itemName))
      .map(p => p._id);

    // Save Social Post
    const newPost = await SocialPost.create({
      pharmacySlug: pharmacy_slug,
      pillar,
      topic: generatedTopic || postTitle,
      title: postTitle,
      caption,
      imageUrls,
      hashtags,
      productLink: `https://${storeUrl}`,
      featuredProducts,
      featuredProductIds,
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
