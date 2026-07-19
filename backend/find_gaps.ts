import { db } from './src/config/database';
import fs from 'fs';
import path from 'path';

async function getDbSchema() {
  const query = `
    SELECT table_name, column_name 
    FROM information_schema.columns 
    WHERE table_schema = 'public'
  `;
  const res = await db.raw(query);
  const schema: Record<string, Set<string>> = {};
  for (const row of res.rows) {
    if (!schema[row.table_name]) schema[row.table_name] = new Set();
    schema[row.table_name].add(row.column_name);
  }
  return schema;
}

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

async function main() {
  const schema = await getDbSchema();
  const allFiles = getAllTsFiles('./src');
  
  const insertUpdateRegex = /(?:insert|update)\s*\(\s*\{([^}]+)\}/g;
  const tableRegex = /(?:trx|db)\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  
  // Actually, parsing this with Regex is hard because of variables. 
  // Let's just output the schema to a file so we can read it easily.
  console.log("DB Tables:", Object.keys(schema).length);
  fs.writeFileSync('db_schema.json', JSON.stringify(Object.fromEntries(
    Object.entries(schema).map(([k, v]) => [k, Array.from(v)])
  ), null, 2));
  console.log("Wrote db_schema.json");
  process.exit(0);
}

main().catch(console.error);
