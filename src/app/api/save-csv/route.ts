
import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import BulkUpload from '@/models/BulkUpload';

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const { fileName, fileContent, businessName } = await req.json();

    if (!fileName || !fileContent || !businessName) {
      return NextResponse.json({ message: 'fileName, fileContent, and businessName are required.' }, { status: 400 });
    }

    // Create a new record in the database for the uploaded file
    await BulkUpload.create({
      fileName: fileName,
      fileContent: fileContent,
      businessName: businessName,
      status: 'completed' // We can mark it as completed since we are just storing it.
    });

    return NextResponse.json({ message: 'File saved successfully.' }, { status: 201 });

  } catch (error) {
    console.error('[Save-CSV] Error saving bulk upload file:', error);
    // This endpoint failing should not stop the main upload process,
    // so we just log the error and return a failure message.
    return NextResponse.json({ message: 'Failed to save file for historical records.' }, { status: 500 });
  }
}
