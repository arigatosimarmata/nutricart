const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'App.tsx');
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
const divStack = [];

console.log("Tracking DIV tag stack inside Playground (Lines 582 to 900)...");

for (let i = 581; i < 900; i++) {
  const lineNum = i + 1;
  const line = lines[i];

  if (!line) continue;

  let trimmed = line.trim();
  if (trimmed.startsWith('//') || trimmed.startsWith('{/*')) continue;

  // Track if we open or close a DIV
  // We can use a simpler regex for divs only: <div or </div>
  const regex = /(<div\b[^>]*>)|(<\/div>)/g;
  let match;
  while ((match = regex.exec(line)) !== null) {
    if (match[1]) {
      // It is an opening <div ...>
      divStack.push({ line: lineNum, text: match[1].slice(0, 50) });
      console.log(`[PUSH] Line ${lineNum}: Opened DIV. Stack size: ${divStack.length}`);
    } else if (match[2]) {
      // It is a closing </div>
      if (divStack.length === 0) {
        console.log(`[EMPTY CLASH!] Line ${lineNum}: Attempted to close </div> but stack is EMPTY!`);
      } else {
        const last = divStack.pop();
        console.log(`[POP] Line ${lineNum}: Closed DIV from Line ${last.line}. Stack size: ${divStack.length}`);
      }
    }
  }
}
