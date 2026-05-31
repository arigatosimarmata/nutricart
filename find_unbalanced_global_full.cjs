const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'App.tsx');
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
const bStack = []; // { }
const pStack = []; // ( )

console.log("Analyzing 100% full file braces and parentheses balance...");

for (let i = 0; i < lines.length; i++) {
  const lineNum = i + 1;
  const line = lines[i];

  if (!line) continue;

  let trimmed = line.trim();
  // Skip comments
  if (trimmed.startsWith('//') || trimmed.startsWith('{/*') || trimmed.startsWith('/*')) continue;

  let inString = false;
  let stringChar = '';

  for (let j = 0; j < line.length; j++) {
    const char = line[j];

    if ((char === '"' || char === "'" || char === '`') && (j === 0 || line[j - 1] !== '\\')) {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (stringChar === char) {
        inString = false;
      }
      continue;
    }

    if (inString) continue;

    if (char === '{') {
      bStack.push({ line: lineNum, col: j + 1 });
    } else if (char === '}') {
      if (bStack.length === 0) {
        console.log(`Global unbalanced '}' at line ${lineNum}, col ${j + 1}`);
      } else {
        bStack.pop();
      }
    } else if (char === '(') {
      pStack.push({ line: lineNum, col: j + 1 });
    } else if (char === ')') {
      if (pStack.length === 0) {
        console.log(`Global unbalanced ')' at line ${lineNum}, col ${j + 1}`);
      } else {
        pStack.pop();
      }
    }
  }
}

console.log(`\nUnclosed Braces ({) left: ${bStack.length}`);
bStack.forEach(b => console.log(`  { opened at Line ${b.line}, Col ${b.col}`));

console.log(`\nUnclosed Parentheses (() left: ${pStack.length}`);
pStack.forEach(p => console.log(`  ( opened at Line ${p.line}, Col ${p.col}`));
