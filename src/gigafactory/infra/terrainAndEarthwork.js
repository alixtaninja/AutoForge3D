import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  bpBoundsTo3JS,
  getAllBuildingsSpec,
  getBuildingStageAtMonth,
} from '../config/masterSpecLoader.js';

const EXCAVATED_PIT_IDS = new Set(['F02', 'UT04']);

const PLOT_SHORT_LABELS = {
  F01: 'F01 GIGA-CASTING',
  F02: 'F02 SERVO STAMPING',
  F03: 'F03 BIW DARK FACTORY',
  F04: 'F04 ECO-SMART PAINT',
  F05: 'F05 GENERAL ASSEMBLY',
  F06A: 'F06A CELL 40GWH',
  F06B: 'F06B BATTERY PACK',
  F07: 'F07 E-AXLE 800V',
  'F08-1': 'F08-1 PLASTIC & BUMPER',
  'F08-2': 'F08-2 JIS SEATING',
  'F08-3': 'F08-3 HOT STAMPING',
  'F08-4': 'F08-4 COCKPIT & GLASS',
  'F08-5': 'F08-5 WIRING HARNESS',
  F09: 'F09 EOL & ADAS TEST',
  WH01: 'WH01 AS/RS LOGISTICS',
  IOC01: 'IOC01 AI CONTROL HQ',
  RD01: 'RD01 R&D WIND TUNNEL',
  PG01: 'PG01 PROVING GROUND',
  LY01: 'LY01 SOLAR YARD',
  UT01: 'UT01 220KV & BESS',
  UT02: 'UT02 CHILLER CUB',
  UT03: 'UT03 INDUSTRIAL GAS',
  UT04: 'UT04 ZLD WATER PLANT',
  UT05: 'UT05 EV FIRE & CLINIC',
};

const COLOR_SANDY_EARTH = new THREE.Color(0xc6a477);
const COLOR_EXCAVATED_PIT = new THREE.Color(0x5b4430);
const COLOR_CONCRETE_SLAB = new THREE.Color(0x9da3a8);

function createSeededRandom(seed = 350125) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function normalizeGeometryForMerge(geometry) {
  const nonIndexed = geometry.index ? geometry.toNonIndexed() : geometry.clone();
  if (!nonIndexed.getAttribute('normal')) {
    nonIndexed.computeVertexNormals();
  }
  if (!nonIndexed.getAttribute('uv')) {
    const count = nonIndexed.getAttribute('position').count;
    nonIndexed.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(count * 2), 2));
  }
  return nonIndexed;
}

function buildSurveyStakeGeometry() {
  const geo = new THREE.BoxGeometry(0.28, 1.5, 0.28).toNonIndexed();
  const pos = geo.getAttribute('position');
  const colors = new Float32Array(pos.count * 3);
  const white = new THREE.Color(0xf5f5f5);
  const red = new THREE.Color(0xe53935);

  for (let i = 0; i < pos.count; i += 1) {
    const y = pos.getY(i);
    // Top band and middle band red, alternating with white survey stripes
    const isRed = y > 0.25 || (y > -0.35 && y <= -0.05);
    const c = isRed ? red : white;
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }

  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geo;
}

function buildZoneSignAtlasTexture(buildings) {
  if (typeof document === 'undefined') {
    const data = new Uint8Array([30, 41, 59, 255]);
    const fallback = new THREE.DataTexture(data, 1, 1);
    fallback.needsUpdate = true;
    return fallback;
  }

  const cols = 4;
  const rows = 6;
  const cellW = 512;
  const cellH = 256;

  const canvas = document.createElement('canvas');
  canvas.width = cols * cellW;
  canvas.height = rows * cellH;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  buildings.slice(0, cols * rows).forEach((b, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const x0 = col * cellW;
    const y0 = row * cellH;

    // Card background
    ctx.fillStyle = '#111827';
    ctx.fillRect(x0 + 8, y0 + 8, cellW - 16, cellH - 16);

    // Accent bar on left
    const accent = b.color_hex || '#f59e0b';
    ctx.fillStyle = accent;
    ctx.fillRect(x0 + 8, y0 + 8, 22, cellH - 16);

    // Border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 4;
    ctx.strokeRect(x0 + 10, y0 + 10, cellW - 20, cellH - 20);

    // Zone title
    const label = PLOT_SHORT_LABELS[b.id] || `${b.id} ZONE`;
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 36px Inter, system-ui, -apple-system, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x0 + 48, y0 + 96, cellW - 72);

    // Dimensions & area sub-label
    const w = b.bounds_m?.width_x ?? 0;
    const l = b.bounds_m?.length_y ?? 0;
    const areaHa = ((w * l) / 10000).toFixed(1);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 24px Inter, system-ui, -apple-system, sans-serif';
    ctx.fillText(`${w}m × ${l}m  •  ${areaHa} ha`, x0 + 48, y0 + 168, cellW - 72);
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

function buildZoneSignsMeshes(buildings) {
  const cols = 4;
  const rows = 6;
  const boardGeos = [];
  const poleGeos = [];

  buildings.slice(0, cols * rows).forEach((b, idx) => {
    const bounds = b.bounds3JS || bpBoundsTo3JS(b.bounds_m);
    const col = idx % cols;
    const row = Math.floor(idx / cols);

    // Canvas UV: v=1 is top of canvas (row=0), v=0 is bottom (row=5)
    const uMin = col / cols;
    const uMax = (col + 1) / cols;
    const vMax = 1 - row / rows;
    const vMin = 1 - (row + 1) / rows;

    const signW = Math.min(22, Math.max(11, bounds.widthX * 0.38));
    const signH = signW * 0.5;
    const signX = bounds.centerX;
    const signY = 3.2 + signH * 0.5;
    const signZ = bounds.maxZ - 1.5;

    // Front-facing quad (+Z)
    const front = new THREE.PlaneGeometry(signW, signH).toNonIndexed();
    const frontUv = front.getAttribute('uv');
    for (let i = 0; i < frontUv.count; i += 1) {
      const u = frontUv.getX(i);
      const v = frontUv.getY(i);
      frontUv.setXY(i, uMin + u * (uMax - uMin), vMin + v * (vMax - vMin));
    }
    front.translate(signX, signY, signZ);
    boardGeos.push(front);

    // Back-facing quad (-Z) so sign is readable from both sides
    const back = new THREE.PlaneGeometry(signW, signH).toNonIndexed();
    back.rotateY(Math.PI);
    const backUv = back.getAttribute('uv');
    for (let i = 0; i < backUv.count; i += 1) {
      const u = backUv.getX(i);
      const v = backUv.getY(i);
      backUv.setXY(i, uMin + u * (uMax - uMin), vMin + v * (vMax - vMin));
    }
    back.translate(signX, signY, signZ - 0.05);
    boardGeos.push(back);

    // Two slim support poles per sign
    const poleOffset = signW * 0.34;
    const poleHeight = signY - signH * 0.5 + 0.1;
    const leftPole = new THREE.BoxGeometry(0.22, poleHeight, 0.22);
    leftPole.translate(signX - poleOffset, poleHeight * 0.5, signZ - 0.025);
    poleGeos.push(normalizeGeometryForMerge(leftPole));

    const rightPole = new THREE.BoxGeometry(0.22, poleHeight, 0.22);
    rightPole.translate(signX + poleOffset, poleHeight * 0.5, signZ - 0.025);
    poleGeos.push(normalizeGeometryForMerge(rightPole));
  });

  const atlasTexture = buildZoneSignAtlasTexture(buildings);
  const signsMesh = new THREE.Mesh(
    mergeGeometries(boardGeos, false),
    new THREE.MeshBasicMaterial({ map: atlasTexture })
  );
  signsMesh.name = 'GigafactoryPlotSigns';

  const polesMesh = new THREE.Mesh(
    mergeGeometries(poleGeos, false),
    new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.5,
      metalness: 0.65,
    })
  );
  polesMesh.name = 'GigafactoryPlotSignPoles';

  return { signsMesh, polesMesh };
}

function buildEcologicalEnvironment(group) {
  // 1. Expanded surrounding terrain base (900 x 600 Three.js units)
  const outerGroundGeo = new THREE.PlaneGeometry(900, 600, 1, 1);
  outerGroundGeo.rotateX(-Math.PI / 2);
  const outerGround = new THREE.Mesh(
    outerGroundGeo,
    new THREE.MeshStandardMaterial({
      color: 0x4b6e3f,
      roughness: 0.96,
      metalness: 0.0,
    })
  );
  outerGround.position.set(0, -0.18, 0);
  outerGround.receiveShadow = true;
  outerGround.name = 'ExpandedTerrain900x600';
  group.add(outerGround);

  // 2. Core 350ha industrial campus earth pad (625 x 350 Three.js units)
  const sitePadGeo = new THREE.PlaneGeometry(625, 350, 1, 1);
  sitePadGeo.rotateX(-Math.PI / 2);
  const sitePad = new THREE.Mesh(
    sitePadGeo,
    new THREE.MeshStandardMaterial({
      color: 0x8d7b66,
      roughness: 0.94,
      metalness: 0.0,
    })
  );
  sitePad.position.set(0, -0.06, 0);
  sitePad.receiveShadow = true;
  sitePad.name = 'GigafactoryCampusPad625x350';
  group.add(sitePad);

  // 3. Ecological greenbelt buffer strips around the 625 x 350 site (1 merged mesh)
  const beltGeos = [];
  const addBelt = (w, d, x, z) => {
    const g = new THREE.PlaneGeometry(w, d);
    g.rotateX(-Math.PI / 2);
    g.translate(x, -0.1, z);
    beltGeos.push(normalizeGeometryForMerge(g));
  };
  addBelt(680, 26, 0, -190); // North greenbelt
  addBelt(680, 26, 0, 190); // South greenbelt
  addBelt(26, 406, -327.5, 0); // West greenbelt
  addBelt(22, 406, 325.5, 0); // East greenbelt

  // Ecological retention park lawn on SE corner
  const sePark = new THREE.CircleGeometry(1, 24);
  sePark.rotateX(-Math.PI / 2);
  sePark.scale(72, 1, 40);
  sePark.translate(235, -0.11, 232);
  beltGeos.push(normalizeGeometryForMerge(sePark));

  const greenbeltMesh = new THREE.Mesh(
    mergeGeometries(beltGeos, false),
    new THREE.MeshStandardMaterial({
      color: 0x386330,
      roughness: 0.92,
      metalness: 0.0,
    })
  );
  greenbeltMesh.receiveShadow = true;
  greenbeltMesh.name = 'EcologicalGreenbelts';
  group.add(greenbeltMesh);

  // 4. Canal & Retention Pond embankments (1 merged mesh)
  const bankGeos = [];

  // East drainage canal banks (x = 352, width 28)
  const westBank = new THREE.BoxGeometry(4, 0.28, 560);
  westBank.translate(338, -0.08, 0);
  bankGeos.push(normalizeGeometryForMerge(westBank));

  const eastBank = new THREE.BoxGeometry(4, 0.28, 560);
  eastBank.translate(366, -0.08, 0);
  bankGeos.push(normalizeGeometryForMerge(eastBank));

  // SE Ecological retention pond stone rim
  const seRim = new THREE.RingGeometry(0.94, 1.08, 28);
  seRim.rotateX(-Math.PI / 2);
  seRim.scale(54, 1, 28);
  seRim.translate(235, -0.07, 232);
  bankGeos.push(normalizeGeometryForMerge(seRim));

  // West stormwater detention basin rim
  const westRim = new THREE.RingGeometry(0.92, 1.08, 20);
  westRim.rotateX(-Math.PI / 2);
  westRim.scale(22, 1, 36);
  westRim.translate(-370, -0.07, 115);
  bankGeos.push(normalizeGeometryForMerge(westRim));

  const banksMesh = new THREE.Mesh(
    mergeGeometries(bankGeos, false),
    new THREE.MeshStandardMaterial({
      color: 0x6c757d,
      roughness: 0.88,
      metalness: 0.05,
    })
  );
  banksMesh.name = 'CanalAndPondEmbankments';
  group.add(banksMesh);

  // 5. Reflective Water Surface: East drainage canal + SE ecological retention pond + West basin
  const waterGeos = [];

  const eastCanalWater = new THREE.PlaneGeometry(25, 560);
  eastCanalWater.rotateX(-Math.PI / 2);
  eastCanalWater.translate(352, -0.08, 0);
  waterGeos.push(normalizeGeometryForMerge(eastCanalWater));

  const sePondWater = new THREE.CircleGeometry(1, 28);
  sePondWater.rotateX(-Math.PI / 2);
  sePondWater.scale(52, 1, 26);
  sePondWater.translate(235, -0.07, 232);
  waterGeos.push(normalizeGeometryForMerge(sePondWater));

  // Connecting spillway channel between SE pond and East canal
  const spillwayWater = new THREE.PlaneGeometry(75, 10);
  spillwayWater.rotateX(-Math.PI / 2);
  spillwayWater.translate(308, -0.075, 232);
  waterGeos.push(normalizeGeometryForMerge(spillwayWater));

  const westBasinWater = new THREE.CircleGeometry(1, 20);
  westBasinWater.rotateX(-Math.PI / 2);
  westBasinWater.scale(20.5, 1, 34);
  westBasinWater.translate(-370, -0.07, 115);
  waterGeos.push(normalizeGeometryForMerge(westBasinWater));

  const waterMesh = new THREE.Mesh(
    mergeGeometries(waterGeos, false),
    new THREE.MeshStandardMaterial({
      color: 0x1b6d8c,
      roughness: 0.08,
      metalness: 0.78,
      envMapIntensity: 1.4,
    })
  );
  waterMesh.name = 'ReflectiveCanalAndRetentionPonds';
  group.add(waterMesh);

  // 6. Greenbelt Trees (InstancedMesh x2: trunks + canopies = 2 draw calls)
  const rand = createSeededRandom(3502026);
  const treePositions = [];

  // North & South greenbelts
  for (let i = 0; i < 36; i += 1) {
    const x = -305 + i * 17.4 + (rand() - 0.5) * 4;
    treePositions.push({ x, z: -186 - rand() * 12, s: 0.85 + rand() * 0.45 });
    if (Math.abs(x) > 22) {
      treePositions.push({ x, z: 186 + rand() * 12, s: 0.85 + rand() * 0.45 });
    }
  }
  // West & East greenbelts
  for (let i = 0; i < 16; i += 1) {
    const z = -160 + i * 21 + (rand() - 0.5) * 4;
    if (Math.abs(z) > 22) {
      treePositions.push({ x: -322 - rand() * 11, z, s: 0.85 + rand() * 0.4 });
    }
    treePositions.push({ x: 322 + rand() * 8, z, s: 0.85 + rand() * 0.4 });
  }
  // Trees around SE retention pond
  for (let i = 0; i < 16; i += 1) {
    const angle = (i / 16) * Math.PI * 2;
    const rx = 59 + rand() * 6;
    const rz = 31 + rand() * 5;
    const x = 235 + Math.cos(angle) * rx;
    const z = 232 + Math.sin(angle) * rz;
    if (z > 184 && x < 332) {
      treePositions.push({ x, z, s: 0.9 + rand() * 0.45 });
    }
  }

  const count = treePositions.length;
  const trunkGeo = new THREE.CylinderGeometry(0.28, 0.42, 2.0, 5);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.95 });
  const trunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, count);
  trunkInst.name = 'GreenbeltTreeTrunks';

  const canopyGeo = new THREE.DodecahedronGeometry(1.6, 0);
  const canopyMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.88 });
  const canopyInst = new THREE.InstancedMesh(canopyGeo, canopyMat, count);
  canopyInst.name = 'GreenbeltTreeCanopies';

  const dummy = new THREE.Object3D();
  const palette = [
    new THREE.Color(0x2d6a32),
    new THREE.Color(0x3a7d38),
    new THREE.Color(0x24582a),
  ];

  treePositions.forEach((t, i) => {
    dummy.position.set(t.x, t.s * 1.0 - 0.1, t.z);
    dummy.rotation.set(0, rand() * Math.PI * 2, 0);
    dummy.scale.set(t.s, t.s, t.s);
    dummy.updateMatrix();
    trunkInst.setMatrixAt(i, dummy.matrix);

    dummy.position.set(t.x, t.s * 2.7 - 0.1, t.z);
    dummy.scale.set(t.s, t.s * 1.15, t.s);
    dummy.updateMatrix();
    canopyInst.setMatrixAt(i, dummy.matrix);
    canopyInst.setColorAt(i, palette[i % palette.length]);
  });

  trunkInst.instanceMatrix.needsUpdate = true;
  canopyInst.instanceMatrix.needsUpdate = true;
  if (canopyInst.instanceColor) canopyInst.instanceColor.needsUpdate = true;

  group.add(trunkInst);
  group.add(canopyInst);
}

function buildPerimeterSecurityFence(group) {
  const halfW = 312.5;
  const halfD = 175.0;
  const step = 15.0;

  const segments = [];
  const addEdge = (x1, z1, x2, z2, gapPredicate) => {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const len = Math.hypot(dx, dz);
    const steps = Math.max(1, Math.round(len / step));
    const angle = Math.atan2(dx, dz);

    for (let i = 0; i < steps; i += 1) {
      const t0 = i / steps;
      const t1 = (i + 1) / steps;
      const mx = x1 + dx * ((t0 + t1) * 0.5);
      const mz = z1 + dz * ((t0 + t1) * 0.5);
      if (gapPredicate && gapPredicate(mx, mz)) continue;

      const px0 = x1 + dx * t0;
      const pz0 = z1 + dz * t0;
      const segLen = len / steps;
      segments.push({
        postX: px0,
        postZ: pz0,
        midX: mx,
        midZ: mz,
        segLen,
        rotY: angle + Math.PI / 2,
      });
    }
  };

  // North edge
  addEdge(-halfW, -halfD, halfW, -halfD);
  // East edge
  addEdge(halfW, -halfD, halfW, halfD);
  // South edge (leave opening for South Admin Gate around x = 0)
  addEdge(halfW, halfD, -halfW, halfD, (mx) => Math.abs(mx) < 16);
  // West edge (leave opening for West Logistics Gate around z = 0)
  addEdge(-halfW, halfD, -halfW, -halfD, (_mx, mz) => Math.abs(mz) < 16);

  const postGeo = new THREE.BoxGeometry(0.32, 2.3, 0.32);
  const postMat = new THREE.MeshStandardMaterial({
    color: 0x374151,
    roughness: 0.45,
    metalness: 0.65,
  });
  const postsInst = new THREE.InstancedMesh(postGeo, postMat, segments.length);
  postsInst.name = 'PerimeterFencePosts';

  const panelGeo = new THREE.BoxGeometry(1, 1.85, 0.08);
  const panelMat = new THREE.MeshStandardMaterial({
    color: 0x4b5563,
    roughness: 0.5,
    metalness: 0.55,
    transparent: true,
    opacity: 0.72,
  });
  const panelsInst = new THREE.InstancedMesh(panelGeo, panelMat, segments.length);
  panelsInst.name = 'PerimeterFencePanels';

  const dummy = new THREE.Object3D();
  segments.forEach((seg, i) => {
    dummy.position.set(seg.postX, 1.1, seg.postZ);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    postsInst.setMatrixAt(i, dummy.matrix);

    dummy.position.set(seg.midX, 1.05, seg.midZ);
    dummy.rotation.set(0, seg.rotY, 0);
    dummy.scale.set(seg.segLen, 1, 1);
    dummy.updateMatrix();
    panelsInst.setMatrixAt(i, dummy.matrix);
  });

  postsInst.instanceMatrix.needsUpdate = true;
  panelsInst.instanceMatrix.needsUpdate = true;

  group.add(postsInst);
  group.add(panelsInst);
}

/**
 * Builds the 350ha Gigafactory terrain, ecological greenbelts, canal & retention ponds,
 * perimeter security fence, and 24 interactive plot pads.
 *
 * @param {THREE.Scene} [scene]
 * @param {Array|Object} [buildingsSpec]
 * @returns {{ group: THREE.Group, plotMeshes: THREE.Mesh[], updateEarthwork: Function }}
 */
export function buildGigafactoryTerrain(scene, buildingsSpec) {
  const buildings = Array.isArray(buildingsSpec)
    ? buildingsSpec
    : Array.isArray(buildingsSpec?.buildings)
      ? buildingsSpec.buildings
      : getAllBuildingsSpec();

  const group = new THREE.Group();
  group.name = 'GigafactoryTerrainGroup';

  buildEcologicalEnvironment(group);
  buildPerimeterSecurityFence(group);

  // 24 Plot Pads (1 InstancedMesh for rendering + 24 invisible raycast hit Meshes)
  const plotCount = buildings.length;
  const padGeo = new THREE.BoxGeometry(1, 0.14, 1);
  const padMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.9,
    metalness: 0.04,
  });
  const plotPadsInst = new THREE.InstancedMesh(padGeo, padMat, plotCount);
  plotPadsInst.receiveShadow = true;
  plotPadsInst.name = 'GigafactoryPlotPads';
  group.add(plotPadsInst);

  // Excavated Pit rim/recess InstancedMesh for basement buildings (F02, UT04)
  const pitBuildings = buildings.filter(
    (b) => EXCAVATED_PIT_IDS.has(b.id) || (b.bounds_m?.basement_z ?? 0) < 0
  );
  const pitGeo = new THREE.BoxGeometry(1, 0.45, 1);
  const pitMat = new THREE.MeshStandardMaterial({
    color: 0x4a3828,
    roughness: 0.95,
    metalness: 0.02,
  });
  const pitInst =
    pitBuildings.length > 0
      ? new THREE.InstancedMesh(pitGeo, pitMat, pitBuildings.length)
      : null;
  if (pitInst) {
    pitInst.name = 'ExcavatedBasementPits';
    group.add(pitInst);
  }

  // Survey Stakes (4 corners per plot, red-white striped)
  const stakeGeo = buildSurveyStakeGeometry();
  const stakeMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.6,
    metalness: 0.1,
  });
  const stakesInst = new THREE.InstancedMesh(stakeGeo, stakeMat, plotCount * 4);
  stakesInst.name = 'PlotSurveyStakes';
  group.add(stakesInst);

  // Green Construction Hoarding (4 perimeter walls per plot)
  const hoardingGeo = new THREE.BoxGeometry(1, 1.15, 0.22);
  const hoardingMat = new THREE.MeshStandardMaterial({
    color: 0x1b7a43,
    roughness: 0.72,
    metalness: 0.15,
  });
  const hoardingInst = new THREE.InstancedMesh(hoardingGeo, hoardingMat, plotCount * 4);
  hoardingInst.name = 'PlotConstructionHoarding';
  group.add(hoardingInst);

  // Floating Canvas-Texture Zone Signs (2 draw calls total: boards + poles)
  const { signsMesh, polesMesh } = buildZoneSignsMeshes(buildings);
  group.add(signsMesh);
  group.add(polesMesh);

  // Invisible raycast hit meshes for clicking individual plots (0 draw calls)
  const invisibleHitMat = new THREE.MeshBasicMaterial({ visible: false });
  const plotMeshes = [];
  const plotEntries = [];

  buildings.forEach((b, index) => {
    const bounds = b.bounds3JS || bpBoundsTo3JS(b.bounds_m);

    const hitGeo = new THREE.PlaneGeometry(bounds.widthX, bounds.depthZ);
    hitGeo.rotateX(-Math.PI / 2);
    const hitMesh = new THREE.Mesh(hitGeo, invisibleHitMat);
    hitMesh.position.set(bounds.centerX, 0.08, bounds.centerZ);
    hitMesh.name = `plot_${b.id}`;
    hitMesh.userData = {
      isGigafactoryPlot: true,
      buildingId: b.id,
      buildingSpec: b,
    };

    group.add(hitMesh);
    plotMeshes.push(hitMesh);

    const pitIndex = pitBuildings.findIndex((pb) => pb.id === b.id);
    plotEntries.push({
      building: b,
      bounds,
      index,
      pitIndex,
      hasBasement: pitIndex !== -1,
    });
  });

  const handle = {
    group,
    plotMeshes,
    plotPadsInst,
    pitInst,
    stakesInst,
    hoardingInst,
    plotEntries,
    updateEarthwork(currentMonth, timelineController) {
      const state =
        timelineController && typeof timelineController === 'object'
          ? { currentMonth, controller: timelineController }
          : currentMonth;
      updateTerrainEarthworkByMonth(handle, state);
    },
  };

  group.userData.__terrainHandle = handle;

  // Initialize at Month 0 (Stage 0 earthwork & stakes)
  updateTerrainEarthworkByMonth(handle, 0);

  if (scene && typeof scene.add === 'function') {
    scene.add(group);
  }

  return handle;
}

function resolveBuildingStage(buildingId, currentMonth, timelineState) {
  if (timelineState && typeof timelineState === 'object') {
    if (typeof timelineState.getBuildingStage === 'function') {
      return timelineState.getBuildingStage(buildingId);
    }
    if (timelineState.controller && typeof timelineState.controller.getBuildingStage === 'function') {
      return timelineState.controller.getBuildingStage(buildingId);
    }
    const overrideMap =
      timelineState.buildingOverrides || timelineState.buildingStages || null;
    if (overrideMap && overrideMap[buildingId] !== undefined) {
      const val = overrideMap[buildingId];
      if (typeof val === 'number') {
        return { stageIndex: val, stageProgress: 1 };
      }
      if (val && typeof val.stageIndex === 'number') {
        return val;
      }
    }
  }
  return getBuildingStageAtMonth(buildingId, currentMonth);
}

/**
 * Transitions the 24 plot pads from Stage 0 sandy earthwork -> excavated pit (F02/UT04)
 * -> clean concrete slab when stageIndex >= 1.
 *
 * @param {Object|THREE.Group} terrainHandle
 * @param {number|Object} timelineState
 */
export function updateTerrainEarthworkByMonth(terrainHandle, timelineState = 0) {
  const handle =
    terrainHandle?.group?.userData?.__terrainHandle ||
    terrainHandle?.userData?.__terrainHandle ||
    terrainHandle;

  if (!handle || !handle.plotPadsInst || !handle.plotEntries) return;

  const currentMonth =
    typeof timelineState === 'number'
      ? timelineState
      : Number(timelineState?.currentMonth) || 0;

  const { plotPadsInst, pitInst, stakesInst, hoardingInst, plotEntries } = handle;
  const dummy = new THREE.Object3D();

  plotEntries.forEach(({ building, bounds, index, pitIndex, hasBasement }) => {
    const stage = resolveBuildingStage(building.id, currentMonth, timelineState);
    const stageIndex = stage?.stageIndex ?? 0;
    const stageProgress = stage?.stageProgress ?? 0;

    const isSurvey = stageIndex === 0;
    const isExcavating =
      hasBasement &&
      ((stageIndex === 0 && stageProgress >= 0.35) ||
        (stageIndex === 1 && stageProgress < 0.45));

    // 1. Update Plot Pad color & elevation
    let padY = 0.02;
    if (stageIndex >= 1 && !isExcavating) {
      plotPadsInst.setColorAt(index, COLOR_CONCRETE_SLAB);
      padY = 0.03;
    } else if (isExcavating) {
      plotPadsInst.setColorAt(index, COLOR_EXCAVATED_PIT);
      padY = -0.18;
    } else {
      plotPadsInst.setColorAt(index, COLOR_SANDY_EARTH);
      padY = 0.01;
    }

    dummy.position.set(bounds.centerX, padY, bounds.centerZ);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(bounds.widthX, 1, bounds.depthZ);
    dummy.updateMatrix();
    plotPadsInst.setMatrixAt(index, dummy.matrix);

    // 2. Update Excavated Pit recess for F02 & UT04
    if (pitInst && pitIndex !== -1) {
      if (isExcavating) {
        dummy.position.set(bounds.centerX, -0.32, bounds.centerZ);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(bounds.widthX * 0.88, 1, bounds.depthZ * 0.88);
      } else {
        dummy.position.set(bounds.centerX, -10, bounds.centerZ);
        dummy.scale.set(0, 0, 0);
      }
      dummy.updateMatrix();
      pitInst.setMatrixAt(pitIndex, dummy.matrix);
    }

    // 3. Update 4 corner Survey Stakes (visible in Stage 0)
    const corners = [
      [bounds.minX + 0.5, bounds.minZ + 0.5],
      [bounds.maxX - 0.5, bounds.minZ + 0.5],
      [bounds.maxX - 0.5, bounds.maxZ - 0.5],
      [bounds.minX + 0.5, bounds.maxZ - 0.5],
    ];
    corners.forEach(([cx, cz], cIdx) => {
      const stakeIdx = index * 4 + cIdx;
      if (isSurvey) {
        dummy.position.set(cx, 0.72, cz);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
      } else {
        dummy.position.set(cx, -10, cz);
        dummy.scale.set(0, 0, 0);
      }
      dummy.updateMatrix();
      stakesInst.setMatrixAt(stakeIdx, dummy.matrix);
    });

    // 4. Update 4 Green Construction Hoarding walls (visible in Stage 0)
    const walls = [
      { x: bounds.centerX, z: bounds.minZ - 0.3, len: bounds.widthX, rotY: 0 },
      { x: bounds.centerX, z: bounds.maxZ + 0.3, len: bounds.widthX, rotY: 0 },
      { x: bounds.minX - 0.3, z: bounds.centerZ, len: bounds.depthZ, rotY: Math.PI / 2 },
      { x: bounds.maxX + 0.3, z: bounds.centerZ, len: bounds.depthZ, rotY: Math.PI / 2 },
    ];
    walls.forEach((w, wIdx) => {
      const wallIdx = index * 4 + wIdx;
      if (isSurvey) {
        dummy.position.set(w.x, 0.56, w.z);
        dummy.rotation.set(0, w.rotY, 0);
        dummy.scale.set(w.len, 1, 1);
      } else {
        dummy.position.set(w.x, -10, w.z);
        dummy.scale.set(0, 0, 0);
      }
      dummy.updateMatrix();
      hoardingInst.setMatrixAt(wallIdx, dummy.matrix);
    });
  });

  plotPadsInst.instanceMatrix.needsUpdate = true;
  if (plotPadsInst.instanceColor) plotPadsInst.instanceColor.needsUpdate = true;
  if (pitInst) pitInst.instanceMatrix.needsUpdate = true;
  stakesInst.instanceMatrix.needsUpdate = true;
  hoardingInst.instanceMatrix.needsUpdate = true;
}
