import * as THREE from 'three';
import {
  WORLD_SCALE,
  HEIGHT_SCALE,
  SCENIC_PROP_BOOST,
  getBuildingSpecById,
  getBuildingStageAtMonth,
} from '../config/masterSpecLoader.js';
import { createStagedBuildingController } from './stageRenderer.js';
import { buildSteelCoilTwin } from '../assets/constructionMaterialsTwins.js';

/**
 * Spine Factories Builder (TASK-009)
 * Builds custom Stage-4 architectural exteriors for the 5 core production spine factories:
 *   - F01: Giga-Casting (6 tall aluminum smelter stacks on West, louvered vents, #E65100)
 *   - F02: Servo Stamping (24m high bay, steel coil yard on West, #F57C00)
 *   - F03: BIW Dark Factory (550m x 460m mega-hall, sawtooth skylight roof + Solar PV, #D84315)
 *   - F04: Eco-Smart Paint Shop (3-tier stepped 28.5m massing, 2x 38m stainless RTO stacks, cleanroom AHUs, #0288D1)
 *   - F05: General Assembly (True E-shaped footprint with 2 U-shaped dock courtyards & 88 dock doors, #2E7D32)
 */

const SPINE_IDS = ['F01', 'F02', 'F03', 'F04', 'F05'];

const UNIT_BOX_GEO = new THREE.BoxGeometry(1, 1, 1);
const _dummy = new THREE.Object3D();

const MAT = {
  plinth: new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.88, metalness: 0.06 }),
  cladding: new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.52, metalness: 0.24 }),
  claddingCool: new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.48, metalness: 0.2 }),
  charcoal: new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.55, metalness: 0.4 }),
  roofDeck: new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.7, metalness: 0.2 }),
  solarPanel: new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.22, metalness: 0.58 }),
  stainless: new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.24, metalness: 0.88 }),
  louver: new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.45, metalness: 0.6 }),
  ahuBody: new THREE.MeshStandardMaterial({ color: 0xdbe4ee, roughness: 0.38, metalness: 0.5 }),
  dockDoor: new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.45 }),
  apron: new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.9, metalness: 0.04 }),
  bollard: new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4, metalness: 0.2 }),
  glass: new THREE.MeshStandardMaterial({
    color: 0x93c5fd,
    emissive: 0x1e3a8a,
    emissiveIntensity: 0.24,
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
  smelterGlow: new THREE.MeshStandardMaterial({
    color: 0xe65100,
    emissive: 0xff6d00,
    emissiveIntensity: 0.7,
    roughness: 0.35,
    metalness: 0.4,
  }),
};

function createAccentMat(hex) {
  return new THREE.MeshStandardMaterial({
    color: hex,
    roughness: 0.42,
    metalness: 0.3,
  });
}

function createLedSign(text, accentHex, width, height) {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 512, 96);
  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 6;
  ctx.strokeRect(4, 4, 504, 88);

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 34px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 49);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    emissive: 0xffffff,
    emissiveMap: tex,
    emissiveIntensity: 0.72,
    roughness: 0.3,
  });
  return new THREE.Mesh(new THREE.PlaneGeometry(width, height), mat);
}

function markWall(mesh) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.isExteriorWall = true;
  return mesh;
}

function markRoof(mesh) {
  mesh.receiveShadow = true;
  mesh.userData.isRoof = true;
  return mesh;
}

function addSolarGrid(group, minX, maxX, minZ, maxZ, yPos, maxCount = 96) {
  const panelW = 3.2;
  const panelD = 1.8;
  const spanX = maxX - minX;
  const spanZ = maxZ - minZ;
  const cols = Math.max(1, Math.floor(spanX / (panelW + 1.0)));
  const rows = Math.max(1, Math.floor(spanZ / (panelD + 1.2)));
  const total = Math.min(maxCount, cols * rows);
  if (total <= 0) return;

  const inst = new THREE.InstancedMesh(UNIT_BOX_GEO, MAT.solarPanel, total);
  markRoof(inst);
  const cx = (minX + maxX) * 0.5;
  const cz = (minZ + maxZ) * 0.5;
  let idx = 0;
  for (let r = 0; r < rows && idx < total; r++) {
    for (let c = 0; c < cols && idx < total; c++) {
      const px = cx - ((cols - 1) * (panelW + 1.0)) * 0.5 + c * (panelW + 1.0);
      const pz = cz - ((rows - 1) * (panelD + 1.2)) * 0.5 + r * (panelD + 1.2);
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

/**
 * F01: Giga-Casting (9,100T)
 * - 6 tall aluminum smelter stacks on West side
 * - Louvered ventilation bays & ridge gravity ventilators
 * - #E65100 accent stripe
 */
function buildF01Exterior(spec) {
  const { widthX, depthZ, heightY } = spec.bounds3JS;
  const g = new THREE.Group();
  g.name = 'Exterior_F01_GigaCasting';
  const accentMat = createAccentMat(spec.color_hex || '#E65100');

  const plinthH = 0.9;
  const plinth = markWall(new THREE.Mesh(new THREE.BoxGeometry(widthX, plinthH, depthZ), MAT.plinth));
  plinth.position.y = plinthH * 0.5;
  g.add(plinth);

  const wallH = heightY - plinthH;
  const shell = markWall(
    new THREE.Mesh(new THREE.BoxGeometry(widthX * 0.99, wallH, depthZ * 0.99), MAT.cladding.clone())
  );
  shell.position.y = plinthH + wallH * 0.5;
  g.add(shell);

  const bandH = 1.05;
  const band = markWall(new THREE.Mesh(new THREE.BoxGeometry(widthX * 1.004, bandH, depthZ * 1.004), accentMat));
  band.position.y = heightY - bandH * 0.6;
  g.add(band);

  const glassBand = markWall(
    new THREE.Mesh(new THREE.BoxGeometry(widthX * 1.002, 0.85, depthZ * 1.002), MAT.glass)
  );
  glassBand.position.y = heightY * 0.65;
  g.add(glassBand);

  // Louvered vents on West, North, South facades (InstancedMesh)
  const louverCount = 18;
  const louverInst = new THREE.InstancedMesh(UNIT_BOX_GEO, MAT.louver, louverCount);
  markWall(louverInst);
  let lIdx = 0;
  for (let i = 0; i < 6; i++) {
    const lz = -depthZ * 0.38 + (i / 5) * depthZ * 0.76;
    _dummy.position.set(-widthX * 0.498, heightY * 0.38, lz);
    _dummy.rotation.set(0, 0, 0);
    _dummy.scale.set(0.25, 2.2, 4.2);
    _dummy.updateMatrix();
    louverInst.setMatrixAt(lIdx++, _dummy.matrix);
  }
  for (let i = 0; i < 6; i++) {
    const lx = -widthX * 0.36 + (i / 5) * widthX * 0.72;
    _dummy.position.set(lx, heightY * 0.36, depthZ * 0.498);
    _dummy.scale.set(4.5, 1.8, 0.25);
    _dummy.updateMatrix();
    louverInst.setMatrixAt(lIdx++, _dummy.matrix);

    _dummy.position.set(lx, heightY * 0.36, -depthZ * 0.498);
    _dummy.updateMatrix();
    louverInst.setMatrixAt(lIdx++, _dummy.matrix);
  }
  louverInst.instanceMatrix.needsUpdate = true;
  g.add(louverInst);

  // Roof deck + Ridge gravity ventilator
  const roof = markRoof(new THREE.Mesh(new THREE.BoxGeometry(widthX * 1.01, 0.25, depthZ * 1.01), MAT.roofDeck));
  roof.position.y = heightY + 0.12;
  g.add(roof);

  const ridgeVent = markRoof(
    new THREE.Mesh(new THREE.BoxGeometry(widthX * 0.65, 1.0, 4.5), MAT.louver)
  );
  ridgeVent.position.set(widthX * 0.08, heightY + 0.7, 0);
  g.add(ridgeVent);

  // 6 Tall Aluminum Smelter Exhaust Stacks (StrikoMelter) on West side
  const stackX = -widthX * 0.38;
  for (let i = 0; i < 6; i++) {
    const sz = -depthZ * 0.38 + (i / 5) * depthZ * 0.76;
    const stackH = 5.2 + (i % 2) * 0.5;
    const base = markRoof(
      new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.4, 2.6), MAT.charcoal)
    );
    base.position.set(stackX, heightY + 0.7, sz);
    g.add(base);

    const stack = markRoof(
      new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.8, stackH, 12), MAT.stainless)
    );
    stack.position.set(stackX, heightY + 1.4 + stackH * 0.5, sz);
    g.add(stack);

    const heatCollar = markRoof(
      new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.68, 0.55, 12), MAT.smelterGlow)
    );
    heatCollar.position.set(stackX, heightY + 1.4 + stackH * 0.85, sz);
    g.add(heatCollar);

    if (i === 0 || i === 5) {
      const beacon = markRoof(new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 8), MAT.beaconRed));
      beacon.position.set(stackX, heightY + 1.4 + stackH + 0.3, sz);
      g.add(beacon);
    }
  }

  addSolarGrid(g, -widthX * 0.18, widthX * 0.42, -depthZ * 0.38, -depthZ * 0.14, heightY + 0.36, 40);
  addSolarGrid(g, -widthX * 0.18, widthX * 0.42, depthZ * 0.14, depthZ * 0.38, heightY + 0.36, 40);

  const sign = createLedSign('F01 GIGA-CASTING 9100T', '#E65100', 14, 2.6);
  if (sign) {
    sign.position.set(0, heightY - 0.6, depthZ * 0.5 + 0.18);
    g.add(sign);
  }

  return g;
}

/**
 * F02: Servo Stamping Shop
 * - 24m high bay
 * - Steel Coil Yard (buildSteelCoilTwin) on West side
 * - #F57C00 accent stripe
 */
function buildF02Exterior(spec) {
  const { widthX, depthZ, heightY } = spec.bounds3JS;
  const g = new THREE.Group();
  g.name = 'Exterior_F02_ServoStamping';
  const accentMat = createAccentMat(spec.color_hex || '#F57C00');

  const plinthH = 0.95;
  const plinth = markWall(new THREE.Mesh(new THREE.BoxGeometry(widthX, plinthH, depthZ), MAT.plinth));
  plinth.position.y = plinthH * 0.5;
  g.add(plinth);

  const wallH = heightY - plinthH;
  const shell = markWall(
    new THREE.Mesh(new THREE.BoxGeometry(widthX * 0.99, wallH, depthZ * 0.99), MAT.cladding.clone())
  );
  shell.position.y = plinthH + wallH * 0.5;
  g.add(shell);

  const bandH = 1.1;
  const band = markWall(new THREE.Mesh(new THREE.BoxGeometry(widthX * 1.004, bandH, depthZ * 1.004), accentMat));
  band.position.y = heightY - bandH * 0.6;
  g.add(band);

  const glassBand = markWall(
    new THREE.Mesh(new THREE.BoxGeometry(widthX * 1.002, 0.9, depthZ * 1.002), MAT.glass)
  );
  glassBand.position.y = heightY * 0.66;
  g.add(glassBand);

  const roof = markRoof(new THREE.Mesh(new THREE.BoxGeometry(widthX * 1.01, 0.25, depthZ * 1.01), MAT.roofDeck));
  roof.position.y = heightY + 0.12;
  g.add(roof);

  addSolarGrid(g, -widthX * 0.4, widthX * 0.4, -depthZ * 0.36, depthZ * 0.36, heightY + 0.36, 72);

  // Heavy-duty Steel Coil Yard on the West staging apron
  const yardPad = new THREE.Mesh(new THREE.BoxGeometry(10, 0.14, depthZ * 0.78), MAT.apron);
  yardPad.position.set(-widthX * 0.5 - 5.5, 0.07, 0);
  yardPad.receiveShadow = true;
  g.add(yardPad);

  const coilScale = WORLD_SCALE * SCENIC_PROP_BOOST * 1.15;
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 5; col++) {
      const coil = buildSteelCoilTwin({ isAluminum: (row + col) % 2 === 1 });
      coil.scale.setScalar(coilScale);
      coil.position.set(
        -widthX * 0.5 - 3.2 - row * 3.6,
        0.14,
        -depthZ * 0.28 + col * (depthZ * 0.14)
      );
      g.add(coil);
    }
  }

  // Overhead coil-yard gantry beam
  const gantrySpan = depthZ * 0.72;
  const gantryTop = new THREE.Mesh(new THREE.BoxGeometry(8.5, 0.45, gantrySpan), MAT.charcoal);
  gantryTop.position.set(-widthX * 0.5 - 5.2, 4.2, 0);
  g.add(gantryTop);

  [-gantrySpan * 0.46, gantrySpan * 0.46].forEach((gz) => {
    [-widthX * 0.5 - 1.5, -widthX * 0.5 - 8.8].forEach((gx) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.45, 4.2, 0.45), accentMat);
      leg.position.set(gx, 2.1, gz);
      g.add(leg);
    });
  });

  const sign = createLedSign('F02 SERVO STAMPING', '#F57C00', 14, 2.6);
  if (sign) {
    sign.position.set(0, heightY - 0.65, depthZ * 0.5 + 0.18);
    g.add(sign);
  }

  return g;
}

/**
 * F03: BIW Dark Factory (550m x 460m Mega-Hall)
 * - Sawtooth skylight roof + south-sloped Solar PV
 * - Welding substation housings
 * - #D84315 accent stripe
 */
function buildF03Exterior(spec) {
  const { widthX, depthZ, heightY } = spec.bounds3JS;
  const g = new THREE.Group();
  g.name = 'Exterior_F03_BIWDarkFactory';
  const accentMat = createAccentMat(spec.color_hex || '#D84315');

  const plinthH = 0.85;
  const plinth = markWall(new THREE.Mesh(new THREE.BoxGeometry(widthX, plinthH, depthZ), MAT.plinth));
  plinth.position.y = plinthH * 0.5;
  g.add(plinth);

  const wallH = heightY - plinthH;
  const shell = markWall(
    new THREE.Mesh(new THREE.BoxGeometry(widthX * 0.99, wallH, depthZ * 0.99), MAT.cladding.clone())
  );
  shell.position.y = plinthH + wallH * 0.5;
  g.add(shell);

  const bandH = 0.95;
  const band = markWall(new THREE.Mesh(new THREE.BoxGeometry(widthX * 1.003, bandH, depthZ * 1.003), accentMat));
  band.position.y = heightY - bandH * 0.62;
  g.add(band);

  const glassBand = markWall(
    new THREE.Mesh(new THREE.BoxGeometry(widthX * 1.001, 0.75, depthZ * 1.001), MAT.glass)
  );
  glassBand.position.y = heightY * 0.64;
  g.add(glassBand);

  const roof = markRoof(new THREE.Mesh(new THREE.BoxGeometry(widthX * 1.005, 0.24, depthZ * 1.005), MAT.roofDeck));
  roof.position.y = heightY + 0.12;
  g.add(roof);

  // Sawtooth skylight monitors + sloped Solar PV rows (InstancedMesh)
  const bayCount = 7;
  const bayPitchZ = (depthZ * 0.84) / bayCount;
  const ridgeInst = new THREE.InstancedMesh(UNIT_BOX_GEO, MAT.roofDeck, bayCount);
  const skyGlassInst = new THREE.InstancedMesh(UNIT_BOX_GEO, MAT.glass, bayCount);
  const pvInst = new THREE.InstancedMesh(UNIT_BOX_GEO, MAT.solarPanel, bayCount);
  markRoof(ridgeInst);
  markRoof(skyGlassInst);
  markRoof(pvInst);

  for (let i = 0; i < bayCount; i++) {
    const bz = -depthZ * 0.42 + (i + 0.5) * bayPitchZ;

    // Sloped sawtooth roof deck
    _dummy.position.set(0, heightY + 0.85, bz + bayPitchZ * 0.08);
    _dummy.rotation.set(0.22, 0, 0);
    _dummy.scale.set(widthX * 0.9, 0.18, bayPitchZ * 0.78);
    _dummy.updateMatrix();
    ridgeInst.setMatrixAt(i, _dummy.matrix);

    // North-facing vertical clerestory monitor glass
    _dummy.position.set(0, heightY + 0.92, bz - bayPitchZ * 0.3);
    _dummy.rotation.set(0, 0, 0);
    _dummy.scale.set(widthX * 0.88, 1.35, 0.18);
    _dummy.updateMatrix();
    skyGlassInst.setMatrixAt(i, _dummy.matrix);

    // South-sloped Solar PV strip
    _dummy.position.set(0, heightY + 1.02, bz + bayPitchZ * 0.1);
    _dummy.rotation.set(0.22, 0, 0);
    _dummy.scale.set(widthX * 0.84, 0.1, bayPitchZ * 0.62);
    _dummy.updateMatrix();
    pvInst.setMatrixAt(i, _dummy.matrix);
  }
  ridgeInst.instanceMatrix.needsUpdate = true;
  skyGlassInst.instanceMatrix.needsUpdate = true;
  pvInst.instanceMatrix.needsUpdate = true;
  g.add(ridgeInst, skyGlassInst, pvInst);

  // Welding power substation enclosures along South perimeter
  const subInst = new THREE.InstancedMesh(UNIT_BOX_GEO, MAT.charcoal, 5);
  for (let i = 0; i < 5; i++) {
    const sx = -widthX * 0.36 + i * (widthX * 0.18);
    _dummy.position.set(sx, 1.1, depthZ * 0.5 + 1.4);
    _dummy.rotation.set(0, 0, 0);
    _dummy.scale.set(4.5, 2.2, 2.2);
    _dummy.updateMatrix();
    subInst.setMatrixAt(i, _dummy.matrix);
  }
  subInst.instanceMatrix.needsUpdate = true;
  g.add(subInst);

  const sign = createLedSign('F03 BIW DARK FACTORY', '#D84315', 18, 3.0);
  if (sign) {
    sign.position.set(0, heightY - 0.55, depthZ * 0.5 + 0.2);
    g.add(sign);
  }

  return g;
}

/**
 * F04: Eco-Smart Paint Shop (3-Tier Stepped 28.5m)
 * - Distinct 3-story stepped massing
 * - 2 tall 38m stainless RTO exhaust stacks
 * - Cleanroom AHU rooftop array
 * - #0288D1 accent
 */
function buildF04Exterior(spec) {
  const { widthX, depthZ, heightY } = spec.bounds3JS;
  const g = new THREE.Group();
  g.name = 'Exterior_F04_EcoPaintShop';
  const accentMat = createAccentMat(spec.color_hex || '#0288D1');

  const tierHeights = [heightY * 0.34, heightY * 0.34, heightY * 0.32];
  const tierScales = [1.0, 0.85, 0.68];
  let curY = 0;

  for (let t = 0; t < 3; t++) {
    const tw = widthX * tierScales[t];
    const td = depthZ * tierScales[t];
    const th = tierHeights[t];

    const wall = markWall(new THREE.Mesh(new THREE.BoxGeometry(tw, th, td), MAT.claddingCool.clone()));
    wall.position.y = curY + th * 0.5;
    g.add(wall);

    const fascia = markWall(new THREE.Mesh(new THREE.BoxGeometry(tw * 1.005, 0.58, td * 1.005), accentMat));
    fascia.position.y = curY + th - 0.32;
    g.add(fascia);

    const glass = markWall(new THREE.Mesh(new THREE.BoxGeometry(tw * 1.003, 0.55, td * 1.003), MAT.glass));
    glass.position.y = curY + th * 0.55;
    g.add(glass);

    const deck = markRoof(new THREE.Mesh(new THREE.BoxGeometry(tw * 1.01, 0.2, td * 1.01), MAT.roofDeck));
    deck.position.y = curY + th + 0.1;
    g.add(deck);

    curY += th;
  }

  // Cleanroom AHU Array on Tier 1 & Tier 3 roofs (InstancedMesh)
  const ahuInst = new THREE.InstancedMesh(UNIT_BOX_GEO, MAT.ahuBody, 10);
  markRoof(ahuInst);
  let aIdx = 0;
  for (let i = 0; i < 6; i++) {
    const ax = -widthX * 0.32 + (i / 5) * widthX * 0.64;
    _dummy.position.set(ax, heightY + 0.72, -depthZ * 0.16);
    _dummy.rotation.set(0, 0, 0);
    _dummy.scale.set(4.0, 1.15, 2.8);
    _dummy.updateMatrix();
    ahuInst.setMatrixAt(aIdx++, _dummy.matrix);
  }
  for (let i = 0; i < 4; i++) {
    const ax = -widthX * 0.3 + (i / 3) * widthX * 0.6;
    _dummy.position.set(ax, tierHeights[0] + 0.65, depthZ * 0.45);
    _dummy.scale.set(3.4, 1.0, 2.2);
    _dummy.updateMatrix();
    ahuInst.setMatrixAt(aIdx++, _dummy.matrix);
  }
  ahuInst.instanceMatrix.needsUpdate = true;
  g.add(ahuInst);

  // 2 Tall 38m Stainless RTO Exhaust Stacks (38 * HEIGHT_SCALE = 13.3 units total height)
  const totalStackTopY = 38 * HEIGHT_SCALE;
  const rtoBaseY = heightY;
  const stackLen = Math.max(3.5, totalStackTopY - rtoBaseY);

  [-widthX * 0.16, widthX * 0.16].forEach((rx) => {
    const rtoUnit = markRoof(new THREE.Mesh(new THREE.BoxGeometry(5.5, 2.2, 4.2), MAT.charcoal));
    rtoUnit.position.set(rx, rtoBaseY + 1.1, depthZ * 0.15);
    g.add(rtoUnit);

    const stack = markRoof(
      new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.95, stackLen, 14), MAT.stainless)
    );
    stack.position.set(rx, rtoBaseY + stackLen * 0.5, depthZ * 0.15);
    g.add(stack);

    const collar = markRoof(
      new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 0.25, 14), accentMat)
    );
    collar.position.set(rx, rtoBaseY + stackLen * 0.72, depthZ * 0.15);
    g.add(collar);

    const beacon = markRoof(new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 8), MAT.beaconRed));
    beacon.position.set(rx, rtoBaseY + stackLen + 0.32, depthZ * 0.15);
    g.add(beacon);
  });

  const sign = createLedSign('F04 ECO PAINT 3-TIER', '#0288D1', 15, 2.8);
  if (sign) {
    sign.position.set(0, tierHeights[0] - 0.5, depthZ * 0.5 + 0.2);
    g.add(sign);
  }

  return g;
}

/**
 * F05: General Assembly — True E-Shaped Footprint
 * - North main spine (650m x 160m) + 3 South wings (West 180m, Center 190m, East 180m x 300m)
 * - Forms 2 U-shaped truck dock courtyards with 88 dock doors
 * - #2E7D32 accent
 */
function buildF05Exterior(spec) {
  const { widthX, depthZ, heightY } = spec.bounds3JS;
  const g = new THREE.Group();
  g.name = 'Exterior_F05_GeneralAssembly_EShape';
  const accentMat = createAccentMat(spec.color_hex || '#2E7D32');

  // Blueprint dimensions (meters -> 3JS units via WORLD_SCALE = 0.25)
  const spineD = 160 * WORLD_SCALE; // 40
  const wingD = 300 * WORLD_SCALE; // 75
  const westW = 180 * WORLD_SCALE; // 45
  const centerW = 190 * WORLD_SCALE; // 47.5
  const eastW = 180 * WORLD_SCALE; // 45

  const spineZ = -depthZ * 0.5 + spineD * 0.5; // North side (-Z)
  const wingZ = depthZ * 0.5 - wingD * 0.5; // South side (+Z)

  const westX = -widthX * 0.5 + westW * 0.5;
  const centerX = 0;
  const eastX = widthX * 0.5 - eastW * 0.5;

  const wings = [
    { w: widthX, d: spineD, x: 0, z: spineZ },
    { w: westW, d: wingD, x: westX, z: wingZ },
    { w: centerW, d: wingD, x: centerX, z: wingZ },
    { w: eastW, d: wingD, x: eastX, z: wingZ },
  ];

  wings.forEach((seg) => {
    const plinth = markWall(new THREE.Mesh(new THREE.BoxGeometry(seg.w, 0.85, seg.d), MAT.plinth));
    plinth.position.set(seg.x, 0.425, seg.z);
    g.add(plinth);

    const wallH = heightY - 0.85;
    const shell = markWall(
      new THREE.Mesh(new THREE.BoxGeometry(seg.w * 0.992, wallH, seg.d * 0.992), MAT.cladding.clone())
    );
    shell.position.set(seg.x, 0.85 + wallH * 0.5, seg.z);
    g.add(shell);

    const band = markWall(
      new THREE.Mesh(new THREE.BoxGeometry(seg.w * 1.004, 0.9, seg.d * 1.004), accentMat)
    );
    band.position.set(seg.x, heightY - 0.58, seg.z);
    g.add(band);

    const glass = markWall(
      new THREE.Mesh(new THREE.BoxGeometry(seg.w * 1.002, 0.72, seg.d * 1.002), MAT.glass)
    );
    glass.position.set(seg.x, heightY * 0.64, seg.z);
    g.add(glass);

    const roof = markRoof(
      new THREE.Mesh(new THREE.BoxGeometry(seg.w * 1.006, 0.24, seg.d * 1.006), MAT.roofDeck)
    );
    roof.position.set(seg.x, heightY + 0.12, seg.z);
    g.add(roof);
  });

  // 2 U-Shaped Truck Dock Courtyards + Concrete Aprons
  const courtW = 50 * WORLD_SCALE; // 12.5
  const westCourtX = -widthX * 0.5 + westW + courtW * 0.5;
  const eastCourtX = widthX * 0.5 - eastW - courtW * 0.5;

  [westCourtX, eastCourtX].forEach((cx) => {
    const apron = new THREE.Mesh(new THREE.BoxGeometry(courtW, 0.1, wingD), MAT.apron);
    apron.position.set(cx, 0.05, wingZ);
    apron.receiveShadow = true;
    g.add(apron);
  });

  // 88 Dock Doors (22 along each of the 4 courtyard-facing wing walls)
  const totalDoors = 88;
  const dockInst = new THREE.InstancedMesh(UNIT_BOX_GEO, MAT.dockDoor, totalDoors);
  const doorWallsX = [
    westX + westW * 0.5, // West wing East face
    centerX - centerW * 0.5, // Center wing West face
    centerX + centerW * 0.5, // Center wing East face
    eastX - eastW * 0.5, // East wing West face
  ];

  let dIdx = 0;
  doorWallsX.forEach((wx) => {
    for (let i = 0; i < 22; i++) {
      const dz = wingZ - wingD * 0.44 + (i / 21) * (wingD * 0.88);
      _dummy.position.set(wx, 1.0, dz);
      _dummy.rotation.set(0, 0, 0);
      _dummy.scale.set(0.25, 1.9, 1.8);
      _dummy.updateMatrix();
      dockInst.setMatrixAt(dIdx++, _dummy.matrix);
    }
  });
  dockInst.instanceMatrix.needsUpdate = true;
  g.add(dockInst);

  // Rooftop Solar PV on North Spine + 3 South Wings
  addSolarGrid(g, -widthX * 0.44, widthX * 0.44, spineZ - spineD * 0.36, spineZ + spineD * 0.36, heightY + 0.36, 48);
  [westX, centerX, eastX].forEach((wx) => {
    addSolarGrid(g, wx - 16, wx + 16, wingZ - wingD * 0.38, wingZ + wingD * 0.38, heightY + 0.36, 28);
  });

  const sign = createLedSign('F05 GENERAL ASSEMBLY', '#2E7D32', 16, 2.8);
  if (sign) {
    sign.position.set(centerX, heightY - 0.55, depthZ * 0.5 + 0.2);
    g.add(sign);
  }

  return g;
}

const EXTERIOR_BUILDERS = {
  F01: buildF01Exterior,
  F02: buildF02Exterior,
  F03: buildF03Exterior,
  F04: buildF04Exterior,
  F05: buildF05Exterior,
};

/**
 * Builds the 5 Spine Production Factories (F01..F05) wrapped with 5-stage EPC controllers.
 *
 * @param {import('../core/constructionTimeline.js').ConstructionTimelineController} [timelineController]
 * @returns {{ group: THREE.Group, buildingControllers: Record<string, ReturnType<typeof createStagedBuildingController>>, update: (elapsedTime?: number, currentMonth?: number, isCutaway?: boolean) => void }}
 */
export function buildSpineFactories(timelineController = null) {
  const group = new THREE.Group();
  group.name = 'Gigafactory_SpineFactories_F01_F05';

  /** @type {Record<string, ReturnType<typeof createStagedBuildingController>>} */
  const buildingControllers = {};

  SPINE_IDS.forEach((id) => {
    const spec = getBuildingSpecById(id);
    if (!spec) return;
    const controller = createStagedBuildingController(spec, EXTERIOR_BUILDERS[id]);
    buildingControllers[id] = controller;
    group.add(controller.group);
  });

  function update(elapsedTime = 0, currentMonth = 0, isCutaway = false) {
    SPINE_IDS.forEach((id) => {
      const controller = buildingControllers[id];
      if (!controller) return;
      const state = timelineController?.getBuildingState
        ? timelineController.getBuildingState(id)
        : getBuildingStageAtMonth(id, currentMonth);
      controller.updateStage(state.stageIndex, state.stageProgress, elapsedTime, isCutaway);
    });
  }

  // Initialize at current timeline state
  update(0, timelineController?.currentMonth ?? 0, false);

  return {
    group,
    buildingControllers,
    update,
  };
}
