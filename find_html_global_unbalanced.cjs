const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'App.tsx');
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
const tagStack = [];

console.log("Analyzing global HTML tag balance from Line 527 to 1446...");

// Single tags to skip
const selfClosing = new Set([
  'img', 'input', 'br', 'hr', 'Plus', 'Trash2', 'Sparkles', 'RefreshCw', 
  'AlertCircle', 'Users', 'FolderTree', 'BookOpen', 'Database', 'Terminal', 'Check', 'Scan', 'Cpu', 'CheckCircle', 'ShoppingCart', 'Utensils', 'Shield'
]);

for (let i = 526; i < 1446; i++) {
  const lineNum = i + 1;
  const line = lines[i];

  if (!line) continue;

  let trimmed = line.trim();
  if (trimmed.startsWith('//') || trimmed.startsWith('{/*') || trimmed.startsWith('/*')) continue;

  const regex = /<\/?([a-zA-Z0-9\.-]+)([^>]*)\/?>/g;
  let match;
  while ((match = regex.exec(line)) !== null) {
    const fullTag = match[0];
    const tagName = match[1];
    const isClosing = fullTag.startsWith('</');
    const isSelfClosed = fullTag.endsWith('/>') || selfClosing.has(tagName);

    if (isSelfClosed) continue;

    if (isClosing) {
      if (tagStack.length === 0) {
        console.log(`Error at line ${lineNum}: Global Closing tag </${tagName}> without opening!`);
      } else {
        const last = tagStack.pop();
        if (last.name !== tagName) {
          console.log(`Error at line ${lineNum}: Global Mismatch! Trying to close </${tagName}>, but last opened was <${last.name}> on line ${last.line}`);
          tagStack.push(last); // keep to trace
        }
      }
    } else {
      tagStack.push({ name: tagName, line: lineNum });
    }
  }
}

console.log(`\nRemaining open global tags: ${tagStack.length}`);
tagStack.forEach(t => {
  console.log(`  <${t.name}> opened on line ${t.line}`);
});
