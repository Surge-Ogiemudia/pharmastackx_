import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import BulkUpload from '@/models/BulkUpload';
import Product from '@/models/Product';
import mongoose from 'mongoose';

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  await dbConnect();


  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'Invalid bulkUploadId' }, { status: 400 });
  }

  try {
    await Product.deleteMany({ bulkUploadId: id });
    await BulkUpload.findByIdAndDelete(id);
    return NextResponse.json({ message: 'Bulk upload and associated products deleted' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
