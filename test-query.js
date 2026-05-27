const { MongoClient } = require('mongodb');
async function test() {
  const client = new MongoClient('mongodb+srv://pharmastakx_db_user:pharmastackx007@cluster0.tpkohgb.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0');
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
