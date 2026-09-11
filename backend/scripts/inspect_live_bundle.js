const fs = require('fs');

async function inspect() {
  const res = await fetch('https://www.invesmentclub.top/login');
  const html = await res.text();
  const regex = /src="([^"]+\.js)"/g;
  let m;
  const scripts = [];
  while ((m = regex.exec(html)) !== null) {
    scripts.push(m[1]);
  }
  console.log('Scripts found:', scripts.length);
  for (const s of scripts) {
    const scriptUrl = s.startsWith('http') ? s : 'https://www.invesmentclub.top' + s;
    const sRes = await fetch(scriptUrl);
    const text = await sRes.text();
    const matches = text.match(/(https?:\/\/[a-zA-Z0-9\.\:\-]+(?:\/api\/v1)?)/g) || [];
    const relevant = matches.filter(u => u.includes('5000') || u.includes('api') || u.includes('invesmentclub') || u.includes('render'));
    if (relevant.length > 0) {
      console.log('Script:', scriptUrl);
      console.log('Relevant URLs found:', [...new Set(relevant)]);
    }
  }
}

inspect().catch(console.error);
