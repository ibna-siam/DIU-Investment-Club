const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
  input: fs.createReadStream('C:/Users/Siami/.gemini/antigravity-ide/brain/58e322b9-915c-4ae9-a63e-4125c7c7ac5a/.system_generated/logs/transcript.jsonl'),
  crlfDelay: Infinity
});

const results = [];
rl.on('line', (line) => {
  if (line.includes('members') && (line.includes('INSERT') || line.includes('insert') || line.includes('seed') || line.includes('Mohammad Tanvir Ahmed'))) {
    results.push(line.substring(0, 200));
  }
});

rl.on('close', () => {
  console.log(`Found ${results.length} occurrences`);
  console.log(results.slice(0, 15));
});
