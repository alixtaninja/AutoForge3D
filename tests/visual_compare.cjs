const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const TIERS = [
  { id: 'original', name: 'Original Raw CAD (785k)', file: 'robotic_system_arm_b01' },
  { id: 'tier1_104k', name: 'Tier 1 CAD (104k)', file: 'robotic_system_arm_b01_optimized' },
  { id: 'tier2_58k', name: 'Tier 2 CAD (58k)', file: 'robotic_system_arm_b01_45k' },
  { id: 'tier3_33k', name: 'Tier 3 CAD (33k)', file: 'robotic_system_arm_b01_20k' }
];

const CAMERAS = [
  { name: 'perspective', label: 'Toàn Cảnh 3/4', pos: [2.8, 2.5, 3.8], target: [0, 1.2, 0] },
  { name: 'shoulder', label: 'Cận Cảnh Khớp Vai & Xi Lanh', pos: [0.8, 1.9, 1.6], target: [0, 1.4, 0] },
  { name: 'wrist', label: 'Cận Cảnh Cổ Tay & Mũi Hàn', pos: [1.2, 1.5, 0.5], target: [0.6, 1.4, 0] }
];

async function runVisualCompare() {
  const outDir = path.join(__dirname, 'screenshots');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    protocolTimeout: 120000,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--window-size=1280,720'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  console.log('Navigating to http://localhost:5173/ ...');
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });

  // Open Model Inspector Modal
  console.log('Opening Model Inspector Modal...');
  await page.evaluate(() => {
    const btn = document.getElementById('btn-model-inspector');
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 1500));

  const results = [];

  for (const tier of TIERS) {
    console.log(`\n========================================`);
    console.log(`Nạp và chụp đối chiếu: ${tier.name} (${tier.file}.glb)`);

    const modelStats = await page.evaluate(async (assetKey) => {
      const { loadSingleSimReadyAsset, instantiateSimReady } = await import('/src/simreadyLoader.js');
      await loadSingleSimReadyAsset(assetKey);
      const instance = instantiateSimReady(assetKey, { targetHeight: 2.35 });
      if (!instance) return { error: 'Failed to instantiate' };

      const insp = window.__modelInspectorInstance;
      if (!insp) return { error: 'Inspector not found' };

      // Set nice working posture
      instance.traverse((child) => {
        if (child.name === 'armShoulder_01_obj_00') child.rotation.z = -0.35;
        if (child.name === 'armShoulder_02_obj_00') child.rotation.z = 0.45;
        if (child.name === 'armShoulder_04_obj_00') child.rotation.y = 0.25;
      });

      if (insp.currentInstance) {
        insp.scene.remove(insp.currentInstance);
      }
      insp.scene.add(instance);
      insp.currentInstance = instance;

      let tris = 0;
      let meshes = 0;
      instance.traverse((c) => {
        if (c.isMesh) {
          meshes++;
          const g = c.geometry;
          tris += g.index ? g.index.count / 3 : g.attributes.position.count / 3;
        }
      });

      return { tris: Math.round(tris), meshes };
    }, tier.file);

    console.log(`Loaded ${tier.name}: ${modelStats.tris} tris, ${modelStats.meshes} meshes`);
    await new Promise(r => setTimeout(r, 600));

    // Capture each camera view using synchronous WebGL Canvas toDataURL
    for (const cam of CAMERAS) {
      const dataUrl = await page.evaluate((pos, target) => {
        const insp = window.__modelInspectorInstance;
        if (insp && insp.camera && insp.controls) {
          insp.camera.position.set(pos[0], pos[1], pos[2]);
          insp.controls.target.set(target[0], target[1], target[2]);
          insp.controls.update();
          insp.renderer.render(insp.scene, insp.camera);

          const canvas = insp.renderer.domElement;
          return canvas.toDataURL('image/png');
        }
        return null;
      }, cam.pos, cam.target);

      if (dataUrl) {
        const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
        const screenshotName = `${tier.id}_${cam.name}.png`;
        const screenshotPath = path.join(outDir, screenshotName);
        fs.writeFileSync(screenshotPath, Buffer.from(base64, 'base64'));
        console.log(`  ✓ Đã lưu ảnh: ${screenshotName} (${cam.label})`);
      }
    }

    results.push({ ...tier, stats: modelStats });
  }

  await browser.close();

  console.log('\n========================================');
  console.log('BẢNG ĐỐI CHIẾU THỐNG KÊ CÁC PHIÊN BẢN CAD:');
  console.table(results.map(r => ({
    'Phiên bản CAD': r.name,
    'Số Tam Giác (Tris)': r.stats.tris,
    'Số Mesh': r.stats.meshes,
    'Mức Giảm Tải': `${Math.round((1 - r.stats.tris / results[0].stats.tris) * 100)}%`
  })));
  console.log(`\nTất cả ảnh chụp màn hình đối chiếu đã lưu tại:\n${outDir}`);
}

runVisualCompare().catch(err => {
  console.error('Lỗi khi chạy Visual Compare:', err);
  process.exit(1);
});
