import mongoose, { Mongoose } from 'mongoose';

// --- FIX: Corrected environment variable name back to MONGO_URI to match Vercel settings ---
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  // This error will be thrown during the build process if the variable is missing.
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
  console.log('[dbConnect] Attempting to connect to the database.');

  if (cached.conn) {
    console.log('[dbConnect] Returning cached database connection.');
    return cached.conn;
  }

  if (!cached.promise) {
    console.log('[dbConnect] No existing connection promise. Creating a new one.');
    const opts = {
      bufferCommands: true,
      maxPoolSize: 10, // Restrict connection pool to avoid Atlas M0 limits
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };
    // Use the correct MONGO_URI variable
    cached.promise = mongoose.connect(MONGO_URI!, opts).then((mongoose) => {
      console.log('[dbConnect] Database connection successfully established.');
      return mongoose;
    }).catch(err => {
        console.error('[dbConnect] Initial connection error:', err);
        cached.promise = null; // Important: clear promise on error
        throw err;
    });
  }

  try {
    console.log('[dbConnect] Awaiting existing connection promise.');
    cached.conn = await cached.promise;
  } catch(e) {
      // This will catch the error thrown from the .catch block above
      console.error("[dbConnect] Failed to await the connection promise.", e);
      throw e;
  }
  
  return cached.conn;
}
