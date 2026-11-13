import * as THREE from 'three';
import {
  WORLD_SCALE,
  HEIGHT_SCALE,
  getBuildingSpecById,
  getBuildingStageAtMonth,
} from '../config/masterSpecLoader.js';
import { createStagedBuildingController } from './stageRenderer.js';

/**
 * North Energy & Battery Cluster Builder (TASK-010)
 * Builds and manages 5-stage EPC controllers + custom Stage 4 architectures for:
 *   - F06A: 40GWh Battery Cell Gigafactory (700m, 2-story, 28 dry-room AHUs, NMP towers, East high-bay)
 *   - F06B: Battery Pack CTB Assembly (cleanroom ribbon, #8E24AA)
 *   - F07:  E-Axle & 800V SiC Powertrain (2-story, floor-2 cleanroom glass ribbon, #4527A0)
 *   - UT01: 220kV Open-Air Substation & 100MWh BESS (gantry switchyard, 3x 125MVA transformers, 40 BESS containers)
 *   - UT02: CUB Chiller Plant (2-story plant + 12 cooling towers with spinning fans)
 *   - UT03: Industrial Gases Plant (8 tall silver cryogenic tanks N2/Ar/CO2/He + vaporizer skids)
 *   - UT04: ZLD Water Treatment Plant (6 circular clarifiers with rotating scraper bridges + RO building)
 */

const NORTH_BUILDING_IDS = Object.freeze([
  'F06A',
  'F06B',
  'F07',
  'UT01',
  'UT02',
  'UT03',
  'UT04',
]);

const UNIT_BOX_GEO = new THREE.BoxGeometry(1, 1, 1);
const UNIT_CYL_GEO = new THREE.CylinderGeometry(0.5, 0.5, 1, 12);
const _dummy = new THREE.Object3D();

const MAT = {
  plinth: new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.88, metalness: 0.06 }),
  cladding: new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.52, metalness: 0.24 }),
  claddingDark: new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.55, metalness: 0.35 }),
  roofDeck: new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.72, metalness: 0.2 }),
  solar: new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.22, metalness: 0.58 }),
  ahu: new THREE.MeshStandardMaterial({ color: 0xdbe4ee, roughness: 0.38, metalness: 0.52 }),
  ahuDark: new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.48, metalness: 0.6 }),
  stainless: new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.22, metalness: 0.86 }),
  cryoSilver: new THREE.MeshStandardMaterial({ color: 0xe5e7eb, roughness: 0.24, metalness: 0.82 }),
  steelGalv: new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.4, metalness: 0.75 }),
  copperBus: new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.35, metalness: 0.8 }),
  insulator: new THREE.MeshStandardMaterial({ color: 0xe0f2fe, roughness: 0.25, metalness: 0.15 }),
  transformer: new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.5, metalness: 0.55 }),
  bessWhite: new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.42, metalness: 0.2 }),
  bessYellow: new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.38, metalness: 0.28 }),
  concretePad: new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.9, metalness: 0.05 }),
  concreteTank: new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.82, metalness: 0.08 }),
  waterTeal: new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    roughness: 0.14,
    metalness: 0.18,
    transparent: true,
    opacity: 0.85,
  }),
  dockDoor: new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.45 }),
  cleanroomGlass: new THREE.MeshStandardMaterial({
    color: 0x93c5fd,
    emissive: 0x1e3a8a,
    emissiveIntensity: 0.28,
    roughness: 0.12,
    metalness: 0.22,
    transparent: true,
    opacity: 0.72,
  }),
  beaconRed: new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xdc2626,
    emissiveIntensity: 1.5,
    roughness: 0.2,
  }),
};

function makeAccentMat(hex) {
  return new THREE.MeshStandardMaterial({
    color: hex,
    roughness: 0.4,
    metalness: 0.32,
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

function addSouthLedSign(group, buildingId, accentHex, widthX, heightY, depthZ, zOverride) {
  const tex = createLedSignTexture(buildingId, accentHex);
  if (!tex) return;
  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    emissive: 0xffffff,
    emissiveMap: tex,
    emissiveIntensity: 0.78,
    roughness: 0.3,
  });
  const signW = Math.min(7.5, Math.max(3.2, widthX * 0.28));
  const signH = signW * 0.25;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(signW, signH), mat);
  sign.position.set(
    0,
    Math.max(1.2, Math.min(heightY - 0.4, heightY * 0.82)),
    (zOverride ?? depthZ * 0.5) + 0.16
  );
  group.add(sign);
}

function addSolarArray(group, minX, maxX, minZ, maxZ, yPos, maxPanels = 64) {
  const spanX = maxX - minX;
  const spanZ = maxZ - minZ;
  const panelW = 3.2;
  const panelD = 1.8;
  const cols = Math.max(1, Math.floor(spanX / (panelW + 1.0)));
  const rows = Math.max(1, Math.floor(spanZ / (panelD + 1.1)));
  const count = Math.min(maxPanels, cols * rows);
  if (count <= 0) return;

  const inst = new THREE.InstancedMesh(UNIT_BOX_GEO, MAT.solar, count);
  inst.userData.isRoof = true;
  let idx = 0;
  for (let r = 0; r < rows && idx < count; r++) {
    for (let c = 0; c < cols && idx < count; c++) {
      const px = minX + (c + 0.5) * (spanX / cols);
      const pz = minZ + (r + 0.5) * (spanZ / rows);
      _dummy.position.set(px, yPos, pz);
      _dummy.rotation.set(0.18, 0, 0);
      _dummy.scale.set(panelW, 0.08, panelD);
      _dummy.updateMatrix();
      inst.setMatrixAt(idx++, _dummy.matrix);
    }
  }
  inst.instanceMatrix.needsUpdate = true;
  group.add(inst);
}

function getDims(spec) {
  const b = spec.bounds3JS;
  return {
    widthX: b.widthX,
    depthZ: b.depthZ,
    heightY: Math.max(1.8, b.heightY),
  };
}

/**
 * F06A: 40GWh Battery Cell Gigafactory (700m, 2-story, #6A1B9A)
 * - 28 Munters Dry-Room AHU units on roof (InstancedMesh)
 * - NMP solvent recovery distillation towers on West
 * - High-bay formation & aging wing on East
 */
function buildF06AExterior(spec) {
  const { widthX, depthZ, heightY } = getDims(spec); // 175 x 80 x 6.3
  const accentMat = makeAccentMat(spec.color_hex || '#6A1B9A');
  const g = new THREE.Group();
  g.name = 'Completed_F06A';

  // Main 2-story West+Center body (70% width) and taller East High-Bay Formation wing (30% width)
  const mainW = widthX * 0.70;
  const highBayW = widthX * 0.30;
  const highBayH = heightY * 1.28; // ~23m equiv
  const mainCenterX = -widthX * 0.5 + mainW * 0.5;
  const highBayCenterX = widthX * 0.5 - highBayW * 0.5;

  // Plinth base across full footprint
  const plinthH = 0.75;
  const plinth = new THREE.Mesh(
    new THREE.BoxGeometry(widthX, plinthH, depthZ),
    MAT.plinth
  );
  plinth.position.y = plinthH * 0.5;
  plinth.castShadow = true;
  plinth.receiveShadow = true;
  plinth.userData.isExteriorWall = true;
  g.add(plinth);

  // Main 2-story shell
  const mainShellMat = MAT.cladding.clone();
  const mainShell = new THREE.Mesh(
    new THREE.BoxGeometry(mainW * 0.995, heightY - plinthH, depthZ * 0.99),
    mainShellMat
  );
  mainShell.position.set(mainCenterX, plinthH + (heightY - plinthH) * 0.5, 0);
  mainShell.castShadow = true;
  mainShell.receiveShadow = true;
  mainShell.userData.isExteriorWall = true;
  mainShell.userData.originalOpacity = mainShellMat.opacity;
  mainShell.userData.originalTransparent = mainShellMat.transparent;
  g.add(mainShell);

  // East High-Bay Formation wing
  const highBayMat = MAT.cladding.clone();
  const highBayShell = new THREE.Mesh(
    new THREE.BoxGeometry(highBayW * 0.99, highBayH - plinthH, depthZ * 0.99),
    highBayMat
  );
  highBayShell.position.set(highBayCenterX, plinthH + (highBayH - plinthH) * 0.5, 0);
  highBayShell.castShadow = true;
  highBayShell.receiveShadow = true;
  highBayShell.userData.isExteriorWall = true;
  highBayShell.userData.originalOpacity = highBayMat.opacity;
  highBayShell.userData.originalTransparent = highBayMat.transparent;
  g.add(highBayShell);

  // Cleanroom glass ribbons (Floor 1 & Floor 2 on main body + upper ribbon on High-Bay)
  const glass1 = new THREE.Mesh(
    new THREE.BoxGeometry(mainW * 1.002, 0.7, depthZ * 1.002),
    MAT.cleanroomGlass
  );
  glass1.position.set(mainCenterX, heightY * 0.36, 0);
  glass1.userData.isExteriorWall = true;
  g.add(glass1);

  const glass2 = new THREE.Mesh(
    new THREE.BoxGeometry(widthX * 1.002, 0.78, depthZ * 1.002),
    MAT.cleanroomGlass
  );
  glass2.position.set(0, heightY * 0.74, 0);
  glass2.userData.isExteriorWall = true;
  g.add(glass2);

  // #6A1B9A Accent fascia bands
  const mainBand = new THREE.Mesh(
    new THREE.BoxGeometry(mainW * 1.004, 0.85, depthZ * 1.004),
    accentMat
  );
  mainBand.position.set(mainCenterX, heightY - 0.45, 0);
  mainBand.userData.isExteriorWall = true;
  g.add(mainBand);

  const highBand = new THREE.Mesh(
    new THREE.BoxGeometry(highBayW * 1.005, 0.95, depthZ * 1.004),
    accentMat
  );
  highBand.position.set(highBayCenterX, highBayH - 0.5, 0);
  highBand.userData.isExteriorWall = true;
  g.add(highBand);

  // Roof decks
  const mainRoof = new THREE.Mesh(
    new THREE.BoxGeometry(mainW * 1.006, 0.25, depthZ * 1.008),
    MAT.roofDeck
  );
  mainRoof.position.set(mainCenterX, heightY + 0.12, 0);
  mainRoof.receiveShadow = true;
  mainRoof.userData.isRoof = true;
  g.add(mainRoof);

  const highRoof = new THREE.Mesh(
    new THREE.BoxGeometry(highBayW * 1.008, 0.25, depthZ * 1.008),
    MAT.roofDeck
  );
  highRoof.position.set(highBayCenterX, highBayH + 0.12, 0);
  highRoof.receiveShadow = true;
  highRoof.userData.isRoof = true;
  g.add(highRoof);

  // 28 Dry-Room Munters AHU Units on Main Roof (2 rows x 14 columns via InstancedMesh)
  const ahuCount = 28;
  const ahuInst = new THREE.InstancedMesh(UNIT_BOX_GEO, MAT.ahu, ahuCount);
  ahuInst.castShadow = true;
  ahuInst.userData.isRoof = true;
  const ahuStartX = mainCenterX - mainW * 0.42;
  const ahuEndX = mainCenterX + mainW * 0.42;
  let aIdx = 0;
  for (let row = 0; row < 2; row++) {
    const az = row === 0 ? -depthZ * 0.22 : depthZ * 0.22;
    for (let col = 0; col < 14; col++) {
      const ax = ahuStartX + (col / 13) * (ahuEndX - ahuStartX);
      _dummy.position.set(ax, heightY + 0.95, az);
      _dummy.rotation.set(0, 0, 0);
      _dummy.scale.set(4.2, 1.45, 6.2);
      _dummy.updateMatrix();
      ahuInst.setMatrixAt(aIdx++, _dummy.matrix);
    }
  }
  ahuInst.instanceMatrix.needsUpdate = true;
  g.add(ahuInst);

  // Rooftop Solar PV on East High-Bay roof
  addSolarArray(
    g,
    highBayCenterX - highBayW * 0.4,
    highBayCenterX + highBayW * 0.4,
    -depthZ * 0.38,
    depthZ * 0.38,
    highBayH + 0.42,
    40
  );

  // NMP Solvent Recovery Distillation Towers on West end (26m equiv = ~9.1 units)
  const nmpGroup = new THREE.Group();
  nmpGroup.name = 'F06A_NMP_Recovery_Towers';
  const towerH = 26 * HEIGHT_SCALE;
  const towerBaseX = -widthX * 0.5 - 2.6;
  const towerZPositions = [-depthZ * 0.25, -depthZ * 0.08, depthZ * 0.09, depthZ * 0.26];

  towerZPositions.forEach((tz, i) => {
    const r = i % 2 === 0 ? 1.15 : 0.9;
    const h = i % 2 === 0 ? towerH : towerH * 0.82;
    const tower = new THREE.Mesh(
      new THREE.CylinderGeometry(r, r * 1.05, h, 14),
      MAT.stainless
    );
    tower.position.set(towerBaseX, h * 0.5, tz);
    tower.castShadow = true;
    nmpGroup.add(tower);

    // Process platform ring
    const ring = new THREE.Mesh(
      new THREE.CylinderGeometry(r * 1.45, r * 1.45, 0.22, 12),
      accentMat
    );
    ring.position.set(towerBaseX, h * 0.65, tz);
    nmpGroup.add(ring);
  });

  // Overhead pipe bridge connecting NMP towers to F06A West wall
  const pipeBridge = new THREE.Mesh(
    new THREE.BoxGeometry(5.4, 0.7, depthZ * 0.56),
    MAT.steelGalv
  );
  pipeBridge.position.set(towerBaseX + 2.5, heightY * 0.72, 0);
  nmpGroup.add(pipeBridge);
  g.add(nmpGroup);

  // LED Sign & Aviation Beacon
  addSouthLedSign(g, 'F06A', spec.color_hex, widthX, heightY, depthZ);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 8), MAT.beaconRed);
  beacon.position.set(highBayCenterX + highBayW * 0.42, highBayH + 0.65, depthZ * 0.42);
  beacon.userData.isRoof = true;
  g.add(beacon);

  return g;
}

/**
 * F06B: Battery Pack CTB Assembly (#8E24AA)
 */
function buildF06BExterior(spec) {
  const { widthX, depthZ, heightY } = getDims(spec); // 100 x 80 x 5.25
  const accentMat = makeAccentMat(spec.color_hex || '#8E24AA');
  const g = new THREE.Group();
  g.name = 'Completed_F06B';

  const plinthH = 0.7;
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(widthX, plinthH, depthZ), MAT.plinth);
  plinth.position.y = plinthH * 0.5;
  plinth.castShadow = true;
  plinth.receiveShadow = true;
  plinth.userData.isExteriorWall = true;
  g.add(plinth);

  const shellMat = MAT.cladding.clone();
  const shell = new THREE.Mesh(
    new THREE.BoxGeometry(widthX * 0.99, heightY - plinthH, depthZ * 0.99),
    shellMat
  );
  shell.position.y = plinthH + (heightY - plinthH) * 0.5;
  shell.castShadow = true;
  shell.receiveShadow = true;
  shell.userData.isExteriorWall = true;
  shell.userData.originalOpacity = shellMat.opacity;
  shell.userData.originalTransparent = shellMat.transparent;
  g.add(shell);

  // Cleanroom glass ribbon
  const glassRibbon = new THREE.Mesh(
    new THREE.BoxGeometry(widthX * 1.003, 0.85, depthZ * 1.003),
    MAT.cleanroomGlass
  );
  glassRibbon.position.y = heightY * 0.68;
  glassRibbon.userData.isExteriorWall = true;
  g.add(glassRibbon);

  // #8E24AA Accent fascia
  const band = new THREE.Mesh(
    new THREE.BoxGeometry(widthX * 1.005, 0.82, depthZ * 1.005),
    accentMat
  );
  band.position.y = heightY - 0.42;
  band.userData.isExteriorWall = true;
  g.add(band);

  // Skybridge SB-03 departure portal on South facade
  const portal = new THREE.Mesh(new THREE.BoxGeometry(4.5, 2.4, 1.4), accentMat);
  portal.position.set(-widthX * 0.15, heightY * 0.62, depthZ * 0.5 + 0.5);
  g.add(portal);

  // Roof deck + Solar + Cleanroom AHUs
  const roof = new THREE.Mesh(new THREE.BoxGeometry(widthX * 1.01, 0.24, depthZ * 1.01), MAT.roofDeck);
  roof.position.y = heightY + 0.12;
  roof.receiveShadow = true;
  roof.userData.isRoof = true;
  g.add(roof);

  addSolarArray(g, -widthX * 0.42, widthX * 0.42, -depthZ * 0.15, depthZ * 0.38, heightY + 0.4, 48);

  const ahuInst = new THREE.InstancedMesh(UNIT_BOX_GEO, MAT.ahu, 8);
  ahuInst.userData.isRoof = true;
  for (let i = 0; i < 8; i++) {
    const ax = -widthX * 0.38 + (i / 7) * (widthX * 0.76);
    _dummy.position.set(ax, heightY + 0.85, -depthZ * 0.3);
    _dummy.rotation.set(0, 0, 0);
    _dummy.scale.set(4.0, 1.3, 3.2);
    _dummy.updateMatrix();
    ahuInst.setMatrixAt(i, _dummy.matrix);
  }
  ahuInst.instanceMatrix.needsUpdate = true;
  g.add(ahuInst);

  addSouthLedSign(g, 'F06B', spec.color_hex, widthX, heightY, depthZ);
  return g;
}

/**
 * F07: E-Axle & 800V SiC Powertrain (2-story, floor-2 cleanroom glass ribbon, #4527A0)
 */
function buildF07Exterior(spec) {
  const { widthX, depthZ, heightY } = getDims(spec); // 100 x 80 x 5.25
  const accentMat = makeAccentMat(spec.color_hex || '#4527A0');
  const g = new THREE.Group();
  g.name = 'Completed_F07';

  const plinthH = 0.7;
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(widthX, plinthH, depthZ), MAT.plinth);
  plinth.position.y = plinthH * 0.5;
  plinth.castShadow = true;
  plinth.receiveShadow = true;
  plinth.userData.isExteriorWall = true;
  g.add(plinth);

  const shellMat = MAT.cladding.clone();
  const shell = new THREE.Mesh(
    new THREE.BoxGeometry(widthX * 0.99, heightY - plinthH, depthZ * 0.99),
    shellMat
  );
  shell.position.y = plinthH + (heightY - plinthH) * 0.5;
  shell.castShadow = true;
  shell.receiveShadow = true;
  shell.userData.isExteriorWall = true;
  shell.userData.originalOpacity = shellMat.opacity;
  shell.userData.originalTransparent = shellMat.transparent;
  g.add(shell);

  // Floor 1 / Floor 2 divider belt & prominent Floor 2 ISO-6 SMT cleanroom glass ribbon
  const midBelt = new THREE.Mesh(
    new THREE.BoxGeometry(widthX * 1.004, 0.35, depthZ * 1.004),
    MAT.claddingDark
  );
  midBelt.position.y = heightY * 0.48;
  midBelt.userData.isExteriorWall = true;
  g.add(midBelt);

  const floor2Glass = new THREE.Mesh(
    new THREE.BoxGeometry(widthX * 1.003, heightY * 0.28, depthZ * 1.003),
    MAT.cleanroomGlass
  );
  floor2Glass.position.y = heightY * 0.68;
  floor2Glass.userData.isExteriorWall = true;
  g.add(floor2Glass);

  // #4527A0 Deep Indigo-Purple crown fascia
  const band = new THREE.Mesh(
    new THREE.BoxGeometry(widthX * 1.006, 0.78, depthZ * 1.006),
    accentMat
  );
  band.position.y = heightY - 0.38;
  band.userData.isExteriorWall = true;
  g.add(band);

  // Skybridge SB-04 departure portal on South facade
  const portal = new THREE.Mesh(new THREE.BoxGeometry(4.5, 2.4, 1.4), accentMat);
  portal.position.set(0, heightY * 0.62, depthZ * 0.5 + 0.5);
  g.add(portal);

  // Roof + Solar + Cleanroom AHUs
  const roof = new THREE.Mesh(new THREE.BoxGeometry(widthX * 1.01, 0.24, depthZ * 1.01), MAT.roofDeck);
  roof.position.y = heightY + 0.12;
  roof.receiveShadow = true;
  roof.userData.isRoof = true;
  g.add(roof);

  addSolarArray(g, -widthX * 0.42, widthX * 0.42, -depthZ * 0.12, depthZ * 0.38, heightY + 0.4, 48);

  const ahuInst = new THREE.InstancedMesh(UNIT_BOX_GEO, MAT.ahu, 10);
  ahuInst.userData.isRoof = true;
  for (let i = 0; i < 10; i++) {
    const ax = -widthX * 0.4 + (i / 9) * (widthX * 0.8);
    _dummy.position.set(ax, heightY + 0.82, -depthZ * 0.3);
    _dummy.rotation.set(0, 0, 0);
    _dummy.scale.set(3.4, 1.25, 3.0);
    _dummy.updateMatrix();
    ahuInst.setMatrixAt(i, _dummy.matrix);
  }
  ahuInst.instanceMatrix.needsUpdate = true;
  g.add(ahuInst);

  addSouthLedSign(g, 'F07', spec.color_hex, widthX, heightY, depthZ);
  return g;
}

/**
 * UT01: Open-Air 220kV Substation & 100MWh BESS (#FBC02D)
 * - Open-air 220kV steel gantry switchyard
 * - 3x 125MVA transformers with radiator fins & bushings
 * - 40 white-yellow BESS containers (InstancedMesh)
 */
function buildUT01Exterior(spec) {
  const { widthX, depthZ } = getDims(spec); // 60 x 67.5
  const accentMat = makeAccentMat(spec.color_hex || '#FBC02D');
  const g = new THREE.Group();
  g.name = 'Completed_UT01';

  // Concrete switchyard pad + perimeter safety curb
  const pad = new THREE.Mesh(new THREE.BoxGeometry(widthX, 0.35, depthZ), MAT.concretePad);
  pad.position.y = 0.175;
  pad.receiveShadow = true;
  g.add(pad);

  // 1. Open-air 220kV Steel Gantry Switchyard (North half: z in [-depthZ*0.44 .. -depthZ*0.04])
  const gantryCols = new THREE.InstancedMesh(UNIT_BOX_GEO, MAT.steelGalv, 12);
  const gantryBeams = new THREE.InstancedMesh(UNIT_BOX_GEO, MAT.steelGalv, 9);
  const insulators = new THREE.InstancedMesh(UNIT_CYL_GEO, MAT.insulator, 18);

  const rowZs = [-depthZ * 0.40, -depthZ * 0.24, -depthZ * 0.08];
  const colXs = [-widthX * 0.40, -widthX * 0.14, widthX * 0.14, widthX * 0.40];
  const gantryH = 4.6;

  let cIdx = 0;
  let bIdx = 0;
  let insIdx = 0;
  rowZs.forEach((rz) => {
    colXs.forEach((cx) => {
      _dummy.position.set(cx, 0.35 + gantryH * 0.5, rz);
      _dummy.rotation.set(0, 0, 0);
      _dummy.scale.set(0.45, gantryH, 0.45);
      _dummy.updateMatrix();
      gantryCols.setMatrixAt(cIdx++, _dummy.matrix);
    });
    for (let s = 0; s < 3; s++) {
      const bx = (colXs[s] + colXs[s + 1]) * 0.5;
      const bw = colXs[s + 1] - colXs[s];
      _dummy.position.set(bx, 0.35 + gantryH - 0.3, rz);
      _dummy.rotation.set(0, 0, 0);
      _dummy.scale.set(bw, 0.38, 0.38);
      _dummy.updateMatrix();
      gantryBeams.setMatrixAt(bIdx++, _dummy.matrix);

      // 2 HV insulator strings per bay
      for (let p = 0; p < 2; p++) {
        _dummy.position.set(bx + (p === 0 ? -2.2 : 2.2), 0.35 + gantryH - 0.9, rz);
        _dummy.rotation.set(0, 0, 0);
        _dummy.scale.set(0.32, 0.9, 0.32);
        _dummy.updateMatrix();
        insulators.setMatrixAt(insIdx++, _dummy.matrix);
      }
    }
  });
  gantryCols.instanceMatrix.needsUpdate = true;
  gantryBeams.instanceMatrix.needsUpdate = true;
  insulators.instanceMatrix.needsUpdate = true;
  gantryCols.castShadow = true;
  g.add(gantryCols, gantryBeams, insulators);

  // Overhead busbar conductors connecting rows
  const busInst = new THREE.InstancedMesh(UNIT_CYL_GEO, MAT.copperBus, 6);
  for (let i = 0; i < 6; i++) {
    const bx = -widthX * 0.34 + i * (widthX * 0.136);
    _dummy.position.set(bx, 0.35 + gantryH - 0.2, -depthZ * 0.24);
    _dummy.rotation.set(Math.PI * 0.5, 0, 0);
    _dummy.scale.set(0.12, depthZ * 0.34, 0.12);
    _dummy.updateMatrix();
    busInst.setMatrixAt(i, _dummy.matrix);
  }
  busInst.instanceMatrix.needsUpdate = true;
  g.add(busInst);

  // 2. Three 125MVA Power Transformers (Center-West)
  for (let i = 0; i < 3; i++) {
    const tx = -widthX * 0.30 + i * (widthX * 0.22);
    const tz = depthZ * 0.05;
    const tGroup = new THREE.Group();
    tGroup.position.set(tx, 0.35, tz);

    const tank = new THREE.Mesh(new THREE.BoxGeometry(3.8, 2.5, 2.8), MAT.transformer);
    tank.position.y = 1.25;
    tank.castShadow = true;
    tGroup.add(tank);

    // Conservator drum on top
    const drum = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.45, 2.6, 10),
      MAT.ahu
    );
    drum.rotation.z = Math.PI * 0.5;
    drum.position.set(0, 2.85, -0.5);
    tGroup.add(drum);

    // 3 HV porcelain bushings
    for (let b = -1; b <= 1; b++) {
      const bush = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.2, 1.2, 8),
        MAT.insulator
      );
      bush.position.set(b * 0.9, 3.05, 0.5);
      tGroup.add(bush);
    }

    // Blast barrier wall
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.35, 2.8, 4.2), MAT.concreteTank);
    wall.position.set(2.8, 1.4, 0);
    tGroup.add(wall);
    g.add(tGroup);
  }

  // GIS Control & Relay Building (Center-East)
  const ctrl = new THREE.Mesh(new THREE.BoxGeometry(9.0, 2.8, 5.5), MAT.cladding);
  ctrl.position.set(widthX * 0.35, 0.35 + 1.4, depthZ * 0.05);
  ctrl.castShadow = true;
  g.add(ctrl);
  const ctrlBand = new THREE.Mesh(new THREE.BoxGeometry(9.1, 0.45, 5.6), accentMat);
  ctrlBand.position.set(widthX * 0.35, 0.35 + 2.6, depthZ * 0.05);
  g.add(ctrlBand);

  // 3. 40 White-Yellow BESS Containers (4 rows x 10 columns = 40 via InstancedMesh)
  const bessCount = 40;
  const bessBodyInst = new THREE.InstancedMesh(UNIT_BOX_GEO, MAT.bessWhite, bessCount);
  const bessStripeInst = new THREE.InstancedMesh(UNIT_BOX_GEO, MAT.bessYellow, bessCount);
  bessBodyInst.castShadow = true;

  let bContainerIdx = 0;
  for (let row = 0; row < 4; row++) {
    const bz = depthZ * 0.18 + row * 4.4;
    for (let col = 0; col < 10; col++) {
      const bx = -widthX * 0.42 + col * (widthX * 0.093);
      _dummy.position.set(bx, 0.35 + 0.72, bz);
      _dummy.rotation.set(0, 0, 0);
      _dummy.scale.set(4.2, 1.44, 2.1);
      _dummy.updateMatrix();
      bessBodyInst.setMatrixAt(bContainerIdx, _dummy.matrix);

      _dummy.position.set(bx, 0.35 + 1.38, bz);
      _dummy.scale.set(4.24, 0.24, 2.14);
      _dummy.updateMatrix();
      bessStripeInst.setMatrixAt(bContainerIdx, _dummy.matrix);
      bContainerIdx++;
    }
  }
  bessBodyInst.instanceMatrix.needsUpdate = true;
  bessStripeInst.instanceMatrix.needsUpdate = true;
  g.add(bessBodyInst, bessStripeInst);

  addSouthLedSign(g, 'UT01', spec.color_hex, widthX, 3.2, depthZ);
  return g;
}

/**
 * UT02: CUB Chiller Plant (#F9A825)
 * - 2-story plant building + 12 cooling towers with spinning fans (InstancedMesh)
 */
function buildUT02Exterior(spec, fanTracker) {
  const { widthX, depthZ, heightY } = getDims(spec); // 40 x 67.5 x 4.9
  const accentMat = makeAccentMat(spec.color_hex || '#F9A825');
  const g = new THREE.Group();
  g.name = 'Completed_UT02';

  // South 2-story plant building (55% depth)
  const plantD = depthZ * 0.54;
  const plantZ = depthZ * 0.5 - plantD * 0.5;

  const plinth = new THREE.Mesh(new THREE.BoxGeometry(widthX, 0.65, plantD), MAT.plinth);
  plinth.position.set(0, 0.325, plantZ);
  plinth.userData.isExteriorWall = true;
  g.add(plinth);

  const shellMat = MAT.cladding.clone();
  const shell = new THREE.Mesh(
    new THREE.BoxGeometry(widthX * 0.98, heightY - 0.65, plantD * 0.98),
    shellMat
  );
  shell.position.set(0, 0.65 + (heightY - 0.65) * 0.5, plantZ);
  shell.castShadow = true;
  shell.receiveShadow = true;
  shell.userData.isExteriorWall = true;
  shell.userData.originalOpacity = shellMat.opacity;
  shell.userData.originalTransparent = shellMat.transparent;
  g.add(shell);

  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(widthX * 0.995, 0.65, plantD * 0.995),
    MAT.cleanroomGlass
  );
  glass.position.set(0, heightY * 0.62, plantZ);
  glass.userData.isExteriorWall = true;
  g.add(glass);

  const band = new THREE.Mesh(
    new THREE.BoxGeometry(widthX * 1.005, 0.72, plantD * 1.005),
    accentMat
  );
  band.position.set(0, heightY - 0.36, plantZ);
  band.userData.isExteriorWall = true;
  g.add(band);

  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(widthX * 1.01, 0.22, plantD * 1.01),
    MAT.roofDeck
  );
  roof.position.set(0, heightY + 0.11, plantZ);
  roof.userData.isRoof = true;
  g.add(roof);

  // North Cooling Tower Yard: 12 Cooling Towers (2 columns x 6 rows)
  const ctDeckD = depthZ * 0.42;
  const ctDeckZ = -depthZ * 0.5 + ctDeckD * 0.5;
  const ctPad = new THREE.Mesh(new THREE.BoxGeometry(widthX * 0.96, 0.4, ctDeckD), MAT.concretePad);
  ctPad.position.set(0, 0.2, ctDeckZ);
  ctPad.receiveShadow = true;
  g.add(ctPad);

  const ctCount = 12;
  const ctBodyInst = new THREE.InstancedMesh(UNIT_BOX_GEO, MAT.ahu, ctCount);
  const ctShroudInst = new THREE.InstancedMesh(UNIT_CYL_GEO, MAT.ahuDark, ctCount);
  const ctFanInst = new THREE.InstancedMesh(UNIT_BOX_GEO, accentMat, ctCount * 2);
  ctBodyInst.castShadow = true;

  const fanCenters = [];
  let idx = 0;
  for (let row = 0; row < 6; row++) {
    const cz = -depthZ * 0.45 + row * (ctDeckD / 6.2) + 1.6;
    for (let col = 0; col < 2; col++) {
      const cx = col === 0 ? -widthX * 0.24 : widthX * 0.24;
      _dummy.position.set(cx, 0.4 + 1.4, cz);
      _dummy.rotation.set(0, 0, 0);
      _dummy.scale.set(6.4, 2.8, 3.6);
      _dummy.updateMatrix();
      ctBodyInst.setMatrixAt(idx, _dummy.matrix);

      _dummy.position.set(cx, 0.4 + 3.05, cz);
      _dummy.scale.set(2.8, 0.65, 2.8);
      _dummy.updateMatrix();
      ctShroudInst.setMatrixAt(idx, _dummy.matrix);

      fanCenters.push({ x: cx, y: 0.4 + 3.12, z: cz, phase: idx * 0.55 });
      idx++;
    }
  }
  ctBodyInst.instanceMatrix.needsUpdate = true;
  ctShroudInst.instanceMatrix.needsUpdate = true;
  g.add(ctBodyInst, ctShroudInst, ctFanInst);

  fanTracker.mesh = ctFanInst;
  fanTracker.centers = fanCenters;

  addSouthLedSign(g, 'UT02', spec.color_hex, widthX, heightY, depthZ);
  return g;
}

/**
 * UT03: Industrial Gases (N2, Ar, CO2, He) (#F57F17)
 * - 8 tall silver vertical cryogenic tanks (18m equiv) + vaporizer skids
 */
function buildUT03Exterior(spec) {
  const { widthX, depthZ } = getDims(spec); // 25 x 67.5
  const accentMat = makeAccentMat(spec.color_hex || '#F57F17');
  const g = new THREE.Group();
  g.name = 'Completed_UT03';

  const pad = new THREE.Mesh(new THREE.BoxGeometry(widthX, 0.35, depthZ), MAT.concretePad);
  pad.position.y = 0.175;
  pad.receiveShadow = true;
  g.add(pad);

  // 8 Tall Silver Vertical Cryogenic Tanks (2 cols x 4 rows)
  const tankH = 18 * HEIGHT_SCALE; // 6.3 3JS units
  const tankR = 2.05;
  const gasBandColors = [0x0284c7, 0x16a34a, 0x64748b, 0xf59e0b]; // N2, Ar, CO2, He

  for (let row = 0; row < 4; row++) {
    const tz = -depthZ * 0.35 + row * (depthZ * 0.16);
    const bandMat = makeAccentMat(gasBandColors[row]);
    for (let col = 0; col < 2; col++) {
      const tx = col === 0 ? -widthX * 0.24 : widthX * 0.24;

      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(tankR, tankR, tankH, 16),
        MAT.cryoSilver
      );
      body.position.set(tx, 0.75 + tankH * 0.5, tz);
      body.castShadow = true;
      g.add(body);

      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(tankR, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.5),
        MAT.cryoSilver
      );
      dome.position.set(tx, 0.75 + tankH, tz);
      g.add(dome);

      const skirt = new THREE.Mesh(
        new THREE.CylinderGeometry(tankR * 0.88, tankR * 0.96, 0.75, 12),
        MAT.steelGalv
      );
      skirt.position.set(tx, 0.35 + 0.375, tz);
      g.add(skirt);

      const gasBand = new THREE.Mesh(
        new THREE.CylinderGeometry(tankR * 1.02, tankR * 1.02, 0.42, 16),
        bandMat
      );
      gasBand.position.set(tx, 0.75 + tankH * 0.78, tz);
      g.add(gasBand);
    }
  }

  // Ambient Vaporizer Skids (South-Center finned banks via InstancedMesh)
  const vapInst = new THREE.InstancedMesh(UNIT_BOX_GEO, MAT.stainless, 16);
  vapInst.castShadow = true;
  let vIdx = 0;
  for (let r = 0; r < 2; r++) {
    const vz = depthZ * 0.24 + r * 4.5;
    for (let c = 0; c < 8; c++) {
      const vx = -widthX * 0.36 + (c / 7) * (widthX * 0.72);
      _dummy.position.set(vx, 0.35 + 1.5, vz);
      _dummy.rotation.set(0, 0, 0);
      _dummy.scale.set(0.6, 3.0, 2.8);
      _dummy.updateMatrix();
      vapInst.setMatrixAt(vIdx++, _dummy.matrix);
    }
  }
  vapInst.instanceMatrix.needsUpdate = true;
  g.add(vapInst);

  // Small compressor/purifier shelter at South end
  const shelter = new THREE.Mesh(new THREE.BoxGeometry(widthX * 0.76, 2.8, 6.0), MAT.cladding);
  shelter.position.set(0, 0.35 + 1.4, depthZ * 0.42);
  shelter.castShadow = true;
  g.add(shelter);

  const shelterBand = new THREE.Mesh(new THREE.BoxGeometry(widthX * 0.78, 0.45, 6.1), accentMat);
  shelterBand.position.set(0, 0.35 + 2.65, depthZ * 0.42);
  g.add(shelterBand);

  addSouthLedSign(g, 'UT03', spec.color_hex, widthX, 3.3, depthZ);
  return g;
}

/**
 * UT04: ZLD Water Treatment Plant (#0097A7)
 * - 6 circular clarifier/treatment tanks with rotating scraper bridges + RO building
 */
function buildUT04Exterior(spec, scraperBridges) {
  const { widthX, depthZ, heightY } = getDims(spec); // 30 x 67.5 x 3.5
  const accentMat = makeAccentMat(spec.color_hex || '#0097A7');
  const g = new THREE.Group();
  g.name = 'Completed_UT04';

  const pad = new THREE.Mesh(new THREE.BoxGeometry(widthX, 0.3, depthZ), MAT.concretePad);
  pad.position.y = 0.15;
  pad.receiveShadow = true;
  g.add(pad);

  // 6 Circular Clarifier / Treatment Tanks (2 cols x 3 rows on North 68% of yard)
  const tankR = Math.min(widthX * 0.21, 5.4);
  const tankWallH = 1.65;
  for (let row = 0; row < 3; row++) {
    const tz = -depthZ * 0.38 + row * (depthZ * 0.24);
    for (let col = 0; col < 2; col++) {
      const tx = col === 0 ? -widthX * 0.25 : widthX * 0.25;

      // Outer concrete tank ring
      const wall = new THREE.Mesh(
        new THREE.CylinderGeometry(tankR, tankR * 1.03, tankWallH, 24, 1, true),
        MAT.concreteTank
      );
      wall.position.set(tx, 0.3 + tankWallH * 0.5, tz);
      wall.castShadow = true;
      g.add(wall);

      // Tank rim
      const rim = new THREE.Mesh(
        new THREE.TorusGeometry(tankR, 0.18, 8, 24),
        MAT.concreteTank
      );
      rim.rotation.x = Math.PI * 0.5;
      rim.position.set(tx, 0.3 + tankWallH, tz);
      g.add(rim);

      // Water surface
      const water = new THREE.Mesh(
        new THREE.CylinderGeometry(tankR * 0.96, tankR * 0.96, 0.15, 22),
        MAT.waterTeal
      );
      water.position.set(tx, 0.3 + tankWallH * 0.78, tz);
      g.add(water);

      // Center feedwell pier
      const pier = new THREE.Mesh(
        new THREE.CylinderGeometry(0.55, 0.65, tankWallH + 0.4, 10),
        MAT.concreteTank
      );
      pier.position.set(tx, 0.3 + (tankWallH + 0.4) * 0.5, tz);
      g.add(pier);

      // Rotating Scraper Bridge
      const bridgePivot = new THREE.Group();
      bridgePivot.position.set(tx, 0.3 + tankWallH + 0.18, tz);
      const beam = new THREE.Mesh(
        new THREE.BoxGeometry(tankR * 1.95, 0.28, 0.55),
        accentMat
      );
      beam.castShadow = true;
      bridgePivot.add(beam);

      const handrail = new THREE.Mesh(
        new THREE.BoxGeometry(tankR * 1.95, 0.35, 0.08),
        MAT.steelGalv
      );
      handrail.position.set(0, 0.3, 0.26);
      bridgePivot.add(handrail);

      bridgePivot.userData.phase = (row * 2 + col) * 0.9;
      g.add(bridgePivot);
      scraperBridges.push(bridgePivot);
    }
  }

  // RO / DI Filtration Building (South end)
  const roD = depthZ * 0.24;
  const roZ = depthZ * 0.5 - roD * 0.5 - 0.8;
  const roShellMat = MAT.cladding.clone();
  const roBuilding = new THREE.Mesh(
    new THREE.BoxGeometry(widthX * 0.92, heightY, roD),
    roShellMat
  );
  roBuilding.position.set(0, 0.3 + heightY * 0.5, roZ);
  roBuilding.castShadow = true;
  roBuilding.receiveShadow = true;
  roBuilding.userData.isExteriorWall = true;
  roBuilding.userData.originalOpacity = roShellMat.opacity;
  roBuilding.userData.originalTransparent = roShellMat.transparent;
  g.add(roBuilding);

  const roBand = new THREE.Mesh(
    new THREE.BoxGeometry(widthX * 0.94, 0.65, roD * 1.02),
    accentMat
  );
  roBand.position.set(0, 0.3 + heightY - 0.32, roZ);
  roBand.userData.isExteriorWall = true;
  g.add(roBand);

  const roRoof = new THREE.Mesh(
    new THREE.BoxGeometry(widthX * 0.95, 0.2, roD * 1.03),
    MAT.roofDeck
  );
  roRoof.position.set(0, 0.3 + heightY + 0.1, roZ);
  roRoof.userData.isRoof = true;
  g.add(roRoof);

  addSouthLedSign(g, 'UT04', spec.color_hex, widthX, heightY + 0.3, depthZ);
  return g;
}

/**
 * Builds the North Energy & Battery Cluster (F06A, F06B, F07, UT01..UT04)
 * wrapped in 5-stage EPC construction controllers.
 *
 * @param {import('../core/constructionTimeline.js').ConstructionTimelineController} [timelineController]
 * @returns {{
 *   group: THREE.Group,
 *   buildingControllers: Record<string, ReturnType<typeof createStagedBuildingController>>,
 *   update: (elapsedTime?: number, currentMonth?: number, isCutaway?: boolean) => void
 * }}
 */
export function buildNorthEnergyAndBattery(timelineController) {
  const group = new THREE.Group();
  group.name = 'NorthEnergyAndBatteryCluster';

  const buildingControllers = {};
  const ut02FanTracker = { mesh: null, centers: [] };
  const ut04ScraperBridges = [];

  const exteriorBuilders = {
    F06A: (spec) => buildF06AExterior(spec),
    F06B: (spec) => buildF06BExterior(spec),
    F07: (spec) => buildF07Exterior(spec),
    UT01: (spec) => buildUT01Exterior(spec),
    UT02: (spec) => buildUT02Exterior(spec, ut02FanTracker),
    UT03: (spec) => buildUT03Exterior(spec),
    UT04: (spec) => buildUT04Exterior(spec, ut04ScraperBridges),
  };

  for (const id of NORTH_BUILDING_IDS) {
    const spec = getBuildingSpecById(id);
    if (!spec) continue;
    const controller = createStagedBuildingController(spec, exteriorBuilders[id]);
    buildingControllers[id] = controller;
    group.add(controller.group);
  }

  function update(elapsedTime = 0, currentMonth = 24, isCutaway = false) {
    const safeTime = Number.isFinite(elapsedTime) ? elapsedTime : 0;
    const safeMonth = Number.isFinite(currentMonth)
      ? currentMonth
      : timelineController?.currentMonth ?? 24;
    const cutaway = Boolean(isCutaway);

    for (const id of NORTH_BUILDING_IDS) {
      const controller = buildingControllers[id];
      if (!controller) continue;

      const state =
        timelineController && typeof timelineController.getBuildingState === 'function'
          ? timelineController.getBuildingState(id)
          : getBuildingStageAtMonth(id, safeMonth);

      controller.updateStage(state.stageIndex, state.stageProgress, safeTime, cutaway);

      // Animate UT02 12 cooling tower fans when Stage 4 is operational
      if (id === 'UT02' && state.stageIndex === 4 && ut02FanTracker.mesh) {
        const centers = ut02FanTracker.centers;
        for (let i = 0; i < centers.length; i++) {
          const c = centers[i];
          const angle = safeTime * 6.5 + c.phase;
          // 2 perpendicular blades per cooling tower cell
          _dummy.position.set(c.x, c.y, c.z);
          _dummy.rotation.set(0, angle, 0);
          _dummy.scale.set(2.3, 0.08, 0.28);
          _dummy.updateMatrix();
          ut02FanTracker.mesh.setMatrixAt(i * 2, _dummy.matrix);

          _dummy.rotation.set(0, angle + Math.PI * 0.5, 0);
          _dummy.updateMatrix();
          ut02FanTracker.mesh.setMatrixAt(i * 2 + 1, _dummy.matrix);
        }
        ut02FanTracker.mesh.instanceMatrix.needsUpdate = true;
      }

      // Animate UT04 6 circular clarifier scraper bridges when Stage 4 is operational
      if (id === 'UT04' && state.stageIndex === 4 && ut04ScraperBridges.length > 0) {
        for (let i = 0; i < ut04ScraperBridges.length; i++) {
          const bridge = ut04ScraperBridges[i];
          bridge.rotation.y = safeTime * 0.28 + (bridge.userData.phase || 0);
        }
      }
    }
  }

  // Initialize at current timeline state
  update(0, timelineController?.currentMonth ?? 0, false);

  return {
    group,
    buildingControllers,
    update,
  };
}

export default buildNorthEnergyAndBattery;
