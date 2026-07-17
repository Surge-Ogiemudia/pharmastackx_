
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { dbConnect } from '@/lib/mongoConnect';
import User from '@/models/User';
import { transporter, mailOptions } from '@/lib/nodemailer';

export async function POST(req) {
  try {
    await dbConnect();
    const allData = await req.json();
    const { 
      businessName,
      businessAddress,
      email: originalEmail,
      password, 
      role = 'customer'
    } = allData;

    if (!originalEmail || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    const email = originalEmail.toLowerCase();

    if (role !== 'customer' && role !== 'pharmacist' && (!businessName || !businessAddress)) {
      return NextResponse.json({ error: 'Business name and address are required for this role.' }, { status: 400 });
    }
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      const errorMessage = `This email is already registered as a ${existingUser.role}. Please log in.`;
      return NextResponse.json({ error: errorMessage }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    let finalRole = role;
    if (email === 'pharmastackx@gmail.com') {
      finalRole = 'admin';
    }

     const baseUsername = allData.username || email.split('@')[0].replace(/[^a-z0-9]/gi, '');
     let username = baseUsername;
     let userExists = await User.findOne({ username });
     let count = 1;
     while (userExists) {
         username = `${baseUsername}${count}`;
         userExists = await User.findOne({ username });
         count++;
     }

    let slug = undefined;
    if (['pharmacy', 'clinic', 'vendor', 'agent'].includes(finalRole) && businessName) {
      slug = businessName.trim().split(' ')[0].toLowerCase();
      let slugExists = await User.findOne({ slug });
      let count = 1;
      let baseSlug = slug;
      while (slugExists) {
        slug = `${baseSlug}${count}`;
        slugExists = await User.findOne({ slug });
        count++;
      }
    }

    if (allData.pharmacy === '') {
      delete allData.pharmacy;
    }

    const newUser = new User({
      ...allData,
      username,
      email,
      password: hashedPassword,
      role: finalRole,
      slug,
      isPublished: ['customer', 'pharmacist'].includes(finalRole)
    });

    await newUser.save();

    // --- PROVISIONING HOOK START ---
    if (finalRole === 'pharmacy') {
      try {
        const mongoose = require('mongoose');
        const db = mongoose.connection.db;

        // 1. Create POS Pharmacy
        await db.collection('pharmacies').insertOne({
          _id: newUser._id,
          pharmacyName: businessName,
          slug: slug,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        // 2. Create Default Branch
        await db.collection('branches').insertOne({
          pharmacyId: newUser._id,
          branchName: 'Main Branch',
          location: businessAddress,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        // 3. Create Default Store
        await db.collection('stores').insertOne({
          pharmacyId: newUser._id,
          storeName: 'Main Bulk Store',
          location: businessAddress,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        // 4. Provision EMR via API
        const emrUrl = process.env.NODE_ENV === 'production' ? 'https://emr.psx.ng' : 'http://localhost:3002';
        fetch(`${emrUrl}/api/provision`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer psx-internal-key-123'
          },
          body: JSON.stringify({
            id: newUser._id.toString(),
            name: businessName,
            slug: slug
          }),
        }).catch(err => console.error('Failed to provision EMR:', err));
        
      } catch (provisionErr) {
        console.error('Provisioning error:', provisionErr);
      }
    }
    // --- PROVISIONING HOOK END ---
    
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
    const protocol = req.headers.get('x-forwarded-proto') || 'https';
    const baseUrl = `${protocol}://${host}`;

    // Notify admin
    fetch(`${baseUrl}/api/notify-admin`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            userName: newUser.username,
            userRole: newUser.role,
        }),
    });

    // Use the reliable verification method from the "resend" flow.
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    const emailVerificationTokenExpires = new Date(Date.now() + 3600000); // 1 hour

    newUser.emailVerificationToken = emailVerificationToken;
    newUser.emailVerificationTokenExpires = emailVerificationTokenExpires;
    await newUser.save();

    const verificationUrl = `${baseUrl}/api/auth/verify-and-redirect?token=${emailVerificationToken}`;

    await transporter.sendMail({
        ...mailOptions,
        to: newUser.email,
        subject: 'Welcome to PharmastackX! Please Verify Your Email',
        text: `Welcome to PharmastackX!\n\nPlease click the following link to verify your email address: ${verificationUrl}`,
        html: `<h2>Welcome to PharmastackX!</h2><p>Please click the following link to verify your email address: <a href="${verificationUrl}">${verificationUrl}</a></p>`,
    });

    return NextResponse.json({ message: 'User created successfully. A verification email has been sent.', user: newUser }, { status: 201 });

  } catch (error) {
    console.error("Signup API Error:", error);
    return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
  }
}
