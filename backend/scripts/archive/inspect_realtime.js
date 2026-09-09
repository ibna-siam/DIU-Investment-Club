require('dotenv').config();
const { getDbAdmin } = require('../dist/config/supabase');

async function check() {
  const db = getDbAdmin();
  
  // Check notifications count and recent notifications
  const { data: countData, count } = await db
    .from('notifications')
    .select('id, user_id, title, is_read, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(10);

  console.log('Total notifications:', count);
  console.log('Recent notifications:', countData);
}

check().catch(console.error);
