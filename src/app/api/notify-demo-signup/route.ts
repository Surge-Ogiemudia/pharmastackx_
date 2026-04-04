
import { NextRequest, NextResponse } from 'next/server';
import { transporter, mailOptions } from '@/lib/nodemailer';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, email, mobile, licenseNumber, stateOfPractice, pharmacy } = body;

    // 1. Construct the notification email for the admin
    const adminMailOptions = {
        ...mailOptions,
        to: 'pharmastackx@gmail.com',
        subject: '[PharmaStackX Demo Registration] - New Sign-up',
        html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                <h2 style="color: #006D5B;">New Product Demo Registration</h2>
                <p>A new user has registered for the product demo. Here are their details:</p>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr style="background-color: #f2f2f2;">
                        <td style="padding: 8px; border: 1px solid #ddd; width: 30%;"><strong>Full Name:</strong></td>
                        <td style="padding: 8px; border: 1px solid #ddd;">${username || 'N/A'}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; border: 1px solid #ddd; width: 30%;"><strong>Email Address:</strong></td>
                        <td style="padding: 8px; border: 1px solid #ddd;">${email}</td>
                    </tr>
                    <tr style="background-color: #f2f2f2;">
                        <td style="padding: 8px; border: 1px solid #ddd; width: 30%;"><strong>Mobile Number:</strong></td>
                        <td style="padding: 8px; border: 1px solid #ddd;">${mobile || 'N/A'}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; border: 1px solid #ddd; width: 30%;"><strong>License Number:</strong></td>
                        <td style="padding: 8px; border: 1px solid #ddd;">${licenseNumber || 'N/A'}</td>
                    </tr>
                     <tr style="background-color: #f2f2f2;">
                        <td style="padding: 8px; border: 1px solid #ddd; width: 30%;"><strong>State of Practice:</strong></td>
                        <td style="padding: 8px; border: 1px solid #ddd;">${stateOfPractice || 'N/A'}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; border: 1px solid #ddd; width: 30%;"><strong>Pharmacy ID:</strong></td>
                        <td style="padding: 8px; border: 1px solid #ddd;">${pharmacy || 'N/A'}</td>
                    </tr>
                </table>
                <p style="margin-top: 20px; font-size: 0.9em; color: #777;">This is an automated notification from the PharmaStackX signup process.</p>
            </div>
        `,
    };

    // 2. Construct the confirmation email for the user with a calendar invite

    const event = {
        title: "PharmaStackX Product Demo",
        description: `Join us for a live session to see how PharmaStackX routes verified medicine requests from patients and partnered clinics directly to community pharmacists.\n\nThis 45-minute session will cover:\n- How to sign up and add PharmaStackX as an app\n- Enabling notifications for real-time alerts\n- Receiving and responding to verified medicine requests\n- Fulfilling requests and earning a 5% service commission`,
        startTime: new Date('2026-01-23T20:00:00+01:00'), // 8:00 PM WAT (UTC+1)
        endTime: new Date('2026-01-23T20:45:00+01:00'),   // 8:45 PM WAT (UTC+1)
        location: "Online / Virtual"
    };

    const toIcsDate = (date: Date) => date.toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';
    const icalContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//PharmaStackX//Product Demo//EN',
        'BEGIN:VEVENT',
        `UID:${new Date().getTime()}-${email}@pharmastackx.com`,
        `DTSTAMP:${toIcsDate(new Date())}`,
        `DTSTART:${toIcsDate(event.startTime)}`,
        `DTEND:${toIcsDate(event.endTime)}`,
        `SUMMARY:${event.title}`,
        `DESCRIPTION:${event.description.replace(/\n/g, '\\n')}`,
        `LOCATION:${event.location}`,
        'END:VEVENT',
        'END:VCALENDAR'
    ].join('\r\n');

    const userMailOptions = {
        ...mailOptions,
        to: email,
        subject: "✔ Confirmed: Your Spot for the PharmaStackX Product Demo",
        html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <h2 style="color: #006D5B;">Thank You for Registering, ${username}!</h2>
                <p>This email confirms your registration for the <strong>PharmaStackX product demo.</strong></p>
                <p>We have attached a calendar invitation to this email. Please accept it to add the event directly to your calendar.</p>
                <hr>
                <p><strong>Event Details:</strong></p>
                <p><strong>Date:</strong> Friday, January 23rd, 2026</p>
                <p><strong>Time:</strong> 8:00 PM WAT</p>
                <p>We look forward to showing you how our platform can revolutionize your pharmacy operations.</p>
                <br>
                <p>Best regards,</p>
                <p><strong>The PharmaStackX Team</strong></p>
            </div>
        `,
        attachments: [{
            filename: 'invite.ics',
            content: icalContent,
            contentType: 'text/calendar; charset=utf-8; method=REQUEST',
        }]
    };

    // 3. Send both emails in parallel
    await Promise.all([
        transporter.sendMail(adminMailOptions),
        transporter.sendMail(userMailOptions)
    ]);

    return NextResponse.json({ message: 'Notifications sent successfully.' }, { status: 200 });

  } catch (error) {
    console.error('Failed to send demo signup notifications:', error);
    return NextResponse.json({ message: 'Notification processed.' }, { status: 200 });
  }
}
