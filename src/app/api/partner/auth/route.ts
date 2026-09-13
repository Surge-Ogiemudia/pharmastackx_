import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import Partner from '@/models/Partner';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Resend } from 'resend';
import { transporter, mailOptions } from '@/lib/nodemailer';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme_partner_secret_key';
const resend = new Resend(process.env.RESEND_API_KEY || 're_mock_key');

// Default starter password when no custom password has been configured yet
const DEFAULT_STARTER_PASSWORD = 'Bubblegum2026!';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = req.nextUrl;
    const slug = searchParams.get('slug')?.toLowerCase().trim();

    if (!slug) {
      return NextResponse.json({ authenticated: false, error: 'Slug required' }, { status: 400 });
    }

    const sessionCookie = req.cookies.get('psx_partner_session')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ authenticated: false });
    }

    try {
      const decoded = jwt.verify(sessionCookie, JWT_SECRET) as { slug?: string };
      if (decoded.slug === slug) {
        return NextResponse.json({ authenticated: true, slug });
      }
    } catch {
      return NextResponse.json({ authenticated: false });
    }

    return NextResponse.json({ authenticated: false });
  } catch (err: any) {
    return NextResponse.json({ authenticated: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();
    const { action, slug, password, email, token, newPassword } = body;

    const cleanSlug = String(slug || '').toLowerCase().trim();
    if (!cleanSlug) {
      return NextResponse.json({ success: false, error: 'Partner slug required' }, { status: 400 });
    }

    let partner = await Partner.findOne({ slug: cleanSlug });
    if (!partner) {
      return NextResponse.json({ success: false, error: 'Partner not found' }, { status: 404 });
    }

    // -------------------------------------------------------------
    // ACTION: LOGIN
    // -------------------------------------------------------------
    if (action === 'login') {
      if (!password) {
        return NextResponse.json({ success: false, error: 'Password required' }, { status: 400 });
      }

      let isValid = false;

      // If partner has a hashed password in DB, compare
      if (partner.passwordHash) {
        isValid = await bcrypt.compare(password, partner.passwordHash);
      } else {
        // Partner has no password set yet: accept default starter password
        // and immediately hash it so it's securely stored
        if (password === DEFAULT_STARTER_PASSWORD) {
          isValid = true;
          partner.passwordHash = await bcrypt.hash(DEFAULT_STARTER_PASSWORD, 10);
          await partner.save();
        }
      }

      if (!isValid) {
        return NextResponse.json({ success: false, error: 'Invalid password. Please check your credentials.' }, { status: 401 });
      }

      const sessionJwt = jwt.sign(
        { slug: partner.slug, partnerId: String(partner._id) },
        JWT_SECRET,
        { expiresIn: '14d' }
      );

      const response = NextResponse.json({
        success: true,
        message: 'Login successful',
        partner: {
          name: partner.name,
          slug: partner.slug,
          email: partner.contactEmail,
        }
      });

      response.cookies.set('psx_partner_session', sessionJwt, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 14 * 24 * 60 * 60, // 14 days
      });

      return response;
    }

    // -------------------------------------------------------------
    // ACTION: LOGOUT
    // -------------------------------------------------------------
    if (action === 'logout') {
      const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
      response.cookies.set('psx_partner_session', '', {
        httpOnly: true,
        path: '/',
        maxAge: 0,
      });
      return response;
    }

    // -------------------------------------------------------------
    // ACTION: FORGOT PASSWORD (DISPATCH EMAIL LINK)
    // -------------------------------------------------------------
    if (action === 'forgot-password') {
      const targetEmail = (email || partner.contactEmail || '').trim();
      if (!targetEmail) {
        return NextResponse.json({ 
          success: false, 
          error: 'Please enter a valid email address to receive the password reset link.' 
        }, { status: 400 });
      }

      // Update email on partner record if newly provided
      if (email && email !== partner.contactEmail) {
        partner.contactEmail = email;
      }

      // Generate 1-hour secure crypto token
      const resetToken = crypto.randomBytes(32).toString('hex');
      partner.resetPasswordToken = resetToken;
      partner.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour
      await partner.save();

      // Compute base URL
      const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'pharmastackx.com';
      const protocol = req.headers.get('x-forwarded-proto') || 'https';
      const baseUrl = `${protocol}://${host}`;
      const resetUrl = `${baseUrl}/partner-dashboard?slug=${partner.slug}&resetToken=${resetToken}`;

      // Email template
      const emailHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background: #ffffff; border: 1px solid #f1f5f9; border-radius: 20px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="font-size: 22px; font-weight: 800; color: #0f172a; margin: 0;">${partner.name} Partner Portal</h1>
            <p style="font-size: 13px; color: #64748b; margin-top: 4px;">PharmaStackX Terminal & Storefront Access</p>
          </div>
          
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; margin-bottom: 24px;">
            <h2 style="font-size: 16px; font-weight: 700; color: #0f172a; margin: 0 0 8px 0;">Reset Your Account Password</h2>
            <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 20px 0;">
              A request was received to update the password for your partner portal (<strong>${partner.slug}</strong>). Click the button below to set your new password:
            </p>
            
            <div style="text-align: center; margin: 24px 0;">
              <a href="${resetUrl}" style="background: #e11d48; color: #ffffff; font-weight: 700; font-size: 14px; padding: 12px 28px; border-radius: 12px; text-decoration: none; display: inline-block; box-shadow: 0 4px 12px rgba(225, 29, 72, 0.25);">
                🔑 Change Your Password
              </a>
            </div>

            <p style="font-size: 12px; color: #94a3b8; margin: 0; text-align: center;">
              This link is valid for <strong>1 hour</strong>. If you did not request this, you can safely ignore this email.
            </p>
          </div>

          <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">
            PharmaStackX B2B Partner Infrastructure &bull; Secure Access
          </p>
        </div>
      `;

      // Try sending via Resend first, fallback to Nodemailer
      let emailDispatched = false;
      if (process.env.RESEND_API_KEY) {
        try {
          const resendResult = await resend.emails.send({
            from: 'PharmaStackX <onboarding@resend.dev>',
            to: [targetEmail],
            subject: `🔐 Change Your ${partner.name} Password`,
            html: emailHtml,
          });
          if (!resendResult.error) {
            emailDispatched = true;
          }
        } catch (resendErr) {
          console.warn('Resend failed, falling back to Nodemailer:', resendErr);
        }
      }

      if (!emailDispatched) {
        try {
          await transporter.sendMail({
            ...mailOptions,
            to: targetEmail,
            subject: `🔐 Change Your ${partner.name} Password`,
            html: emailHtml,
          });
          emailDispatched = true;
        } catch (mailErr) {
          console.error('Nodemailer failed as well:', mailErr);
        }
      }

      return NextResponse.json({
        success: true,
        message: `Password reset link sent to ${targetEmail}. Please check your inbox and click the link to set your new password.`,
        resetUrlDev: process.env.NODE_ENV === 'development' ? resetUrl : undefined,
      });
    }

    // -------------------------------------------------------------
    // ACTION: RESET PASSWORD (CONFIRM NEW PASSWORD VIA TOKEN)
    // -------------------------------------------------------------
    if (action === 'reset-password') {
      if (!token || !newPassword) {
        return NextResponse.json({ success: false, error: 'Token and new password required' }, { status: 400 });
      }

      if (newPassword.length < 6) {
        return NextResponse.json({ success: false, error: 'Password must be at least 6 characters long' }, { status: 400 });
      }

      const validPartner = await Partner.findOne({
        slug: cleanSlug,
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: new Date() },
      });

      if (!validPartner) {
        return NextResponse.json({ 
          success: false, 
          error: 'This password reset link is invalid or has expired. Please request a new one.' 
        }, { status: 400 });
      }

      // Hash and save the new password
      validPartner.passwordHash = await bcrypt.hash(newPassword, 10);
      validPartner.resetPasswordToken = undefined;
      validPartner.resetPasswordExpires = undefined;
      await validPartner.save();

      // Issue active session cookie so they're immediately authenticated
      const sessionJwt = jwt.sign(
        { slug: validPartner.slug, partnerId: String(validPartner._id) },
        JWT_SECRET,
        { expiresIn: '14d' }
      );

      const response = NextResponse.json({
        success: true,
        message: 'Your password has been changed successfully! You are now logged in.',
      });

      response.cookies.set('psx_partner_session', sessionJwt, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 14 * 24 * 60 * 60,
      });

      return response;
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });

  } catch (err: any) {
    console.error('Error in partner auth route:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal server error' }, { status: 500 });
  }
}
