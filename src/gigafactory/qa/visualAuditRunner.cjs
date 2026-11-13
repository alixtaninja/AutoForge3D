#!/usr/bin/env node
/**
 * TASK-016: Automated Visual QA & Performance Audit Runner for EV Gigafactory 350Ha
 *
 * Launches `npm run preview -- --port 4174`, opens the app in headless Chromium via
 * `puppeteer-core` (SwiftShader WebGL), switches to Gigafactory 350Ha mode, captures
 * screenshots across 5 EPC milestones + X-Ray cutaway + Model Inspector (Tower Crane),
 * records `renderer.info.render` (draw calls & triangles), and checks for console/page errors.
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn, execSync } = require('child_process');
const puppeteer = require('puppeteer-core');

const REPO_ROOT = path.resolve(__dirname, '../../..');
const PORT = 4174;
const BASE_URL = `http://127.0.0.1:${PORT}`;

const DEFAULT_SCREENSHOT_DIR =
  '/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/70e0efc0-a858-4695-bfa5-b866dcab262f/screenshots/gigafactory';
const SCREENSHOT_DIR = process.env.GF_SCREENSHOT_DIR || DEFAULT_SCREENSHOT_DIR;

const SLIDER_SELECTOR =
  '#gf-month-slider, [data-gf="month-slider"], .gf-month-slider, input[type="range"]';

function detectBrowserExecutable() {
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) {
    return process.env.CHROME_PATH;
  }

  const candidates = [
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/snap/bin/chromium',
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  for (const cmd of ['google-chrome', 'chromium', 'chromium-browser']) {
    try {
      const resolved = execSync(`which ${cmd}`, { stdio: ['ignore', 'pipe', 'ignore'] })
        .toString()
        .trim();
      if (resolved && fs.existsSync(resolved)) {
        return resolved;
      }
    } catch {
      // Continue searching
    }
  }

  throw new Error(
    'Could not find Chromium or Google Chrome binary. Set CHROME_PATH environment variable.'
  );
}

function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const req = http.get(url, (res) => {
        res.resume();
        if (res.statusCode && res.statusCode < 500) {
          resolve();
        } else if (Date.now() - start > timeoutMs) {
          reject(new Error(`Server responded with status ${res.statusCode}`));
        } else {
          setTimeout(attempt, 300);
        }
      });

      req.on('error', () => {
        if (Date.now() - start > timeoutMs) {
          reject(new Error(`Timed out waiting for preview server at ${url}`));
        } else {
          setTimeout(attempt, 300);
        }
      });
    };
    attempt();
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFrames(page, count = 4) {
  await page.evaluate(
    (frameCount) =>
      new Promise((resolve) => {
        let i = 0;
        const step = () => {
          i += 1;
          if (i >= frameCount) resolve();
          else requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }),
    count
  );
}

async function measureRenderStats(page) {
  return page.evaluate(async () => {
    const renderer = window.__threeRenderer;
    const renderInfo = renderer?.info?.render
      ? {
          calls: renderer.info.render.calls,
          triangles: renderer.info.render.triangles,
          points: renderer.info.render.points,
          lines: renderer.info.render.lines,
        }
      : null;

    const memoryInfo = renderer?.info?.memory
      ? {
          geometries: renderer.info.memory.geometries,
          textures: renderer.info.memory.textures,
        }
      : null;

    // Measure rAF frame interval over 2 frames (1 frame delta under CPU SwiftShader)
    const fps = await new Promise((resolve) => {
      const times = [];
      const tick = (now) => {
        times.push(now);
        if (times.length < 2) {
          requestAnimationFrame(tick);
        } else {
          const elapsed = times[times.length - 1] - times[0];
          resolve(elapsed > 0 ? Math.round((1000 / elapsed) * 10) / 10 : 0);
        }
      };
      requestAnimationFrame(tick);
    });

    const monthText =
      document.querySelector('[data-gf="month-label"]')?.textContent?.trim() || '';
    const epochText =
      document.querySelector('[data-gf="epoch-label"]')?.textContent?.trim() || '';

    return { renderInfo, memoryInfo, fps, monthText, epochText };
  });
}

async function setTimelineMonth(page, month) {
  const sliderFound = await page.evaluate(
    ({ selector, value }) => {
      const el = document.querySelector(selector);
      if (!el) return false;
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      )?.set;
      if (setter) {
        setter.call(el, String(value));
      } else {
        el.value = String(value);
      }
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    },
    { selector: SLIDER_SELECTOR, value: month }
  );

  if (!sliderFound) {
    throw new Error(`Timeline slider not found using selector: ${SLIDER_SELECTOR}`);
  }

  await sleep(150);
  await waitFrames(page, 1);
}

async function runAudit() {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  const executablePath = detectBrowserExecutable();
  console.log(`[QA] Using browser: ${executablePath}`);
  console.log(`[QA] Saving screenshots to: ${SCREENSHOT_DIR}`);

  // Start Vite preview server on port 4174
  const serverProc = spawn('npm', ['run', 'preview', '--', '--port', String(PORT), '--host', '127.0.0.1'], {
    cwd: REPO_ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, FORCE_COLOR: '0' },
  });

  let serverStdout = '';
  let serverStderr = '';
  serverProc.stdout.on('data', (chunk) => {
    serverStdout += chunk.toString();
  });
  serverProc.stderr.on('data', (chunk) => {
    serverStderr += chunk.toString();
  });

  let browser;
  const consoleErrors = [];
  const pageErrors = [];
  const milestoneResults = [];

  try {
    await waitForServer(BASE_URL, 30000);
    console.log(`[QA] Preview server ready at ${BASE_URL}`);

    browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: [
        '--enable-webgl',
        '--use-gl=angle',
        '--use-angle=swiftshader',
        '--ignore-gpu-blocklist',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    page.on('pageerror', (err) => {
      pageErrors.push(err?.stack || err?.message || String(err));
    });

    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('#btn-mode-gigafactory', { timeout: 15000 });
    await sleep(1000);

    // Enter EV Gigafactory 350Ha mode
    await page.click('#btn-mode-gigafactory');
    await page.waitForSelector(SLIDER_SELECTOR, { visible: true, timeout: 15000 });
    await sleep(300);
    await waitFrames(page, 1);

    const milestones = [
      { month: 1, file: 'month_01.png', label: 'Month 1 - Survey & Earthwork' },
      { month: 4, file: 'month_04.png', label: 'Month 4 - Roads, Streetlights, Traffic Signals, Signage' },
      { month: 8, file: 'month_08.png', label: 'Month 8 - Deep Foundations, Formwork, Concrete Mixers' },
      { month: 13, file: 'month_13.png', label: 'Month 13 - Tower Cranes & Mega Steel Frame Erection' },
      { month: 24, file: 'month_24.png', label: 'Month 24 - Completed 350Ha Gigafactory + PG01 + IOC01' },
    ];

    for (const m of milestones) {
      await setTimelineMonth(page, m.month);
      const stats = await measureRenderStats(page);
      const outPath = path.join(SCREENSHOT_DIR, m.file);
      await page.screenshot({ path: outPath });
      milestoneResults.push({
        ...m,
        outPath,
        ...stats,
      });
      console.log(
        `[QA] Captured ${m.file} | Calls: ${stats.renderInfo?.calls ?? 'N/A'} | Tris: ${stats.renderInfo?.triangles ?? 'N/A'} | FPS(SwiftShader): ${stats.fps}`
      );
    }

    // X-Ray Cutaway at Month 24
    await page.waitForSelector('#btn-cutaway', { timeout: 10000 });
    await page.click('#btn-cutaway');
    await sleep(200);
    await waitFrames(page, 1);
    const xrayStats = await measureRenderStats(page);
    const xrayPath = path.join(SCREENSHOT_DIR, 'month_24_xray.png');
    await page.screenshot({ path: xrayPath });
    milestoneResults.push({
      month: 24,
      file: 'month_24_xray.png',
      label: 'Month 24 - X-Ray Roof Cutaway Interior Production Lines',
      outPath: xrayPath,
      ...xrayStats,
    });
    console.log(
      `[QA] Captured month_24_xray.png | Calls: ${xrayStats.renderInfo?.calls ?? 'N/A'} | Tris: ${xrayStats.renderInfo?.triangles ?? 'N/A'}`
    );

    // Model Inspector -> Tower Crane Twin
    await page.waitForSelector('#btn-model-inspector', { timeout: 10000 });
    await page.click('#btn-model-inspector');
    await page.waitForSelector('#modal-model-select', { visible: true, timeout: 10000 });

    const selectedModel = await page.evaluate(() => {
      const sel = document.getElementById('modal-model-select');
      if (!sel) return null;
      const options = Array.from(sel.options).map((o) => o.value);
      const target =
        options.find((v) => v === 'tower_crane_twin') ||
        options.find((v) => v === 'machinery_tower_crane') ||
        options.find((v) => v.includes('tower_crane'));
      if (!target) return null;
      sel.value = target;
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      return target;
    });

    if (!selectedModel) {
      throw new Error('Could not find tower crane option in #modal-model-select');
    }

    await sleep(250);
    await waitFrames(page, 1);
    const inspectorPath = path.join(SCREENSHOT_DIR, 'inspector_tower_crane.png');
    await page.screenshot({ path: inspectorPath });
    console.log(`[QA] Captured inspector_tower_crane.png (selected: ${selectedModel})`);

    const reportSummary = {
      timestamp: new Date().toISOString(),
      baseUrl: BASE_URL,
      screenshotDir: SCREENSHOT_DIR,
      selectedInspectorModel: selectedModel,
      milestones: milestoneResults,
      consoleErrors,
      pageErrors,
    };

    console.log('\n=== VISUAL AUDIT SUMMARY ===');
    console.log(JSON.stringify(reportSummary, null, 2));

    if (pageErrors.length > 0) {
      console.error(`\n[QA] FAIL: ${pageErrors.length} fatal pageerror(s) detected.`);
      process.exitCode = 1;
    } else if (consoleErrors.length > 0) {
      console.error(`\n[QA] WARN/FAIL: ${consoleErrors.length} console.error(s) detected.`);
      process.exitCode = 1;
    } else {
      console.log('\n[QA] PASS: All screenshots captured with 0 pageerror and 0 console.error events.');
    }
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
    if (serverProc && !serverProc.killed) {
      serverProc.kill('SIGTERM');
      await sleep(300);
      if (!serverProc.killed) {
        serverProc.kill('SIGKILL');
      }
    }
    if (process.exitCode && (serverStderr || serverStdout)) {
      console.error('[QA] Server stderr tail:', serverStderr.slice(-500));
    }
  }
}

runAudit().catch((err) => {
  console.error('[QA] Fatal runner error:', err);
  process.exit(1);
});
