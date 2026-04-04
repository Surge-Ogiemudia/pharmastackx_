import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import formidable from 'formidable';
import fs from 'fs';
import { parse } from 'papaparse';

const Product = require('@/models/Product');

// Note: in the App Router, `export const config = { api: { bodyParser: false } }` is deprecated.
// File upload handling should use FormData via `request.formData()` or move the route
// to a Pages API (pages/api) for the older bodyParser config. This file keeps using
// formidable for Node environments; ensure Vercel/runtime supports it or convert to
// a FormData-based handler if needed.

export async function POST(req) {
  await dbConnect();
  const form = new formidable.IncomingForm();

  return new Promise((resolve, reject) => {
    form.parse(req, async (err, fields, files) => {
      if (err) {
        return resolve(NextResponse.json({ error: 'Error parsing file' }, { status: 400 }));
      }
      const file = files.file;
      if (!file) {
        return resolve(NextResponse.json({ error: 'No file uploaded' }, { status: 400 }));
      }
      const csv = fs.readFileSync(file.filepath, 'utf8');
      const { data } = parse(csv, { header: true });
      // Save each product to DB
      const inserted = await Product.insertMany(data);
      resolve(NextResponse.json({ inserted }));
    });
  });
}
