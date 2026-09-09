require('dotenv').config();
const { getDbAdmin } = require('../dist/config/supabase');

async function inspect() {
  const db = getDbAdmin();
  
  // Check notifications table
  const { data: notifData, error: nErr } = await db.from('notifications').select('*').limit(3);
  console.log('Notifications error:', nErr);
  console.log('Notifications sample row:', notifData ? notifData[0] : null);

  // Check documents table
  const { data: docData, error: dErr } = await db.from('documents').select('*').limit(3);
  console.log('Documents error:', dErr);
  console.log('Documents sample row:', docData ? docData[0] : null);

  // Check buckets in Supabase Storage
  const { data: buckets, error: bErr } = await db.storage.listBuckets();
  console.log('Storage buckets:', buckets, 'Error:', bErr);

  // Check audit_logs table
  const { data: auditData, error: aErr } = await db.from('audit_logs').select('*').limit(1);
  console.log('Audit logs sample row:', auditData ? Object.keys(auditData[0] || {}) : aErr);
}

inspect().catch(console.error);
