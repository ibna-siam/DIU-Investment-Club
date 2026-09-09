const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
  input: fs.createReadStream('C:/Users/Siami/.gemini/antigravity-ide/brain/58e322b9-915c-4ae9-a63e-4125c7c7ac5a/.system_generated/logs/transcript.jsonl'),
  crlfDelay: Infinity
});

rl.on('line', (line) => {
  if (line.includes('"step_index":2082') || line.includes('"step_index":2084') || line.includes('"step_index":2086') || line.includes('"step_index":2100') || line.includes('"step_index":2105')) {
    const obj = JSON.parse(line);
    console.log('Step:', obj.step_index);
    if (obj.tool_calls) {
      for (const tc of obj.tool_calls) {
        console.log('Tool:', tc.name, JSON.stringify(tc.args).substring(0, 300));
      }
    }
  }
});
