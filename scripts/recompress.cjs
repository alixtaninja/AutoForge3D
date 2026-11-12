const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const dir = path.join(__dirname, '../public/models/simready');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.glb') && !f.includes('_20k') && !f.includes('_25k'));

console.log('Applying meshopt & prune on ' + files.length + ' models...');

for (const file of files) {
  const filePath = path.join(dir, file);
  const tmpPath = path.join(dir, 'recomp_' + file);
  try {
    execSync(`npx @gltf-transform/cli optimize "${filePath}" "${tmpPath}" --compress meshopt`, { stdio: 'pipe' });
    if (fs.existsSync(tmpPath)) {
      const oldSize = (fs.statSync(filePath).size / 1024 / 1024).toFixed(2);
      const newSize = (fs.statSync(tmpPath).size / 1024 / 1024).toFixed(2);
      console.log(`  ${file}: ${oldSize} MB -> ${newSize} MB`);
      fs.copyFileSync(tmpPath, filePath);
      fs.unlinkSync(tmpPath);
    }
  } catch (e) {
    console.error(`  Error on ${file}:`, e.message);
  }
}
