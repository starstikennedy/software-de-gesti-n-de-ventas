import { readFileSync, writeFileSync } from 'fs';
const path = './src/App.tsx';
let content = readFileSync(path, 'utf8');
content = content.split('\n').filter(line => line.trim() !== '```').join('\n');
writeFileSync(path, content, 'utf8');
console.log('Done. Lines:', content.split('\n').length);
