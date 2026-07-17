import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { dbConnect } from '@/lib/mongoConnect';
import User from '@/models/User';
import mongoose from 'mongoose';

const API_KEY = process.env.INTERNAL_API_KEY || 'psx-internal-key-123';

// Middleware to check internal API key
function verifyApiKey(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || authHeader !== `Bearer ${API_KEY}`) {
    return false;
  }
  return true;
}

export async function POST(req: Request) {
  if (!verifyApiKey(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await dbConnect();
    const data = await req.json();
    const { name, phoneNumber, email, password, role, pharmacyId, branchId, storeId } = data;

    if (!name || !phoneNumber || !password || !role || !pharmacyId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if user exists
    const existingUser = await User.findOne({ $or: [{ phoneNumber }, { email: email || `${phoneNumber}@staff.psx.ng` }] });
    if (existingUser) {
      return NextResponse.json({ error: 'User with this phone or email already exists' }, { status: 409 });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user mapped to Main PSX schema
    const newUser = new User({
      username: name,
      email: email || `${phoneNumber}@staff.psx.ng`, // Dummy email since it's required in Main schema
      phoneNumber,
      password: hashedPassword,
      role,
      pharmacy: pharmacyId,
      // POS specific fields can be ignored or stored if schema allows
    });

    await newUser.save();

    return NextResponse.json({ 
      message: 'Staff created successfully', 
      user: {
        id: newUser._id,
        name: newUser.username,
        role: newUser.role,
        phoneNumber: newUser.phoneNumber,
        pharmacyId: newUser.pharmacy
      } 
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating staff:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  if (!verifyApiKey(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const pharmacyId = searchParams.get('pharmacyId');

    if (!pharmacyId) {
      return NextResponse.json({ error: 'pharmacyId is required' }, { status: 400 });
    }

    const staffMembers = await User.find({ 
      pharmacy: pharmacyId, 
      role: { $in: ['pharmacist', 'store_manager', 'store_keeper', 'staff'] } 
    }).select('-password -__v');

    const mappedStaff = staffMembers.map(member => ({
      id: member._id,
      name: member.username,
      role: member.role,
      phoneNumber: member.phoneNumber,
      email: member.email,
      pharmacyId: member.pharmacy,
      createdAt: member.createdAt
    }));

    return NextResponse.json({ staff: mappedStaff });
  } catch (error: any) {
    console.error('Error fetching staff:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
