const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const AUDIT_MODELS = [
  { key: 'vehicle_forklift_orange_a01', height: 1.8, targetY: 0.9, camPos: [2.5, 1.8, 2.5] },
  { key: 'robotic_system_a01', height: 2.2, targetY: 1.1, camPos: [3.2, 2.2, 3.2] },
  { key: 'engineAssembly_electric_engine_a01', height: 1.2, targetY: 0.6, camPos: [1.8, 1.2, 1.8] },
  { key: 'wheelAssembly_tire_c01', height: 1.0, targetY: 0.5, camPos: [1.5, 0.9, 1.5] },
  { key: 'conveyor_belt_a05', height: 1.5, targetY: 0.7, camPos: [3.5, 2.2, 3.5] },
  { key: 'rack_h3m_s02', height: 2.8, targetY: 1.4, camPos: [4.0, 2.8, 4.0] }
];

async function runAudit() {
  const outDir = path.join(__dirname, 'screenshots/models');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 1000));

  await page.evaluate(() => {
    const btn = document.getElementById('btn-model-inspector');
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 1000));

  for (const m of AUDIT_MODELS) {
    console.log(`Auditing ${m.key}...`);
    const res = await page.evaluate(async (cfg) => {
      const { loadSingleSimReadyAsset, instantiateSimReady } = await import('/src/simreadyLoader.js');
      await loadSingleSimReadyAsset(cfg.key);
      const instance = instantiateSimReady(cfg.key, { targetHeight: cfg.height });
      if (!instance) return { error: 'Failed to instantiate' };

      const insp = window.__modelInspectorInstance;
      if (!insp) return { error: 'Inspector not found' };

      if (insp.currentInstance) insp.scene.remove(insp.currentInstance);
      insp.currentInstance = instance;
      insp.scene.add(instance);

      insp.camera.position.set(cfg.camPos[0], cfg.camPos[1], cfg.camPos[2]);
      insp.controls.target.set(0, cfg.targetY, 0);
      insp.controls.update();

      insp.renderer.render(insp.scene, insp.camera);
      return { ok: true, dataUrl: insp.renderer.domElement.toDataURL('image/png') };
    }, m);

    if (res && res.dataUrl) {
      const base64Data = res.dataUrl.replace(/^data:image\/png;base64,/, '');
      fs.writeFileSync(path.join(outDir, `${m.key}.png`), base64Data, 'base64');
      console.log(`Saved screenshot: ${m.key}.png`);
    } else {
      console.log(`Failed capture for ${m.key}:`, res);
    }
  }

  await browser.close();
  console.log('Visual audit finished!');
}

runAudit().catch(err => {
  console.error(err);
  process.exit(1);
});
