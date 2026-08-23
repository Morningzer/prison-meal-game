const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const sourcePath = path.resolve(__dirname, '../../111/data.js');
const outputPath = path.resolve(__dirname, '../data/hengwen_content.json');

if (!fs.existsSync(sourcePath)) {
  throw new Error(`Formal content source not found: ${sourcePath}`);
}

const sandbox = { window: {} };
const source = fs.readFileSync(sourcePath, 'utf8');
vm.runInNewContext(source, sandbox, { filename: sourcePath });

if (!sandbox.window.DATA) {
  throw new Error('Formal content source did not expose window.DATA.');
}

fs.writeFileSync(outputPath, `${JSON.stringify(sandbox.window.DATA, null, 2)}\n`);
console.log(`Exported formal Hengwen content to ${outputPath}`);
