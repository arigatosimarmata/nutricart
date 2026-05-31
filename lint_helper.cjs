const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'App.tsx');
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
const stack = [];

// Simple tag parsing using regex
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Skip comment lines in general
  if (line.trim().startsWith('//') || line.trim().startsWith('{/*')) continue;
  
  // Find tags
  const tagRegex = /<\/?[a-zA-Z][a-zA-Z0-9:-]*[^>]*>/g;
  let match;
  while ((match = tagRegex.exec(line)) !== null) {
    const rawTag = match[0];
    
    // Ignore self-closing tags like <img ... />, <input ... />, <br />, <Sparkles ... /> (assuming no custom children inside)
    if (rawTag.endsWith('/>') || rawTag.includes('<img') || rawTag.includes('<input') || rawTag.includes('<br') || rawTag.includes('<RefreshCw') || rawTag.includes('<AlertCircle') || rawTag.includes('<Sparkles') || rawTag.includes('<Cpu') || rawTag.includes('<Barcode') || rawTag.includes('<Plus') || rawTag.includes('<Trash2') || rawTag.includes('<Dolly') || rawTag.includes('<FolderTree') || rawTag.includes('<BookOpen') || rawTag.includes('<CheckCircle') || rawTag.includes('<Database') || rawTag.includes('<Terminal')) {
      continue;
    }
    
    // AnimatePresence, motion.div etc. are relevant
    const isClosing = rawTag.startsWith('</');
    const tagNameMatch = rawTag.match(/<\/?([a-zA-Z0-9\.-]+)/);
    if (!tagNameMatch) continue;
    const tagName = tagNameMatch[1];
    
    if (isClosing) {
      if (stack.length === 0) {
        console.log(`Warning Line ${i+1}: Closing tag </${tagName}> without opening tag!`);
      } else {
        const last = stack.pop();
        if (last.name !== tagName) {
          console.log(`Mismatch Line ${i+1}: Attempted to close </${tagName}> but last opened tag was <${last.name}> from line ${last.line}`);
          // Put it back to continue analysis
          stack.push(last);
        }
      }
    } else {
      stack.push({ name: tagName, line: i + 1 });
    }
  }
}

if (stack.length > 0) {
  console.log("\nUnclosed tags remaining in stack:");
  stack.forEach(t => console.log(`  <${t.name}> opened on line ${t.line}`));
} else {
  console.log("\nAll parsed tags balanced!");
}
