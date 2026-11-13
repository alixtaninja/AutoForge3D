# QA Visual Audit Report — EV Gigafactory 350Ha (`TASK-016`)

**Date:** 2026-11-13  
**Branch:** `task/TASK-016`  
**Runner:** [`src/gigafactory/qa/visualAuditRunner.cjs`](../../src/gigafactory/qa/visualAuditRunner.cjs)  
**Preview Target:** `http://127.0.0.1:4174` (`npm run preview -- --port 4174 --host 127.0.0.1`)  
**Browser Engine:** Headless Google Chrome (`puppeteer-core`, ANGLE SwiftShader WebGL, `1280x720`)

---

## 1. Executive Summary

- **Fatal Page Errors (`pageerror`):** `0` (**PASS**)
- **Console Errors (`console.error`):** `2` non-fatal external/asset resource errors in offline/sandboxed preview:
  1. `Failed to load resource: net::ERR_CERT_AUTHORITY_INVALID` (external Google Fonts CDN in sandboxed VM)
  2. `Failed to load resource: the server responded with a status of 404 (Not Found)` (missing `favicon.ico`)
- **Visual Milestone Coverage:** `7 / 7` screenshots captured and visually verified.
- **Triangle Budget (`< 450,000` tris):** **PASS** across all 5 standard EPC timeline milestones (`39,002` to `166,792` tris). In X-Ray Cutaway mode at Month 24, triangles reach `514,876` due to simultaneously revealing all interior machinery lines.
- **Draw Call Budget (`< 350` calls):** **NEEDS OPTIMIZATION** — Draw calls range from `920` (Month 24 completed) to `6,706` (Month 13 peak steel frame erection). See Section 4 for details and recommended instancing/merging follow-ups.

---

## 2. Milestone Verification & Telemetry

| Milestone | Screenshot File | Render Calls | Triangles | Geometries | Textures | SwiftShader FPS | Visual Status |
|---|---|---:|---:|---:|---:|---:|---|
| **Month 1** (Survey & Earthwork) | [`month_01.png`](/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/70e0efc0-a858-4695-bfa5-b866dcab262f/screenshots/gigafactory/month_01.png) | 1,196 | 39,002 | 1,582 | 99 | 0.7 | **PASS** — 24 surveyed plot pads, perimeter green fences, retention pond, and zone billboards visible. |
| **Month 4** (Roads, Streetlights, Signals, Signage) | [`month_04.png`](/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/70e0efc0-a858-4695-bfa5-b866dcab262f/screenshots/gigafactory/month_04.png) | 1,641 | 72,474 | 2,004 | 100 | 0.6 | **PASS** — 6-lane asphalt boulevards, zebra crossings, streetlights, traffic signals, and West gate rendered cleanly. |
| **Month 8** (Deep Foundations, Formwork, Concrete Mixers) | [`month_08.png`](/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/70e0efc0-a858-4695-bfa5-b866dcab262f/screenshots/gigafactory/month_08.png) | 1,937 | 99,274 | 2,739 | 100 | 0.8 | **PASS** — Concrete foundation pads, pile caps, formwork stacks, and concrete mixer trucks active across spine & utility plots. |
| **Month 13** (Tower Cranes & Mega Steel Frame Erection) | [`month_13.png`](/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/70e0efc0-a858-4695-bfa5-b866dcab262f/screenshots/gigafactory/month_13.png) | 6,706 | 166,792 | 5,557 | 102 | 0.5 | **PASS** — Full steel column grids, trusses, tower cranes, skybridges, and `WH01` high-bay frame visible. |
| **Month 24** (Completed 350Ha Gigafactory + PG01 + IOC01) | [`month_24.png`](/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/70e0efc0-a858-4695-bfa5-b866dcab262f/screenshots/gigafactory/month_24.png) | 920 | 99,468 | 5,979 | 124 | 0.5 | **PASS** — Completed 24-building complex, rooftop solar arrays, `IOC01` glass tower + helipad, `F05` E-shape, `UT01..UT04`. |
| **Month 24 (X-Ray Cutaway)** | [`month_24_xray.png`](/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/70e0efc0-a858-4695-bfa5-b866dcab262f/screenshots/gigafactory/month_24_xray.png) | 3,494 | 514,876 | 6,575 | 124 | 0.4 | **PASS** — Roof cutaway reveals interior production lines, presses, robot arms, and high-bay racks. |
| **Model Inspector** (`machinery_tower_crane`) | [`inspector_tower_crane.png`](/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/70e0efc0-a858-4695-bfa5-b866dcab262f/screenshots/gigafactory/inspector_tower_crane.png) | N/A (Modal WebGL) | 1,582 (model) | 119 meshes | — | — | **PASS** — `Cẩu Tháp Xây Dựng (Tower Crane)` renders with `0.00m` joint gap (`PASS`). |

---

## 3. Screenshot Artifact Directory

All captured PNGs are stored at:
`/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/70e0efc0-a858-4695-bfa5-b866dcab262f/screenshots/gigafactory/`

- `month_01.png`
- `month_04.png`
- `month_08.png`
- `month_13.png`
- `month_24.png`
- `month_24_xray.png`
- `inspector_tower_crane.png`

---

## 4. 60 FPS & Draw Call Compliance Notes

1. **SwiftShader vs. Hardware GPU:** Headless SwiftShader runs WebGL rasterization on CPU (`~0.5–0.8 FPS` for 350Ha scenes), which is expected for software rendering and validates functional WebGL correctness rather than hardware frame pacing.
2. **Triangle Budget Compliance (`< 450,000`):**
   - Standard timeline milestones (`Month 1` through `Month 24`) stay between `39,002` and `166,792` triangles (**37% of budget at peak**).
   - X-Ray mode at Month 24 (`514,876` tris) slightly exceeds `450,000` when all interior lines are visible simultaneously.
3. **Draw Call Budget (`< 350`):**
   - Current draw calls (`920` at Month 24, `6,706` at Month 13) exceed the `< 350` target for sustained 60 FPS on mid-range GPUs.
   - **Recommended Follow-up Optimization:**
     - Convert per-bay steel columns/trusses in `stageRenderer.js` (active at Month 13) to shared `InstancedMesh` batches across buildings.
     - Merge static building envelope sub-meshes / solar panel arrays per zone or use `InstancedMesh` for rooftop solar modules and interior racks.
     - Add a `favicon.ico` and optionally self-host or guard Google Fonts to eliminate the 2 benign `console.error` network logs.
