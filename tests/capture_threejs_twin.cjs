const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const CAMERAS = [
  { name: 'perspective', pos: [2.8, 2.5, 3.8], target: [0, 1.2, 0] },
  { name: 'shoulder', pos: [0.8, 1.9, 1.6], target: [0, 1.4, 0] },
  { name: 'wrist', pos: [1.2, 1.5, 0.5], target: [0.6, 1.4, 0] }
];

async function run() {
  const outDir = path.join(__dirname, 'screenshots');
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 1200));

  await page.evaluate(() => {
    document.getElementById('btn-model-inspector')?.click();
  });
  await new Promise(r => setTimeout(r, 1000));

  const stats = await page.evaluate(async () => {
    const { buildOptimizedLODRobotArm } = await import('/src/factoryBuilder.js');
    const instance = buildOptimizedLODRobotArm({ targetHeight: 2.35 });
    const insp = window.__modelInspectorInstance;
    if (!insp) return { error: 'No inspector' };

    // Apply same test posture as visual_compare.cjs
    instance.traverse((child) => {
      if (child.name === 'armShoulder_01_obj_00') child.rotation.z = -0.35;
      if (child.name === 'armShoulder_02_obj_00') child.rotation.z = 0.45;
      if (child.name === 'armShoulder_04_obj_00') child.rotation.y = 0.25;
    });

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
    return { tris: Math.round(tris), meshes };
  });

  console.log('Three.js Twin stats:', stats);

  for (const cam of CAMERAS) {
    const dataUrl = await page.evaluate((c) => {
      const insp = window.__modelInspectorInstance;
      insp.camera.position.set(c.pos[0], c.pos[1], c.pos[2]);
      insp.controls.target.set(c.target[0], c.target[1], c.target[2]);
      insp.controls.update();
      insp.renderer.render(insp.scene, insp.camera);
      return insp.renderer.domElement.toDataURL('image/png');
    }, cam);

    const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
    fs.writeFileSync(path.join(outDir, `threejs_twin_${cam.name}.png`), base64Data, 'base64');
    console.log(`Saved threejs_twin_${cam.name}.png`);
  }

  await browser.close();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
