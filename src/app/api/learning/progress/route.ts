import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { dbConnect } from '@/lib/mongoConnect';
import User from '@/models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

export async function GET() {
  await dbConnect();
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session_token');

  if (!sessionToken) {
    return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
  }

  try {
    const payload = jwt.verify(sessionToken.value, JWT_SECRET) as { userId: string };
    const userId = payload.userId;

    const user = await User.findById(userId).select('xp learningStreak lastLearningDate role').lean();

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const xp = user.xp || 0;
    const streak = user.learningStreak || 0;
    
    // Role-based ranking separation
    const isCustomer = user.role === 'customer';
    const roleQuery = isCustomer ? { role: 'customer' } : { role: { $in: ['pharmacist', 'pharmacy', 'clinic'] } };

    // Rank calculations
    const globalRank = await User.countDocuments({ xp: { $gt: xp }, ...roleQuery }) + 1;
    let cityRank = null;
    let city = user.city || null;
    
    if (user.city) {
        cityRank = await User.countDocuments({ city: user.city, xp: { $gt: xp }, ...roleQuery }) + 1;
    }

    return NextResponse.json({
        xp,
        streak,
        globalRank,
        cityRank,
        city,
        lastLearningDate: user.lastLearningDate
    }, { status: 200 });

  } catch (error) {
    console.error('Progress GET API Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
    await dbConnect();
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session_token');

    if (!sessionToken) {
        return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    try {
        const payload = jwt.verify(sessionToken.value, JWT_SECRET) as { userId: string };
        const userId = payload.userId;

        const body = await req.json();
        const { xpAdded } = body;

        if (!xpAdded || typeof xpAdded !== 'number') {
            return NextResponse.json({ message: 'Invalid XP amount' }, { status: 400 });
        }

        const user = await User.findById(userId);
        if (!user) {
            return NextResponse.json({ message: 'User not found' }, { status: 404 });
        }

        user.xp = (user.xp || 0) + xpAdded;

        // Streak logic
        const now = new Date();
        const lastDate = user.lastLearningDate ? new Date(user.lastLearningDate) : null;
        
        if (!lastDate) {
            user.learningStreak = 1;
        } else {
            const todayStr = now.toISOString().split('T')[0];
            const lastStr = lastDate.toISOString().split('T')[0];
            
            if (todayStr !== lastStr) {
                // Check if it was yesterday
                const yesterday = new Date(now);
                yesterday.setDate(now.getDate() - 1);
                const yesterdayStr = yesterday.toISOString().split('T')[0];

                if (lastStr === yesterdayStr) {
                    user.learningStreak = (user.learningStreak || 0) + 1;
                } else {
                    user.learningStreak = 1; // reset
                }
            }
            // if todayStr === lastStr, do nothing to streak
        }

        user.lastLearningDate = now;
        await user.save();

        return NextResponse.json({ 
            message: 'Progress updated',
            xp: user.xp,
            streak: user.learningStreak
        }, { status: 200 });

    } catch (error) {
        console.error('Progress POST API Error:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
