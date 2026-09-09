const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
  input: fs.createReadStream('C:/Users/Siami/.gemini/antigravity-ide/brain/58e322b9-915c-4ae9-a63e-4125c7c7ac5a/.system_generated/logs/transcript.jsonl'),
  crlfDelay: Infinity
});

rl.on('line', (line) => {
  if (line.includes('"step_index":2082')) {
    const obj = JSON.parse(line);
    fs.writeFileSync('C:/Users/Siami/.gemini/antigravity-ide/brain/58e322b9-915c-4ae9-a63e-4125c7c7ac5a/scratch/step2082.json', JSON.stringify(obj, null, 2));
    process.exit(0);
  }
});
