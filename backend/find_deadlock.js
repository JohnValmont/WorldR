import * as fs from 'fs';
import * as path from 'path';

function searchDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      searchDir(fullPath);
    } else if (fullPath.endsWith('.ts')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      
      // We want to find functions that have 'trx' as an argument and contain 'db('
      // We will just do a simple check: if the file contains both 'trx: any' (or similar) and 'db('
      if (content.includes('trx') && content.includes('db(')) {
        console.log(`Potential candidate: ${fullPath}`);
        // Let's print out the lines with 'db('
        const lines = content.split('\n');
        lines.forEach((line, index) => {
          if (line.includes('db(')) {
            console.log(`  Line ${index + 1}: ${line.trim()}`);
          }
        });
      }
    }
  }
}

searchDir('d:\\WorldR\\backend\\src\\api');
