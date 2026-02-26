const fs = require('fs');
const path = require('path');
const p = './src/pages';
const files = fs.readdirSync(p).filter(f => f.endsWith('.jsx'));
for (let f of files) {
    const fp = path.join(p, f);
    let content = fs.readFileSync(fp, 'utf8');
    if (content.includes('http://localhost:3001')) {
        fs.writeFileSync(fp, content.split('http://localhost:3001').join(''));
        console.log('Fixed', f);
    }
}
