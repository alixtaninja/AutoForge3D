const puppeteer = require('puppeteer-core');

async function testPerformance() {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
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

  page.on('console', msg => console.log('[BROWSER CONSOLE]', msg.type(), msg.text()));
  page.on('pageerror', err => console.error('[BROWSER ERROR]', err.message));
  page.on('response', res => {
    if (res.status() >= 400) console.log('[HTTP FAIL]', res.status(), res.url());
  });

  console.log('Navigating to http://localhost:5173/ ...');
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });

  console.log('Waiting for SimReady assets to stream and parse...');
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 1000));
    const size = await page.evaluate(() => window.__simreadyCache ? window.__simreadyCache.size : -1);
    console.log(`[Timer ${i+1}s] Cache size: ${size}`);
    if (size >= 14) break;
  }

  // Open roof to see interior robots
  await page.evaluate(() => {
    const btn = document.getElementById('btn-cutaway');
    if (btn && !btn.classList.contains('active')) btn.click();
  });
  await new Promise(r => setTimeout(r, 1000));

  // Query performance stats from Three.js renderer.info
  const stats = await page.evaluate(() => {
    const r = window.__threeRenderer;
    const s = window.__threeScene;
    if (!r || !s) return { error: 'renderer or scene not found' };

    let totalMeshes = 0;
    let shadowCasters = 0;
    let shadowReceivers = 0;
    let uniqueGeometries = new Set();
    let uniqueMaterials = new Set();
    const meshesByAsset = {};
    const trianglesByAsset = {};
    let totalTris = 0;

    s.traverse((node) => {
      if (node.isMesh && node.geometry) {
        // Check if node or any of its parents is hidden
        let isVis = true;
        let pCheck = node;
        while (pCheck) {
          if (!pCheck.visible) {
            isVis = false;
            break;
          }
          pCheck = pCheck.parent;
        }

        totalMeshes++;
        const g = node.geometry;
        const tris = g.index ? Math.floor(g.index.count / 3) : (g.attributes.position ? Math.floor(g.attributes.position.count / 3) : 0);
        if (isVis) {
          totalTris += tris;
        }

        // Find root asset name
        let p = node;
        let assetTag = 'procedural/other';
        while (p) {
          if (p.userData && (p.userData.simreadyAsset || p.userData.type || p.userData.id)) {
            assetTag = p.userData.simreadyAsset || `${p.userData.type || 'obj'}_${p.userData.id || ''}`;
            break;
          }
          if (p.name && p.name.startsWith('SimReady_')) {
            assetTag = p.name;
            break;
          }
          p = p.parent;
        }
        if (isVis) {
          trianglesByAsset[assetTag] = (trianglesByAsset[assetTag] || 0) + tris;
        }

        if (node.castShadow) {
          shadowCasters++;
        }
        if (node.receiveShadow) shadowReceivers++;
        if (node.geometry) uniqueGeometries.add(node.geometry.id);
        if (node.material) {
          if (Array.isArray(node.material)) node.material.forEach(m => uniqueMaterials.add(m.id));
          else uniqueMaterials.add(node.material.id);
        }
      }
    });

    const shadowCasterList = [];
    s.traverse((node) => {
      if (node.isMesh && node.castShadow) {
        const g = node.geometry;
        const tris = g.index ? Math.floor(g.index.count / 3) : (g.attributes.position ? Math.floor(g.attributes.position.count / 3) : 0);
        shadowCasterList.push({ name: node.name, parent: node.parent?.name, tris });
      }
    });

    const sortedAssets = Object.entries(trianglesByAsset).sort((a,b) => b[1] - a[1]);
    const sortedMeshes = Object.entries(meshesByAsset).sort((a,b) => b[1] - a[1]);

    return {
      drawCalls: r.info.render.calls,
      renderedTrianglesPerFrame: r.info.render.triangles,
      staticSceneTriangles: totalTris,
      shadowCasters,
      shadowReceivers,
      totalMeshesInScene: totalMeshes,
      uniqueGeometriesCount: uniqueGeometries.size,
      uniqueMaterialsCount: uniqueMaterials.size,
      shadowCasterSample: shadowCasterList.slice(0, 20),
      trianglesByAsset: sortedAssets.slice(0, 15)
    };
  });

  console.log('=== THREE.JS PERFORMANCE AUDIT RESULTS ===');
  console.log(JSON.stringify(stats, null, 2));

  await browser.close();
}

testPerformance().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
