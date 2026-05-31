const fs = require('fs');
const path = require('path');

function searchFileGlobal(dir) {
  try {
    const list = fs.readdirSync(dir);
    for (const file of list) {
      if (file === 'node_modules' || file === 'proc' || file === 'sys' || file === 'dev' || file === 'lib' || file === 'lib64' || file === 'usr') continue;
      const fullPath = path.join(dir, file);
      let stat;
      try {
        stat = fs.statSync(fullPath);
      } catch (e) {
        continue;
      }
      if (stat.isDirectory()) {
         searchFileGlobal(fullPath);
      } else if (file === 'App.tsx' || file === 'App_backup.tsx') {
         console.log(`FOUND SYSTEM COPY: ${fullPath} (${stat.size} bytes)`);
      }
    }
  } catch (err) {}
}

console.log("Scanning global system for App.tsx replicas...");
searchFileID = searchFileGlobal('/');
console.log("Scan completed.");
