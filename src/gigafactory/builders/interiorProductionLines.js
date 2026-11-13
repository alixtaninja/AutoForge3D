import * as THREE from 'three';
import {
  getBuildingSpecById,
  getBuildingStageAtMonth,
} from '../config/masterSpecLoader.js';
import {
  buildConveyorTwin,
  buildElectricEngineTwin,
  buildForkliftTwin,
  buildMultiArmStationTwin,
  buildWheelTwin,
} from '../../threejsTwins.js';
import {
  buildOptimizedLODRobotArm,
  buildSleekCar,
} from '../../factoryBuilder.js';
import { buildSteelCoilTwin } from '../assets/constructionMaterialsTwins.js';

/**
 * Interior Production Lines Builder (TASK-013)
 * Renders lightweight, animated manufacturing lines inside the 6 core buildings
 * (F01, F02, F03, F04, F05, WH01) when X-Ray Cutaway mode is active OR when
 * the camera zooms in close (< 220 units) on a Stage >= 3 building.
 */

const INTERIOR_BUILDING_IDS = ['F01', 'F02', 'F03', 'F04', 'F05', 'WH01'];
const CLOSE_ZOOM_DISTANCE_SQ = 220 * 220;

const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
const UNIT_CYL = new THREE.CylinderGeometry(0.5, 0.5, 1, 12);
const _dummy = new THREE.Object3D();

const MAT = {
  floorZone: new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85, metalness: 0.1 }),
  safetyLine: new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.5, metalness: 0.1 }),
  pressBody: new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.42, metalness: 0.72 }),
  pressBlue: new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.36, metalness: 0.6 }),
  pressWhite: new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.4, metalness: 0.35 }),
  steel: new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.3, metalness: 0.82 }),
  chrome: new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.18, metalness: 0.92 }),
  robotOrange: new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.32, metalness: 0.35 }),
  robotDark: new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.48, metalness: 0.6 }),
  moltenGlow: new THREE.MeshStandardMaterial({
    color: 0xf97316,
    emissive: 0xff6d00,
    emissiveIntensity: 1.4,
    roughness: 0.3,
  }),
  laserBlue: new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0ea5e9,
    emissiveIntensity: 1.8,
    roughness: 0.2,
  }),
  weldSpark: new THREE.MeshBasicMaterial({ color: 0xfef08a }),
  paintTank: new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.35, metalness: 0.45 }),
  paintLiquid: new THREE.MeshStandardMaterial({
    color: 0x0ea5e9,
    emissive: 0x0369a1,
    emissiveIntensity: 0.45,
    roughness: 0.15,
    metalness: 0.2,
  }),
  boothGlass: new THREE.MeshStandardMaterial({
    color: 0xbae6fd,
    roughness: 0.12,
    metalness: 0.15,
    transparent: true,
    opacity: 0.38,
  }),
  ovenGlow: new THREE.MeshStandardMaterial({
    color: 0xea580c,
    emissive: 0xf97316,
    emissiveIntensity: 0.65,
    roughness: 0.4,
  }),
  rackBlue: new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.35, metalness: 0.55 }),
  rackOrange: new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.35, metalness: 0.4 }),
  palletBox: new THREE.MeshStandardMaterial({ color: 0xc29b61, roughness: 0.8, metalness: 0.05 }),
  craneYellow: new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.38, metalness: 0.45 }),
  biwShell: new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.28, metalness: 0.78 }),
};

function tintRobotOrange(robotRoot) {
  robotRoot.traverse((child) => {
    if (child.isMesh && child.material && child.material.color) {
      const hex = child.material.color.getHex();
      if (hex === 0xf8fafc || hex === 0xe2e8f0) {
        child.material = MAT.robotOrange;
      }
    }
  });
  return robotRoot;
}

/**
 * F01: 6 Giga-Press 9,100T casting islands + orange robotic extractors
 */
function buildF01Interior(spec) {
  const { widthX, depthZ } = spec.bounds3JS;
  const g = new THREE.Group();
  g.name = 'Interior_F01_GigaCasting';

  const slab = new THREE.Mesh(UNIT_BOX, MAT.floorZone);
  slab.scale.set(widthX * 0.94, 0.08, depthZ * 0.9);
  slab.position.y = 0.06;
  g.add(slab);

  const pressCount = 6;
  const pressPositions = [];
  for (let col = 0; col < 2; col++) {
    for (let row = 0; row < 3; row++) {
      pressPositions.push({
        x: col === 0 ? -widthX * 0.16 : widthX * 0.12,
        z: -depthZ * 0.28 + row * (depthZ * 0.28),
      });
    }
  }

  // Instanced static press bases & fixed platens
  const baseInst = new THREE.InstancedMesh(UNIT_BOX, MAT.pressBody, pressCount);
  const platenInst = new THREE.InstancedMesh(UNIT_BOX, MAT.pressBlue, pressCount);
  const furnaceInst = new THREE.InstancedMesh(UNIT_CYL, MAT.moltenGlow, pressCount);
  const movingPlatenInst = new THREE.InstancedMesh(UNIT_BOX, MAT.steel, pressCount);
  const castingInst = new THREE.InstancedMesh(UNIT_BOX, MAT.chrome, pressCount);

  pressPositions.forEach((p, idx) => {
    // Main press bed
    _dummy.position.set(p.x, 0.85, p.z);
    _dummy.rotation.set(0, 0, 0);
    _dummy.scale.set(10.5, 1.5, 4.8);
    _dummy.updateMatrix();
    baseInst.setMatrixAt(idx, _dummy.matrix);

    // Fixed platen & injection end
    _dummy.position.set(p.x - 3.6, 2.35, p.z);
    _dummy.scale.set(2.8, 3.2, 4.4);
    _dummy.updateMatrix();
    platenInst.setMatrixAt(idx, _dummy.matrix);

    // Molten aluminum holding furnace
    _dummy.position.set(p.x - 7.0, 1.5, p.z);
    _dummy.scale.set(2.8, 2.8, 2.8);
    _dummy.updateMatrix();
    furnaceInst.setMatrixAt(idx, _dummy.matrix);

    // Cooling table casting part
    _dummy.position.set(p.x + 7.5, 0.9, p.z + 2.4);
    _dummy.scale.set(2.4, 0.35, 1.8);
    _dummy.updateMatrix();
    castingInst.setMatrixAt(idx, _dummy.matrix);
  });

  baseInst.instanceMatrix.needsUpdate = true;
  platenInst.instanceMatrix.needsUpdate = true;
  furnaceInst.instanceMatrix.needsUpdate = true;
  castingInst.instanceMatrix.needsUpdate = true;
  g.add(baseInst, platenInst, furnaceInst, castingInst, movingPlatenInst);

  // 6 Orange robotic extractors using buildOptimizedLODRobotArm
  const extractors = [];
  pressPositions.forEach((p, idx) => {
    const arm = tintRobotOrange(buildOptimizedLODRobotArm({ targetHeight: 2.4, rotationY: -Math.PI * 0.5 }));
    arm.position.set(p.x + 5.2, 0.1, p.z + 2.8);
    g.add(arm);
    extractors.push({ arm, phase: idx * 1.05 });
  });

  return {
    group: g,
    update(t) {
      for (let i = 0; i < pressCount; i++) {
        const p = pressPositions[i];
        const cycle = Math.sin(t * 1.4 + i * 1.1);
        const offsetX = cycle > 0 ? 0.6 : 2.1;
        _dummy.position.set(p.x + offsetX, 2.35, p.z);
        _dummy.rotation.set(0, 0, 0);
        _dummy.scale.set(1.6, 3.0, 4.2);
        _dummy.updateMatrix();
        movingPlatenInst.setMatrixAt(i, _dummy.matrix);
      }
      movingPlatenInst.instanceMatrix.needsUpdate = true;

      for (const ext of extractors) {
        ext.arm.rotation.y = -Math.PI * 0.5 + Math.sin(t * 1.4 + ext.phase) * 0.75;
      }
    },
  };
}

/**
 * F02: Steel coil staging (buildSteelCoilTwin) + 4 Schuler Servo tandem press lines
 */
function buildF02Interior(spec) {
  const { widthX, depthZ } = spec.bounds3JS;
  const g = new THREE.Group();
  g.name = 'Interior_F02_ServoStamping';

  const slab = new THREE.Mesh(UNIT_BOX, MAT.floorZone);
  slab.scale.set(widthX * 0.94, 0.08, depthZ * 0.9);
  slab.position.y = 0.06;
  g.add(slab);

  // Steel & Aluminum coil staging yard on the West side
  const coilCount = 8;
  for (let i = 0; i < coilCount; i++) {
    const coil = buildSteelCoilTwin({ isAluminum: i % 2 === 1 });
    const col = i % 2;
    const row = Math.floor(i / 2);
    coil.scale.setScalar(1.35);
    coil.position.set(
      -widthX * 0.38 + col * 4.5,
      0.1,
      -depthZ * 0.3 + row * (depthZ * 0.2)
    );
    coil.rotation.y = Math.PI * 0.5;
    g.add(coil);
  }

  // 4 Schuler Servo tandem press lines (4 presses per line = 16 presses)
  const lineCount = 4;
  const pressesPerLine = 4;
  const totalPresses = lineCount * pressesPerLine;

  const archInst = new THREE.InstancedMesh(UNIT_BOX, MAT.pressWhite, totalPresses);
  const crownInst = new THREE.InstancedMesh(UNIT_BOX, MAT.pressBlue, totalPresses);
  const ramInst = new THREE.InstancedMesh(UNIT_BOX, MAT.robotOrange, totalPresses);
  const feedTableInst = new THREE.InstancedMesh(UNIT_BOX, MAT.steel, lineCount);

  const pressCoords = [];
  for (let l = 0; l < lineCount; l++) {
    const lz = -depthZ * 0.31 + l * (depthZ * 0.205);
    _dummy.position.set(widthX * 0.08, 0.55, lz);
    _dummy.rotation.set(0, 0, 0);
    _dummy.scale.set(widthX * 0.62, 0.9, 2.4);
    _dummy.updateMatrix();
    feedTableInst.setMatrixAt(l, _dummy.matrix);

    for (let p = 0; p < pressesPerLine; p++) {
      const px = -widthX * 0.14 + p * 11.5;
      const idx = l * pressesPerLine + p;
      pressCoords.push({ x: px, z: lz, phase: l * 0.8 + p * 0.6 });

      // Press uprights/body
      _dummy.position.set(px, 2.2, lz);
      _dummy.scale.set(4.2, 4.2, 4.6);
      _dummy.updateMatrix();
      archInst.setMatrixAt(idx, _dummy.matrix);

      // Blue Schuler Servo crown
      _dummy.position.set(px, 4.7, lz);
      _dummy.scale.set(4.5, 1.1, 4.8);
      _dummy.updateMatrix();
      crownInst.setMatrixAt(idx, _dummy.matrix);
    }
  }

  archInst.instanceMatrix.needsUpdate = true;
  crownInst.instanceMatrix.needsUpdate = true;
  feedTableInst.instanceMatrix.needsUpdate = true;
  g.add(feedTableInst, archInst, crownInst, ramInst);

  return {
    group: g,
    update(t) {
      for (let i = 0; i < totalPresses; i++) {
        const c = pressCoords[i];
        const stroke = Math.abs(Math.sin(t * 2.8 + c.phase)) * 1.15;
        _dummy.position.set(c.x, 1.45 + stroke, c.z);
        _dummy.rotation.set(0, 0, 0);
        _dummy.scale.set(3.2, 1.1, 3.6);
        _dummy.updateMatrix();
        ramInst.setMatrixAt(i, _dummy.matrix);
      }
      ramInst.instanceMatrix.needsUpdate = true;
    },
  };
}

/**
 * F03: BIW Dark Factory welding lines with rows of orange robotic arms + OpenGate framing stations
 */
function buildF03Interior(spec) {
  const { widthX, depthZ } = spec.bounds3JS;
  const g = new THREE.Group();
  g.name = 'Interior_F03_BIWDarkFactory';

  const slab = new THREE.Mesh(UNIT_BOX, MAT.floorZone);
  slab.scale.set(widthX * 0.95, 0.08, depthZ * 0.92);
  slab.position.y = 0.06;
  g.add(slab);

  const lineCount = 4;
  const lineZs = [];
  for (let l = 0; l < lineCount; l++) {
    lineZs.push(-depthZ * 0.34 + l * (depthZ * 0.225));
  }

  // Conveyor tracks + OpenGate framing stations
  const trackInst = new THREE.InstancedMesh(UNIT_BOX, MAT.pressBody, lineCount);
  const gateCount = lineCount * 2;
  const gateInst = new THREE.InstancedMesh(UNIT_BOX, MAT.pressBlue, gateCount);
  const laserInst = new THREE.InstancedMesh(UNIT_BOX, MAT.laserBlue, gateCount);

  let gIdx = 0;
  lineZs.forEach((lz) => {
    _dummy.position.set(0, 0.3, lz);
    _dummy.rotation.set(0, 0, 0);
    _dummy.scale.set(widthX * 0.84, 0.45, 3.2);
    _dummy.updateMatrix();
    trackInst.setMatrixAt(lineZs.indexOf(lz), _dummy.matrix);

    [-widthX * 0.14, widthX * 0.18].forEach((gx) => {
      _dummy.position.set(gx, 2.2, lz);
      _dummy.scale.set(6.5, 3.8, 5.4);
      _dummy.updateMatrix();
      gateInst.setMatrixAt(gIdx, _dummy.matrix);

      _dummy.position.set(gx, 3.9, lz);
      _dummy.scale.set(6.6, 0.25, 5.5);
      _dummy.updateMatrix();
      laserInst.setMatrixAt(gIdx, _dummy.matrix);
      gIdx++;
    });
  });

  trackInst.instanceMatrix.needsUpdate = true;
  gateInst.instanceMatrix.needsUpdate = true;
  laserInst.instanceMatrix.needsUpdate = true;
  g.add(trackInst, gateInst, laserInst);

  // Rows of orange robotic arms (InstancedMesh: 16 robots/line * 4 lines = 64 robots)
  const robotsPerSide = 8;
  const totalRobots = lineCount * robotsPerSide * 2;
  const robotBaseInst = new THREE.InstancedMesh(UNIT_CYL, MAT.robotDark, totalRobots);
  const robotArmInst = new THREE.InstancedMesh(UNIT_BOX, MAT.robotOrange, totalRobots);
  const robotForearmInst = new THREE.InstancedMesh(UNIT_BOX, MAT.robotOrange, totalRobots);
  const sparkInst = new THREE.InstancedMesh(UNIT_BOX, MAT.weldSpark, totalRobots);

  const robotMeta = [];
  let rIdx = 0;
  lineZs.forEach((lz, l) => {
    for (let s = 0; s < robotsPerSide; s++) {
      const rx = -widthX * 0.36 + s * (widthX * 0.102);
      [-3.4, 3.4].forEach((dz) => {
        const rz = lz + dz;
        const sideSign = dz > 0 ? -1 : 1;
        robotMeta.push({ x: rx, z: rz, sideSign, phase: l * 1.3 + s * 0.7 + (dz > 0 ? 0.5 : 0) });

        _dummy.position.set(rx, 0.55, rz);
        _dummy.rotation.set(0, 0, 0);
        _dummy.scale.set(0.95, 0.9, 0.95);
        _dummy.updateMatrix();
        robotBaseInst.setMatrixAt(rIdx, _dummy.matrix);
        rIdx++;
      });
    }
  });
  robotBaseInst.instanceMatrix.needsUpdate = true;
  g.add(robotBaseInst, robotArmInst, robotForearmInst, sparkInst);

  // Moving BIW unpainted shells along the 4 lines
  const shellsPerLine = 5;
  const totalShells = lineCount * shellsPerLine;
  const shellInst = new THREE.InstancedMesh(UNIT_BOX, MAT.biwShell, totalShells);
  g.add(shellInst);

  // 2 Multi-arm underbody marriage stations
  [-widthX * 0.28, widthX * 0.02].forEach((mx) => {
    const station = buildMultiArmStationTwin({ targetHeight: 2.5 });
    station.position.set(mx, 0.1, 0);
    g.add(station);
  });

  return {
    group: g,
    update(t) {
      // Animate orange welding robot arms + sparks
      for (let i = 0; i < totalRobots; i++) {
        const rm = robotMeta[i];
        const swing = Math.sin(t * 3.2 + rm.phase) * 0.45;
        const reach = Math.cos(t * 3.2 + rm.phase) * 0.35;

        _dummy.position.set(rm.x, 1.55, rm.z + rm.sideSign * 0.3);
        _dummy.rotation.set(rm.sideSign * (0.35 + reach * 0.4), swing, 0);
        _dummy.scale.set(0.42, 1.55, 0.42);
        _dummy.updateMatrix();
        robotArmInst.setMatrixAt(i, _dummy.matrix);

        _dummy.position.set(rm.x + swing * 0.4, 2.25, rm.z + rm.sideSign * (1.25 + reach * 0.4));
        _dummy.rotation.set(rm.sideSign * 1.15, swing * 0.5, 0);
        _dummy.scale.set(0.3, 1.4, 0.3);
        _dummy.updateMatrix();
        robotForearmInst.setMatrixAt(i, _dummy.matrix);

        const sparkOn = Math.sin(t * 14 + rm.phase * 3) > 0.72;
        _dummy.position.set(rm.x + swing * 0.5, 1.5, rm.z + rm.sideSign * 2.1);
        _dummy.rotation.set(t * 5, t * 3, 0);
        _dummy.scale.setScalar(sparkOn ? 0.32 : 0.001);
        _dummy.updateMatrix();
        sparkInst.setMatrixAt(i, _dummy.matrix);
      }
      robotArmInst.instanceMatrix.needsUpdate = true;
      robotForearmInst.instanceMatrix.needsUpdate = true;
      sparkInst.instanceMatrix.needsUpdate = true;

      // Advance BIW shells West -> East
      const span = widthX * 0.8;
      let sIdx = 0;
      for (let l = 0; l < lineCount; l++) {
        for (let s = 0; s < shellsPerLine; s++) {
          const frac = ((s / shellsPerLine) + t * 0.035) % 1.0;
          const sx = -span * 0.5 + frac * span;
          _dummy.position.set(sx, 1.15, lineZs[l]);
          _dummy.rotation.set(0, 0, 0);
          _dummy.scale.set(3.8, 1.15, 1.75);
          _dummy.updateMatrix();
          shellInst.setMatrixAt(sIdx++, _dummy.matrix);
        }
      }
      shellInst.instanceMatrix.needsUpdate = true;
    },
  };
}

/**
 * F04: Paint shop dip tanks (RoDip E) and spray booths
 */
function buildF04Interior(spec) {
  const { widthX, depthZ } = spec.bounds3JS;
  const g = new THREE.Group();
  g.name = 'Interior_F04_PaintShop';

  const slab = new THREE.Mesh(UNIT_BOX, MAT.floorZone);
  slab.scale.set(widthX * 0.94, 0.08, depthZ * 0.9);
  slab.position.y = 0.06;
  g.add(slab);

  // 4 RoDip E pre-treatment / E-coat dip tanks on South half
  const tankCount = 4;
  const tankShellInst = new THREE.InstancedMesh(UNIT_BOX, MAT.paintTank, tankCount);
  const tankLiquidInst = new THREE.InstancedMesh(UNIT_BOX, MAT.paintLiquid, tankCount);
  const dipBodyInst = new THREE.InstancedMesh(UNIT_BOX, MAT.biwShell, tankCount);

  const tankCoords = [];
  for (let i = 0; i < tankCount; i++) {
    const tx = -widthX * 0.3 + i * (widthX * 0.2);
    const tz = depthZ * 0.2;
    tankCoords.push({ x: tx, z: tz, phase: i * 1.5 });

    _dummy.position.set(tx, 1.1, tz);
    _dummy.rotation.set(0, 0, 0);
    _dummy.scale.set(13.5, 2.0, 7.5);
    _dummy.updateMatrix();
    tankShellInst.setMatrixAt(i, _dummy.matrix);

    _dummy.position.set(tx, 1.95, tz);
    _dummy.scale.set(12.6, 0.25, 6.6);
    _dummy.updateMatrix();
    tankLiquidInst.setMatrixAt(i, _dummy.matrix);
  }
  tankShellInst.instanceMatrix.needsUpdate = true;
  tankLiquidInst.instanceMatrix.needsUpdate = true;
  g.add(tankShellInst, tankLiquidInst, dipBodyInst);

  // 3 Spray booths + EcoInCure ovens on North half
  const boothCount = 3;
  const boothGlassInst = new THREE.InstancedMesh(UNIT_BOX, MAT.boothGlass, boothCount);
  const ovenInst = new THREE.InstancedMesh(UNIT_BOX, MAT.ovenGlow, boothCount);
  const sprayRobotInst = new THREE.InstancedMesh(UNIT_BOX, MAT.robotOrange, boothCount * 6);

  let srIdx = 0;
  for (let b = 0; b < boothCount; b++) {
    const bz = -depthZ * 0.3 + b * 12.5;
    _dummy.position.set(-widthX * 0.14, 2.2, bz);
    _dummy.rotation.set(0, 0, 0);
    _dummy.scale.set(widthX * 0.44, 3.6, 7.2);
    _dummy.updateMatrix();
    boothGlassInst.setMatrixAt(b, _dummy.matrix);

    _dummy.position.set(widthX * 0.26, 2.2, bz);
    _dummy.scale.set(widthX * 0.26, 3.6, 7.2);
    _dummy.updateMatrix();
    ovenInst.setMatrixAt(b, _dummy.matrix);

    for (let r = 0; r < 6; r++) {
      const rx = -widthX * 0.31 + r * 7.2;
      _dummy.position.set(rx, 1.5, bz + (r % 2 === 0 ? -2.4 : 2.4));
      _dummy.scale.set(0.6, 2.2, 0.6);
      _dummy.updateMatrix();
      sprayRobotInst.setMatrixAt(srIdx++, _dummy.matrix);
    }
  }
  boothGlassInst.instanceMatrix.needsUpdate = true;
  ovenInst.instanceMatrix.needsUpdate = true;
  sprayRobotInst.instanceMatrix.needsUpdate = true;
  g.add(boothGlassInst, ovenInst, sprayRobotInst);

  return {
    group: g,
    update(t) {
      // Animate RoDip E bodies dipping and rotating 360 degrees
      for (let i = 0; i < tankCount; i++) {
        const tc = tankCoords[i];
        const dip = Math.sin(t * 1.1 + tc.phase);
        _dummy.position.set(tc.x, 2.6 + dip * 1.1, tc.z);
        _dummy.rotation.set(0, 0, t * 0.9 + tc.phase);
        _dummy.scale.set(3.8, 1.15, 1.75);
        _dummy.updateMatrix();
        dipBodyInst.setMatrixAt(i, _dummy.matrix);
      }
      dipBodyInst.instanceMatrix.needsUpdate = true;
    },
  };
}

/**
 * F05: E-shaped General Assembly conveyor lines, moving EV bodies (buildSleekCar),
 * Marriage station, and finished EVs rolling out East.
 */
function buildF05Interior(spec) {
  const { widthX, depthZ } = spec.bounds3JS;
  const g = new THREE.Group();
  g.name = 'Interior_F05_GeneralAssembly';

  // Exact E-shape segments matching spineFactoriesBuilder.js (WORLD_SCALE = 0.25)
  const spineD = 40;
  const wingD = 75;
  const westW = 45;
  const centerW = 47.5;
  const eastW = 45;

  const spineZ = -depthZ * 0.5 + spineD * 0.5; // -37.5
  const wingZ = depthZ * 0.5 - wingD * 0.5; // +20
  const westX = -widthX * 0.5 + westW * 0.5; // -58.75
  const centerX = 0;
  const eastX = widthX * 0.5 - eastW * 0.5; // +58.75

  // Floor pads strictly inside the E-shape
  [
    { w: widthX * 0.96, d: spineD * 0.88, x: 0, z: spineZ },
    { w: westW * 0.86, d: wingD * 0.9, x: westX, z: wingZ },
    { w: centerW * 0.86, d: wingD * 0.9, x: centerX, z: wingZ },
    { w: eastW * 0.86, d: wingD * 0.9, x: eastX, z: wingZ },
  ].forEach((seg) => {
    const pad = new THREE.Mesh(UNIT_BOX, MAT.floorZone);
    pad.scale.set(seg.w, 0.08, seg.d);
    pad.position.set(seg.x, 0.06, seg.z);
    g.add(pad);
  });

  // Reusable conveyor segments along North Spine (Trim Line) & 3 South Wings
  const placeConveyorRun = (x1, z1, x2, z2, step = 12) => {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const len = Math.hypot(dx, dz);
    const count = Math.max(1, Math.floor(len / step));
    const angle = Math.atan2(-dz, dx);
    for (let i = 0; i < count; i++) {
      const frac = (i + 0.5) / count;
      const conv = buildConveyorTwin({ targetLength: step * 0.92 });
      conv.position.set(x1 + dx * frac, 0.1, z1 + dz * frac);
      conv.rotation.y = angle;
      g.add(conv);
    }
  };

  placeConveyorRun(-widthX * 0.44, spineZ, widthX * 0.44, spineZ, 16);
  placeConveyorRun(westX, -15, westX, 48, 16);
  placeConveyorRun(centerX, -15, centerX, 48, 16);
  placeConveyorRun(eastX, -15, eastX, 48, 16);

  // Marriage Station in Center Wing (gantry + battery/e-axle lift)
  const marriageGroup = new THREE.Group();
  marriageGroup.position.set(centerX, 0.1, 14);
  const gantry = new THREE.Mesh(UNIT_BOX, MAT.pressBlue);
  gantry.scale.set(12, 4.2, 8);
  gantry.position.y = 2.1;
  const liftEngine = buildElectricEngineTwin({ targetHeight: 1.3 });
  liftEngine.position.set(0, 0.4, 0);
  const wheelProp = buildWheelTwin({ targetHeight: 1.0 });
  wheelProp.position.set(4.5, 0.1, -3);
  marriageGroup.add(gantry, liftEngine, wheelProp);
  g.add(marriageGroup);

  // Forklifts in Kitting area
  [-32, 32].forEach((fx) => {
    const fl = buildForkliftTwin({ color: 'orange', targetHeight: 2.1 });
    fl.position.set(fx, 0.1, spineZ + 10);
    g.add(fl);
  });

  // Moving EV bodies & finished EVs using buildSleekCar
  const carPalette = ['#ef4444', '#2563eb', '#10b981', '#f8fafc', '#f59e0b', '#6366f1'];
  const spineCars = [];
  for (let i = 0; i < 6; i++) {
    const car = buildSleekCar({
      id: `F05-TRIM-${i}`,
      colorHex: carPalette[i % carPalette.length],
    });
    car.scale.setScalar(0.65);
    g.add(car);
    spineCars.push({ car, offset: i / 6 });
  }

  const finalCars = [];
  for (let i = 0; i < 4; i++) {
    const car = buildSleekCar({
      id: `F05-FINAL-${i}`,
      colorHex: carPalette[(i + 2) % carPalette.length],
    });
    car.scale.setScalar(0.65);
    car.rotation.y = 0; // Facing East (+X)
    g.add(car);
    finalCars.push({ car, offset: i / 4 });
  }

  return {
    group: g,
    update(t) {
      // Trim line cars moving West -> East along North spine
      const spineSpan = widthX * 0.82;
      for (const item of spineCars) {
        const frac = (item.offset + t * 0.04) % 1.0;
        item.car.position.set(-spineSpan * 0.5 + frac * spineSpan, 0.55, spineZ);
      }

      // Marriage lift oscillation
      liftEngine.position.y = 0.45 + Math.sin(t * 2.0) * 0.35;

      // Finished EVs rolling down East wing & exiting East toward F09
      for (const item of finalCars) {
        const frac = (item.offset + t * 0.055) % 1.0;
        if (frac < 0.55) {
          const localZ = -14 + (frac / 0.55) * 32;
          item.car.position.set(eastX, 0.55, localZ);
          item.car.rotation.y = -Math.PI * 0.5;
        } else {
          const localX = eastX + ((frac - 0.55) / 0.45) * 28;
          item.car.position.set(localX, 0.12, 18);
          item.car.rotation.y = 0;
        }
      }
    },
  };
}

/**
 * WH01: 24 high-bay AS/RS rack aisles (InstancedMesh) + automated stacker cranes
 */
function buildWH01Interior(spec) {
  const { widthX, depthZ } = spec.bounds3JS;
  const g = new THREE.Group();
  g.name = 'Interior_WH01_ASRS';

  const slab = new THREE.Mesh(UNIT_BOX, MAT.floorZone);
  slab.scale.set(widthX * 0.94, 0.08, depthZ * 0.9);
  slab.position.y = 0.06;
  g.add(slab);

  // 24 High-bay rack rows (12 aisles x 2 sides), 6 bays per row = 144 bays
  const rackRows = 24;
  const baysPerRow = 6;
  const totalBays = rackRows * baysPerRow;
  const rackH = 8.4;

  const uprightInst = new THREE.InstancedMesh(UNIT_BOX, MAT.rackBlue, totalBays * 2);
  const beamInst = new THREE.InstancedMesh(UNIT_BOX, MAT.rackOrange, totalBays * 3);
  const palletInst = new THREE.InstancedMesh(UNIT_BOX, MAT.palletBox, totalBays * 3);

  let uIdx = 0;
  let bIdx = 0;
  let pIdx = 0;

  const bayLen = (widthX * 0.72) / baysPerRow;
  const rowSpanZ = depthZ * 0.84;

  for (let r = 0; r < rackRows; r++) {
    const rz = -rowSpanZ * 0.5 + (r / (rackRows - 1)) * rowSpanZ;
    for (let b = 0; b < baysPerRow; b++) {
      const bx = -widthX * 0.36 + (b + 0.5) * bayLen;

      // 2 Uprights per bay
      [-bayLen * 0.46, bayLen * 0.46].forEach((ox) => {
        _dummy.position.set(bx + ox, rackH * 0.5, rz);
        _dummy.rotation.set(0, 0, 0);
        _dummy.scale.set(0.24, rackH, 1.3);
        _dummy.updateMatrix();
        uprightInst.setMatrixAt(uIdx++, _dummy.matrix);
      });

      // 3 Shelf tiers + pallet loads
      [1.8, 4.4, 7.0].forEach((ly) => {
        _dummy.position.set(bx, ly, rz);
        _dummy.scale.set(bayLen * 0.92, 0.22, 1.35);
        _dummy.updateMatrix();
        beamInst.setMatrixAt(bIdx++, _dummy.matrix);

        _dummy.position.set(bx, ly + 0.65, rz);
        _dummy.scale.set(bayLen * 0.78, 1.05, 1.1);
        _dummy.updateMatrix();
        palletInst.setMatrixAt(pIdx++, _dummy.matrix);
      });
    }
  }

  uprightInst.instanceMatrix.needsUpdate = true;
  beamInst.instanceMatrix.needsUpdate = true;
  palletInst.instanceMatrix.needsUpdate = true;
  g.add(uprightInst, beamInst, palletInst);

  // 6 Automated AS/RS Stacker Cranes gliding along aisles
  const craneCount = 6;
  const craneInst = new THREE.InstancedMesh(UNIT_BOX, MAT.craneYellow, craneCount);
  g.add(craneInst);

  // 2 Forklifts at East AMR/shipping staging apron
  [-12, 12].forEach((fz) => {
    const fl = buildForkliftTwin({ color: 'blue', targetHeight: 2.1 });
    fl.position.set(widthX * 0.41, 0.1, fz);
    fl.rotation.y = -Math.PI * 0.5;
    g.add(fl);
  });

  return {
    group: g,
    update(t) {
      for (let i = 0; i < craneCount; i++) {
        const aisleZ = -rowSpanZ * 0.42 + (i / (craneCount - 1)) * (rowSpanZ * 0.84);
        const cx = Math.sin(t * 0.6 + i * 1.4) * (widthX * 0.3);
        _dummy.position.set(cx, rackH * 0.5, aisleZ);
        _dummy.rotation.set(0, 0, 0);
        _dummy.scale.set(1.2, rackH * 0.95, 0.9);
        _dummy.updateMatrix();
        craneInst.setMatrixAt(i, _dummy.matrix);
      }
      craneInst.instanceMatrix.needsUpdate = true;
    },
  };
}

const ZONE_BUILDERS = {
  F01: buildF01Interior,
  F02: buildF02Interior,
  F03: buildF03Interior,
  F04: buildF04Interior,
  F05: buildF05Interior,
  WH01: buildWH01Interior,
};

/**
 * Builds all 6 interior production line zones and returns `{ group, update }`.
 *
 * @param {import('../core/constructionTimeline.js').ConstructionTimelineController} [timelineController]
 * @returns {{ group: THREE.Group, update: (elapsedTime: number, currentMonth: number, isCutaway: boolean, cameraPosition?: THREE.Vector3) => void }}
 */
export function buildInteriorProductionLines(timelineController) {
  const group = new THREE.Group();
  group.name = 'Gigafactory_InteriorProductionLines';

  const zones = [];

  for (const id of INTERIOR_BUILDING_IDS) {
    const spec = getBuildingSpecById(id);
    const builder = ZONE_BUILDERS[id];
    if (!spec || !builder) continue;

    const built = builder(spec);
    built.group.position.set(spec.bounds3JS.centerX, 0, spec.bounds3JS.centerZ);
    built.group.visible = false;
    group.add(built.group);

    zones.push({
      id,
      centerX: spec.bounds3JS.centerX,
      centerZ: spec.bounds3JS.centerZ,
      group: built.group,
      updateZone: built.update,
    });
  }

  function getStageIndex(buildingId, currentMonth) {
    if (timelineController && typeof timelineController.getBuildingState === 'function') {
      return timelineController.getBuildingState(buildingId).stageIndex;
    }
    return getBuildingStageAtMonth(buildingId, currentMonth).stageIndex;
  }

  function update(elapsedTime, currentMonth, isCutaway, cameraPosition) {
    let anyVisible = false;

    for (const zone of zones) {
      const stageIndex = getStageIndex(zone.id, currentMonth);
      let isClose = false;

      if (cameraPosition && stageIndex >= 3) {
        const dx = cameraPosition.x - zone.centerX;
        const dy = cameraPosition.y || 0;
        const dz = cameraPosition.z - zone.centerZ;
        const distSq = dx * dx + dy * dy + dz * dz;
        isClose = distSq < CLOSE_ZOOM_DISTANCE_SQ;
      }

      const shouldShow = (isCutaway === true && stageIndex >= 3) || isClose;
      zone.group.visible = shouldShow;

      if (shouldShow) {
        anyVisible = true;
        zone.updateZone(elapsedTime);
      }
    }

    group.visible = anyVisible;
  }

  return { group, update };
}
