
import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import User from '@/models/User';
import mongoose from 'mongoose'; // Import mongoose to use ObjectId

export async function PUT(request: Request) {
    await dbConnect();

    // Correctly fetch the session on the server-side
    const host = request.headers.get('host');
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const sessionResponse = await fetch(`${protocol}://${host}/api/auth/session`, {
        headers: {
            cookie: request.headers.get('cookie') || '',
        },
    });

    if (!sessionResponse.ok) {
        return NextResponse.json({ message: 'Failed to fetch session' }, { status: sessionResponse.status });
    }

    const session = await sessionResponse.json();

    if (!session?.user?._id) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    try {
        // The pharmacy owner's ID from the session is a STRING
        const pharmacyOwnerId = session.user._id;
        const { pharmacistId, canManageStore } = await request.json();

        if (!pharmacistId || typeof canManageStore !== 'boolean') {
            return NextResponse.json({ message: 'Invalid input: pharmacistId and canManageStore are required.' }, { status: 400 });
        }

        // The pharmacistId from the request body needs to be converted to an ObjectId
        if (!mongoose.Types.ObjectId.isValid(pharmacistId)) {
            return NextResponse.json({ message: 'Invalid Pharmacist ID format' }, { status: 400 });
        }
        const pharmacistObjectId = new mongoose.Types.ObjectId(pharmacistId);

        // Atomically find and update the document.
        const updatedPharmacist = await User.findOneAndUpdate(
            // The query now matches the schema exactly:
            // - _id is an ObjectId
            // - pharmacy is a String
            { 
                _id: pharmacistObjectId, 
                pharmacy: pharmacyOwnerId, // This must be a string as per the schema
                role: 'pharmacist' 
            },
            // Update
            { $set: { canManageStore: canManageStore } },
            // Options
            { new: true }
        );

        if (!updatedPharmacist) {
            // This will now correctly trigger if the pharmacist doesn't exist or isn't linked to this pharmacy
            return NextResponse.json({ message: 'Update failed: The specified pharmacist is not linked to your pharmacy.' }, { status: 404 });
        }

        console.log(`DATABASE WRITE CONFIRMED: Updated canManageStore for pharmacist ${updatedPharmacist.username} to ${canManageStore}`);

        // Re-fetch the complete list to send to the frontend.
        const pharmacists = await User.find({
            role: 'pharmacist',
            pharmacy: pharmacyOwnerId, // Query by the string ID
        }).select('_id username email profilePicture canManageStore').lean();

        return NextResponse.json({ pharmacists }, { status: 200 });

    } catch (error: any) {
        console.error('Error in manage-access endpoint:', error);
        return NextResponse.json({ message: `Server error: ${error.message || 'An unknown error occurred'}` }, { status: 500 });
    }
}
