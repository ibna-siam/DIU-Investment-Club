require('dotenv').config();
const { getDbAdmin } = require('../dist/config/supabase');

async function cleanNotificationSpam() {
  const db = getDbAdmin();
  
  console.log('Cleaning duplicate notification spam from database...');

  // Fetch all notifications ordered by created_at descending
  const { data: allNotifs, error } = await db
    .from('notifications')
    .select('id, user_id, title, message, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching notifications:', error);
    return;
  }

  console.log(`Found ${allNotifs?.length || 0} total notifications in database.`);

  const seen = new Set();
  const duplicateIds = [];

  for (const n of (allNotifs || [])) {
    // Unique key: user_id + title
    const key = `${n.user_id}:${n.title}`;
    if (seen.has(key)) {
      duplicateIds.push(n.id);
    } else {
      seen.add(key);
    }
  }

  console.log(`Identified ${duplicateIds.length} duplicate notification entries to remove.`);

  if (duplicateIds.length > 0) {
    // Delete in batches of 100
    for (let i = 0; i < duplicateIds.length; i += 100) {
      const batch = duplicateIds.slice(i, i + 100);
      const { error: delErr } = await db
        .from('notifications')
        .delete()
        .in('id', batch);

      if (delErr) {
        console.error('Error deleting batch:', delErr);
      }
    }
    console.log(`Successfully purged ${duplicateIds.length} duplicate notifications!`);
  }

  const { count } = await db.from('notifications').select('*', { count: 'exact', head: true });
  console.log(`Clean notifications count remaining: ${count}`);
}

cleanNotificationSpam().catch(console.error);
