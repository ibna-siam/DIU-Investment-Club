require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { getDbAdmin, isSupabaseConfigured } = require('../dist/config/supabase');

async function testPing() {
  console.log('isSupabaseConfigured:', isSupabaseConfigured());
  const client = getDbAdmin();
  
  for (let i = 1; i <= 3; i++) {
    const t0 = Date.now();
    try {
      const { data, error, status } = await client
        .from('system_settings')
        .select('id')
        .limit(1);
      const latency = Date.now() - t0;
      console.log(`Run ${i}: status=${status}, latency=${latency}ms, error=${error?.message || 'none'}, rows=${data?.length}`);
    } catch (e) {
      console.log(`Run ${i} exception:`, e.message);
    }
  }
}

testPing();
