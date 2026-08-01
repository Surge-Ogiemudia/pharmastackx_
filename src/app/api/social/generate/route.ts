import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import User from '@/models/User';
import Product from '@/models/Product';
import SocialPost from '@/models/SocialPost';

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
      .limit(20)
      .lean();

    const businessName = user.businessName || 'Our Pharmacy';
    const storeUrl = `${pharmacy_slug}.psx.ng`;

    let postTitle = '';
    let caption = '';
    let hashtags: string[] = [];
    let imageUrls: string[] = [];
    let featuredProducts: Array<{ name: string; price: number; image?: string }> = [];

    // Helper to generate image URL via high quality Pollinations AI endpoint
    const createAiImageUrl = (prompt: string, seed: number) => {
      const sanitized = encodeURIComponent(`high quality pharmacy product photo, ${prompt}, realistic medical style`);
      return `https://image.pollinations.ai/prompt/${sanitized}?width=1080&height=1080&seed=${seed}&nologo=true`;
    };

    const randomSeed = Math.floor(Math.random() * 1000000);

    if (pillar === 'wellness') {
      const featured = products[Math.floor(Math.random() * Math.min(products.length, 5))];
      postTitle = '🌿 Daily Wellness Boost';
      const prodName = featured ? featured.itemName : 'Multivitamins & Skincare';
      const prodPrice = featured ? `₦${featured.amount.toLocaleString()}` : '';

      caption = `✨ Prioritize your health today with ${businessName}!\n\n` +
        `Nourish your body and stay energized all week long. Whether you're upgrading your daily skincare routine or boosting your immune system, we've got you covered.\n\n` +
        (featured ? `Featured: ${prodName} (${prodPrice})\n\n` : '') +
        `🛒 Order directly online for fast delivery: https://${storeUrl}`;

      hashtags = ['#WellnessJourney', '#HealthyLiving', '#PharmacyCare', '#SelfCareNigeria', `#${pharmacy_slug}`];
      imageUrls = [createAiImageUrl(`skincare and wellness supplement bottle on a clean minimalist pharmacy counter`, randomSeed)];
      if (featured) featuredProducts.push({ name: featured.itemName, price: featured.amount, image: featured.imageUrl });

    } else if (pillar === 'education') {
      // 3-slide Carousel
      const featured = products[0] || { itemName: 'Essential Medications' };
      postTitle = '📚 3 Myths vs Facts About Your Medications';

      caption = `💡 Health Tip of the Week from ${businessName}!\n\n` +
        `Slide 1: MYTH - "Taking higher doses of pain relievers works faster."\nFACT: Overdosing leads to organ strain. Always adhere to prescribed dosages!\n\n` +
        `Slide 2: MYTH - "You can stop antibiotics as soon as you feel better."\nFACT: Stopping early creates drug resistance. Always complete your course!\n\n` +
        `Slide 3: Need reliable advice or genuine pharmaceuticals?\n` +
        `Visit our store or order online: https://${storeUrl}`;

      hashtags = ['#HealthTips', '#PharmacyEducation', '#AskYourPharmacist', '#StayInformed', `#${pharmacy_slug}`];
      imageUrls = [
        createAiImageUrl(`infographic slide 1, medicine myth vs fact, medical aesthetic`, randomSeed),
        createAiImageUrl(`infographic slide 2, antibiotic awareness, clean medical banner`, randomSeed + 1),
        createAiImageUrl(`infographic slide 3, friendly pharmacist advising patient in modern pharmacy`, randomSeed + 2),
      ];

    } else if (pillar === 'pairs') {
      const prod1 = products[0] || { itemName: 'Vitamin C Supplement', amount: 1500 };
      const prod2 = products[1] || { itemName: 'Immune Support Zinc', amount: 2000 };

      postTitle = '🤝 The Ultimate Immunity Pair';

      caption = `🔥 Power Duo for Your Health at ${businessName}!\n\n` +
        `Combine ${prod1.itemName} (₦${prod1.amount.toLocaleString()}) with ${prod2.itemName} (₦${prod2.amount.toLocaleString()}) for maximum absorption and total wellness protection.\n\n` +
        `Get both together today at: https://${storeUrl}`;

      hashtags = ['#ProductPairing', '#ImmunityCombo', '#HealthDuo', '#PharmacyDeals', `#${pharmacy_slug}`];
      imageUrls = [createAiImageUrl(`two complementary pharmacy products side by side, clean studio lighting`, randomSeed)];
      featuredProducts = [
        { name: prod1.itemName, price: prod1.amount, image: prod1.imageUrl },
        { name: prod2.itemName, price: prod2.amount, image: prod2.imageUrl }
      ];

    } else if (pillar === 'spotlight') {
      const featured = products[Math.floor(Math.random() * Math.min(products.length, 10))] || { itemName: 'Essential Health Product', amount: 2500 };

      postTitle = `🎯 Product Spotlight: ${featured.itemName}`;

      caption = `📦 NOW IN STOCK at ${businessName}!\n\n` +
        `Name: ${featured.itemName}\n` +
        `Price: ₦${featured.amount.toLocaleString()}\n` +
        `Status: In Stock & Ready for Immediate Delivery 🚀\n\n` +
        `Tap the link to order now: https://${storeUrl}`;

      hashtags = ['#NowInStock', '#PharmacySpotlight', '#GenuineDrugs', '#FastDelivery', `#${pharmacy_slug}`];
      imageUrls = [createAiImageUrl(`professional commercial product photo of ${featured.itemName} on glowing display stand`, randomSeed)];
      featuredProducts = [{ name: featured.itemName, price: featured.amount, image: featured.imageUrl }];

    } else {
      // Custom Prompt
      const promptText = customPrompt || 'General health announcement';
      postTitle = '✍️ Custom Announcement';

      caption = `📣 Announcement from ${businessName}\n\n` +
        `${promptText}\n\n` +
        `Visit us online at https://${storeUrl} or stop by our store!`;

      hashtags = ['#PharmacyUpdate', '#CommunityPharmacy', `#${pharmacy_slug}`];
      imageUrls = [createAiImageUrl(`custom announcement banner for pharmacy, ${promptText}`, randomSeed)];
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
