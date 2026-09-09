require('dotenv').config();
const { getDbAdmin } = require('../dist/config/supabase');

async function testUpload() {
  const db = getDbAdmin();
  const testBuffer = Buffer.from('DIU Investment Club Constitution test file contents');
  const path = `club/test_constitution_${Date.now()}.txt`;
  
  const { data: uploadData, error: uploadErr } = await db.storage
    .from('documents')
    .upload(path, testBuffer, { contentType: 'text/plain', upsert: true });

  console.log('Upload result:', uploadData, 'Error:', uploadErr);

  if (uploadData) {
    // Test signed URL
    const { data: signedData, error: signedErr } = await db.storage
      .from('documents')
      .createSignedUrl(path, 60);
    console.log('Signed URL result:', signedData?.signedUrl ? 'SUCCESS (got URL)' : null, 'Error:', signedErr);

    // Clean up test file
    const { data: rmData, error: rmErr } = await db.storage
      .from('documents')
      .remove([path]);
    console.log('Cleanup result:', rmData, 'Error:', rmErr);
  }
}

testUpload().catch(console.error);
