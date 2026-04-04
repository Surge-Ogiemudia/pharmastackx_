
import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import User, { IUser } from '@/models/User';
import mongoose from 'mongoose';

// GET all pharmacists for a specific pharmacy
export async function GET(request: Request) {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const pharmacyId = searchParams.get('pharmacyId');

    if (!pharmacyId) {
        return NextResponse.json({ message: 'Pharmacy ID is required' }, { status: 400 });
    }

    try {
        const pharmacists = await User.find({
            role: 'pharmacist',
            pharmacy: pharmacyId
        }).select('_id username email profilePicture canManageStore').lean();

        return NextResponse.json({ pharmacists }, { status: 200 });
    } catch (error: any) {
        console.error('Error fetching pharmacists:', error);
        return NextResponse.json({ message: `Server error: ${error.message}` }, { status: 500 });
    }
}


// POST (Connect/Switch a pharmacist to a pharmacy)
export async function POST(request: Request) {
    await dbConnect();

    // 1. Get Session
    const host = request.headers.get('host');
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const sessionResponse = await fetch(`${protocol}://${host}/api/auth/session`, {
        headers: { cookie: request.headers.get('cookie') || '' },
    });

    if (!sessionResponse.ok) {
        return NextResponse.json({ message: 'Failed to fetch session' }, { status: sessionResponse.status });
    }
    const session = await sessionResponse.json();
    if (!session?.user?._id) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // The logged-in user MUST be a pharmacist to switch.
    if (session.user.role !== 'pharmacist') {
        return NextResponse.json({ message: 'Forbidden: Only pharmacists can switch pharmacies.' }, { status: 403 });
    }

    const pharmacistId = session.user._id;

    try {
        const { pharmacyId } = await request.json(); // The ID of the pharmacy to connect to.

        if (!pharmacyId) {
            return NextResponse.json({ message: 'pharmacyId is required.' }, { status: 400 });
        }

        // 2. Validate both IDs
        if (!mongoose.Types.ObjectId.isValid(pharmacistId) || !mongoose.Types.ObjectId.isValid(pharmacyId)) {
            return NextResponse.json({ message: 'Invalid ID format' }, { status: 400 });
        }

        // 3. Find the pharmacist and the target pharmacy
        const pharmacist = await User.findById(pharmacistId);
        const pharmacyToConnect = await User.findById(pharmacyId);

        if (!pharmacist || pharmacist.role !== 'pharmacist') {
            return NextResponse.json({ message: 'Pharmacist not found' }, { status: 404 });
        }
        if (!pharmacyToConnect || pharmacyToConnect.role !== 'pharmacy') {
            return NextResponse.json({ message: 'Target pharmacy not found' }, { status: 404 });
        }

        // 4. Update the pharmacist's `pharmacy` field
        // The schema expects a String, so we use the pharmacy's _id as a string.
        pharmacist.pharmacy = (pharmacyToConnect._id as mongoose.Types.ObjectId).toString();
        
        // Reset store management access when switching
        pharmacist.canManageStore = false; 

        await pharmacist.save();

        return NextResponse.json({ message: 'Successfully switched pharmacy.' }, { status: 200 });

    } catch (error: any) {
        console.error('Error in switch-pharmacy endpoint:', error);
        return NextResponse.json({ message: `Server error: ${error.message}` }, { status: 500 });
    }
}
