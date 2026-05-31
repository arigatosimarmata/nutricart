const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'App.tsx');
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');

// Line 1161 is 0-indexed index 1160
console.log("Current Line 1161 content:", JSON.stringify(lines[1160]));

if (lines[1160].trim() === ')}') {
  console.log("Found target. Modifying to `))` block...");
  lines[1160] = lines[1160].replace(')}', '))}') ;
  fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
  console.log("Replaced successfully!");
} else {
  console.log("Target line content doesn't match expected! Searching by text...");
  let found = false;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('rcp.instructions?.slice') && lines[i+2] && lines[i+2].trim() === ')}') {
      console.log(`Found target at line ${i+3}:`, JSON.stringify(lines[i+2]));
      lines[i+2] = lines[i+2].replace(')}', '))}') ;
      fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
      console.log("Replaced successfully!");
      found = true;
      break;
    }
  }
  if (!found) console.log("Not found anywhere!");
}
