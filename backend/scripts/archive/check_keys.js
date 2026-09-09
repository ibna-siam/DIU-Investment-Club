require('dotenv').config();
const { queryDatabase } = require('../dist/database/db');

async function checkUsers() {
  const users = await queryDatabase('SELECT id, email, full_name, role_id, is_active FROM users LIMIT 5');
  console.log('Users in users table:', users ? users.rows : null);

  const profiles = await queryDatabase('SELECT id, email, full_name FROM profiles LIMIT 5');
  console.log('Profiles in profiles table:', profiles ? profiles.rows : null);
}

checkUsers().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
