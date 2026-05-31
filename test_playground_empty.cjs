const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'App.tsx');
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');

// Find activeTab === "playground" start and end inside renderPlaygroundTab fn
let startFnIdx = -1;
let endFnIdx = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('const renderPlaygroundTab = () => {')) {
    startFnIdx = i;
    break;
  }
}

if (startFnIdx !== -1) {
  for (let i = lines.length - 1; i > startFnIdx; i--) {
    if (lines[i].trim().startsWith('};') && lines[i-1].trim().startsWith(');')) {
      endFnIdx = i;
      break;
    }
  }
}

if (startFnIdx !== -1 && endFnIdx !== -1) {
  console.log(`Found helper function at lines ${startFnIdx+1} to ${endFnIdx+1}`);
  const backupLines = [...lines];
  
  // Replace with empty playground handler
  lines.splice(startFnIdx + 2, (endFnIdx - startFnIdx) - 2, '    return <div>Empty Playground</div>;');
  
  fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
  console.log("Temporarily emptied playground tab! Let's test with tsc:");
  
  const execSync = require('child_process').execSync;
  try {
    execSync('npx tsc --noEmit', { stdio: 'inherit' });
    console.log("Result: TSC SUCCESS! The error indeed lies strictly inside the playground tab code!");
  } catch (err) {
    console.log("Result: TSC FAILED! The error lies outside of the playground tab code as well!");
  }
  
  // Restore backup
  fs.writeFileSync(filePath, backupLines.join('\n'), 'utf8');
  console.log("App.tsx restored from memory!");
} else {
  console.log("Helper function markers not found!");
}
