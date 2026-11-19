'use strict';

const fs = require('fs');
const path = require('path');

const scriptsDir = path.join(__dirname, '..', 'scripts');
const indexPath = path.join(scriptsDir, 'INDEX.md');

function collectScripts(dir, base = '') {
    const files = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const rel = base ? `${base}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
            files.push(...collectScripts(path.join(dir, entry.name), rel));
        } else if (/\.(js|mjs)$/.test(entry.name) && entry.name !== 'INDEX.md') {
            files.push(rel);
        }
    }
    return files;
}

const scripts = collectScripts(scriptsDir);
const indexContent = fs.readFileSync(indexPath, 'utf8');
const missing = scripts.filter(f => !indexContent.includes(f));

if (missing.length > 0) {
    console.error('scripts/INDEX.md brakuje wpisów dla:');
    missing.forEach(f => console.error('  - ' + f));
    process.exit(1);
}

console.log(`scripts/INDEX.md zawiera wszystkie ${scripts.length} skrypty.`);
