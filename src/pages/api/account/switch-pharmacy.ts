
import { NextApiRequest, NextApiResponse } from 'next';
import { dbConnect } from '@/lib/mongoConnect';
import User from '@/models/User';
import jwt from 'jsonwebtoken';

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
        const newPharmacy = await User.findById(pharmacyId);
        if (!newPharmacy || newPharmacy.role !== 'pharmacy') {
            return res.status(404).json({ message: 'The selected pharmacy does not exist.' });
        }

        const updatedPharmacist = await User.findByIdAndUpdate(
            userId, // Use the userId from the JWT token
            { $set: { pharmacy: newPharmacy._id } },
            { new: true }
        ).populate('pharmacy', 'businessName');

        if (!updatedPharmacist) {
            return res.status(404).json({ message: 'Pharmacist not found.' });
        }

        const detailedUser = {
            ...updatedPharmacist.toObject(),
            pharmacy: {
                _id: newPharmacy._id,
                businessName: newPharmacy.businessName,
            },
        };

        return res.status(200).json(detailedUser);
    } catch (error: any) {
        console.error('Error switching pharmacy:', error);
        return res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
}
