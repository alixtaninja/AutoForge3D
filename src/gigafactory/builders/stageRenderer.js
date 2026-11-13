import * as THREE from 'three';
import {
  WORLD_SCALE,
  HEIGHT_SCALE,
  SCENIC_PROP_BOOST,
  bpBoundsTo3JS,
} from '../config/masterSpecLoader.js';
import {
  buildTowerCraneTwin,
  buildCrawlerCraneTwin,
  buildExcavatorTwin,
  buildBulldozerTwin,
  buildConcreteMixerTruckTwin,
} from '../assets/heavyMachineryTwins.js';
import {
  buildPlywoodFormworkStackTwin,
  buildSteelGirderStackTwin,
  buildConcretePileStackTwin,
  buildScaffoldingBayTwin,
  buildRebarCageAndFormworkTwin,
} from '../assets/constructionMaterialsTwins.js';

/**
 * 5-Stage EPC Building Renderer (TASK-008)
 * Renders any industrial building spec smoothly across:
 *   Stage 0: Survey & Excavation (Excavator, Bulldozer, earthwork pit, stakes)
 *   Stage 1: Foundation & Piling (InstancedMesh pile caps, Rebar, Plywood, ConcreteMixer)
 *   Stage 2: Structural Steel Grid (InstancedMesh H-columns & girders, TowerCrane, CrawlerCrane, Scaffolding)
 *   Stage 3: Envelope, Cladding, Dock Doors & Rooftop Solar PV
 *   Stage 4: Completed Operational Building (custom exterior fn or procedural fallback + X-Ray Cutaway)
 */

// Shared PBR materials to minimize shader compilations & draw calls across 24 buildings
const SHARED_MAT = {
  soil: new THREE.MeshStandardMaterial({ color: 0x8b6f47, roughness: 0.95, metalness: 0.02 }),
  deepPit: new THREE.MeshStandardMaterial({ color: 0x5c472d, roughness: 0.96, metalness: 0.02 }),
  leanConcrete: new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.9, metalness: 0.04 }),
  pileCap: new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.85, metalness: 0.08 }),
  steelColumn: new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.42, metalness: 0.78 }),
  steelTruss: new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.45, metalness: 0.72 }),
  slab: new THREE.MeshStandardMaterial({ color: 0xb0b8c4, roughness: 0.86, metalness: 0.08 }),
  claddingBase: new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.55, metalness: 0.25 }),
  plinth: new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.88, metalness: 0.06 }),
  roofDeck: new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.7, metalness: 0.2 }),
  solarPanel: new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.22, metalness: 0.58 }),
  dockDoor: new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.45 }),
  ahuBody: new THREE.MeshStandardMaterial({ color: 0xdbe4ee, roughness: 0.4, metalness: 0.55 }),
  stainlessStack: new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.25, metalness: 0.85 }),
  stakeRed: new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.5, metalness: 0.1 }),
  stakeWhite: new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5, metalness: 0.1 }),
  glassClerestory: new THREE.MeshStandardMaterial({
    color: 0x93c5fd,
    emissive: 0x1e3a8a,
    emissiveIntensity: 0.25,
    roughness: 0.12,
    metalness: 0.22,
    transparent: true,
    opacity: 0.68,
  }),
  beaconRed: new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xdc2626,
    emissiveIntensity: 1.5,
    roughness: 0.2,
  }),
};

// Shared unit geometries (scaled per instance)
const UNIT_BOX_GEO = new THREE.BoxGeometry(1, 1, 1);
const UNIT_CYL_GEO = new THREE.CylinderGeometry(0.5, 0.5, 1, 10);

// Reusable dummy Object3D for InstancedMesh matrix updates (zero GC in updateStage)
const _dummy = new THREE.Object3D();

function clamp01(v) {
  return v <= 0 ? 0 : v >= 1 ? 1 : v;
}

function getAccentMaterial(colorHex) {
  return new THREE.MeshStandardMaterial({
    color: colorHex || '#38bdf8',
    roughness: 0.42,
    metalness: 0.3,
  });
}

function createLedSignTexture(buildingId, accentHex) {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 256, 64);
  ctx.strokeStyle = accentHex || '#38bdf8';
  ctx.lineWidth = 4;
  ctx.strokeRect(3, 3, 250, 58);

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 30px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(buildingId, 128, 33);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Computes grid positions along X and Z for structural columns & footings.
 */
function computeColumnGrid(widthX, depthZ, grid3JS) {
  const stepX = Math.max(3.0, grid3JS[0] || 6.0);
  const stepZ = Math.max(3.0, grid3JS[1] || 6.0);

  const countX = Math.max(2, Math.min(14, Math.round(widthX / stepX) + 1));
  const countZ = Math.max(2, Math.min(12, Math.round(depthZ / stepZ) + 1));

  const marginX = Math.min(1.2, widthX * 0.06);
  const marginZ = Math.min(1.2, depthZ * 0.06);
  const spanX = Math.max(1, widthX - marginX * 2);
  const spanZ = Math.max(1, depthZ - marginZ * 2);

  const xs = [];
  for (let i = 0; i < countX; i++) {
    xs.push(-spanX * 0.5 + (spanX * i) / (countX - 1));
  }
  const zs = [];
  for (let j = 0; j < countZ; j++) {
    zs.push(-spanZ * 0.5 + (spanZ * j) / (countZ - 1));
  }

  return { xs, zs };
}

/**
 * Default procedural completed exterior used if buildCompletedExteriorFn is omitted.
 */
function buildDefaultCompletedExterior(buildingSpec, dims, accentMat) {
  const { widthX, depthZ, heightY, floors } = dims;
  const g = new THREE.Group();
  g.name = `DefaultCompleted_${buildingSpec.id}`;

  // 1. Concrete plinth base
  const plinthH = Math.min(0.85, heightY * 0.14);
  const plinth = new THREE.Mesh(
    new THREE.BoxGeometry(widthX, plinthH, depthZ),
    SHARED_MAT.plinth
  );
  plinth.position.y = plinthH * 0.5;
  plinth.castShadow = true;
  plinth.receiveShadow = true;
  plinth.userData.isExteriorWall = true;
  g.add(plinth);

  // 2. Main insulated cladding shell
  const wallH = Math.max(0.5, heightY - plinthH);
  const mainMat =
    buildingSpec.id === 'IOC01' ? SHARED_MAT.glassClerestory.clone() : SHARED_MAT.claddingBase.clone();
  if (buildingSpec.id === 'IOC01') {
    mainMat.color.setHex(0x1565c0);
    mainMat.opacity = 0.85;
  }
  const shell = new THREE.Mesh(
    new THREE.BoxGeometry(widthX * 0.99, wallH, depthZ * 0.99),
    mainMat
  );
  shell.position.y = plinthH + wallH * 0.5;
  shell.castShadow = true;
  shell.receiveShadow = true;
  shell.userData.isExteriorWall = true;
  shell.userData.originalOpacity = mainMat.opacity;
  shell.userData.originalTransparent = mainMat.transparent;
  g.add(shell);

  // 3. Functional color accent fascia band
  const bandH = Math.min(1.1, heightY * 0.16);
  const band = new THREE.Mesh(
    new THREE.BoxGeometry(widthX * 1.004, bandH, depthZ * 1.004),
    accentMat
  );
  band.position.y = heightY - bandH * 0.65;
  band.userData.isExteriorWall = true;
  g.add(band);

  // 4. Horizontal clerestory daylight ribbon
  if (heightY > 2.2) {
    const glassH = Math.min(0.9, heightY * 0.14);
    const glassBand = new THREE.Mesh(
      new THREE.BoxGeometry(widthX * 1.002, glassH, depthZ * 1.002),
      SHARED_MAT.glassClerestory
    );
    glassBand.position.y = heightY * 0.66;
    glassBand.userData.isExteriorWall = true;
    g.add(glassBand);
  }

  // 5. Roof deck
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(widthX * 1.01, 0.25, depthZ * 1.01),
    SHARED_MAT.roofDeck
  );
  roof.position.y = heightY + 0.12;
  roof.receiveShadow = true;
  roof.userData.isRoof = true;
  g.add(roof);

  // 6. Rooftop Solar PV Array (InstancedMesh)
  const panelW = 3.2;
  const panelD = 1.8;
  const cols = Math.max(1, Math.floor((widthX * 0.78) / (panelW + 1.0)));
  const rows = Math.max(1, Math.floor((depthZ * 0.72) / (panelD + 1.2)));
  const totalPanels = Math.min(80, cols * rows);
  if (totalPanels > 0 && heightY > 1.5) {
    const solarInst = new THREE.InstancedMesh(UNIT_BOX_GEO, SHARED_MAT.solarPanel, totalPanels);
    solarInst.userData.isRoof = true;
    let idx = 0;
    for (let r = 0; r < rows && idx < totalPanels; r++) {
      for (let c = 0; c < cols && idx < totalPanels; c++) {
        const px = -((cols - 1) * (panelW + 1.0)) * 0.5 + c * (panelW + 1.0);
        const pz = -((rows - 1) * (panelD + 1.2)) * 0.5 + r * (panelD + 1.2);
        _dummy.position.set(px, heightY + 0.42, pz);
        _dummy.rotation.set(0.18, 0, 0);
        _dummy.scale.set(panelW, 0.08, panelD);
        _dummy.updateMatrix();
        solarInst.setMatrixAt(idx++, _dummy.matrix);
      }
    }
    solarInst.instanceMatrix.needsUpdate = true;
    g.add(solarInst);
  }

  // 7. Rooftop AHU units & stacks (RTO / Smelter / Beacon)
  const ahuCount = Math.min(6, Math.max(1, Math.floor(widthX / 20)));
  const ahuInst = new THREE.InstancedMesh(UNIT_BOX_GEO, SHARED_MAT.ahuBody, ahuCount);
  ahuInst.userData.isRoof = true;
  for (let i = 0; i < ahuCount; i++) {
    const ax = -widthX * 0.32 + (i / Math.max(1, ahuCount - 1)) * (widthX * 0.64);
    _dummy.position.set(ahuCount === 1 ? 0 : ax, heightY + 0.7, -depthZ * 0.32);
    _dummy.rotation.set(0, 0, 0);
    _dummy.scale.set(2.4, 0.9, 1.6);
    _dummy.updateMatrix();
    ahuInst.setMatrixAt(i, _dummy.matrix);
  }
  ahuInst.instanceMatrix.needsUpdate = true;
  g.add(ahuInst);

  // Special RTO / Smelter stacks for F01 and F04
  if (buildingSpec.id === 'F01' || buildingSpec.id === 'F04') {
    const stackCount = buildingSpec.id === 'F01' ? 4 : 2;
    const stackH = buildingSpec.id === 'F04' ? 3.8 : 2.8;
    for (let i = 0; i < stackCount; i++) {
      const stack = new THREE.Mesh(
        new THREE.CylinderGeometry(0.45, 0.55, stackH, 10),
        SHARED_MAT.stainlessStack
      );
      stack.position.set(
        -widthX * 0.38 + i * 2.6,
        heightY + stackH * 0.5,
        depthZ * 0.25
      );
      stack.userData.isRoof = true;
      g.add(stack);
    }
  }

  // 8. LED Building ID Sign on South facade
  const signTex = createLedSignTexture(buildingSpec.id, buildingSpec.color_hex);
  if (signTex) {
    const signMat = new THREE.MeshStandardMaterial({
      map: signTex,
      emissive: 0xffffff,
      emissiveMap: signTex,
      emissiveIntensity: 0.75,
      roughness: 0.3,
    });
    const signW = Math.min(8, widthX * 0.35);
    const signH = signW * 0.25;
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(signW, signH), signMat);
    sign.position.set(0, Math.min(heightY - 0.5, heightY * 0.85), depthZ * 0.5 + 0.15);
    g.add(sign);
  }

  // Aviation warning beacon on tall buildings (>= 3 floors or >= 20m)
  if (floors >= 3 || (buildingSpec.bounds_m?.height_z ?? 0) >= 20) {
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 8), SHARED_MAT.beaconRed);
    beacon.position.set(widthX * 0.45, heightY + 0.55, depthZ * 0.45);
    beacon.userData.isRoof = true;
    g.add(beacon);
  }

  return g;
}

/**
 * Creates a 5-stage EPC construction controller for a single Gigafactory building.
 *
 * @param {object} buildingSpec - Building spec from getAllBuildingsSpec()
 * @param {(buildingSpec: object) => THREE.Object3D} [buildCompletedExteriorFn] - Optional Stage 4 builder
 * @returns {{ group: THREE.Group, updateStage: (stageIndex: number, stageProgress?: number, elapsedTime?: number, isCutaway?: boolean) => void }}
 */
export function createStagedBuildingController(buildingSpec, buildCompletedExteriorFn) {
  const bounds3JS = buildingSpec.bounds3JS || bpBoundsTo3JS(buildingSpec.bounds_m);
  const widthX = Math.max(4, bounds3JS.widthX);
  const depthZ = Math.max(4, bounds3JS.depthZ);
  const heightY = Math.max(1.2, bounds3JS.heightY);
  const basementY = bounds3JS.basementY || 0;
  const floors = Math.max(1, buildingSpec.floors || 1);

  let columnGrid3JS = [6, 6];
  if (
    Array.isArray(buildingSpec.columnGrid3JS) &&
    buildingSpec.columnGrid3JS[0] > 0 &&
    buildingSpec.columnGrid3JS[1] > 0
  ) {
    columnGrid3JS = buildingSpec.columnGrid3JS;
  } else if (
    Array.isArray(buildingSpec.column_grid_m) &&
    buildingSpec.column_grid_m[0] > 0 &&
    buildingSpec.column_grid_m[1] > 0
  ) {
    columnGrid3JS = [
      buildingSpec.column_grid_m[0] * WORLD_SCALE,
      buildingSpec.column_grid_m[1] * WORLD_SCALE,
    ];
  }

  const dims = { widthX, depthZ, heightY, basementY, floors };
  const grid = computeColumnGrid(widthX, depthZ, columnGrid3JS);
  const accentMat = getAccentMaterial(buildingSpec.color_hex);
  const propScale = WORLD_SCALE * SCENIC_PROP_BOOST;

  const group = new THREE.Group();
  group.name = `StagedBuilding_${buildingSpec.id}`;
  group.position.set(bounds3JS.centerX, 0, bounds3JS.centerZ);
  group.userData = {
    isGigafactoryBuilding: true,
    buildingId: buildingSpec.id,
    buildingSpec,
  };

  // Lazy-built stage containers
  const stageGroups = [null, null, null, null, null];
  const stageData = [{}, {}, {}, {}, {}];

  function buildStage0() {
    const g = new THREE.Group();
    g.name = `${buildingSpec.id}_Stage0_Survey`;

    // Earthwork pad
    const pad = new THREE.Mesh(
      new THREE.BoxGeometry(widthX * 0.94, 0.16, depthZ * 0.94),
      SHARED_MAT.soil
    );
    pad.position.y = 0.08;
    pad.receiveShadow = true;
    g.add(pad);

    // Recessed excavation pit for buildings with basement (e.g., F02, UT04) or deep footings
    const pitDepth = basementY < 0 ? Math.min(1.6, Math.abs(basementY) * 0.6) : 0.35;
    const pit = new THREE.Mesh(
      new THREE.BoxGeometry(widthX * 0.72, pitDepth, depthZ * 0.72),
      SHARED_MAT.deepPit
    );
    pit.position.y = 0.09;
    g.add(pit);

    // Excavated earth mounds
    const mounds = [];
    const moundCount = widthX > 40 ? 3 : 2;
    for (let i = 0; i < moundCount; i++) {
      const m = new THREE.Mesh(
        new THREE.ConeGeometry(Math.min(4.5, widthX * 0.1), 1.6, 7),
        SHARED_MAT.soil
      );
      m.position.set(
        -widthX * 0.3 + i * (widthX * 0.28),
        0.75,
        depthZ * 0.34
      );
      m.castShadow = true;
      g.add(m);
      mounds.push(m);
    }

    // 4 Corner survey stakes (red/white)
    const corners = [
      [-widthX * 0.48, -depthZ * 0.48],
      [widthX * 0.48, -depthZ * 0.48],
      [-widthX * 0.48, depthZ * 0.48],
      [widthX * 0.48, depthZ * 0.48],
    ];
    corners.forEach(([cx, cz]) => {
      const post = new THREE.Mesh(UNIT_CYL_GEO, SHARED_MAT.stakeRed);
      post.scale.set(0.24, 1.4, 0.24);
      post.position.set(cx, 0.7, cz);
      const tip = new THREE.Mesh(UNIT_CYL_GEO, SHARED_MAT.stakeWhite);
      tip.scale.set(0.26, 0.35, 0.26);
      tip.position.set(cx, 1.25, cz);
      g.add(post, tip);
    });

    // Heavy Machinery: Excavator & Bulldozer
    const excavator = buildExcavatorTwin();
    excavator.scale.setScalar(propScale);
    excavator.position.set(-widthX * 0.18, 0.16, 0);
    g.add(excavator);

    const bulldozer = buildBulldozerTwin();
    bulldozer.scale.setScalar(propScale);
    bulldozer.position.set(widthX * 0.18, 0.16, depthZ * 0.12);
    bulldozer.rotation.y = -0.6;
    g.add(bulldozer);

    stageData[0] = { mounds, excavator, bulldozer };
    stageGroups[0] = g;
    group.add(g);
  }

  function buildStage1() {
    const g = new THREE.Group();
    g.name = `${buildingSpec.id}_Stage1_Foundation`;

    // Lean concrete blinding slab
    const slab = new THREE.Mesh(
      new THREE.BoxGeometry(widthX * 0.95, 0.22, depthZ * 0.95),
      SHARED_MAT.leanConcrete
    );
    slab.position.y = 0.11;
    slab.receiveShadow = true;
    g.add(slab);

    // InstancedMesh concrete pile caps / footings aligned to columnGrid
    const totalCaps = grid.xs.length * grid.zs.length;
    const capInst = new THREE.InstancedMesh(UNIT_BOX_GEO, SHARED_MAT.pileCap, totalCaps);
    capInst.castShadow = true;
    capInst.receiveShadow = true;
    const capPositions = [];
    let idx = 0;
    for (let ix = 0; ix < grid.xs.length; ix++) {
      for (let iz = 0; iz < grid.zs.length; iz++) {
        const px = grid.xs[ix];
        const pz = grid.zs[iz];
        capPositions.push([px, pz]);
        _dummy.position.set(px, 0.35, pz);
        _dummy.rotation.set(0, 0, 0);
        _dummy.scale.set(1.3, 0.55, 1.3);
        _dummy.updateMatrix();
        capInst.setMatrixAt(idx++, _dummy.matrix);
      }
    }
    capInst.instanceMatrix.needsUpdate = true;
    g.add(capInst);

    // Rebar cage + formwork twin(s)
    const rebarCount = widthX > 45 ? 2 : 1;
    for (let i = 0; i < rebarCount; i++) {
      const rebar = buildRebarCageAndFormworkTwin();
      rebar.scale.setScalar(propScale * 0.95);
      rebar.position.set(
        rebarCount === 1 ? 0 : (i === 0 ? -widthX * 0.2 : widthX * 0.2),
        0.22,
        0
      );
      g.add(rebar);
    }

    // Material stacks: Plywood formwork & Concrete pile stack
    const plywood = buildPlywoodFormworkStackTwin();
    plywood.scale.setScalar(propScale);
    plywood.position.set(-widthX * 0.34, 0.22, depthZ * 0.32);
    g.add(plywood);

    const piles = buildConcretePileStackTwin();
    piles.scale.setScalar(propScale * 0.85);
    piles.position.set(widthX * 0.32, 0.22, -depthZ * 0.32);
    g.add(piles);

    // Concrete Mixer Truck pouring foundation
    const mixer = buildConcreteMixerTruckTwin();
    mixer.scale.setScalar(propScale * 0.95);
    mixer.position.set(widthX * 0.24, 0.22, depthZ * 0.26);
    mixer.rotation.y = -2.2;
    g.add(mixer);

    stageData[1] = { slab, capInst, capPositions, mixer };
    stageGroups[1] = g;
    group.add(g);
  }

  function buildStage2() {
    const g = new THREE.Group();
    g.name = `${buildingSpec.id}_Stage2_SteelFrame`;

    // Foundation slab base
    const baseSlab = new THREE.Mesh(
      new THREE.BoxGeometry(widthX * 0.95, 0.24, depthZ * 0.95),
      SHARED_MAT.slab
    );
    baseSlab.position.y = 0.12;
    baseSlab.receiveShadow = true;
    g.add(baseSlab);

    // InstancedMesh H-Columns
    const totalCols = grid.xs.length * grid.zs.length;
    const colInst = new THREE.InstancedMesh(UNIT_BOX_GEO, SHARED_MAT.steelColumn, totalCols);
    colInst.castShadow = true;
    const colPositions = [];
    let cIdx = 0;
    for (let ix = 0; ix < grid.xs.length; ix++) {
      for (let iz = 0; iz < grid.zs.length; iz++) {
        colPositions.push([grid.xs[ix], grid.zs[iz], ix / Math.max(1, grid.xs.length - 1)]);
        _dummy.position.set(grid.xs[ix], heightY * 0.5, grid.zs[iz]);
        _dummy.rotation.set(0, 0, 0);
        _dummy.scale.set(0.45, heightY, 0.45);
        _dummy.updateMatrix();
        colInst.setMatrixAt(cIdx++, _dummy.matrix);
      }
    }
    colInst.instanceMatrix.needsUpdate = true;
    g.add(colInst);

    // InstancedMesh Roof Girders / Trusses along X and Z
    const xGirderSpan = grid.xs[grid.xs.length - 1] - grid.xs[0];
    const zGirderSpan = grid.zs[grid.zs.length - 1] - grid.zs[0];
    const totalGirders = grid.zs.length + grid.xs.length;
    const girderInst = new THREE.InstancedMesh(UNIT_BOX_GEO, SHARED_MAT.steelTruss, totalGirders);
    girderInst.castShadow = true;
    const girderSpecs = [];
    for (let iz = 0; iz < grid.zs.length; iz++) {
      girderSpecs.push({
        x: 0,
        z: grid.zs[iz],
        sx: xGirderSpan,
        sy: 0.42,
        sz: 0.26,
      });
    }
    for (let ix = 0; ix < grid.xs.length; ix++) {
      girderSpecs.push({
        x: grid.xs[ix],
        z: 0,
        sx: 0.26,
        sy: 0.36,
        sz: zGirderSpan,
      });
    }
    girderSpecs.forEach((gs, i) => {
      _dummy.position.set(gs.x, heightY - 0.22, gs.z);
      _dummy.rotation.set(0, 0, 0);
      _dummy.scale.set(gs.sx, gs.sy, gs.sz);
      _dummy.updateMatrix();
      girderInst.setMatrixAt(i, _dummy.matrix);
    });
    girderInst.instanceMatrix.needsUpdate = true;
    g.add(girderInst);

    // Intermediate concrete floor slabs for multi-story buildings (F04, F06A, F07, IOC01, UT02, UT05)
    const floorSlabs = [];
    if (floors > 1) {
      for (let f = 1; f < floors; f++) {
        const fy = (heightY * f) / floors;
        const fSlab = new THREE.Mesh(
          new THREE.BoxGeometry(widthX * 0.92, 0.22, depthZ * 0.92),
          SHARED_MAT.slab
        );
        fSlab.position.y = fy;
        fSlab.receiveShadow = true;
        g.add(fSlab);
        floorSlabs.push({ mesh: fSlab, threshold: 0.25 + (f / floors) * 0.5 });
      }
    }

    // 1 to 4 Tower Cranes depending on building footprint
    const area = widthX * depthZ;
    const craneCount = area > 4500 ? 4 : area > 1800 ? 2 : 1;
    const craneOffsets = [
      [-widthX * 0.42, depthZ * 0.48],
      [widthX * 0.42, -depthZ * 0.48],
      [-widthX * 0.42, -depthZ * 0.48],
      [widthX * 0.42, depthZ * 0.48],
    ];
    const towerCranes = [];
    const craneHeightM = Math.max(24, (buildingSpec.bounds_m?.height_z ?? 16) * 1.45);
    const jibLengthM = Math.min(40, Math.max(22, Math.min(widthX, depthZ) * 0.65));

    for (let i = 0; i < craneCount; i++) {
      const crane = buildTowerCraneTwin({ height: craneHeightM, jibLength: jibLengthM });
      crane.scale.set(WORLD_SCALE * 1.15, HEIGHT_SCALE * 1.05, WORLD_SCALE * 1.15);
      const [ox, oz] = craneOffsets[i];
      crane.position.set(ox, 0, oz);
      g.add(crane);
      towerCranes.push({
        crane,
        baseAngle: i * 1.35,
        speed: 0.32 + (i % 2) * 0.08,
      });
    }

    // Crawler Crane
    const crawler = buildCrawlerCraneTwin({ boomLength: 20 });
    crawler.scale.setScalar(propScale * 0.9);
    crawler.position.set(widthX * 0.48 + 2.2, 0, depthZ * 0.15);
    crawler.rotation.y = -Math.PI * 0.5;
    g.add(crawler);

    // Steel Girder Stack staging
    const girderStack = buildSteelGirderStackTwin();
    girderStack.scale.setScalar(propScale * 0.85);
    girderStack.position.set(-widthX * 0.48 - 2.0, 0, 0);
    g.add(girderStack);

    // Scaffolding Bays along South facade
    const scaffCount = Math.min(3, Math.max(1, Math.floor(widthX / 22)));
    for (let i = 0; i < scaffCount; i++) {
      const scaff = buildScaffoldingBayTwin({
        width: 12,
        height: Math.min(12, Math.max(6, (buildingSpec.bounds_m?.height_z ?? 12) * 0.65)),
      });
      scaff.scale.set(WORLD_SCALE * 1.2, HEIGHT_SCALE, WORLD_SCALE * 1.2);
      const sx = scaffCount === 1 ? 0 : -widthX * 0.25 + (i / (scaffCount - 1)) * widthX * 0.5;
      scaff.position.set(sx, 0, depthZ * 0.5 + 0.8);
      g.add(scaff);
    }

    stageData[2] = {
      colInst,
      colPositions,
      girderInst,
      girderSpecs,
      floorSlabs,
      towerCranes,
      crawler,
    };
    stageGroups[2] = g;
    group.add(g);
  }

  function buildStage3() {
    const g = new THREE.Group();
    g.name = `${buildingSpec.id}_Stage3_Envelope`;

    // Cladding shell rising from bottom to top
    const wallShell = new THREE.Mesh(
      new THREE.BoxGeometry(widthX * 0.99, heightY, depthZ * 0.99),
      SHARED_MAT.claddingBase
    );
    wallShell.position.y = heightY * 0.5;
    wallShell.castShadow = true;
    wallShell.receiveShadow = true;
    wallShell.userData.isExteriorWall = true;
    g.add(wallShell);

    // Accent stripe
    const bandH = Math.min(1.0, heightY * 0.15);
    const band = new THREE.Mesh(
      new THREE.BoxGeometry(widthX * 1.003, bandH, depthZ * 1.003),
      accentMat
    );
    band.position.y = heightY - bandH * 0.7;
    band.userData.isExteriorWall = true;
    g.add(band);

    // Clerestory glazing ribbon
    const glassBand = new THREE.Mesh(
      new THREE.BoxGeometry(widthX * 1.001, Math.min(0.85, heightY * 0.14), depthZ * 1.001),
      SHARED_MAT.glassClerestory
    );
    glassBand.position.y = heightY * 0.66;
    glassBand.userData.isExteriorWall = true;
    g.add(glassBand);

    // InstancedMesh Dock Doors along South facade
    const doorCount = Math.max(2, Math.min(12, Math.floor(widthX / 6.5)));
    const dockInst = new THREE.InstancedMesh(UNIT_BOX_GEO, SHARED_MAT.dockDoor, doorCount);
    for (let i = 0; i < doorCount; i++) {
      const dx = -widthX * 0.4 + (i / Math.max(1, doorCount - 1)) * (widthX * 0.8);
      _dummy.position.set(dx, 1.05, depthZ * 0.5 + 0.05);
      _dummy.rotation.set(0, 0, 0);
      _dummy.scale.set(1.9, 2.0, 0.18);
      _dummy.updateMatrix();
      dockInst.setMatrixAt(i, _dummy.matrix);
    }
    dockInst.instanceMatrix.needsUpdate = true;
    g.add(dockInst);

    // Roof deck
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(widthX * 1.01, 0.24, depthZ * 1.01),
      SHARED_MAT.roofDeck
    );
    roof.position.y = heightY + 0.12;
    roof.userData.isRoof = true;
    g.add(roof);

    // InstancedMesh Rooftop Solar PV panels
    const panelW = 3.2;
    const panelD = 1.8;
    const cols = Math.max(1, Math.floor((widthX * 0.78) / (panelW + 1.0)));
    const rows = Math.max(1, Math.floor((depthZ * 0.72) / (panelD + 1.2)));
    const totalPanels = Math.min(80, cols * rows);
    const solarPositions = [];
    let solarInst = null;
    if (totalPanels > 0) {
      solarInst = new THREE.InstancedMesh(UNIT_BOX_GEO, SHARED_MAT.solarPanel, totalPanels);
      solarInst.userData.isRoof = true;
      let idx = 0;
      for (let r = 0; r < rows && idx < totalPanels; r++) {
        for (let c = 0; c < cols && idx < totalPanels; c++) {
          const px = -((cols - 1) * (panelW + 1.0)) * 0.5 + c * (panelW + 1.0);
          const pz = -((rows - 1) * (panelD + 1.2)) * 0.5 + r * (panelD + 1.2);
          solarPositions.push([px, pz]);
          _dummy.position.set(px, heightY + 0.4, pz);
          _dummy.rotation.set(0.18, 0, 0);
          _dummy.scale.set(panelW, 0.08, panelD);
          _dummy.updateMatrix();
          solarInst.setMatrixAt(idx++, _dummy.matrix);
        }
      }
      solarInst.instanceMatrix.needsUpdate = true;
      g.add(solarInst);
    }

    // Demobilizing Tower Crane & Scaffolding during early envelope phase
    const finishCrane = buildTowerCraneTwin({
      height: Math.max(24, (buildingSpec.bounds_m?.height_z ?? 16) * 1.45),
      jibLength: 26,
    });
    finishCrane.scale.set(WORLD_SCALE * 1.15, HEIGHT_SCALE * 1.05, WORLD_SCALE * 1.15);
    finishCrane.position.set(-widthX * 0.42, 0, depthZ * 0.48);
    g.add(finishCrane);

    stageData[3] = {
      wallShell,
      band,
      glassBand,
      dockInst,
      roof,
      solarInst,
      solarPositions,
      panelW,
      panelD,
      finishCrane,
    };
    stageGroups[3] = g;
    group.add(g);
  }

  function buildStage4() {
    const g = new THREE.Group();
    g.name = `${buildingSpec.id}_Stage4_Operational`;

    const exterior =
      typeof buildCompletedExteriorFn === 'function'
        ? buildCompletedExteriorFn(buildingSpec)
        : buildDefaultCompletedExterior(buildingSpec, dims, accentMat);

    g.add(exterior);
    stageData[4] = { exterior };
    stageGroups[4] = g;
    group.add(g);
  }

  function ensureStage(idx) {
    if (stageGroups[idx]) return;
    if (idx === 0) buildStage0();
    else if (idx === 1) buildStage1();
    else if (idx === 2) buildStage2();
    else if (idx === 3) buildStage3();
    else if (idx === 4) buildStage4();
  }

  function applyCutawayToStage4(exterior, isCutaway) {
    if (!exterior) return;
    exterior.traverse((obj) => {
      if (!obj.isMesh) return;
      if (obj.userData?.isRoof) {
        obj.visible = !isCutaway;
      } else if (obj.userData?.isExteriorWall && obj.material) {
        if (isCutaway) {
          if (obj.userData._savedOpacity === undefined) {
            obj.userData._savedOpacity = obj.material.opacity;
            obj.userData._savedTransparent = obj.material.transparent;
          }
          obj.material.transparent = true;
          obj.material.opacity = 0.16;
        } else if (obj.userData._savedOpacity !== undefined) {
          obj.material.opacity = obj.userData._savedOpacity;
          obj.material.transparent = obj.userData._savedTransparent;
        }
      }
    });
  }

  // Initialize Stage 0 by default
  ensureStage(0);

  /**
   * Updates the building visual state for a given stage, progress, time, and cutaway mode.
   *
   * @param {number} stageIndex - 0 (Survey) .. 4 (Operational)
   * @param {number} [stageProgress=1] - Normalized progress within stage [0..1]
   * @param {number} [elapsedTime=0] - Global elapsed seconds for machinery animations
   * @param {boolean} [isCutaway=false] - X-Ray roof/wall cutaway mode
   */
  function updateStage(stageIndex, stageProgress = 1, elapsedTime = 0, isCutaway = false) {
    const sIdx = Math.max(0, Math.min(4, Math.round(stageIndex)));
    const p = clamp01(stageProgress);

    ensureStage(sIdx);
    // In cutaway mode during Stage 3/4, also ensure Stage 2 steel frame is available as structural skeleton
    if (isCutaway && sIdx >= 3) {
      ensureStage(2);
    }

    for (let i = 0; i < 5; i++) {
      if (stageGroups[i]) {
        stageGroups[i].visible = i === sIdx || (isCutaway && sIdx >= 3 && i === 2);
      }
    }

    if (sIdx === 0) {
      const d = stageData[0];
      const moundScale = 0.25 + 0.75 * p;
      d.mounds.forEach((m) => {
        m.scale.set(moundScale, moundScale, moundScale);
      });
      if (d.excavator?.userData?.slewingPivot) {
        d.excavator.userData.slewingPivot.rotation.y = Math.sin(elapsedTime * 0.9) * 0.65;
      }
      if (d.bulldozer) {
        d.bulldozer.position.z = depthZ * 0.12 + Math.sin(elapsedTime * 0.6) * 0.8;
      }
    } else if (sIdx === 1) {
      const d = stageData[1];
      const capScaleY = 0.08 + 0.92 * p;
      for (let i = 0; i < d.capPositions.length; i++) {
        const [px, pz] = d.capPositions[i];
        _dummy.position.set(px, 0.22 + 0.28 * capScaleY, pz);
        _dummy.rotation.set(0, 0, 0);
        _dummy.scale.set(1.3, 0.55 * capScaleY, 1.3);
        _dummy.updateMatrix();
        d.capInst.setMatrixAt(i, _dummy.matrix);
      }
      d.capInst.instanceMatrix.needsUpdate = true;

      if (d.mixer?.userData?.drum) {
        d.mixer.userData.drum.rotation.y = elapsedTime * 2.4;
      }
    } else if (sIdx === 2) {
      const d = stageData[2];
      // Columns rise bay-by-bay across p [0..0.6]
      for (let i = 0; i < d.colPositions.length; i++) {
        const [cx, cz, xNorm] = d.colPositions[i];
        const localP = clamp01((p - xNorm * 0.25) / 0.45);
        const hScale = Math.max(0.03, localP);
        _dummy.position.set(cx, (heightY * hScale) * 0.5, cz);
        _dummy.rotation.set(0, 0, 0);
        _dummy.scale.set(0.45, heightY * hScale, 0.45);
        _dummy.updateMatrix();
        d.colInst.setMatrixAt(i, _dummy.matrix);
      }
      d.colInst.instanceMatrix.needsUpdate = true;

      // Floor slabs appear progressively
      d.floorSlabs.forEach((fs) => {
        fs.mesh.visible = p >= fs.threshold;
      });

      // Roof girders appear in second half of Stage 2
      const girderP = clamp01((p - 0.52) / 0.42);
      d.girderSpecs.forEach((gs, i) => {
        const s = Math.max(0.001, girderP);
        _dummy.position.set(gs.x, heightY - 0.22, gs.z);
        _dummy.rotation.set(0, 0, 0);
        _dummy.scale.set(gs.sx * s, gs.sy * s, gs.sz * s);
        _dummy.updateMatrix();
        d.girderInst.setMatrixAt(i, _dummy.matrix);
      });
      d.girderInst.instanceMatrix.needsUpdate = true;

      // Animate Tower Cranes slewing & trolley
      d.towerCranes.forEach(({ crane, baseAngle, speed }, idx) => {
        crane.visible = true;
        if (crane.userData?.slewingPivot) {
          crane.userData.slewingPivot.rotation.y =
            baseAngle + Math.sin(elapsedTime * speed + idx * 1.7) * 0.78;
        }
        if (crane.userData?.trolley) {
          crane.userData.trolley.position.z =
            12 + Math.sin(elapsedTime * 0.45 + idx) * 5;
        }
      });

      if (d.crawler?.userData?.slewingPivot) {
        d.crawler.userData.slewingPivot.rotation.y = Math.sin(elapsedTime * 0.4) * 0.45;
      }
    } else if (sIdx === 3) {
      const d = stageData[3];
      const wallP = clamp01(p / 0.7);
      const curH = Math.max(0.1, heightY * wallP);

      d.wallShell.visible = !isCutaway;
      d.wallShell.scale.y = wallP;
      d.wallShell.position.y = curH * 0.5;

      d.band.visible = !isCutaway && p > 0.55;
      d.glassBand.visible = !isCutaway && p > 0.35;
      d.dockInst.visible = p > 0.35;

      d.roof.visible = !isCutaway && p > 0.5;

      if (d.solarInst) {
        d.solarInst.visible = !isCutaway && p > 0.48;
        const solarP = clamp01((p - 0.48) / 0.52);
        const activePanels = Math.round(solarP * d.solarPositions.length);
        for (let i = 0; i < d.solarPositions.length; i++) {
          const [px, pz] = d.solarPositions[i];
          const s = i < activePanels ? 1 : 0.001;
          _dummy.position.set(px, heightY + 0.4, pz);
          _dummy.rotation.set(0.18, 0, 0);
          _dummy.scale.set(d.panelW * s, 0.08 * s, d.panelD * s);
          _dummy.updateMatrix();
          d.solarInst.setMatrixAt(i, _dummy.matrix);
        }
        d.solarInst.instanceMatrix.needsUpdate = true;
      }

      if (d.finishCrane) {
        d.finishCrane.visible = p < 0.85;
        if (d.finishCrane.userData?.slewingPivot) {
          d.finishCrane.userData.slewingPivot.rotation.y = Math.sin(elapsedTime * 0.3) * 0.6;
        }
      }
    } else if (sIdx === 4) {
      const d = stageData[4];
      applyCutawayToStage4(d.exterior, isCutaway);
    }

    // If cutaway is active on Stage 3 or 4, ensure Stage 2 structural skeleton is fully erected
    if (isCutaway && sIdx >= 3 && stageData[2]?.colPositions) {
      const d2 = stageData[2];
      d2.towerCranes.forEach(({ crane }) => {
        crane.visible = false;
      });
      if (d2.crawler) d2.crawler.visible = false;
      for (let i = 0; i < d2.colPositions.length; i++) {
        const [cx, cz] = d2.colPositions[i];
        _dummy.position.set(cx, heightY * 0.5, cz);
        _dummy.rotation.set(0, 0, 0);
        _dummy.scale.set(0.45, heightY, 0.45);
        _dummy.updateMatrix();
        d2.colInst.setMatrixAt(i, _dummy.matrix);
      }
      d2.colInst.instanceMatrix.needsUpdate = true;
      d2.girderSpecs.forEach((gs, i) => {
        _dummy.position.set(gs.x, heightY - 0.22, gs.z);
        _dummy.rotation.set(0, 0, 0);
        _dummy.scale.set(gs.sx, gs.sy, gs.sz);
        _dummy.updateMatrix();
        d2.girderInst.setMatrixAt(i, _dummy.matrix);
      });
      d2.girderInst.instanceMatrix.needsUpdate = true;
    }
  }

  return {
    group,
    updateStage,
  };
}
