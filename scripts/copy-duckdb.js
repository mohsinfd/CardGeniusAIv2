import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '../public');

// Create public directory if it doesn't exist
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Copy DuckDB WASM files from node_modules to public directory
const duckdbDir = path.join(__dirname, '../node_modules/@duckdb/duckdb-wasm/dist');
const files = [
  'duckdb-mvp.wasm',
  'duckdb-browser-mvp.worker.js'
];

files.forEach(file => {
  const source = path.join(duckdbDir, file);
  const dest = path.join(publicDir, file);
  fs.copyFileSync(source, dest);
  console.log(`Copied ${file} to public directory`);
}); 