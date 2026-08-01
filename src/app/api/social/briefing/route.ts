import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import User from '@/models/User';
import Product from '@/models/Product';
import SocialPost from '@/models/SocialPost';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getUpcomingEvents } from '@/lib/healthCalendar';

export const maxDuration = 60;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const pharmacy_slug = searchParams.get('pharmacy_slug');

    if (!pharmacy_slug) {
      return NextResponse.json({ success: false, error: 'Pharmacy slug is required' }, { status: 400 });
    }

    await dbConnect();
    const user = await User.findOne({ slug: pharmacy_slug });
    if (!user) {
      return NextResponse.json({ success: false, error: 'Pharmacy user not found' }, { status: 404 });
    }

    // 1. Fetch recent posts
    const recentPosts = await SocialPost.find({ pharmacySlug: pharmacy_slug })
      .sort({ createdAt: -1 })
      .limit(7)
      .lean();

    const recentTopics = recentPosts.map((p) => p.topic || p.title).filter(Boolean);
    const recentProductIds = recentPosts.flatMap((p) => (p as any).featuredProductIds || []);

    // 2. Scan Inventory (find products NOT recently promoted, but with good stock)
    const allProducts = await Product.find({ slug: pharmacy_slug, isPublished: true, amount: { $gt: 0 } })
      .sort({ quantity: -1, amount: -1 })
      .limit(30)
      .lean();

    const recommendedProducts = allProducts.filter(
      (p) => !recentProductIds.some((id) => id.toString() === p._id.toString())
    ).slice(0, 3); // Top 3 to recommend

    // 3. Check Calendar
    const upcomingEvents = getUpcomingEvents(7); // Next 7 days

    // 4. Determine day's strategy
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = new Date();
    const dayName = days[today.getDay()];
    
    let defaultStrategy = '';
    let suggestedPillar = 'wellness';
    
    switch (dayName) {
      case 'Monday': defaultStrategy = 'Health Education / Motivation'; suggestedPillar = 'education'; break;
      case 'Tuesday': defaultStrategy = 'Product Spotlight'; suggestedPillar = 'spotlight'; break;
      case 'Wednesday': defaultStrategy = 'Wellness Tips / Lifestyle'; suggestedPillar = 'wellness'; break;
      case 'Thursday': defaultStrategy = 'Product Spotlight / Combo Deals'; suggestedPillar = 'pairs'; break;
      case 'Friday': defaultStrategy = 'Engagement / Interactive / Weekend Prep'; suggestedPillar = 'custom'; break;
      case 'Saturday': defaultStrategy = 'Quick tip or testimonial-style'; suggestedPillar = 'wellness'; break;
      case 'Sunday': defaultStrategy = 'Rest / Weekly reflection'; suggestedPillar = 'custom'; break;
    }

    const businessName = user.businessName || 'Our Pharmacy';

    // 5. Generate Natural Language Briefing
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
    let briefing = `Happy ${dayName}! It's a great day for ${defaultStrategy}.`;
    
    if (apiKey) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const prompt = `You are a proactive, brilliant Social Media Manager (AI Teammate) for a Nigerian Pharmacy named "${businessName}".
        Write a short "Today's Briefing" for the pharmacy owner. Speak directly to them in a friendly, encouraging, strategic tone.
        Keep it under 4 short paragraphs. Use bullet points if necessary. Do not output markdown code blocks.
        
        Context:
        - Today is: ${dayName}
        - The default content strategy for today is: ${defaultStrategy}
        - Recently covered topics (avoid repeating): ${recentTopics.slice(0, 3).join(', ') || 'None'}
        - Highly stocked products NOT promoted recently: ${recommendedProducts.map(p => p.itemName).join(', ') || 'None'}
        - Upcoming Health Events (next 7 days): ${upcomingEvents.map(e => e.name).join(', ') || 'None'}
        
        Draft a strategic recommendation for today's post, suggesting a specific topic and mentioning any relevant inventory or upcoming events.`;

        const result = await model.generateContent(prompt);
        if (result && result.response) {
          briefing = result.response.text();
        }
      } catch (err) {
        console.error('Gemini Briefing Error:', err);
      }
    }

    return NextResponse.json({
      success: true,
      briefing,
      recommendedPillar: suggestedPillar,
      recommendedProducts,
      upcomingEvents,
      weekSummary: recentPosts.slice(0, 5) // Send some history for the UI
    });

  } catch (error: any) {
    console.error('Error in /api/social/briefing:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
