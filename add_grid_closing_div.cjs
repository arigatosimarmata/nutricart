const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const targetStr = `                          ) : (
                            <div className="col-span-2 text-center text-xs text-slate-500 py-4">Format hasil tidak valid.</div>
                          )}
                        

                      </motion.div>`;

const replacementStr = `                          ) : (
                            <div className="col-span-2 text-center text-xs text-slate-500 py-4">Format hasil tidak valid.</div>
                          )}
                        </div>

                      </motion.div>`;

if (content.includes(targetStr)) {
  console.log("Target string found. Replacing...");
  content = content.replace(targetStr, replacementStr);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log("Successfully inserted closing div!");
} else {
  console.log("Target string not found with exact spacing. Let's do a line-by-line replacement:");
  const lines = content.split('\n');
  let foundIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('Format hasil tidak valid.') && lines[i+1].trim() === ')}') {
      foundIdx = i + 1;
      break;
    }
  }
  if (foundIdx !== -1) {
    console.log(`Found location at line ${foundIdx + 1}`);
    lines.splice(foundIdx + 1, 0, '                        </div>');
    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    console.log("Successfully inserted closing div at line-by-line basis!");
  } else {
    console.log("Not found with line-by-line either!");
  }
}
