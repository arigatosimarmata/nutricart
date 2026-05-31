const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');

// Find activeTab === "playground" starting index and ending index
let startIdx = -1;
let endIdx = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('activeTab === "playground" && (')) {
    startIdx = i;
  }
  if (startIdx !== -1 && i > startIdx && lines[i].trim() === ')}') {
    // We want the last )} of the playground tab before code tab
    if (lines[i+2] && lines[i+2].includes('Go Source Viewer Cockpit')) {
      endIdx = i;
      break;
    }
  }
}

if (startIdx !== -1 && endIdx !== -1) {
  console.log(`Found playground tab at lines ${startIdx + 1} to ${endIdx + 1}`);
  
  // Extract playground contents ( we keep everything between activeTab === "playground" && (   and   )} )
  const playgroundLines = lines.slice(startIdx + 1, endIdx);
  const playgroundJsx = playgroundLines.join('\n');
  
  // Create function renderPlaygroundTab
  const renderFunction = `  const renderPlaygroundTab = () => {
    if (activeTab !== "playground") return null;
    return (
${playgroundJsx}
    );
  };\n`;

  // Remove playground lines from master list and replace activeTab === "playground" with {renderPlaygroundTab()}
  lines.splice(startIdx, (endIdx - startIdx) + 1, '        {renderPlaygroundTab()}');
  
  let newContent = lines.join('\n');
  
  // Now we need to insert renderPlaygroundTab function definition BEFORE "return ("
  const returnIdx = newContent.indexOf('return (');
  if (returnIdx !== -1) {
    const beforeReturn = newContent.substring(0, returnIdx);
    const afterReturn = newContent.substring(returnIdx);
    
    fs.writeFileSync(filePath, beforeReturn + renderFunction + '\n' + afterReturn, 'utf8');
    console.log("Successfully moved playground tab to renderPlaygroundTab fn!");
  } else {
    console.log("Error: return ( not found in file!");
  }
} else {
  console.log(`Markers not found! startIdx: ${startIdx}, endIdx: ${endIdx}`);
}
