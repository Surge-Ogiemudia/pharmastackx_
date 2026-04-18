
import { NextApiRequest, NextApiResponse } from 'next';
import { dbConnect } from '@/lib/mongoConnect';
import User from '@/models/User';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const token = req.cookies.session_token;

    if (!token) {
        return res.status(401).json({ message: 'Not Authenticated' });
    }

    let userId: string;
    try {
        const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
        userId = payload.userId;
        if (!userId) {
            throw new Error('Invalid token payload');
        }
    } catch (error) {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }

    try {
        await dbConnect();
    } catch (error) {
        console.error("Database connection error in /api/account/switch-pharmacy:", error);
        return res.status(500).json({ message: 'Database connection error' });
    }

    const { pharmacyId } = req.body;

    if (!pharmacyId) {
        return res.status(400).json({ message: 'Pharmacy ID is required.' });
    }

    try {
        const pharmacist = await User.findById(userId);
        if (!pharmacist) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // If it's a valid ObjectId and looks like a pharmacy, link it.
        // Otherwise, if the user is a pharmacist, treat it as a custom string.
        let pharmacyValue = pharmacyId;
        let isLinked = false;

        if (mongoose.Types.ObjectId.isValid(pharmacyId)) {
            const pharmacyDoc = await User.findById(pharmacyId);
            if (pharmacyDoc && pharmacyDoc.role === 'pharmacy') {
                pharmacyValue = pharmacyDoc._id;
                isLinked = true;
            }
        }

        const updateData: any = { pharmacy: pharmacyValue };
        // Reset store management if they are switching to a new linked/unlinked entity
        if (pharmacist.role === 'pharmacist') {
            updateData.canManageStore = false;
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: updateData },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found.' });
        }

        if (isLinked) {
            await updatedUser.populate('pharmacy', 'businessName');
        }

        return res.status(200).json(updatedUser);
    } catch (error: any) {
        console.error('Error switching pharmacy:', error);
        return res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
}
