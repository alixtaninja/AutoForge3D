import * as THREE from 'three';
import {
  getBuildingSpecById,
  getBuildingStageAtMonth,
  bpBoundsTo3JS,
} from '../config/masterSpecLoader.js';
import { createStagedBuildingController } from './stageRenderer.js';

/**
 * South Cluster, Supplier Park, HQ & R&D Builder (TASK-011)
 * Builds and manages the 5-stage EPC lifecycle for:
 *   - WH01: 32m AS/RS High-Bay Automated Warehouse (24 West truck docks + East AMR apron)
 *   - F08-1..5: On-Site JIS Supplier Park (F08-1 w/ resin silos, F08-2 & F08-5 w/ SB-05 links)
 *   - IOC01: 8-Story (36m) Blue Glass HQ & AI Data Center (8 spandrels, arched canopy, fountain, Helipad)
 *   - RD01: R&D Institute, Closed-Loop Wind Tunnel & 200m Crash Test Hall
 *   - UT05: 3-Story EV Fire Station, Medical Clinic & Central Canteen (4 red fire-truck bays)
 */

const TARGET_BUILDING_IDS = [
  'WH01',
  'F08-1',
  'F08-2',
  'F08-3',
  'F08-4',
  'F08-5',
  'IOC01',
  'RD01',
  'UT05',
];

const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
const UNIT_CYL = new THREE.CylinderGeometry(0.5, 0.5, 1, 14);
const _dummy = new THREE.Object3D();

// Shared PBR Materials
const MAT = {
  plinth: new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.88, metalness: 0.06 }),
  apron: new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.85, metalness: 0.05 }),
  asphalt: new THREE.MeshStandardMaterial({ color: 0x26292e, roughness: 0.9, metalness: 0.04 }),
  claddingWhite: new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.55, metalness: 0.25 }),
  claddingSlate: new THREE.MeshStandardMaterial({ color: 0x546e7a, roughness: 0.5, metalness: 0.32 }),
  darkTrim: new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.45, metalness: 0.55 }),
  roofDeck: new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.72, metalness: 0.18 }),
  solarPanel: new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.22, metalness: 0.58 }),
  dockDoor: new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.48, metalness: 0.45 }),
  bollardYellow: new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4, metalness: 0.2 }),
  amrStripe: new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    emissive: 0x0891b2,
    emissiveIntensity: 0.35,
    roughness: 0.35,
  }),
  tealAccent: new THREE.MeshStandardMaterial({ color: 0x00838f, roughness: 0.42, metalness: 0.32 }),
  blueAccent: new THREE.MeshStandardMaterial({ color: 0x1976d2, roughness: 0.4, metalness: 0.35 }),
  fireRed: new THREE.MeshStandardMaterial({ color: 0xc62828, roughness: 0.42, metalness: 0.28 }),
  fireDoorGlass: new THREE.MeshStandardMaterial({
    color: 0xdbeafe,
    roughness: 0.15,
    metalness: 0.25,
    transparent: true,
    opacity: 0.72,
  }),
  silverMetal: new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.28, metalness: 0.8 }),
  siloWhite: new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.38, metalness: 0.45 }),
  ahuBody: new THREE.MeshStandardMaterial({ color: 0xdbe4ee, roughness: 0.42, metalness: 0.52 }),
  clerestoryGlass: new THREE.MeshStandardMaterial({
    color: 0x93c5fd,
    emissive: 0x1e3a8a,
    emissiveIntensity: 0.24,
    roughness: 0.12,
    metalness: 0.25,
    transparent: true,
    opacity: 0.68,
  }),
  iocCurtainGlass: new THREE.MeshStandardMaterial({
    color: 0x1565c0,
    emissive: 0x0ea5e9,
    emissiveIntensity: 0.22,
    roughness: 0.1,
    metalness: 0.42,
    transparent: true,
    opacity: 0.84,
  }),
  iocMullion: new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.35, metalness: 0.72 }),
  fountainWater: new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.28,
    roughness: 0.08,
    metalness: 0.2,
    transparent: true,
    opacity: 0.85,
  }),
  fountainFoam: new THREE.MeshStandardMaterial({
    color: 0xe0f2fe,
    emissive: 0x7dd3fc,
    emissiveIntensity: 0.35,
    roughness: 0.2,
    transparent: true,
    opacity: 0.85,
  }),
  beaconRed: new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xdc2626,
    emissiveIntensity: 1.6,
    roughness: 0.2,
  }),
  helipadGreen: new THREE.MeshStandardMaterial({
    color: 0x22c55e,
    emissive: 0x16a34a,
    emissiveIntensity: 1.3,
    roughness: 0.25,
  }),
};

function tagWall(mesh) {
  mesh.userData.isExteriorWall = true;
  if (mesh.material) {
    mesh.userData.originalOpacity = mesh.material.opacity;
    mesh.userData.originalTransparent = mesh.material.transparent;
  }
  return mesh;
}

function tagRoof(mesh) {
  mesh.userData.isRoof = true;
  return mesh;
}

function createLedSignTexture(title, subtitle, accentHex) {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 112;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 512, 112);
  ctx.strokeStyle = accentHex || '#38bdf8';
  ctx.lineWidth = 6;
  ctx.strokeRect(4, 4, 504, 104);

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 40px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, 256, subtitle ? 40 : 56);

  if (subtitle) {
    ctx.fillStyle = accentHex || '#38bdf8';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(subtitle, 256, 82);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createHelipadTexture() {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, 256, 256);

  // Outer yellow safety ring
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(128, 128, 108, 0, Math.PI * 2);
  ctx.stroke();

  // Inner dashed white ring
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 4;
  ctx.setLineDash([12, 10]);
  ctx.beginPath();
  ctx.arc(128, 128, 86, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Crisp 'H' marking
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 110px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('H', 128, 134);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function addLedSign(group, title, subtitle, accentHex, pos, rotY = 0, width = 8) {
  const tex = createLedSignTexture(title, subtitle, accentHex);
  if (!tex) return null;
  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    emissive: 0xffffff,
    emissiveMap: tex,
    emissiveIntensity: 0.78,
    roughness: 0.3,
  });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(width, width * 0.22), mat);
  sign.position.copy(pos);
  sign.rotation.y = rotY;
  group.add(sign);
  return sign;
}

function addRooftopSolarAndAhu(group, widthX, depthZ, heightY, maxPanels = 64) {
  const panelW = 3.2;
  const panelD = 1.8;
  const cols = Math.max(1, Math.floor((widthX * 0.76) / (panelW + 1.0)));
  const rows = Math.max(1, Math.floor((depthZ * 0.68) / (panelD + 1.2)));
  const totalPanels = Math.min(maxPanels, cols * rows);

  if (totalPanels > 0) {
    const solarInst = new THREE.InstancedMesh(UNIT_BOX, MAT.solarPanel, totalPanels);
    tagRoof(solarInst);
    let idx = 0;
    for (let r = 0; r < rows && idx < totalPanels; r++) {
      for (let c = 0; c < cols && idx < totalPanels; c++) {
        const px = -((cols - 1) * (panelW + 1.0)) * 0.5 + c * (panelW + 1.0);
        const pz = -((rows - 1) * (panelD + 1.2)) * 0.5 + r * (panelD + 1.2);
        _dummy.position.set(px, heightY + 0.36, pz);
        _dummy.rotation.set(0.18, 0, 0);
        _dummy.scale.set(panelW, 0.08, panelD);
        _dummy.updateMatrix();
        solarInst.setMatrixAt(idx++, _dummy.matrix);
      }
    }
    solarInst.instanceMatrix.needsUpdate = true;
    group.add(solarInst);
  }

  const ahuCount = Math.min(6, Math.max(2, Math.floor(widthX / 16)));
  const ahuInst = new THREE.InstancedMesh(UNIT_BOX, MAT.ahuBody, ahuCount);
  tagRoof(ahuInst);
  for (let i = 0; i < ahuCount; i++) {
    const ax = -widthX * 0.32 + (i / Math.max(1, ahuCount - 1)) * (widthX * 0.64);
    _dummy.position.set(ax, heightY + 0.58, -depthZ * 0.36);
    _dummy.rotation.set(0, 0, 0);
    _dummy.scale.set(2.2, 0.78, 1.5);
    _dummy.updateMatrix();
    ahuInst.setMatrixAt(i, _dummy.matrix);
  }
  ahuInst.instanceMatrix.needsUpdate = true;
  group.add(ahuInst);
}

/**
 * 1. WH01 — 32m AS/RS High-Bay Automated Warehouse
 * Massive #546E7A warehouse with 24 West truck dock bays & East AMR dispatch apron.
 */
function buildWh01Exterior(spec) {
  const { widthX, depthZ, heightY } = spec.bounds3JS || bpBoundsTo3JS(spec.bounds_m);
  const g = new THREE.Group();
  g.name = 'Completed_WH01';

  // Concrete plinth
  const plinthH = 0.85;
  const plinth = tagWall(
    new THREE.Mesh(new THREE.BoxGeometry(widthX, plinthH, depthZ), MAT.plinth)
  );
  plinth.position.y = plinthH * 0.5;
  plinth.castShadow = true;
  plinth.receiveShadow = true;
  g.add(plinth);

  // Massive #546E7A high-bay cladding volume
  const wallH = heightY - plinthH;
  const shell = tagWall(
    new THREE.Mesh(new THREE.BoxGeometry(widthX * 0.99, wallH, depthZ * 0.99), MAT.claddingSlate.clone())
  );
  shell.position.y = plinthH + wallH * 0.5;
  shell.castShadow = true;
  shell.receiveShadow = true;
  g.add(shell);

  // Upper dark parapet trim & horizontal clerestory strip
  const parapet = tagWall(
    new THREE.Mesh(new THREE.BoxGeometry(widthX * 1.005, 0.9, depthZ * 1.005), MAT.darkTrim)
  );
  parapet.position.y = heightY - 0.45;
  g.add(parapet);

  const glassRibbon = tagWall(
    new THREE.Mesh(new THREE.BoxGeometry(widthX * 1.002, 0.85, depthZ * 1.002), MAT.clerestoryGlass)
  );
  glassRibbon.position.y = heightY * 0.78;
  g.add(glassRibbon);

  // Vertical structural pilaster ribs along East/West facades for architectural scale
  const ribCount = 8;
  const ribInst = new THREE.InstancedMesh(UNIT_BOX, MAT.darkTrim, ribCount * 2);
  tagWall(ribInst);
  let rIdx = 0;
  for (let i = 0; i < ribCount; i++) {
    const rz = -depthZ * 0.44 + (i / (ribCount - 1)) * (depthZ * 0.88);
    for (const side of [-1, 1]) {
      _dummy.position.set(side * (widthX * 0.5 + 0.08), heightY * 0.5, rz);
      _dummy.rotation.set(0, 0, 0);
      _dummy.scale.set(0.28, heightY * 0.95, 0.55);
      _dummy.updateMatrix();
      ribInst.setMatrixAt(rIdx++, _dummy.matrix);
    }
  }
  ribInst.instanceMatrix.needsUpdate = true;
  g.add(ribInst);

  // 24 West Truck Dock Bays (x = -widthX * 0.5)
  const dockCount = 24;
  const westApron = new THREE.Mesh(
    new THREE.BoxGeometry(5.5, 0.14, depthZ * 0.96),
    MAT.apron
  );
  westApron.position.set(-widthX * 0.5 - 2.75, 0.07, 0);
  westApron.receiveShadow = true;
  g.add(westApron);

  const dockDoorInst = new THREE.InstancedMesh(UNIT_BOX, MAT.dockDoor, dockCount);
  const dockCanopyInst = new THREE.InstancedMesh(UNIT_BOX, MAT.darkTrim, dockCount);
  const bollardInst = new THREE.InstancedMesh(UNIT_CYL, MAT.bollardYellow, dockCount * 2);
  let bIdx = 0;

  for (let i = 0; i < dockCount; i++) {
    const dz = -depthZ * 0.45 + (i / (dockCount - 1)) * (depthZ * 0.9);
    // Sectional door
    _dummy.position.set(-widthX * 0.5 - 0.06, 1.15, dz);
    _dummy.rotation.set(0, 0, 0);
    _dummy.scale.set(0.22, 1.9, 1.85);
    _dummy.updateMatrix();
    dockDoorInst.setMatrixAt(i, _dummy.matrix);

    // Dock shelter/canopy
    _dummy.position.set(-widthX * 0.5 - 0.45, 2.25, dz);
    _dummy.scale.set(0.9, 0.2, 2.1);
    _dummy.updateMatrix();
    dockCanopyInst.setMatrixAt(i, _dummy.matrix);

    // Pair of yellow safety bollards
    for (const bOff of [-1.15, 1.15]) {
      _dummy.position.set(-widthX * 0.5 - 0.85, 0.45, dz + bOff);
      _dummy.scale.set(0.2, 0.75, 0.2);
      _dummy.updateMatrix();
      bollardInst.setMatrixAt(bIdx++, _dummy.matrix);
    }
  }
  dockDoorInst.instanceMatrix.needsUpdate = true;
  dockCanopyInst.instanceMatrix.needsUpdate = true;
  bollardInst.instanceMatrix.needsUpdate = true;
  g.add(dockDoorInst, dockCanopyInst, bollardInst);

  // East AMR Dispatch Apron (x = +widthX * 0.5)
  const eastApron = new THREE.Mesh(
    new THREE.BoxGeometry(6.0, 0.14, depthZ * 0.88),
    MAT.apron
  );
  eastApron.position.set(widthX * 0.5 + 3.0, 0.07, 0);
  eastApron.receiveShadow = true;
  g.add(eastApron);

  // AMR Dispatch Canopy + 6 High-Speed Automated Doors + Cyan AMR guide stripes
  const amrCanopy = new THREE.Mesh(
    new THREE.BoxGeometry(3.8, 0.22, depthZ * 0.72),
    MAT.darkTrim
  );
  amrCanopy.position.set(widthX * 0.5 + 1.9, 2.8, 0);
  g.add(amrCanopy);

  const amrDoors = new THREE.InstancedMesh(UNIT_BOX, MAT.clerestoryGlass, 6);
  const amrStripes = new THREE.InstancedMesh(UNIT_BOX, MAT.amrStripe, 6);
  for (let i = 0; i < 6; i++) {
    const az = -depthZ * 0.3 + (i / 5) * (depthZ * 0.6);
    _dummy.position.set(widthX * 0.5 + 0.06, 1.25, az);
    _dummy.rotation.set(0, 0, 0);
    _dummy.scale.set(0.2, 2.2, 2.6);
    _dummy.updateMatrix();
    amrDoors.setMatrixAt(i, _dummy.matrix);

    _dummy.position.set(widthX * 0.5 + 3.0, 0.16, az);
    _dummy.scale.set(5.4, 0.04, 0.45);
    _dummy.updateMatrix();
    amrStripes.setMatrixAt(i, _dummy.matrix);
  }
  amrDoors.instanceMatrix.needsUpdate = true;
  amrStripes.instanceMatrix.needsUpdate = true;
  g.add(amrDoors, amrStripes);

  // Roof deck + Solar PV + AHU + Aviation Beacons (32m high-bay)
  const roof = tagRoof(
    new THREE.Mesh(new THREE.BoxGeometry(widthX * 1.01, 0.25, depthZ * 1.01), MAT.roofDeck)
  );
  roof.position.y = heightY + 0.12;
  g.add(roof);
  addRooftopSolarAndAhu(g, widthX, depthZ, heightY, 72);

  const beacons = [];
  for (const [bx, bz] of [
    [-widthX * 0.46, -depthZ * 0.46],
    [widthX * 0.46, depthZ * 0.46],
  ]) {
    const beacon = tagRoof(new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 8), MAT.beaconRed.clone()));
    beacon.position.set(bx, heightY + 0.55, bz);
    g.add(beacon);
    beacons.push(beacon);
  }
  g.userData.beacons = beacons;

  addLedSign(g, 'WH01 AS/RS', '32M HIGH-BAY • 80,000 PALLETS', '#546E7A', new THREE.Vector3(0, heightY * 0.88, depthZ * 0.5 + 0.16), 0, 12);
  addLedSign(g, 'WH01 DOCKS 1-24', 'WEST TRUCK BAY', '#FACC15', new THREE.Vector3(-widthX * 0.5 - 0.18, heightY * 0.65, 0), -Math.PI * 0.5, 11);

  return g;
}

/**
 * 2. F08-1..5 — On-Site JIS Supplier Park (#00838F)
 * F08-1 features external plastic resin silos; F08-2 & F08-5 have SB-05 skybridge portals.
 */
function buildSupplierParkExterior(spec) {
  const { widthX, depthZ, heightY } = spec.bounds3JS || bpBoundsTo3JS(spec.bounds_m);
  const g = new THREE.Group();
  g.name = `Completed_${spec.id}`;

  const plinthH = 0.6;
  const plinth = tagWall(
    new THREE.Mesh(new THREE.BoxGeometry(widthX, plinthH, depthZ), MAT.plinth)
  );
  plinth.position.y = plinthH * 0.5;
  plinth.receiveShadow = true;
  g.add(plinth);

  const wallH = heightY - plinthH;
  const shell = tagWall(
    new THREE.Mesh(new THREE.BoxGeometry(widthX * 0.99, wallH, depthZ * 0.99), MAT.claddingWhite.clone())
  );
  shell.position.y = plinthH + wallH * 0.5;
  shell.castShadow = true;
  shell.receiveShadow = true;
  g.add(shell);

  // #00838F JIS Teal accent fascia band
  const bandH = Math.min(1.05, heightY * 0.22);
  const band = tagWall(
    new THREE.Mesh(new THREE.BoxGeometry(widthX * 1.004, bandH, depthZ * 1.004), MAT.tealAccent)
  );
  band.position.y = heightY - bandH * 0.55;
  g.add(band);

  // Clerestory glazing ribbon (2 bands if 2 floors like F08-5)
  const floors = spec.floors || 1;
  for (let f = 0; f < floors; f++) {
    const glassY = floors === 1 ? heightY * 0.62 : (heightY * (f + 0.55)) / floors;
    const glass = tagWall(
      new THREE.Mesh(new THREE.BoxGeometry(widthX * 1.002, 0.65, depthZ * 1.002), MAT.clerestoryGlass)
    );
    glass.position.y = glassY;
    g.add(glass);
  }

  // Logistics Dock Doors on South facade
  const doorCount = Math.max(4, Math.min(10, Math.floor(widthX / 7)));
  const dockInst = new THREE.InstancedMesh(UNIT_BOX, MAT.dockDoor, doorCount);
  for (let i = 0; i < doorCount; i++) {
    const dx = -widthX * 0.38 + (i / (doorCount - 1)) * (widthX * 0.76);
    _dummy.position.set(dx, 0.95, depthZ * 0.5 + 0.06);
    _dummy.rotation.set(0, 0, 0);
    _dummy.scale.set(1.8, 1.75, 0.18);
    _dummy.updateMatrix();
    dockInst.setMatrixAt(i, _dummy.matrix);
  }
  dockInst.instanceMatrix.needsUpdate = true;
  g.add(dockInst);

  // Roof + Solar PV + AHU
  const roof = tagRoof(
    new THREE.Mesh(new THREE.BoxGeometry(widthX * 1.01, 0.22, depthZ * 1.01), MAT.roofDeck)
  );
  roof.position.y = heightY + 0.11;
  g.add(roof);
  addRooftopSolarAndAhu(g, widthX, depthZ, heightY, 48);

  // F08-1 Special: External Plastic Resin Silos along West flank
  if (spec.id === 'F08-1') {
    const siloCount = 6;
    const siloR = 1.35;
    const siloH = heightY * 1.18;
    const siloInst = new THREE.InstancedMesh(UNIT_CYL, MAT.siloWhite, siloCount);
    const coneGeo = new THREE.ConeGeometry(siloR, 1.2, 14);
    const coneInst = new THREE.InstancedMesh(coneGeo, MAT.silverMetal, siloCount);

    for (let i = 0; i < siloCount; i++) {
      const sz = -depthZ * 0.34 + (i / (siloCount - 1)) * (depthZ * 0.68);
      _dummy.position.set(-widthX * 0.5 - siloR - 0.6, siloH * 0.5 + 0.8, sz);
      _dummy.rotation.set(0, 0, 0);
      _dummy.scale.set(siloR * 2, siloH, siloR * 2);
      _dummy.updateMatrix();
      siloInst.setMatrixAt(i, _dummy.matrix);

      _dummy.position.set(-widthX * 0.5 - siloR - 0.6, siloH + 1.4, sz);
      _dummy.scale.set(1, 1, 1);
      _dummy.updateMatrix();
      coneInst.setMatrixAt(i, _dummy.matrix);
    }
    siloInst.instanceMatrix.needsUpdate = true;
    coneInst.instanceMatrix.needsUpdate = true;
    g.add(siloInst, coneInst);

    // Overhead pneumatic resin feed pipe manifold
    const manifold = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.35, depthZ * 0.72),
      MAT.silverMetal
    );
    manifold.position.set(-widthX * 0.5 - 0.7, heightY * 0.78, 0);
    g.add(manifold);
  }

  // F08-2 & F08-5 Special: Skybridge SB-05 connection portal vestibule on North facade
  if (spec.id === 'F08-2' || spec.id === 'F08-5') {
    const portal = new THREE.Mesh(
      new THREE.BoxGeometry(5.5, 2.6, 2.2),
      MAT.tealAccent
    );
    portal.position.set(0, heightY * 0.72, -depthZ * 0.5 - 0.9);
    g.add(portal);
  }

  const subMap = {
    'F08-1': 'PLASTIC INJECTION & RESIN',
    'F08-2': 'JIS SEAT PLANT -> SB-05',
    'F08-3': '2000MPa HOT STAMPING',
    'F08-4': 'COCKPIT & GLAZING',
    'F08-5': 'HV/LV WIRING HARNESS',
  };
  addLedSign(
    g,
    spec.id,
    subMap[spec.id] || 'SUPPLIER PARK',
    '#00838F',
    new THREE.Vector3(0, heightY * 0.84, depthZ * 0.5 + 0.15),
    0,
    9.5
  );

  return g;
}

/**
 * 3. IOC01 — 8-Story Glass HQ & AI Data Center (36m)
 * Iconic blue glass curtain wall with 8 floor spandrels, arched lobby canopy,
 * front plaza fountain, and rooftop Helipad (H).
 */
function buildIoc01Exterior(spec) {
  const { widthX, depthZ, heightY } = spec.bounds3JS || bpBoundsTo3JS(spec.bounds_m);
  const floors = spec.floors || 8;
  const g = new THREE.Group();
  g.name = 'Completed_IOC01';

  // Granite / precast podium plinth
  const plinthH = 1.1;
  const plinth = tagWall(
    new THREE.Mesh(new THREE.BoxGeometry(widthX * 1.04, plinthH, depthZ * 1.04), MAT.plinth)
  );
  plinth.position.y = plinthH * 0.5;
  plinth.receiveShadow = true;
  g.add(plinth);

  // Main 8-story reflective blue glass curtain wall core
  const towerH = heightY - plinthH;
  const glassCore = tagWall(
    new THREE.Mesh(new THREE.BoxGeometry(widthX * 0.96, towerH, depthZ * 0.96), MAT.iocCurtainGlass.clone())
  );
  glassCore.position.y = plinthH + towerH * 0.5;
  glassCore.castShadow = true;
  glassCore.receiveShadow = true;
  g.add(glassCore);

  // 8 distinct floor spandrels (horizontal anodized aluminum bands)
  const spandrelInst = new THREE.InstancedMesh(UNIT_BOX, MAT.iocMullion, floors);
  tagWall(spandrelInst);
  for (let f = 0; f < floors; f++) {
    const sy = plinthH + ((f + 1) / floors) * towerH;
    _dummy.position.set(0, sy, 0);
    _dummy.rotation.set(0, 0, 0);
    _dummy.scale.set(widthX * 0.975, 0.28, depthZ * 0.975);
    _dummy.updateMatrix();
    spandrelInst.setMatrixAt(f, _dummy.matrix);
  }
  spandrelInst.instanceMatrix.needsUpdate = true;
  g.add(spandrelInst);

  // Vertical curtain wall mullions (InstancedMesh around perimeter)
  const colsX = 9;
  const colsZ = 7;
  const totalMullions = colsX * 2 + colsZ * 2;
  const mullionInst = new THREE.InstancedMesh(UNIT_BOX, MAT.iocMullion, totalMullions);
  tagWall(mullionInst);
  let mIdx = 0;
  for (let i = 0; i < colsX; i++) {
    const mx = -widthX * 0.44 + (i / (colsX - 1)) * (widthX * 0.88);
    for (const side of [-1, 1]) {
      _dummy.position.set(mx, plinthH + towerH * 0.5, side * depthZ * 0.485);
      _dummy.rotation.set(0, 0, 0);
      _dummy.scale.set(0.18, towerH, 0.18);
      _dummy.updateMatrix();
      mullionInst.setMatrixAt(mIdx++, _dummy.matrix);
    }
  }
  for (let j = 0; j < colsZ; j++) {
    const mz = -depthZ * 0.42 + (j / (colsZ - 1)) * (depthZ * 0.84);
    for (const side of [-1, 1]) {
      _dummy.position.set(side * widthX * 0.485, plinthH + towerH * 0.5, mz);
      _dummy.rotation.set(0, 0, 0);
      _dummy.scale.set(0.18, towerH, 0.18);
      _dummy.updateMatrix();
      mullionInst.setMatrixAt(mIdx++, _dummy.matrix);
    }
  }
  mullionInst.instanceMatrix.needsUpdate = true;
  g.add(mullionInst);

  // Arched Lobby Canopy on South entrance (z = +depthZ * 0.5)
  const canopyGroup = new THREE.Group();
  canopyGroup.position.set(0, 0, depthZ * 0.5 + 2.8);
  const archGeo = new THREE.CylinderGeometry(3.8, 3.8, 7.2, 16, 1, true, 0, Math.PI);
  const archMesh = new THREE.Mesh(archGeo, MAT.silverMetal);
  archMesh.rotation.z = Math.PI * 0.5;
  archMesh.rotation.y = Math.PI * 0.5;
  archMesh.position.y = 2.6;
  canopyGroup.add(archMesh);

  const archGlass = new THREE.Mesh(
    new THREE.CylinderGeometry(3.68, 3.68, 7.0, 16, 1, true, 0, Math.PI),
    MAT.clerestoryGlass
  );
  archGlass.rotation.z = Math.PI * 0.5;
  archGlass.rotation.y = Math.PI * 0.5;
  archGlass.position.y = 2.6;
  canopyGroup.add(archGlass);

  // Canopy support columns
  for (const cx of [-3.5, 3.5]) {
    for (const cz of [-2.2, 2.2]) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 2.7, 8), MAT.silverMetal);
      col.position.set(cx, 1.35, cz);
      canopyGroup.add(col);
    }
  }
  g.add(canopyGroup);

  // Front Plaza & Fountain (South of canopy)
  const plaza = new THREE.Mesh(
    new THREE.BoxGeometry(widthX * 0.85, 0.12, 11.5),
    MAT.apron
  );
  plaza.position.set(0, 0.06, depthZ * 0.5 + 7.2);
  plaza.receiveShadow = true;
  g.add(plaza);

  const fountainRim = new THREE.Mesh(
    new THREE.CylinderGeometry(3.8, 4.1, 0.45, 24),
    MAT.plinth
  );
  fountainRim.position.set(0, 0.28, depthZ * 0.5 + 8.6);
  g.add(fountainRim);

  const fountainPool = new THREE.Mesh(
    new THREE.CylinderGeometry(3.45, 3.45, 0.35, 24),
    MAT.fountainWater
  );
  fountainPool.position.set(0, 0.36, depthZ * 0.5 + 8.6);
  g.add(fountainPool);

  const fountainJet = new THREE.Mesh(
    new THREE.ConeGeometry(0.85, 1.85, 12),
    MAT.fountainFoam
  );
  fountainJet.position.set(0, 1.35, depthZ * 0.5 + 8.6);
  g.add(fountainJet);
  g.userData.fountainJet = fountainJet;

  // Architectural roof parapet + Rooftop Helipad (H)
  const roofDeck = tagRoof(
    new THREE.Mesh(new THREE.BoxGeometry(widthX * 0.99, 0.35, depthZ * 0.99), MAT.darkTrim)
  );
  roofDeck.position.y = heightY + 0.15;
  g.add(roofDeck);

  const helipadTex = createHelipadTexture();
  const helipadTopMat = helipadTex
    ? new THREE.MeshStandardMaterial({ map: helipadTex, roughness: 0.6, metalness: 0.15 })
    : MAT.asphalt;
  const helipad = tagRoof(
    new THREE.Mesh(
      new THREE.CylinderGeometry(6.8, 7.2, 0.45, 24),
      [MAT.silverMetal, helipadTopMat, MAT.silverMetal]
    )
  );
  helipad.position.set(0, heightY + 0.55, 0);
  g.add(helipad);

  // Helipad perimeter green lights & corner aviation beacons
  const padLights = new THREE.InstancedMesh(UNIT_BOX, MAT.helipadGreen, 8);
  tagRoof(padLights);
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    _dummy.position.set(Math.cos(angle) * 6.9, heightY + 0.8, Math.sin(angle) * 6.9);
    _dummy.rotation.set(0, 0, 0);
    _dummy.scale.set(0.28, 0.16, 0.28);
    _dummy.updateMatrix();
    padLights.setMatrixAt(i, _dummy.matrix);
  }
  padLights.instanceMatrix.needsUpdate = true;
  g.add(padLights);

  const beacons = [];
  for (const [bx, bz] of [
    [-widthX * 0.46, -depthZ * 0.46],
    [widthX * 0.46, depthZ * 0.46],
  ]) {
    const b = tagRoof(new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), MAT.beaconRed.clone()));
    b.position.set(bx, heightY + 0.6, bz);
    g.add(b);
    beacons.push(b);
  }
  g.userData.beacons = beacons;

  addLedSign(
    g,
    'IOC01 HQ',
    'AI DATA CENTER • 8 FLOORS',
    '#38BDF8',
    new THREE.Vector3(0, heightY - 0.85, depthZ * 0.485 + 0.2),
    0,
    11
  );

  return g;
}

/**
 * 4. RD01 — R&D, Climatic Wind Tunnel & 200m Crash Test Track Hall
 */
function buildRd01Exterior(spec) {
  const { widthX, depthZ, heightY } = spec.bounds3JS || bpBoundsTo3JS(spec.bounds_m);
  const g = new THREE.Group();
  g.name = 'Completed_RD01';

  // Base site pad
  const sitePad = new THREE.Mesh(
    new THREE.BoxGeometry(widthX * 0.98, 0.18, depthZ * 0.98),
    MAT.apron
  );
  sitePad.position.y = 0.09;
  sitePad.receiveShadow = true;
  g.add(sitePad);

  // A. 2-Story R&D Lab Block (South-West quadrant)
  const labW = widthX * 0.48;
  const labD = depthZ * 0.48;
  const labH = heightY;
  const labShell = tagWall(
    new THREE.Mesh(new THREE.BoxGeometry(labW, labH, labD), MAT.claddingWhite.clone())
  );
  labShell.position.set(-widthX * 0.22, labH * 0.5 + 0.18, depthZ * 0.21);
  labShell.castShadow = true;
  labShell.receiveShadow = true;
  g.add(labShell);

  const labBand = tagWall(
    new THREE.Mesh(new THREE.BoxGeometry(labW * 1.005, 0.9, labD * 1.005), MAT.blueAccent)
  );
  labBand.position.set(-widthX * 0.22, labH - 0.35, depthZ * 0.21);
  g.add(labBand);

  for (let f = 0; f < 2; f++) {
    const glass = tagWall(
      new THREE.Mesh(new THREE.BoxGeometry(labW * 1.003, 0.85, labD * 1.003), MAT.clerestoryGlass)
    );
    glass.position.set(-widthX * 0.22, labH * (f === 0 ? 0.32 : 0.72), depthZ * 0.21);
    g.add(glass);
  }

  const labRoof = tagRoof(
    new THREE.Mesh(new THREE.BoxGeometry(labW * 1.01, 0.22, labD * 1.01), MAT.roofDeck)
  );
  labRoof.position.set(-widthX * 0.22, labH + 0.28, depthZ * 0.21);
  g.add(labRoof);

  // B. Giant Closed-Loop Tubular Climatic Wind Tunnel (North-West quadrant)
  const wtGroup = new THREE.Group();
  wtGroup.position.set(-widthX * 0.22, 0, -depthZ * 0.24);
  const wtLen = labW * 0.86;
  const wtSep = labD * 0.56;
  const tubeR = 2.0;
  const tubeY = 2.55;

  // Two long straight aerodynamic ducts along X
  for (const zSign of [-1, 1]) {
    const duct = new THREE.Mesh(
      new THREE.CylinderGeometry(tubeR, tubeR, wtLen, 16),
      MAT.silverMetal
    );
    duct.rotation.z = Math.PI * 0.5;
    duct.position.set(0, tubeY, zSign * wtSep * 0.5);
    duct.castShadow = true;
    wtGroup.add(duct);
  }

  // Two return cross-ducts along Z
  for (const xSign of [-1, 1]) {
    const cross = new THREE.Mesh(
      new THREE.CylinderGeometry(tubeR * 0.92, tubeR * 0.92, wtSep, 16),
      MAT.silverMetal
    );
    cross.rotation.x = Math.PI * 0.5;
    cross.position.set(xSign * wtLen * 0.5, tubeY, 0);
    cross.castShadow = true;
    wtGroup.add(cross);

    // Corner turning-vane housings
    for (const zSign of [-1, 1]) {
      const corner = new THREE.Mesh(
        new THREE.BoxGeometry(tubeR * 2.25, tubeR * 2.25, tubeR * 2.25),
        MAT.blueAccent
      );
      corner.position.set(xSign * wtLen * 0.5, tubeY, zSign * wtSep * 0.5);
      wtGroup.add(corner);
    }
  }

  // Central Aero Test Chamber & Fan Drive Shroud
  const testChamber = new THREE.Mesh(
    new THREE.BoxGeometry(8.5, 4.8, 6.2),
    MAT.darkTrim
  );
  testChamber.position.set(0, tubeY, wtSep * 0.5);
  wtGroup.add(testChamber);

  const fanShroud = new THREE.Mesh(
    new THREE.CylinderGeometry(tubeR * 1.32, tubeR * 1.32, 3.6, 16),
    MAT.blueAccent
  );
  fanShroud.rotation.z = Math.PI * 0.5;
  fanShroud.position.set(0, tubeY, -wtSep * 0.5);
  wtGroup.add(fanShroud);

  // Support cradles under wind tunnel
  const cradleInst = new THREE.InstancedMesh(UNIT_BOX, MAT.plinth, 8);
  let crIdx = 0;
  for (const xOff of [-wtLen * 0.32, 0, wtLen * 0.32]) {
    for (const zSign of [-1, 1]) {
      _dummy.position.set(xOff, tubeY * 0.35, zSign * wtSep * 0.5);
      _dummy.rotation.set(0, 0, 0);
      _dummy.scale.set(1.2, tubeY * 0.7, 2.8);
      _dummy.updateMatrix();
      cradleInst.setMatrixAt(crIdx++, _dummy.matrix);
    }
  }
  for (const xSign of [-1, 1]) {
    _dummy.position.set(xSign * wtLen * 0.5, tubeY * 0.35, 0);
    _dummy.scale.set(2.8, tubeY * 0.7, 1.2);
    _dummy.updateMatrix();
    cradleInst.setMatrixAt(crIdx++, _dummy.matrix);
  }
  cradleInst.instanceMatrix.needsUpdate = true;
  wtGroup.add(cradleInst);
  g.add(wtGroup);

  // C. 200m Crash Test Track Hall (East wing: 50+ Three.js units long along Z)
  const crashW = widthX * 0.36;
  const crashD = depthZ * 0.88; // ~66 units (> 200m at 0.25 scale)
  const crashH = heightY * 0.82;
  const crashHall = tagWall(
    new THREE.Mesh(new THREE.BoxGeometry(crashW, crashH, crashD), MAT.claddingSlate.clone())
  );
  crashHall.position.set(widthX * 0.28, crashH * 0.5 + 0.18, 0);
  crashHall.castShadow = true;
  crashHall.receiveShadow = true;
  g.add(crashHall);

  const crashStripe = tagWall(
    new THREE.Mesh(new THREE.BoxGeometry(crashW * 1.005, 0.75, crashD * 1.002), MAT.blueAccent)
  );
  crashStripe.position.set(widthX * 0.28, crashH - 0.3, 0);
  g.add(crashStripe);

  const crashRoof = tagRoof(
    new THREE.Mesh(new THREE.BoxGeometry(crashW * 1.01, 0.22, crashD * 1.01), MAT.roofDeck)
  );
  crashRoof.position.set(widthX * 0.28, crashH + 0.28, 0);
  g.add(crashRoof);

  // High-speed camera dome skylights along Crash Test Hall roof
  const domeInst = new THREE.InstancedMesh(UNIT_BOX, MAT.clerestoryGlass, 6);
  tagRoof(domeInst);
  for (let i = 0; i < 6; i++) {
    const dz = -crashD * 0.38 + (i / 5) * (crashD * 0.76);
    _dummy.position.set(widthX * 0.28, crashH + 0.5, dz);
    _dummy.rotation.set(0, 0, 0);
    _dummy.scale.set(crashW * 0.45, 0.35, 4.2);
    _dummy.updateMatrix();
    domeInst.setMatrixAt(i, _dummy.matrix);
  }
  domeInst.instanceMatrix.needsUpdate = true;
  g.add(domeInst);

  // Reinforced Crash Impact Barrier Block at North end of Crash Hall
  const barrier = new THREE.Mesh(
    new THREE.BoxGeometry(crashW * 0.75, crashH * 0.75, 2.2),
    MAT.bollardYellow
  );
  barrier.position.set(widthX * 0.28, crashH * 0.4, -crashD * 0.48);
  g.add(barrier);

  addLedSign(
    g,
    'RD01 R&D',
    'WIND TUNNEL • 200M CRASH LAB',
    '#1976D2',
    new THREE.Vector3(-widthX * 0.22, labH * 0.86, depthZ * 0.45 + 0.2),
    0,
    10.5
  );

  return g;
}

/**
 * 5. UT05 — 3-Story EV Fire Station, Medical Clinic & Canteen (#C62828)
 * Features 4 red fire-truck garage bays on the ground floor.
 */
function buildUt05Exterior(spec) {
  const { widthX, depthZ, heightY } = spec.bounds3JS || bpBoundsTo3JS(spec.bounds_m);
  const floors = spec.floors || 3;
  const g = new THREE.Group();
  g.name = 'Completed_UT05';

  // Concrete apron in front of fire bays
  const apron = new THREE.Mesh(
    new THREE.BoxGeometry(widthX * 0.96, 0.14, depthZ + 5.5),
    MAT.apron
  );
  apron.position.set(0, 0.07, 2.2);
  apron.receiveShadow = true;
  g.add(apron);

  // Main 3-story #C62828 Fire Red & White body
  const plinthH = 0.45;
  const wallH = heightY - plinthH;
  const shell = tagWall(
    new THREE.Mesh(new THREE.BoxGeometry(widthX * 0.96, wallH, depthZ * 0.94), MAT.fireRed.clone())
  );
  shell.position.y = plinthH + wallH * 0.5;
  shell.castShadow = true;
  shell.receiveShadow = true;
  g.add(shell);

  // Crisp white horizontal floor spandrels & clinic/canteen glazing for floors 2 & 3
  for (let f = 1; f < floors; f++) {
    const fy = (heightY * f) / floors;
    const spandrel = tagWall(
      new THREE.Mesh(new THREE.BoxGeometry(widthX * 0.975, 0.28, depthZ * 0.955), MAT.claddingWhite)
    );
    spandrel.position.y = fy;
    g.add(spandrel);

    const winBand = tagWall(
      new THREE.Mesh(new THREE.BoxGeometry(widthX * 0.97, 0.62, depthZ * 0.95), MAT.clerestoryGlass)
    );
    winBand.position.y = fy + 0.55;
    g.add(winBand);
  }

  // 4 Red Fire-Truck Garage Bays along South facade
  const bayCount = 4;
  const bayW = Math.min(5.8, (widthX * 0.72) / bayCount);
  const bayH = (heightY / floors) * 1.15;
  const frameInst = new THREE.InstancedMesh(UNIT_BOX, MAT.claddingWhite, bayCount);
  const doorInst = new THREE.InstancedMesh(UNIT_BOX, MAT.fireDoorGlass, bayCount);
  const lightInst = new THREE.InstancedMesh(UNIT_BOX, MAT.beaconRed, bayCount);
  const stripeInst = new THREE.InstancedMesh(UNIT_BOX, MAT.bollardYellow, bayCount);

  for (let i = 0; i < bayCount; i++) {
    const bx = -widthX * 0.3 + (i / (bayCount - 1)) * (widthX * 0.6);
    // White bay surround frame
    _dummy.position.set(bx, bayH * 0.5 + 0.14, depthZ * 0.47 + 0.08);
    _dummy.rotation.set(0, 0, 0);
    _dummy.scale.set(bayW + 0.5, bayH + 0.25, 0.25);
    _dummy.updateMatrix();
    frameInst.setMatrixAt(i, _dummy.matrix);

    // Glazed sectional fire-truck door
    _dummy.position.set(bx, bayH * 0.5 + 0.1, depthZ * 0.47 + 0.18);
    _dummy.scale.set(bayW - 0.2, bayH - 0.1, 0.16);
    _dummy.updateMatrix();
    doorInst.setMatrixAt(i, _dummy.matrix);

    // Emergency beacon bar above bay
    _dummy.position.set(bx, bayH + 0.35, depthZ * 0.47 + 0.24);
    _dummy.scale.set(1.2, 0.22, 0.22);
    _dummy.updateMatrix();
    lightInst.setMatrixAt(i, _dummy.matrix);

    // Apron yellow bay lane box
    _dummy.position.set(bx, 0.15, depthZ * 0.47 + 2.6);
    _dummy.scale.set(bayW * 0.85, 0.03, 4.2);
    _dummy.updateMatrix();
    stripeInst.setMatrixAt(i, _dummy.matrix);
  }
  frameInst.instanceMatrix.needsUpdate = true;
  doorInst.instanceMatrix.needsUpdate = true;
  lightInst.instanceMatrix.needsUpdate = true;
  stripeInst.instanceMatrix.needsUpdate = true;
  g.add(frameInst, doorInst, lightInst, stripeInst);

  // Roof deck + Solar PV + HVAC
  const roof = tagRoof(
    new THREE.Mesh(new THREE.BoxGeometry(widthX * 0.98, 0.22, depthZ * 0.96), MAT.roofDeck)
  );
  roof.position.y = heightY + 0.11;
  g.add(roof);
  addRooftopSolarAndAhu(g, widthX * 0.9, depthZ * 0.85, heightY, 24);

  addLedSign(
    g,
    'UT05 FIRE & MED',
    'EV FIRE STATION • CLINIC • CANTEEN',
    '#C62828',
    new THREE.Vector3(0, heightY - 0.4, depthZ * 0.475 + 0.2),
    0,
    9.5
  );

  return g;
}

const EXTERIOR_BUILDERS = {
  WH01: buildWh01Exterior,
  'F08-1': buildSupplierParkExterior,
  'F08-2': buildSupplierParkExterior,
  'F08-3': buildSupplierParkExterior,
  'F08-4': buildSupplierParkExterior,
  'F08-5': buildSupplierParkExterior,
  IOC01: buildIoc01Exterior,
  RD01: buildRd01Exterior,
  UT05: buildUt05Exterior,
};

/**
 * Builds and returns the South Cluster, Supplier Park, HQ & R&D group
 * along with per-building staged controllers and an update loop.
 *
 * @param {import('../core/constructionTimeline.js').ConstructionTimelineController} [timelineController]
 * @returns {{ group: THREE.Group, buildingControllers: Record<string, ReturnType<typeof createStagedBuildingController>>, update: (elapsedTime: number, currentMonth: number, isCutaway?: boolean) => void }}
 */
export function buildSouthSupplierAndRd(timelineController) {
  const group = new THREE.Group();
  group.name = 'Gigafactory_South_Supplier_RD';

  const buildingControllers = {};

  for (const id of TARGET_BUILDING_IDS) {
    const spec = getBuildingSpecById(id);
    if (!spec) continue;

    const controller = createStagedBuildingController(spec, EXTERIOR_BUILDERS[id]);
    buildingControllers[id] = controller;
    group.add(controller.group);
  }

  function update(elapsedTime = 0, currentMonth = 0, isCutaway = false) {
    for (const id of TARGET_BUILDING_IDS) {
      const controller = buildingControllers[id];
      if (!controller) continue;

      const stageState =
        timelineController && typeof timelineController.getBuildingState === 'function'
          ? timelineController.getBuildingState(id)
          : getBuildingStageAtMonth(id, currentMonth);

      controller.updateStage(
        stageState.stageIndex,
        stageState.stageProgress,
        elapsedTime,
        isCutaway
      );

      // Subtle operational animations in Stage 4
      if (stageState.stageIndex === 4) {
        const ext = controller.group.getObjectByName(`Completed_${id}`);
        if (ext?.userData?.fountainJet) {
          const pulse = 0.85 + 0.25 * Math.sin(elapsedTime * 4.2);
          ext.userData.fountainJet.scale.set(1, pulse, 1);
        }
        if (ext?.userData?.beacons) {
          const blink = 0.9 + 0.8 * Math.max(0, Math.sin(elapsedTime * 3.1));
          ext.userData.beacons.forEach((b) => {
            if (b.material) b.material.emissiveIntensity = blink;
          });
        }
      }
    }
  }

  return {
    group,
    buildingControllers,
    update,
  };
}
