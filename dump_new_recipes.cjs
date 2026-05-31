const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'App.tsx');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

console.log("Dumping new lines 1080 to 1195 to trace the tags:");
for (let i = 1079; i <Math.min(lines.length, 1195); i++) {
  console.log(`${i + 1}: ${lines[i]}`);
}
