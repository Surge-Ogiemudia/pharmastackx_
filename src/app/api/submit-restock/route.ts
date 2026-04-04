
import { NextRequest, NextResponse } from 'next/server';
import { transporter } from '../../../lib/nodemailer';
import { dbConnect } from '@/lib/mongoConnect';
import UserModel from '@/models/User';

// Helper function to convert a file stream to a buffer
async function streamToBuffer(stream: ReadableStream<Uint8Array>): Promise<Buffer> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const userId = formData.get('userId') as string;
    if (!userId) {
      return NextResponse.json({ success: false, message: 'User information is missing.' }, { status: 400 });
    }

    // Get user details from the database
    await dbConnect();
    const user = await UserModel.findById(userId).lean();
    if (!user) {
      return NextResponse.json({ success: false, message: 'Submitting user not found.' }, { status: 404 });
    }
    
    const submissionType = formData.get('submissionType') as string;
    const notes = formData.get('notes') as string;
    const listContent = formData.get('listContent') as string;
    const listFile = formData.get('listFile') as File | null;

    const attachments = [];
    // Start email body with the user's information
    let htmlBody = `
      <h1>New Medicine Restock Request</h1>
      <h2>Submitted By:</h2>
      <ul>
        <li><strong>Business Name:</strong> ${user.businessName || 'N/A'}</li>
        <li><strong>Email:</strong> ${user.email || 'N/A'}</li>
        <li><strong>Phone:</strong> ${user.phoneNumber || 'N/A'}</li>
      </ul>
      <hr>
    `;

    // Handle 'Build a list' submissions
    if (submissionType === 'list' && listContent) {
      htmlBody += '<h2>Built List Items:</h2>';
      const items = JSON.parse(listContent);
      htmlBody += '<ul>';
      
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const itemImage = formData.get(`itemImage_${i}`) as File | null;

        htmlBody += `
          <li>
            <strong>Item ${i + 1}:</strong><br/>
            - Brand Name: ${item.brandName || 'N/A'}<br/>
            - Active Ingredients: ${item.activeIngredients || 'N/A'}<br/>
            - Form: ${item.form || 'N/A'}<br/>
            - Strength: ${item.strength || 'N/A'}<br/>
            - Quantity: ${item.quantity || 'N/A'}<br/>
        `;

        if (itemImage) {
          const imageBuffer = await streamToBuffer(itemImage.stream());
          const cid = `image_${i}@pharmastackx.com`;
          attachments.push({
            filename: itemImage.name,
            content: imageBuffer,
            contentType: itemImage.type,
            cid: cid,
          });
          htmlBody += `- Attached Image: <br/><img src="cid:${cid}" alt="Item Image" style="max-width: 200px; margin-top: 5px;"/><br/>`;
        }
        htmlBody += `</li><br/>`;
      }
      htmlBody += '</ul>';
    }

    // Handle 'Upload file' submissions
    if (submissionType === 'file' && listFile) {
        htmlBody += `<p><strong>A restock file was uploaded. See attachment.</strong></p>`;
        const listFileBuffer = await streamToBuffer(listFile.stream());
        attachments.push({
            filename: listFile.name,
            content: listFileBuffer,
            contentType: listFile.type,
        });
    }

    if (notes) {
      htmlBody += `<h2>Additional Notes:</h2><p>${notes}</p>`;
    }

    const mailOptions = {
      from: `"Pharmastackx Notifier" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER, 
      subject: `New Restock Request from ${user.businessName || 'a user'}`,
      html: htmlBody,
      attachments: attachments,
    };

    // I noticed the nodemailer import path was also incorrect, I will fix that too
    const finalTransporter = (await import('../../../lib/nodemailer')).transporter;
    await finalTransporter.sendMail(mailOptions);

    return NextResponse.json({ success: true, message: 'Request submitted successfully.' });

  } catch (error) {
    console.error('Error processing restock request:', error);
    if (error instanceof Error) {
        return NextResponse.json({ success: false, message: `Server error: ${error.message}` }, { status: 500 });
    }
    return NextResponse.json({ success: false, message: 'An unknown server error occurred.' }, { status: 500 });
  }
}
