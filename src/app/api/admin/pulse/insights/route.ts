import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import Request from '@/models/Request'; // Primary live data model
import Product from '@/models/Product';
import User from '@/models/User';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

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
    const admin = await authorizeAdmin();
    if (!admin) return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });

    try {
        await dbConnect();
        
        // 1. Fetch Recent Spikes (Last 30 Days)
        const daysAgo = 30;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysAgo);

        const recentTrends = await Request.aggregate([
            { $match: { createdAt: { $gte: startDate } } },
            { $unwind: "$items" },
            { 
                $match: { 
                    "items.name": { $exists: true, $ne: "", $nin: [" medicine", "test", ". ", "Drug Name"] } 
                } 
            },
            { $group: { _id: "$items.name", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        let combinedInsights: any[] = recentTrends.map(t => ({ ...t, type: 'spike', label: '🔥 Trending' }));

        // 2. Fallback to All-Time Popular if sparse
        if (combinedInsights.length < 5) {
            const allTime = await Request.aggregate([
                { $unwind: "$items" },
                { 
                    $match: { 
                        "items.name": { $exists: true, $ne: "", $nin: [" medicine", "test", ". ", "Drug Name"] } 
                    } 
                },
                { $group: { _id: "$items.name", count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 15 }
            ]);
            
            allTime.forEach(t => {
                if (t._id && !combinedInsights.find(c => c._id === t._id)) {
                    combinedInsights.push({ ...t, type: 'popular', label: '⭐ All-Time' });
                }
            });
        }

        // 3. Add Store Spotlights (Inventory-based)
        if (combinedInsights.length < 15) {
            // Lower threshold: even 1 item in stock is a lead!
            const products = await Product.find({ isPublished: true, quantity: { $gt: 0 } })
                .limit(10)
                .select('itemName category')
                .lean();
            
            products.forEach(p => {
                if (p.itemName && !combinedInsights.find(c => c._id === p.itemName)) {
                    combinedInsights.push({ 
                        _id: p.itemName, 
                        count: 'In Stock', 
                        type: 'inventory', 
                        label: '📦 Stocked',
                        category: p.category || 'Pharmacy'
                    });
                }
            });
        }

        // 4. Market Baseline Fallback (Guarantee Zero-Empty State)
        if (combinedInsights.length < 5) {
            const baseline = [
                { _id: 'Malaria Prevention', count: 'High', type: 'baseline', label: '🛡️ Seasonal', category: 'General Health' },
                { _id: 'Vitamin C Spikes', count: 'Rising', type: 'baseline', label: '☀️ Immunity', category: 'Vitamins' },
                { _id: 'Pain Management', count: 'Stable', type: 'baseline', label: '💊 Essential', category: 'Analgesics' },
                { _id: 'Dermatology Trends', count: 'Rising', type: 'baseline', label: '✨ Skincare', category: 'Topical' },
                { _id: 'First Aid Essentials', count: 'High', type: 'baseline', label: '🩹 Always Needed', category: 'Emergency' }
            ];
            
            baseline.forEach(b => {
                if (!combinedInsights.find(c => c._id === b._id)) {
                    combinedInsights.push(b);
                }
            });
        }

        return NextResponse.json({ 
            success: true, 
            insights: combinedInsights,
            counts: {
                total: combinedInsights.length,
                spikes: combinedInsights.filter(i => i.type === 'spike').length,
                popular: combinedInsights.filter(i => i.type === 'popular').length,
                inventory: combinedInsights.filter(i => i.type === 'inventory').length,
                baseline: combinedInsights.filter(i => i.type === 'baseline').length
            }
        }, {
            headers: {
                'Cache-Control': 's-maxage=300, stale-while-revalidate=600',
            }
        });

    } catch (err: any) {
        console.error('Pulse Insights Error:', err);
        return NextResponse.json({ success: false, error: err.message, insights: [] }, { status: 500 });
    }
}
