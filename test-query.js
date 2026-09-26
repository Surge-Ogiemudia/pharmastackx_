const { MongoClient } = require('mongodb');
async function test() {
  const client = new MongoClient(process.env.MONGO_URI);
  await client.connect();
  const db = client.db('test');
  const p = await db.collection('products').find({ itemName: /Amlodipine/i, isPublished: true, quantity: { $gt: 0 } }).toArray();
  console.log('Products:', p.length);
  const slugs = p.map(x => x.slug);
  const users = await db.collection('users').find({ slug: { $in: slugs } }).toArray();
  console.log('Users:', users.length, users.map(u => u.slug));
  await client.close();
}
test();
