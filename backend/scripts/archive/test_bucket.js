require('dotenv').config();
const { getDbAdmin } = require('../dist/config/supabase');

async function testBucket() {
  const db = getDbAdmin();
  
  // List buckets
  let { data: buckets, error: listErr } = await db.storage.listBuckets();
  console.log('Existing buckets:', buckets);

  let docBucket = (buckets || []).find(b => b.name === 'documents');
  if (!docBucket) {
    console.log('Creating "documents" bucket...');
    const { data: created, error: createErr } = await db.storage.createBucket('documents', {
      public: true, // or false if signed URLs used
      fileSizeLimit: 20971520, // 20MB
    });
    console.log('Create bucket result:', created, 'Error:', createErr);
  }

  const { data: bucketsAfter } = await db.storage.listBuckets();
  console.log('Buckets after:', bucketsAfter);
}

testBucket().catch(console.error);
