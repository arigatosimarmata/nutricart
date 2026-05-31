const fs = require('fs');
const path = require('path');

function searchFile(dir, fileName) {
  try {
    const list = fs.readdirSync(dir);
    for (const file of list) {
      if (file === 'node_modules' || file === '.git' || file === 'dist' || file === 'backend-go') continue;
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        searchFile(fullPath, fileName);
      } else if (file === fileName) {
        console.log(`Found file: ${fullPath} (${stat.size} bytes)`);
      }
    }
  } catch (err) {}
}

console.log("Searching for copy of App.tsx in project space...");
searchFile('.', 'App.tsx');
searchFile('.', 'App_backup.tsx');
console.log("Search finished.");
