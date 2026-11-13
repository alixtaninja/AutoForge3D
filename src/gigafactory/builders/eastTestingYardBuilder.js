import * as THREE from 'three';
import {
  WORLD_SCALE,
  HEIGHT_SCALE,
  SCENIC_PROP_BOOST,
  getBuildingSpecById,
  getBuildingStageAtMonth,
} from '../config/masterSpecLoader.js';
import { createStagedBuildingController } from './stageRenderer.js';
import { buildSleekCar } from '../../factoryBuilder.js';

/**
 * TASK-012: East Testing, EOL Calibration & Solar Finished-Vehicle Yard Builder
 * Wraps F09 (EOL & ADAS Calibration), PG01 (16-Surface Proving Ground 3.8km),
 * and LY01 (Solar Finished-Vehicle Yard) with createStagedBuildingController.
 */

const UNIT_BOX_GEO = new THREE.BoxGeometry(1, 1, 1);
const UNIT_CYL_GEO = new THREE.CylinderGeometry(0.5, 0.5, 1, 10);
const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

const SHARED_MAT = {
  asphalt: new THREE.MeshStandardMaterial({ color: 0x26292e, roughness: 0.88, metalness: 0.06 }),
  trackAsphalt: new THREE.MeshStandardMaterial({ color: 0x1e2228, roughness: 0.82, metalness: 0.08 }),
  concreteApron: new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.86, metalness: 0.06 }),
  infieldGrass: new THREE.MeshStandardMaterial({ color: 0x3b5e3a, roughness: 0.94, metalness: 0.02 }),
  plinth: new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.88, metalness: 0.06 }),
  cladding: new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.52, metalness: 0.25 }),
  roofDeck: new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.7, metalness: 0.2 }),
  solarPanel: new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.22, metalness: 0.58 }),
  galvSteel: new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.38, metalness: 0.78 }),
  darkSteel: new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.45, metalness: 0.72 }),
  f09Accent: new THREE.MeshStandardMaterial({ color: 0x388e3c, roughness: 0.42, metalness: 0.3 }),
  glass: new THREE.MeshStandardMaterial({
    color: 0x93c5fd,
    emissive: 0x1e3a8a,
    emissiveIntensity: 0.28,
    roughness: 0.12,
    metalness: 0.25,
    transparent: true,
    opacity: 0.68,
  }),
  cabinGlass: new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1, metalness: 0.85 }),
  carBodyWhite: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.26, metalness: 0.38 }),
  yellowSafety: new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.45, metalness: 0.15 }),
  whiteStripe: new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.6, metalness: 0.05 }),
  barrierRed: new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.5, metalness: 0.12 }),
  barrierWhite: new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5, metalness: 0.12 }),
  cobble: new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.92, metalness: 0.05 }),
  water: new THREE.MeshStandardMaterial({
    color: 0x0ea5e9,
    emissive: 0x0369a1,
    emissiveIntensity: 0.22,
    roughness: 0.08,
    metalness: 0.35,
    transparent: true,
    opacity: 0.8,
  }),
  chargerBody: new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.35, metalness: 0.25 }),
  chargerGlow: new THREE.MeshStandardMaterial({
    color: 0x22d3ee,
    emissive: 0x06b6d4,
    emissiveIntensity: 1.4,
    roughness: 0.2,
  }),
  gateLedGreen: new THREE.MeshStandardMaterial({
    color: 0x4ade80,
    emissive: 0x22c55e,
    emissiveIntensity: 1.2,
    roughness: 0.25,
  }),
  orangeCone: new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.5, metalness: 0.05 }),
  ahuBody: new THREE.MeshStandardMaterial({ color: 0xdbe4ee, roughness: 0.4, metalness: 0.55 }),
};

const EV_YARD_PALETTE = [
  0xf8fafc, // Pearl White
  0x1e293b, // Obsidian Slate
  0x2563eb, // Electric Blue
  0xdc2626, // Crimson Red
  0x059669, // Emerald EV Green
  0x94a3b8, // Liquid Silver
  0xea580c, // Sunset Copper
  0x475569, // Cyber Graphite
];

function createSignTexture(title, subtitle, accentHex = '#388e3c') {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 6;
  ctx.strokeRect(4, 4, 504, 120);

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 42px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, 256, 48);

  ctx.fillStyle = '#93c5fd';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText(subtitle, 256, 92);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Samples position, tangent, outward normal, and banking factor [0..1]
 * along the PG01 stadium oval centerline.
 *
 * @param {number} s - Normalized parameter in [0, 1)
 * @param {number} straightHalf - Half-length of straightaways along X
 * @param {number} radius - Curve radius along Z
 */
function sampleOvalCenterline(s, straightHalf, radius) {
  const normS = ((s % 1) + 1) % 1;
  const straightLen = straightHalf * 2;
  const curveLen = Math.PI * radius;
  const totalLen = straightLen * 2 + curveLen * 2;
  let d = normS * totalLen;

  // 1. South straight: (-straightHalf, +radius) -> (+straightHalf, +radius)
  if (d < straightLen) {
    const t = d / straightLen;
    return {
      x: -straightHalf + t * straightLen,
      z: radius,
      tx: 1,
      tz: 0,
      nx: 0,
      nz: 1,
      bankFactor: 0,
    };
  }
  d -= straightLen;

  // 2. East banked curve: phi from +PI/2 down to -PI/2
  if (d < curveLen) {
    const t = d / curveLen;
    const phi = Math.PI * 0.5 - t * Math.PI;
    const c = Math.cos(phi);
    const sn = Math.sin(phi);
    return {
      x: straightHalf + radius * c,
      z: radius * sn,
      tx: sn,
      tz: -c,
      nx: c,
      nz: sn,
      bankFactor: Math.sin(t * Math.PI),
    };
  }
  d -= curveLen;

  // 3. North straight: (+straightHalf, -radius) -> (-straightHalf, -radius)
  if (d < straightLen) {
    const t = d / straightLen;
    return {
      x: straightHalf - t * straightLen,
      z: -radius,
      tx: -1,
      tz: 0,
      nx: 0,
      nz: -1,
      bankFactor: 0,
    };
  }
  d -= straightLen;

  // 4. West banked curve: phi from -PI/2 down to -3*PI/2
  const t = d / curveLen;
  const phi = -Math.PI * 0.5 - t * Math.PI;
  const c = Math.cos(phi);
  const sn = Math.sin(phi);
  return {
    x: -straightHalf + radius * c,
    z: radius * sn,
    tx: sn,
    tz: -c,
    nx: c,
    nz: sn,
    bankFactor: Math.sin(t * Math.PI),
  };
}

/**
 * Builds a continuous banked oval track ribbon BufferGeometry.
 */
function buildBankedOvalTrackGeometry(straightHalf, radius, trackWidth, maxBankHeight, segments = 128) {
  const halfW = trackWidth * 0.5;
  const positions = [];
  const indices = [];

  for (let i = 0; i <= segments; i++) {
    const s = i / segments;
    const pt = sampleOvalCenterline(s, straightHalf, radius);

    const innerX = pt.x - pt.nx * halfW;
    const innerZ = pt.z - pt.nz * halfW;
    const innerY = 0.14;

    const outerX = pt.x + pt.nx * halfW;
    const outerZ = pt.z + pt.nz * halfW;
    const outerY = 0.14 + pt.bankFactor * maxBankHeight;

    positions.push(innerX, innerY, innerZ);
    positions.push(outerX, outerY, outerZ);
  }

  for (let i = 0; i < segments; i++) {
    const a = i * 2;
    const b = a + 1;
    const c = a + 2;
    const d = a + 3;
    indices.push(a, c, b);
    indices.push(b, c, d);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Stage 4 Exterior for F09 (EOL & ADAS Calibration Center - 7 Gates)
 */
function buildF09Completed(buildingSpec) {
  const { widthX, depthZ, heightY } = buildingSpec.bounds3JS;
  const g = new THREE.Group();
  g.name = 'F09_EOL_ADAS_Completed';

  // Concrete apron linking F05 exit (West) and PG01/LY01 (South)
  const westLinkApron = new THREE.Mesh(
    new THREE.BoxGeometry(widthX + 14, 0.14, depthZ + 12),
    SHARED_MAT.concreteApron
  );
  westLinkApron.position.set(-5, 0.07, 4);
  westLinkApron.receiveShadow = true;
  g.add(westLinkApron);

  // Plinth
  const plinthH = 0.75;
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(widthX, plinthH, depthZ), SHARED_MAT.plinth);
  plinth.position.y = plinthH * 0.5;
  plinth.castShadow = true;
  plinth.receiveShadow = true;
  plinth.userData.isExteriorWall = true;
  g.add(plinth);

  // Main cladding shell
  const wallH = Math.max(1.0, heightY - plinthH);
  const shellMat = SHARED_MAT.cladding.clone();
  const shell = new THREE.Mesh(
    new THREE.BoxGeometry(widthX * 0.99, wallH, depthZ * 0.99),
    shellMat
  );
  shell.position.y = plinthH + wallH * 0.5;
  shell.castShadow = true;
  shell.receiveShadow = true;
  shell.userData.isExteriorWall = true;
  shell.userData.originalOpacity = shellMat.opacity;
  shell.userData.originalTransparent = shellMat.transparent;
  g.add(shell);

  // Eco-EV Green accent fascia band
  const band = new THREE.Mesh(
    new THREE.BoxGeometry(widthX * 1.005, 0.72, depthZ * 1.005),
    SHARED_MAT.f09Accent
  );
  band.position.y = heightY - 0.55;
  band.userData.isExteriorWall = true;
  g.add(band);

  // Clerestory daylight glazing ribbon
  const glassBand = new THREE.Mesh(
    new THREE.BoxGeometry(widthX * 1.002, 0.65, depthZ * 1.002),
    SHARED_MAT.glass
  );
  glassBand.position.y = heightY * 0.68;
  glassBand.userData.isExteriorWall = true;
  g.add(glassBand);

  // 7-Gate Inspection Portals on West (F05 entry) & East (dispatch exit)
  const gateCount = 7;
  const gateInst = new THREE.InstancedMesh(UNIT_BOX_GEO, SHARED_MAT.darkSteel, gateCount * 2);
  const gateLedInst = new THREE.InstancedMesh(UNIT_BOX_GEO, SHARED_MAT.gateLedGreen, gateCount * 2);
  const bollardInst = new THREE.InstancedMesh(UNIT_CYL_GEO, SHARED_MAT.yellowSafety, gateCount * 4);
  let gIdx = 0;
  let bIdx = 0;

  for (let i = 0; i < gateCount; i++) {
    const gz = -depthZ * 0.4 + (i / (gateCount - 1)) * (depthZ * 0.8);

    // West intake gate (from F05) & East exit gate
    [-widthX * 0.5 - 0.1, widthX * 0.5 + 0.1].forEach((gx) => {
      _dummy.position.set(gx, 1.3, gz);
      _dummy.rotation.set(0, 0, 0);
      _dummy.scale.set(0.5, 2.5, 4.2);
      _dummy.updateMatrix();
      gateInst.setMatrixAt(gIdx, _dummy.matrix);

      _dummy.position.set(gx + (gx < 0 ? -0.22 : 0.22), 2.75, gz);
      _dummy.scale.set(0.2, 0.28, 3.8);
      _dummy.updateMatrix();
      gateLedInst.setMatrixAt(gIdx, _dummy.matrix);
      gIdx++;

      // Safety bollards flanking each gate
      [-2.4, 2.4].forEach((bz) => {
        _dummy.position.set(gx + (gx < 0 ? -0.7 : 0.7), 0.45, gz + bz);
        _dummy.scale.set(0.28, 0.9, 0.28);
        _dummy.updateMatrix();
        bollardInst.setMatrixAt(bIdx++, _dummy.matrix);
      });
    });
  }
  gateInst.instanceMatrix.needsUpdate = true;
  gateLedInst.instanceMatrix.needsUpdate = true;
  bollardInst.instanceMatrix.needsUpdate = true;
  g.add(gateInst, gateLedInst, bollardInst);

  // Enclosed link tunnel connecting F05 East exit to F09 West intake
  const linkTunnel = new THREE.Mesh(
    new THREE.BoxGeometry(12.5, 2.6, depthZ * 0.42),
    SHARED_MAT.glass
  );
  linkTunnel.position.set(-widthX * 0.5 - 6.2, 1.45, 0);
  linkTunnel.userData.isExteriorWall = true;
  g.add(linkTunnel);

  // Interior 7-lane EOL & ADAS Calibration equipment (visible in Cutaway X-Ray)
  const dynoInst = new THREE.InstancedMesh(UNIT_BOX_GEO, SHARED_MAT.darkSteel, gateCount);
  const archInst = new THREE.InstancedMesh(UNIT_BOX_GEO, SHARED_MAT.galvSteel, gateCount);
  for (let i = 0; i < gateCount; i++) {
    const gz = -depthZ * 0.4 + (i / (gateCount - 1)) * (depthZ * 0.8);
    _dummy.position.set(-widthX * 0.15, 0.25, gz);
    _dummy.rotation.set(0, 0, 0);
    _dummy.scale.set(14, 0.25, 2.8);
    _dummy.updateMatrix();
    dynoInst.setMatrixAt(i, _dummy.matrix);

    _dummy.position.set(widthX * 0.18, 1.6, gz);
    _dummy.scale.set(1.2, 3.0, 4.0);
    _dummy.updateMatrix();
    archInst.setMatrixAt(i, _dummy.matrix);
  }
  dynoInst.instanceMatrix.needsUpdate = true;
  archInst.instanceMatrix.needsUpdate = true;
  g.add(dynoInst, archInst);

  // Roof deck & Solar PV array (hidden in Cutaway mode)
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(widthX * 1.01, 0.24, depthZ * 1.01),
    SHARED_MAT.roofDeck
  );
  roof.position.y = heightY + 0.12;
  roof.userData.isRoof = true;
  g.add(roof);

  const cols = 10;
  const rows = 14;
  const solarInst = new THREE.InstancedMesh(UNIT_BOX_GEO, SHARED_MAT.solarPanel, cols * rows);
  solarInst.userData.isRoof = true;
  let sIdx = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const px = -widthX * 0.38 + (c / (cols - 1)) * (widthX * 0.76);
      const pz = -depthZ * 0.4 + (r / (rows - 1)) * (depthZ * 0.8);
      _dummy.position.set(px, heightY + 0.42, pz);
      _dummy.rotation.set(0.18, 0, 0);
      _dummy.scale.set(3.4, 0.08, 3.2);
      _dummy.updateMatrix();
      solarInst.setMatrixAt(sIdx++, _dummy.matrix);
    }
  }
  solarInst.instanceMatrix.needsUpdate = true;
  g.add(solarInst);

  // Rooftop AHU units
  const ahuInst = new THREE.InstancedMesh(UNIT_BOX_GEO, SHARED_MAT.ahuBody, 4);
  ahuInst.userData.isRoof = true;
  for (let i = 0; i < 4; i++) {
    _dummy.position.set(-widthX * 0.3 + i * (widthX * 0.2), heightY + 0.75, -depthZ * 0.42);
    _dummy.rotation.set(0, 0, 0);
    _dummy.scale.set(2.8, 0.9, 1.8);
    _dummy.updateMatrix();
    ahuInst.setMatrixAt(i, _dummy.matrix);
  }
  ahuInst.instanceMatrix.needsUpdate = true;
  g.add(ahuInst);

  // LED Sign
  const signTex = createSignTexture('F09', 'EOL & ADAS CALIBRATION', '#388e3c');
  if (signTex) {
    const signMat = new THREE.MeshStandardMaterial({
      map: signTex,
      emissive: 0xffffff,
      emissiveMap: signTex,
      emissiveIntensity: 0.75,
      roughness: 0.3,
    });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(14, 3.5), signMat);
    sign.position.set(0, heightY - 1.1, depthZ * 0.5 + 0.18);
    g.add(sign);
  }

  return g;
}

/**
 * Stage 4 Exterior for LY01 (Solar Finished-Vehicle Yard)
 */
function buildLY01Completed(buildingSpec) {
  const { widthX, depthZ, heightY } = buildingSpec.bounds3JS;
  const g = new THREE.Group();
  g.name = 'LY01_Solar_Vehicle_Yard_Completed';

  // Asphalt marshalling yard pad
  const pad = new THREE.Mesh(
    new THREE.BoxGeometry(widthX, 0.16, depthZ),
    SHARED_MAT.asphalt
  );
  pad.position.y = 0.08;
  pad.receiveShadow = true;
  g.add(pad);

  // 3 Rows of Solar Carport Canopies (InstancedMesh columns + tilted PV roofs)
  const canopyRows = 3;
  const baysPerRow = 12;
  const totalBays = canopyRows * baysPerRow;
  const rowZs = [-depthZ * 0.3, 0, depthZ * 0.3];
  const bayWidth = (widthX * 0.9) / baysPerRow;

  const colInst = new THREE.InstancedMesh(UNIT_BOX_GEO, SHARED_MAT.galvSteel, totalBays * 2);
  const canopyInst = new THREE.InstancedMesh(UNIT_BOX_GEO, SHARED_MAT.solarPanel, totalBays);
  colInst.castShadow = true;
  canopyInst.castShadow = true;

  let cIdx = 0;
  let kIdx = 0;
  for (let r = 0; r < canopyRows; r++) {
    const rz = rowZs[r];
    for (let b = 0; b < baysPerRow; b++) {
      const bx = -widthX * 0.45 + (b + 0.5) * bayWidth;

      // Twin steel support posts per bay
      [-1.1, 1.1].forEach((dz) => {
        _dummy.position.set(bx, heightY * 0.5, rz + dz);
        _dummy.rotation.set(0, 0, 0);
        _dummy.scale.set(0.28, heightY, 0.28);
        _dummy.updateMatrix();
        colInst.setMatrixAt(cIdx++, _dummy.matrix);
      });

      // Tilted solar carport roof
      _dummy.position.set(bx, heightY + 0.1, rz);
      _dummy.rotation.set(0.14, 0, 0);
      _dummy.scale.set(bayWidth * 0.94, 0.1, 5.8);
      _dummy.updateMatrix();
      canopyInst.setMatrixAt(kIdx++, _dummy.matrix);
    }
  }
  colInst.instanceMatrix.needsUpdate = true;
  canopyInst.instanceMatrix.needsUpdate = true;
  g.add(colInst, canopyInst);

  // Hundreds of parked multi-color EVs (InstancedMesh body + cabin)
  const carsPerSide = 36;
  const totalCars = canopyRows * 2 * carsPerSide; // 216 parked EVs
  const carBodyInst = new THREE.InstancedMesh(UNIT_BOX_GEO, SHARED_MAT.carBodyWhite, totalCars);
  const carCabinInst = new THREE.InstancedMesh(UNIT_BOX_GEO, SHARED_MAT.cabinGlass, totalCars);

  let carIdx = 0;
  for (let r = 0; r < canopyRows; r++) {
    const rz = rowZs[r];
    [-1.7, 1.7].forEach((laneOffsetZ) => {
      for (let i = 0; i < carsPerSide; i++) {
        const cx = -widthX * 0.44 + (i / (carsPerSide - 1)) * (widthX * 0.88);
        const cz = rz + laneOffsetZ;

        // Lower body
        _dummy.position.set(cx, 0.34, cz);
        _dummy.rotation.set(0, Math.PI * 0.5, 0);
        _dummy.scale.set(1.55, 0.32, 0.82);
        _dummy.updateMatrix();
        carBodyInst.setMatrixAt(carIdx, _dummy.matrix);

        // Upper glass cabin
        _dummy.position.set(cx, 0.56, cz);
        _dummy.scale.set(0.95, 0.22, 0.72);
        _dummy.updateMatrix();
        carCabinInst.setMatrixAt(carIdx, _dummy.matrix);

        const hex = EV_YARD_PALETTE[(carIdx * 7 + r * 3) % EV_YARD_PALETTE.length];
        _color.setHex(hex);
        carBodyInst.setColorAt(carIdx, _color);
        carIdx++;
      }
    });
  }
  carBodyInst.instanceMatrix.needsUpdate = true;
  if (carBodyInst.instanceColor) carBodyInst.instanceColor.needsUpdate = true;
  carCabinInst.instanceMatrix.needsUpdate = true;
  g.add(carBodyInst, carCabinInst);

  // 800V DC Fast-Charger Pedestals along charging islands
  const chargersPerRow = 12;
  const totalChargers = canopyRows * chargersPerRow;
  const chargerInst = new THREE.InstancedMesh(UNIT_BOX_GEO, SHARED_MAT.chargerBody, totalChargers);
  const chargerGlowInst = new THREE.InstancedMesh(UNIT_BOX_GEO, SHARED_MAT.chargerGlow, totalChargers);
  let chIdx = 0;
  for (let r = 0; r < canopyRows; r++) {
    const rz = rowZs[r];
    for (let c = 0; c < chargersPerRow; c++) {
      const cx = -widthX * 0.43 + (c / (chargersPerRow - 1)) * (widthX * 0.86);
      _dummy.position.set(cx, 0.65, rz);
      _dummy.rotation.set(0, 0, 0);
      _dummy.scale.set(0.32, 1.0, 0.24);
      _dummy.updateMatrix();
      chargerInst.setMatrixAt(chIdx, _dummy.matrix);

      _dummy.position.set(cx, 1.05, rz);
      _dummy.scale.set(0.34, 0.14, 0.26);
      _dummy.updateMatrix();
      chargerGlowInst.setMatrixAt(chIdx, _dummy.matrix);
      chIdx++;
    }
  }
  chargerInst.instanceMatrix.needsUpdate = true;
  chargerGlowInst.instanceMatrix.needsUpdate = true;
  g.add(chargerInst, chargerGlowInst);

  // Yard dispatch sign
  const signTex = createSignTexture('LY01', 'SOLAR FINISHED-VEHICLE YARD • 800V DC', '#1e3a8a');
  if (signTex) {
    const signMat = new THREE.MeshStandardMaterial({
      map: signTex,
      emissive: 0xffffff,
      emissiveMap: signTex,
      emissiveIntensity: 0.65,
      roughness: 0.35,
    });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(14, 3.5), signMat);
    sign.position.set(-widthX * 0.5 + 8, 3.2, depthZ * 0.5 + 0.2);
    g.add(sign);
  }

  return g;
}

/**
 * Stage 4 Exterior for PG01 (16-Surface Proving Ground 3.8km, 630m x 220m)
 */
function buildPG01Completed(buildingSpec, ovalParams) {
  const { widthX, depthZ } = buildingSpec.bounds3JS;
  const { straightHalf, radius, trackWidth, maxBankHeight } = ovalParams;
  const g = new THREE.Group();
  g.name = 'PG01_Proving_Ground_Completed';

  // Infield base pad
  const basePad = new THREE.Mesh(
    new THREE.BoxGeometry(widthX, 0.12, depthZ),
    SHARED_MAT.infieldGrass
  );
  basePad.position.y = 0.06;
  basePad.receiveShadow = true;
  g.add(basePad);

  // Outer High-Speed Banked Oval Track
  const trackGeo = buildBankedOvalTrackGeometry(
    straightHalf,
    radius,
    trackWidth,
    maxBankHeight,
    128
  );
  const trackMesh = new THREE.Mesh(trackGeo, SHARED_MAT.trackAsphalt);
  trackMesh.receiveShadow = true;
  g.add(trackMesh);

  // Dashed lane markings & Red-White Safety Barriers around outer oval
  const markerCount = 96;
  const dashInst = new THREE.InstancedMesh(UNIT_BOX_GEO, SHARED_MAT.whiteStripe, markerCount);
  const barrierCount = 120;
  const redBarriers = new THREE.InstancedMesh(UNIT_BOX_GEO, SHARED_MAT.barrierRed, barrierCount / 2);
  const whiteBarriers = new THREE.InstancedMesh(UNIT_BOX_GEO, SHARED_MAT.barrierWhite, barrierCount / 2);

  for (let i = 0; i < markerCount; i++) {
    const pt = sampleOvalCenterline(i / markerCount, straightHalf, radius);
    const yaw = Math.atan2(-pt.tz, pt.tx);
    _dummy.position.set(pt.x, 0.16 + pt.bankFactor * maxBankHeight * 0.5, pt.z);
    _dummy.rotation.set(0, yaw, 0);
    _dummy.scale.set(1.6, 0.04, 0.16);
    _dummy.updateMatrix();
    dashInst.setMatrixAt(i, _dummy.matrix);
  }
  dashInst.instanceMatrix.needsUpdate = true;
  g.add(dashInst);

  let rIdx = 0;
  let wIdx = 0;
  const outerOffset = trackWidth * 0.5 + 0.55;
  for (let i = 0; i < barrierCount; i++) {
    const pt = sampleOvalCenterline(i / barrierCount, straightHalf, radius);
    const yaw = Math.atan2(-pt.tz, pt.tx);
    _dummy.position.set(
      pt.x + pt.nx * outerOffset,
      0.38 + pt.bankFactor * maxBankHeight,
      pt.z + pt.nz * outerOffset
    );
    _dummy.rotation.set(0, yaw, 0);
    _dummy.scale.set(2.4, 0.52, 0.35);
    _dummy.updateMatrix();
    if (i % 2 === 0) {
      redBarriers.setMatrixAt(rIdx++, _dummy.matrix);
    } else {
      whiteBarriers.setMatrixAt(wIdx++, _dummy.matrix);
    }
  }
  redBarriers.instanceMatrix.needsUpdate = true;
  whiteBarriers.instanceMatrix.needsUpdate = true;
  g.add(redBarriers, whiteBarriers);

  // Inner 16-Surface Test Lanes inside the oval infield
  const innerGroup = new THREE.Group();
  innerGroup.name = 'PG01_Inner_Test_Lanes';

  // 1. Belgian Pavé Cobbles Lane (North-West infield)
  const paveBase = new THREE.Mesh(
    new THREE.BoxGeometry(36, 0.12, 4.2),
    SHARED_MAT.concreteApron
  );
  paveBase.position.set(-22, 0.14, -10.5);
  innerGroup.add(paveBase);

  const cobbleCount = 48;
  const cobbleInst = new THREE.InstancedMesh(UNIT_BOX_GEO, SHARED_MAT.cobble, cobbleCount);
  for (let i = 0; i < cobbleCount; i++) {
    const col = i % 24;
    const row = Math.floor(i / 24);
    _dummy.position.set(-39 + col * 1.48, 0.23, -11.4 + row * 1.8);
    _dummy.rotation.set(0, (i % 3) * 0.08, 0);
    _dummy.scale.set(1.15, 0.12, 1.35);
    _dummy.updateMatrix();
    cobbleInst.setMatrixAt(i, _dummy.matrix);
  }
  cobbleInst.instanceMatrix.needsUpdate = true;
  innerGroup.add(cobbleInst);

  // 2. Twist Track (Articulation staggered humps - South-West infield)
  const twistBase = new THREE.Mesh(
    new THREE.BoxGeometry(36, 0.12, 4.2),
    SHARED_MAT.asphalt
  );
  twistBase.position.set(-22, 0.14, -3.5);
  innerGroup.add(twistBase);

  const bumpCount = 18;
  const bumpInst = new THREE.InstancedMesh(UNIT_BOX_GEO, SHARED_MAT.yellowSafety, bumpCount);
  for (let i = 0; i < bumpCount; i++) {
    const isLeft = i % 2 === 0;
    _dummy.position.set(-38 + i * 1.9, 0.28, -3.5 + (isLeft ? -0.95 : 0.95));
    _dummy.rotation.set(0, 0, 0);
    _dummy.scale.set(1.0, 0.24, 1.8);
    _dummy.updateMatrix();
    bumpInst.setMatrixAt(i, _dummy.matrix);
  }
  bumpInst.instanceMatrix.needsUpdate = true;
  innerGroup.add(bumpInst);

  // 3. Three Elevated Grade Ramps (15%, 20%, 30% - Center-North infield)
  const rampSpecs = [
    { grade: '15%', height: 1.65, zOffset: -11.5 },
    { grade: '20%', height: 2.35, zOffset: -7.5 },
    { grade: '30%', height: 3.35, zOffset: -3.5 },
  ];
  rampSpecs.forEach((ramp) => {
    const rx = 14;
    const rampGroup = new THREE.Group();
    rampGroup.position.set(rx, 0.12, ramp.zOffset);

    const slopeLen = 6.5;
    const slopeAngle = Math.atan2(ramp.height, slopeLen);
    const hypLen = Math.hypot(slopeLen, ramp.height);

    const upSlope = new THREE.Mesh(
      new THREE.BoxGeometry(hypLen, 0.22, 2.4),
      SHARED_MAT.trackAsphalt
    );
    upSlope.position.set(-slopeLen * 0.5 - 1.5, ramp.height * 0.5, 0);
    upSlope.rotation.z = slopeAngle;
    upSlope.castShadow = true;

    const topDeck = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 0.24, 2.4),
      SHARED_MAT.concreteApron
    );
    topDeck.position.set(0, ramp.height, 0);
    topDeck.castShadow = true;

    const downSlope = new THREE.Mesh(
      new THREE.BoxGeometry(hypLen, 0.22, 2.4),
      SHARED_MAT.trackAsphalt
    );
    downSlope.position.set(slopeLen * 0.5 + 1.5, ramp.height * 0.5, 0);
    downSlope.rotation.z = -slopeAngle;
    downSlope.castShadow = true;

    // Support piers
    const pier = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, ramp.height, 2.0),
      SHARED_MAT.plinth
    );
    pier.position.set(0, ramp.height * 0.5, 0);

    rampGroup.add(upSlope, topDeck, downSlope, pier);
    innerGroup.add(rampGroup);
  });

  // 4. Blue Water Wading Trough (400mm deep - South infield)
  const troughWall = new THREE.Mesh(
    new THREE.BoxGeometry(32, 0.35, 5.2),
    SHARED_MAT.concreteApron
  );
  troughWall.position.set(-18, 0.18, 8.0);
  innerGroup.add(troughWall);

  const waterSurface = new THREE.Mesh(
    new THREE.BoxGeometry(29.5, 0.18, 3.8),
    SHARED_MAT.water
  );
  waterSurface.position.set(-18, 0.31, 8.0);
  innerGroup.add(waterSurface);

  // 5. ABS / ADAS Braking & AI Auto-Parking Pad (South-East infield)
  const absPad = new THREE.Mesh(
    new THREE.BoxGeometry(34, 0.14, 12),
    SHARED_MAT.trackAsphalt
  );
  absPad.position.set(20, 0.14, 7.5);
  absPad.receiveShadow = true;
  innerGroup.add(absPad);

  const absStripeInst = new THREE.InstancedMesh(UNIT_BOX_GEO, SHARED_MAT.whiteStripe, 10);
  for (let i = 0; i < 10; i++) {
    _dummy.position.set(6 + i * 3.1, 0.22, 7.5);
    _dummy.rotation.set(0, 0, 0);
    _dummy.scale.set(0.16, 0.02, 9.5);
    _dummy.updateMatrix();
    absStripeInst.setMatrixAt(i, _dummy.matrix);
  }
  absStripeInst.instanceMatrix.needsUpdate = true;
  innerGroup.add(absStripeInst);

  const coneInst = new THREE.InstancedMesh(UNIT_CYL_GEO, SHARED_MAT.orangeCone, 12);
  for (let i = 0; i < 12; i++) {
    _dummy.position.set(5 + i * 2.7, 0.42, 3.0 + (i % 2) * 8.5);
    _dummy.rotation.set(0, 0, 0);
    _dummy.scale.set(0.32, 0.5, 0.32);
    _dummy.updateMatrix();
    coneInst.setMatrixAt(i, _dummy.matrix);
  }
  coneInst.instanceMatrix.needsUpdate = true;
  innerGroup.add(coneInst);

  g.add(innerGroup);

  // PG01 Signboard
  const signTex = createSignTexture('PG01', '3.8 KM 16-SURFACE PROVING GROUND', '#455a64');
  if (signTex) {
    const signMat = new THREE.MeshStandardMaterial({
      map: signTex,
      emissive: 0xffffff,
      emissiveMap: signTex,
      emissiveIntensity: 0.65,
      roughness: 0.35,
    });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(14, 3.5), signMat);
    sign.position.set(0, 2.4, depthZ * 0.5 + 0.2);
    g.add(sign);
  }

  return g;
}

/**
 * Builds the East Testing, EOL & Solar Finished-Vehicle Yard cluster (F09, PG01, LY01).
 *
 * @param {object} [timelineController] - Optional ConstructionTimelineController
 * @returns {{ group: THREE.Group, buildingControllers: Record<string, object>, update: (elapsedTime: number, currentMonth: number, isCutaway?: boolean) => void }}
 */
export function buildEastTestingAndYard(timelineController) {
  const group = new THREE.Group();
  group.name = 'EastTestingAndYard_Cluster';

  const f09Spec = getBuildingSpecById('F09');
  const ly01Spec = getBuildingSpecById('LY01');
  const pg01Spec = getBuildingSpecById('PG01');

  const ovalParams = {
    straightHalf: 44,
    radius: 20.5,
    trackWidth: 6.4,
    maxBankHeight: 1.25,
  };

  const ctrlF09 = createStagedBuildingController(f09Spec, buildF09Completed);
  const ctrlLY01 = createStagedBuildingController(ly01Spec, buildLY01Completed);
  const ctrlPG01 = createStagedBuildingController(pg01Spec, (spec) =>
    buildPG01Completed(spec, ovalParams)
  );

  group.add(ctrlF09.group, ctrlLY01.group, ctrlPG01.group);

  // 8 Animated EV test cars driving on PG01 banked oval track in Stage 4 / Epoch 6
  const testCarsGroup = new THREE.Group();
  testCarsGroup.name = 'PG01_Animated_Test_EVs';
  testCarsGroup.visible = false;
  ctrlPG01.group.add(testCarsGroup);

  const testCarConfigs = [
    { id: 'PG-EV-01', colorHex: '#ef4444', colorName: 'Crimson Red', speed: 0.082, laneOffset: -1.3 },
    { id: 'PG-EV-02', colorHex: '#3b82f6', colorName: 'Electric Blue', speed: 0.095, laneOffset: 1.2 },
    { id: 'PG-EV-03', colorHex: '#f8fafc', colorName: 'Pearl White', speed: 0.078, laneOffset: -0.6 },
    { id: 'PG-EV-04', colorHex: '#10b981', colorName: 'Emerald Green', speed: 0.088, laneOffset: 0.9 },
    { id: 'PG-EV-05', colorHex: '#f59e0b', colorName: 'Solar Amber', speed: 0.091, laneOffset: 1.5 },
    { id: 'PG-EV-06', colorHex: '#1e293b', colorName: 'Obsidian Black', speed: 0.075, laneOffset: -1.5 },
    { id: 'PG-EV-07', colorHex: '#06b6d4', colorName: 'Cyan Pulse', speed: 0.085, laneOffset: 0.2 },
    { id: 'PG-EV-08', colorHex: '#8b5cf6', colorName: 'Tech Violet', speed: 0.098, laneOffset: 1.1 },
  ];

  const carScale = WORLD_SCALE * SCENIC_PROP_BOOST;
  const maxBankAngle = Math.atan2(ovalParams.maxBankHeight, ovalParams.trackWidth);
  const animatedCars = testCarConfigs.map((cfg, idx) => {
    const car = buildSleekCar({
      id: cfg.id,
      model: 'Apex EV Prototype',
      colorHex: cfg.colorHex,
      colorName: cfg.colorName,
    });
    if (car.userData?.updateStage) {
      car.userData.updateStage(3);
    }
    car.scale.setScalar(carScale);
    testCarsGroup.add(car);
    return {
      car,
      basePhase: idx / testCarConfigs.length,
      speed: cfg.speed,
      laneOffset: cfg.laneOffset,
    };
  });

  const buildingControllers = {
    F09: ctrlF09,
    LY01: ctrlLY01,
    PG01: ctrlPG01,
  };

  function getStageState(buildingId, currentMonth) {
    if (timelineController && typeof timelineController.getBuildingState === 'function') {
      return timelineController.getBuildingState(buildingId);
    }
    return getBuildingStageAtMonth(buildingId, currentMonth);
  }

  function update(elapsedTime = 0, currentMonth = 0, isCutaway = false) {
    const stateF09 = getStageState('F09', currentMonth);
    ctrlF09.updateStage(stateF09.stageIndex, stateF09.stageProgress, elapsedTime, isCutaway);

    const stateLY01 = getStageState('LY01', currentMonth);
    ctrlLY01.updateStage(stateLY01.stageIndex, stateLY01.stageProgress, elapsedTime, isCutaway);

    const statePG01 = getStageState('PG01', currentMonth);
    ctrlPG01.updateStage(statePG01.stageIndex, statePG01.stageProgress, elapsedTime, isCutaway);

    // Show & animate 8 EV cars on PG01 oval track when PG01 is operational (Stage 4 / Epoch 6)
    const showTestCars = statePG01.stageIndex >= 4;
    testCarsGroup.visible = showTestCars;

    if (showTestCars) {
      const { straightHalf, radius, trackWidth, maxBankHeight } = ovalParams;
      for (let i = 0; i < animatedCars.length; i++) {
        const item = animatedCars[i];
        const s = (item.basePhase + elapsedTime * item.speed) % 1;
        const pt = sampleOvalCenterline(s, straightHalf, radius);

        const lateralFrac = (item.laneOffset + trackWidth * 0.5) / trackWidth;
        const yElev = 0.16 + pt.bankFactor * maxBankHeight * Math.max(0, Math.min(1, lateralFrac));

        item.car.position.set(
          pt.x + pt.nx * item.laneOffset,
          yElev,
          pt.z + pt.nz * item.laneOffset
        );
        const yaw = Math.atan2(-pt.tz, pt.tx);
        const roll = pt.bankFactor * maxBankAngle;
        item.car.rotation.set(roll, yaw, 0, 'YXZ');
      }
    }
  }

  return {
    group,
    buildingControllers,
    update,
  };
}
