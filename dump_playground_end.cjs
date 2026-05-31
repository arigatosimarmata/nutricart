const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'App.tsx');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

console.log("Dumping lines 1150 to 1185 with JSON formatting:");
for (let i = 1149; i < 1185; i++) {
  console.log(`${i + 1}: ${JSON.stringify(lines[i])}`);
}
