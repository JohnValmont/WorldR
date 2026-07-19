import fs from 'fs';
import path from 'path';

function getAllTsFiles(dirPath: string, arrayOfFiles: string[] = []) {
  const files = fs.readdirSync(dirPath);
  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllTsFiles(dirPath + "/" + file, arrayOfFiles);
    } else if (file.endsWith('.ts')) {
      arrayOfFiles.push(path.join(dirPath, "/", file));
    }
  });
  return arrayOfFiles;
}

const dbSchema = require('./db_schema.json');
const allDbColumns = new Set<string>();
for (const cols of Object.values(dbSchema)) {
  for (const col of (cols as string[])) {
    allDbColumns.add(col);
  }
}

const files = getAllTsFiles('./src');
const maybeMissingColumns = new Set<string>();

const keyRegex = /['"]?([a-zA-Z0-9_]+)['"]?\s*:/g;

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  
  // Very rough heuristic: find .update({ ... }) or .insert({ ... })
  const blockRegex = /\.(?:update|insert|where)\s*\(\s*\{([^}]+)\}/g;
  let match;
  while ((match = blockRegex.exec(content)) !== null) {
    const block = match[1];
    let keyMatch;
    while ((keyMatch = keyRegex.exec(block)) !== null) {
      const key = keyMatch[1];
      if (!allDbColumns.has(key)) {
        maybeMissingColumns.add(key);
      }
    }
  }
  
  // also check select('col1', 'col2')
  const selectRegex = /\.select\s*\(([^)]+)\)/g;
  let sMatch;
  while ((sMatch = selectRegex.exec(content)) !== null) {
    const args = sMatch[1].split(',').map(s => s.trim().replace(/['"]/g, ''));
    for (let arg of args) {
      if (arg.includes('.')) arg = arg.split('.')[1]; // table.column
      if (arg.includes(' as ')) arg = arg.split(' as ')[0].trim();
      if (!allDbColumns.has(arg) && arg !== '*' && arg.length > 0) {
        maybeMissingColumns.add(arg);
      }
    }
  }
});

console.log("Potentially missing DB columns referenced in TS:", Array.from(maybeMissingColumns));
