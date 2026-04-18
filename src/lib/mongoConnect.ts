import mongoose, { Mongoose } from 'mongoose';

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  throw new Error('FATAL: MONGO_URI environment variable is not defined.');
}

declare global {
  var mongoose: {
    conn: Mongoose | null;
    promise: Promise<Mongoose> | null;
  };
}

let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export async function dbConnect(): Promise<Mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGO_URI!, {
      bufferCommands: false,
      maxPoolSize: 3,        // Vercel serverless: many instances × low pool = safe total
      minPoolSize: 0,        // Release connections when idle
      maxIdleTimeMS: 10000,  // Close connections idle for 10s
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 30000,
      connectTimeoutMS: 10000,
      family: 4,
    }).then((m) => m).catch((err) => {
      cached.promise = null;
      throw err;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    throw e;
  }

  return cached.conn;
}
