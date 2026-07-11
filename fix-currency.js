const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Restoring corrupted files...');
execSync('git checkout -- d:/WorldR/frontend/src');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.ts') || file.endsWith('.tsx')) results.push(file);
    }
  });
  return results;
}

const files = walk('d:/WorldR/frontend/src');
let changed = 0;
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('§')) {
    // string replace with $$ means a single literal $ in output
    let newContent = content.replace(/§/g, '$$$$'); // Wait! In JS string replace using RegExp, '$$' yields '$'. So '$$$$' would yield '$$'. We want '$', so '$$' is correct.
    
    // Actually, to avoid escaping madness, let's just pass a function:
    newContent = content.replace(/§/g, () => '$');
    
    fs.writeFileSync(file, newContent, 'utf8');
    changed++;
  }
});

console.log('Replaced § with $ in ' + changed + ' files.');
