const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const REFS = [
  { key: 'vehicle_forklift_orange_a01', scale: 1, pos: [2.6, 1.8, 2.8], target: [0, 0.9, 0.4] },
  { key: 'robotic_system_a01', scale: 1, pos: [3.2, 2.2, 3.2], target: [0, 1.0, 0] },
  { key: 'conveyor_belt_a05', scale: 1, pos: [3.0, 2.0, 3.0], target: [0, 0.6, 0] },
  { key: 'rack_h3m_s02', scale: 1, pos: [4.0, 2.5, 4.0], target: [0, 1.4, 0] },
  { key: 'engineAssembly_electric_engine_a01', scale: 1.5, pos: [1.5, 1.1, 1.5], target: [0, 0.4, 0] },
  { key: 'wheelAssembly_tire_c01', scale: 1.5, pos: [1.4, 1.0, 1.4], target: [0, 0.4, 0] }
];

async function run() {
  const outDir = path.join(__dirname, 'screenshots/refs');
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

  for (const r of REFS) {
    console.log('Capturing ref:', r.key);
    const dataUrl = await page.evaluate(async (cfg) => {
      const { loadSingleSimReadyAsset, instantiateSimReady } = await import('/src/simreadyLoader.js');
      await loadSingleSimReadyAsset(cfg.key);
      const instance = instantiateSimReady(cfg.key, { scale: cfg.scale });
      const insp = window.__modelInspectorInstance;
      if (!instance || !insp) return null;

      if (insp.currentInstance) insp.scene.remove(insp.currentInstance);
      insp.currentInstance = instance;
      insp.scene.add(instance);
      insp.runAnim = false;

      insp.camera.position.set(cfg.pos[0], cfg.pos[1], cfg.pos[2]);
      insp.controls.target.set(cfg.target[0], cfg.target[1], cfg.target[2]);
      insp.controls.update();
      insp.renderer.render(insp.scene, insp.camera);
      return insp.renderer.domElement.toDataURL('image/png');
    }, r);

    if (dataUrl) {
      fs.writeFileSync(path.join(outDir, `${r.key}.png`), dataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');
      console.log('Saved:', r.key);
    }
  }

  await browser.close();
}

run().catch(e => { console.error(e); process.exit(1); });
