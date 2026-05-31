const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

if (content.includes('auth_usecase_test.go"')) {
  console.log("Found faulty double quote, replacing with backtick...");
  content = content.replace('auth_usecase_test.go"', 'auth_usecase_test.go`');
  fs.writeFileSync(filePath, content, 'utf8');
  console.log("Successfully replaced and saved!");
} else {
  console.log("Faulty double quote not found with exact match, let's dump the substring around auth_usecase_test.go:");
  const idx = content.indexOf('auth_usecase_test.go');
  if (idx !== -1) {
    console.log("Characters:", JSON.stringify(content.slice(idx, idx + 30)));
  } else {
    console.log("Substring not found!");
  }
}
