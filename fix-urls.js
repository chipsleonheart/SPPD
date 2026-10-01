import fs from 'node:fs';
import path from 'node:path';

const pagesDirectory = './src/pages';
for (const file of fs.readdirSync(pagesDirectory).filter((entry) => entry.endsWith('.jsx'))) {
  const filePath = path.join(pagesDirectory, file);
  const content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('http://localhost:3001')) {
    fs.writeFileSync(filePath, content.replaceAll('http://localhost:3001', ''));
    console.log('Fixed', file);
  }
}
