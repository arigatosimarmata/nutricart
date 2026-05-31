const fs = require('fs');
fs.copyFileSync('src/App.tsx', 'src/App_backup.tsx');
console.log("App.tsx backup created successfully!");
