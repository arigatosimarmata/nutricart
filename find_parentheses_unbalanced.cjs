const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'App.tsx');
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');

console.log("Analyzing parentheses balance inside renderPlaygroundTab fn (lines 452 to 1057)...");

let parenLevel = 0;
const stack = [];

for (let i = 451; i < 1057; i++) {
  const lineNum = i + 1;
  const line = lines[i];

  if (!line) continue;

  let trimmed = line.trim();
  // skip comments and logs
  if (trimmed.startsWith('//') || trimmed.startsWith('{/*') || trimmed.startsWith('/*')) continue;

  let inDoubleQuote = false;
  let inSingleQuote = false;
  let inTemplateLiteral = false;

  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    
    // Simple state machine for string literals
    if (char === '"' && !inSingleQuote && !inTemplateLiteral) inDoubleQuote = !inDoubleQuote;
    else if (char === "'" && !inDoubleQuote && !inTemplateLiteral) inSingleQuote = !inSingleQuote;
    else if (char === '`' && !inDoubleQuote && !inSingleQuote) inTemplateLiteral = !inTemplateLiteral;

    if (inDoubleQuote || inSingleQuote || inTemplateLiteral) continue;

    // Check parentheses
    if (char === '(') {
      parenLevel++;
      stack.push({ char: '(', line: lineNum, col: j + 1 });
    } else if (char === ')') {
      parenLevel--;
      const popped = stack.pop();
      if (parenLevel < 0) {
        console.log(`Error: Extra closing parenthesis ')' at line ${lineNum}, col ${j + 1}`);
        parenLevel = 0; // reset
      }
    }
  }
}

console.log(`\nRemaining open parentheses in helper function: ${stack.length}`);
stack.forEach(p => {
  console.log(`  '${p.char}' opened on line ${p.line}, col ${p.col}`);
});
