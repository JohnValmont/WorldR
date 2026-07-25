const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('d:/WorldR/frontend/src');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // Replace .toLocaleString() with .toLocaleString('en-US')
  // We need to be careful not to replace it if it already has arguments.
  // Using a regex to match empty parens.
  const regexEmpty = /\.toLocaleString\(\s*\)/g;
  if (regexEmpty.test(content)) {
    content = content.replace(regexEmpty, ".toLocaleString('en-US')");
    changed = true;
  }

  // Replace .toLocaleString(undefined with .toLocaleString('en-US'
  const regexUndefined = /\.toLocaleString\(\s*undefined/g;
  if (regexUndefined.test(content)) {
    content = content.replace(regexUndefined, ".toLocaleString('en-US'");
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
  }
});
