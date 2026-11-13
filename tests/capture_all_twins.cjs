const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const TWINS = [
  // skip
  // skip
  // skip
  { key: 'rack_h3m', fn: 'buildRackTwin', args: { targetHeight: 3.0 }, pos: [3.6, 2.4, 3.6], target: [0, 1.4, 0] },
  { key: 'electric_engine', fn: 'buildElectricEngineTwin', args: { targetHeight: 0.85 }, pos: [1.3, 0.9, 1.3], target: [0, 0.35, 0] },
  { key: 'wheel_sport', fn: 'buildWheelTwin', args: { targetHeight: 0.72 }, pos: [1.1, 0.8, 1.1], target: [0, 0.36, 0] }
];

async function run() {
  const outDir = path.join(__dirname, 'screenshots/twins');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1000, height: 700 });
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 1000));

  await page.evaluate(() => {
    document.getElementById('btn-model-inspector')?.click();
  });
  await new Promise(r => setTimeout(r, 800));

  for (const t of TWINS) {
    const res = await page.evaluate(async (cfg) => {
      const twins = await import('/src/threejsTwins.js');
      const instance = twins[cfg.fn](cfg.args);
      const insp = window.__modelInspectorInstance;
      if (!instance || !insp) return { error: 'Missing instance or inspector' };

      if (insp.currentInstance) insp.scene.remove(insp.currentInstance);
      insp.currentInstance = instance;
      insp.scene.add(instance);
      insp.runAnim = false;

      let tris = 0;
      let meshes = 0;
      instance.traverse(c => {
        if (c.isMesh && c.geometry) {
          meshes++;
          const idx = c.geometry.index;
          tris += idx ? idx.count / 3 : c.geometry.attributes.position.count / 3;
        }
      });

      insp.camera.position.set(cfg.pos[0], cfg.pos[1], cfg.pos[2]);
      insp.controls.target.set(cfg.target[0], cfg.target[1], cfg.target[2]);
      insp.controls.update();
      insp.renderer.render(insp.scene, insp.camera);
      return { tris: Math.round(tris), meshes, dataUrl: insp.renderer.domElement.toDataURL('image/png') };
    }, t);

    if (res && res.dataUrl) {
      fs.writeFileSync(path.join(outDir, `${t.key}.png`), res.dataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');
      console.log(`${t.key.padEnd(20)} | ${String(res.tris).padStart(5)} tris | ${res.meshes} meshes | Saved`);
    } else {
      console.log('Failed:', t.key, res);
    }
  }

  await browser.close();
}

run().catch(e => { console.error(e); process.exit(1); });
