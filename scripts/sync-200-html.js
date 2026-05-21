/**
 * Keeps 200.html in sync with index.html for Vercel /app and /dashboard rewrites.
 * Run: node scripts/sync-200-html.js
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const indexPath = path.join(root, 'index.html');
const outPath = path.join(root, '200.html');

fs.copyFileSync(indexPath, outPath);
console.log('Synced index.html -> 200.html');
