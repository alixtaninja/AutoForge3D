const puppeteer = require('puppeteer-core');

async function testBenchmarkLab() {
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

  console.log('Navigating to http://localhost:5173/ ...');
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });

  // Wait for initial render and cache
  console.log('Waiting for SimReady cache...');
  for (let i = 0; i < 5; i++) {
    await new Promise(r => setTimeout(r, 1000));
    const size = await page.evaluate(() => window.__simreadyCache ? window.__simreadyCache.size : -1);
    if (size >= 4) break;
  }

  console.log('Clicking "📊 Benchmark Lab" button...');
  await page.evaluate(() => {
    const btn = document.getElementById('btn-benchmark-lab');
    if (btn) btn.click();
  });

  await new Promise(r => setTimeout(r, 1500));

  // Check if benchmark modal is visible
  const isModalVisible = await page.evaluate(() => {
    const modal = document.getElementById('benchmark-modal');
    return modal && !modal.classList.contains('hidden');
  });
  console.log(`Benchmark Modal visible: ${isModalVisible}`);

  // Test 1: Baseline 1x Robot Arm
  let stats1 = await page.evaluate(() => {
    return {
      fps: document.getElementById('bm-val-fps')?.textContent,
      frametime: document.getElementById('bm-val-frametime')?.textContent,
      drawcalls: document.getElementById('bm-val-drawcalls')?.textContent,
      triangles: document.getElementById('bm-val-triangles')?.textContent,
      meshes: document.getElementById('bm-val-meshes')?.textContent
    };
  });
  console.log('Stats 1x Robot Arm:', stats1);

  // Test 2: Switch to 5x Robot Arms
  console.log('Switching count to 5x...');
  await page.evaluate(() => {
    const btn5 = document.querySelector('.bm-count-btn[data-count="5"]');
    if (btn5) btn5.click();
  });
  await new Promise(r => setTimeout(r, 1500));

  let stats5 = await page.evaluate(() => {
    return {
      fps: document.getElementById('bm-val-fps')?.textContent,
      frametime: document.getElementById('bm-val-frametime')?.textContent,
      drawcalls: document.getElementById('bm-val-drawcalls')?.textContent,
      triangles: document.getElementById('bm-val-triangles')?.textContent,
      meshes: document.getElementById('bm-val-meshes')?.textContent
    };
  });
  console.log('Stats 5x Robot Arms:', stats5);

  // Test 3: Switch to Detailed Truck
  console.log('Switching asset to Detailed Truck...');
  await page.evaluate(() => {
    const select = document.getElementById('bm-asset-select');
    if (select) {
      select.value = 'detailed_truck';
      select.dispatchEvent(new Event('change'));
    }
  });
  await new Promise(r => setTimeout(r, 1500));

  let statsTruck = await page.evaluate(() => {
    return {
      fps: document.getElementById('bm-val-fps')?.textContent,
      frametime: document.getElementById('bm-val-frametime')?.textContent,
      drawcalls: document.getElementById('bm-val-drawcalls')?.textContent,
      triangles: document.getElementById('bm-val-triangles')?.textContent,
      meshes: document.getElementById('bm-val-meshes')?.textContent
    };
  });
  console.log('Stats 5x Detailed Trucks:', statsTruck);

  await browser.close();
  console.log('Benchmark Lab Test Complete!');
}

testBenchmarkLab().catch(err => {
  console.error('Benchmark Test failed:', err);
  process.exit(1);
});
