const fs = require('fs');
const path = require('path');

const esmPkgPath = path.join(__dirname, '../dist/esm/package.json');
const cjsPkgPath = path.join(__dirname, '../dist/cjs/package.json');

// Ensure parent directories exist
fs.mkdirSync(path.dirname(esmPkgPath), { recursive: true });
fs.mkdirSync(path.dirname(cjsPkgPath), { recursive: true });

fs.writeFileSync(esmPkgPath, JSON.stringify({ type: 'module' }, null, 2));
fs.writeFileSync(cjsPkgPath, JSON.stringify({ type: 'commonjs' }, null, 2));

console.log('Postbuild: Package directories marked with correct module types.');
