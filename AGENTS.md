# AGENTS.md — AI Coding Agent Context & Operating Manual (`AutoForge3D`)

> **Welcome Coding Agent (Google Jules, Antigravity, Gemini Code Assist, or Subagent)!**  
> Read this file **FIRST** before making any changes. This file guarantees **zero context loss** across asynchronous sessions and multi-agent workflows.

---

## 1. Project Overview & Active Feature Branch

- **Repository**: `alixtaninja/AutoForge3D` (Three.js + Vite WebGL 3D Industrial Digital Twin)
- **Active Feature Branch for EV Gigafactory 350Ha City-Builder**: `feat/ev-gigafactory-city-builder`
- **Production Baseline Branch**: `main` (currently runs the single-plant **Riverside Auto Plant Demo** in 100% Three.js Twin Mode at 60 FPS)
- **Core Goal on `feat/ev-gigafactory-city-builder`**:
  Build an interactive, YouTube-streamable **350-Hectare EV Gigafactory Industrial City-Builder & 24-Month EPC Construction Simulation** alongside the existing Riverside Demo (switched via a Top Navbar mode toggle: `🏭 Riverside Demo` ↔ `🌆 Siêu Tổ Hợp Gigafactory 350Ha`).

---

## 2. Mandatory Context Files (Read Before Coding)

Depending on your assigned task, read ONLY the relevant specification files below:

1. **Dispatch Board & Task Status (MUST READ FIRST)**:
   - [`docs/ev-gigafactory-blueprint/MULTI_AGENT_DISPATCH_BOARD.md`](docs/ev-gigafactory-blueprint/MULTI_AGENT_DISPATCH_BOARD.md) — Master task queue (`TASK-001` to `TASK-016`), current status, and branch/PR tracking.
2. **Detailed Atomic Task Specs (MUST READ FOR YOUR ASSIGNED `TASK-xxx`)**:
   - [`docs/ev-gigafactory-blueprint/ATOMIC_TASK_SPECIFICATIONS.md`](docs/ev-gigafactory-blueprint/ATOMIC_TASK_SPECIFICATIONS.md) — Exact file paths, exported function signatures, coordinate math, polygon budgets, and acceptance criteria for every task.
3. **Spatial & Engineering Master Data**:
   - [`docs/ev-gigafactory-blueprint/gigafactory_digital_twin_spec.json`](docs/ev-gigafactory-blueprint/gigafactory_digital_twin_spec.json) — 3D coordinates `(x_min, y_min, width_x, length_y, height_z)` for all 24 buildings (`F01..UT05`), 5 Skybridges (`SB-01..05`), and AGV corridors.
   - [`docs/ev-gigafactory-blueprint/construction_stages_manifest.json`](docs/ev-gigafactory-blueprint/construction_stages_manifest.json) — 7 Construction Epochs (`E0..E6`), road network coordinates, and missing 3D model catalog.
   - [`docs/ev-gigafactory-blueprint/EV_Gigafactory_Master_Plan_Phase1.md`](docs/ev-gigafactory-blueprint/EV_Gigafactory_Master_Plan_Phase1.md) — Engineering blueprint (Tesla / Xiaomi / BYD / VinFast synthesis).
4. **Code Review & Merge Protocol (FOR REVIEWER AGENTS)**:
   - [`docs/ev-gigafactory-blueprint/REVIEW_AND_MERGE_PROTOCOL.md`](docs/ev-gigafactory-blueprint/REVIEW_AND_MERGE_PROTOCOL.md)

---

## 3. Environment & Build Commands

- **Node.js / Package Manager**: Node 20+ / `npm`
- **Install dependencies**:
  ```bash
  npm install
  ```
- **Verify Production Build (MANDATORY before every commit/PR)**:
  ```bash
  npm run build
  ```
- **Start Local Dev Server**:
  ```bash
  npm run dev -- --host --port 5173
  ```

---

## 4. Non-Negotiable Technical & Architectural Rules

1. **100% Pure Three.js Twins in Live Scene (Zero Startup GLB Preloading)**:
   - Do **NOT** preload or auto-stream `.glb` files on page startup. All buildings, roads, streetlights, traffic lights, cranes, construction vehicles, and materials in the live scene MUST be procedural Three.js geometries (`THREE.Group` / `THREE.Mesh` / `THREE.InstancedMesh`).
2. **Coordinate System & Smart Scenic Scale**:
   - Blueprint coordinates in `gigafactory_digital_twin_spec.json` use:
     - `X`: `0 .. 2500 m` (West to East)
     - `Y`: `0 .. 1400 m` (South to North)
     - `Z`: `0 .. +36 m` (Vertical height)
   - In Three.js (`Y-up`), always use the shared helper `blueprintToThreeJS(x, y, z)` in `src/gigafactory/config/masterSpecLoader.js`:
     - Centers the 2500m × 1400m site at the origin `(0, 0, 0)` and applies `WORLD_SCALE` (default `0.25` so the entire 350ha complex fits within a `625 × 350` Three.js unit canvas with crisp shadow precision and zero camera far-plane clipping), while applying a `SCENIC_PROP_BOOST = 1.6` for construction vehicles, streetlights, traffic lights, and road signs so they remain clearly visible on YouTube streams!
3. **`THREE.InstancedMesh` for Repeated Props**:
   - Streetlights, traffic lights, road signs, trees, solar panels, structural steel H-columns, concrete piles, plywood stacks, and steel coils repeated >20 times MUST use `THREE.InstancedMesh` or merged geometries to keep total scene Draw Calls `< 350` and FPS at `60 FPS`.
4. **Strict File Isolation (Zero Merge Conflicts)**:
   - Only create or edit the files listed in your assigned `TASK-xxx` specification in `ATOMIC_TASK_SPECIFICATIONS.md` (plus updating your row in `MULTI_AGENT_DISPATCH_BOARD.md`).
   - Never delete or break existing Riverside Demo files (`src/factoryBuilder.js`, `src/threejsTwins.js`, `src/modelInspector.js`, `src/benchmarkLab.js`).

---

## 5. Step-by-Step Workflow for Execution Agents

1. **Sync & Claim Task**:
   - Checkout `feat/ev-gigafactory-city-builder` and pull latest changes:
     ```bash
     git checkout feat/ev-gigafactory-city-builder
     git pull --rebase origin feat/ev-gigafactory-city-builder
     ```
   - Pick a task marked `⚪ TODO` (whose dependencies are `✅ MERGED`) in `docs/ev-gigafactory-blueprint/MULTI_AGENT_DISPATCH_BOARD.md`.
   - Create a dedicated task branch from `feat/ev-gigafactory-city-builder`:
     ```bash
     git checkout -b task/TASK-xxx-short-slug
     ```
   - Update the task's status in `MULTI_AGENT_DISPATCH_BOARD.md` to `🟡 IN_PROGRESS` (or update it in your PR).
2. **Implement & Self-Verify**:
   - Read the exact contract for `TASK-xxx` in `docs/ev-gigafactory-blueprint/ATOMIC_TASK_SPECIFICATIONS.md`.
   - Implement the code cleanly with JSDoc comments.
   - Run `npm run build` and ensure **0 errors**.
3. **Submit Pull Request for Specialist Review**:
   - Update the task status in `MULTI_AGENT_DISPATCH_BOARD.md` to `🟣 IN_REVIEW`.
   - Commit and push your task branch:
     ```bash
     git add .
     git commit -m "feat(TASK-xxx): <concise summary of implementation>"
     git push -u origin task/TASK-xxx-short-slug
     ```
   - Open a Pull Request targeting **`feat/ev-gigafactory-city-builder`** (NOT `main` until Milestone release):
     ```bash
     gh pr create --base feat/ev-gigafactory-city-builder --head task/TASK-xxx-short-slug \
       --title "[TASK-xxx] <Task Title>" \
       --body "Implements TASK-xxx according to ATOMIC_TASK_SPECIFICATIONS.md. Build verified."
     ```
4. **Hand Off to Reviewer Agent**:
   - A Specialist Review & Merge Agent (following `docs/ev-gigafactory-blueprint/REVIEW_AND_MERGE_PROTOCOL.md`) will review the diff, verify `npm run build` & 3D performance guardrails, merge the PR into `feat/ev-gigafactory-city-builder`, and update the status to `✅ MERGED`.
