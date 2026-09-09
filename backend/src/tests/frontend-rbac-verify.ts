async function verifyFrontend() {
  console.log('\n--- VERIFYING FRONTEND ENDPOINTS & PAGES ---');
  const pages = [
    'http://localhost:3000/login',
    'http://localhost:3000/dashboard',
    'http://localhost:3000/unauthorized',
    'http://localhost:3000/settings',
    'http://localhost:3000/users',
  ];

  for (const page of pages) {
    try {
      const res = await fetch(page);
      console.log(`  [FRONTEND] ${page} -> Status ${res.status}`);
    } catch (err: any) {
      console.error(`  [FRONTEND ERROR] ${page} -> ${err.message}`);
    }
  }
}

verifyFrontend();
