## 🎯 Task Reference
- **Task ID**: `TASK-xxx` (see [`docs/ev-gigafactory-blueprint/ATOMIC_TASK_SPECIFICATIONS.md`](../docs/ev-gigafactory-blueprint/ATOMIC_TASK_SPECIFICATIONS.md))
- **Target Integration Branch**: `feat/ev-gigafactory-city-builder`
- **Executing Agent**: (e.g., Google Jules / Antigravity / Contributor)

---

## 📋 Implementation Summary
- Briefly describe the modules, Three.js Twins, or infrastructure builders created/modified in this PR.

---

## 🛡️ 5-Gate Specialist QA Checklist (For Execution & Reviewer Agents)
- [ ] **Gate 1 — Scope Isolation**: Only files authorized for this `TASK-xxx` (plus `MULTI_AGENT_DISPATCH_BOARD.md`) were created/modified. Existing Riverside Demo files remain intact.
- [ ] **Gate 2 — Build & Contract Verification**: `npm run build` succeeds with `0` errors and exported function names/signatures match `ATOMIC_TASK_SPECIFICATIONS.md`.
- [ ] **Gate 3 — 60 FPS & WebGL Guardrails**: 100% Pure Three.js Twins (no startup `.glb` preloading); repeated objects (>20 instances) use `THREE.InstancedMesh` or merged geometries; triangle counts respect task budget.
- [ ] **Gate 4 — Spatial & Industrial Realism**: Coordinates use `bpTo3JS()` / `bpBoundsTo3JS()`, models sit cleanly at `y = 0`, and industrial proportions/colors match real-world references.
- [ ] **Gate 5 — Dispatch Board Updated**: Task status in `docs/ev-gigafactory-blueprint/MULTI_AGENT_DISPATCH_BOARD.md` is updated.
