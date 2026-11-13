import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  SCENIC_PROP_BOOST,
  WORLD_SCALE,
  bpTo3JS,
  getAllBuildingsSpec,
  getRoadCorridorsSpec,
} from '../config/masterSpecLoader.js';

const INFRA_INSTALL_MONTH = 2.5;
const TREE_START_MONTH = 3.0;
const TREE_COMPLETE_MONTH = 21.0;
const TRAFFIC_CYCLE_SECONDS = 12.0;

function createSeededRandom(seed = 50052026) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function prepGeo(geometry) {
  const geo = geometry.index ? geometry.toNonIndexed() : geometry;
  if (!geo.attributes.normal) {
    geo.computeVertexNormals();
  }
  if (!geo.attributes.uv) {
    const count = geo.attributes.position.count;
    geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(count * 2), 2));
  }
  return geo;
}

function safeMerge(geos) {
  if (!geos || geos.length === 0) return null;
  const merged = mergeGeometries(geos, false);
  for (const g of geos) g.dispose();
  return merged;
}

function subtractIntervals(start, end, cuts) {
  let segments = [[start, end]];
  for (const [cStart, cEnd] of cuts) {
    const next = [];
    for (const [s, e] of segments) {
      if (cEnd <= s || cStart >= e) {
        next.push([s, e]);
      } else {
        if (s < cStart) next.push([s, cStart]);
        if (e > cEnd) next.push([cEnd, e]);
      }
    }
    segments = next;
  }
  return segments.filter(([s, e]) => e - s > 2.0);
}

function computeRoadIntersections(horizontalRoads, verticalRoads) {
  const intersections = [];
  for (const h of horizontalRoads) {
    const hb = h.bounds3JS;
    for (const v of verticalRoads) {
      const vb = v.bounds3JS;
      const intersectsX = vb.minX <= hb.maxX + 0.5 && vb.maxX >= hb.minX - 0.5;
      const intersectsZ = hb.minZ <= vb.maxZ + 0.5 && hb.maxZ >= hb.minZ - 0.5;
      if (intersectsX && intersectsZ) {
        intersections.push({
          hId: h.id,
          vId: v.id,
          x: vb.centerX,
          z: hb.centerZ,
          halfW: vb.widthX * 0.5,
          halfD: hb.depthZ * 0.5,
        });
      }
    }
  }
  return intersections;
}

function isInsideAnyBuilding(x, z, buildings, margin = 1.4) {
  for (let i = 0; i < buildings.length; i += 1) {
    const b = buildings[i].bounds3JS;
    if (
      x >= b.minX - margin &&
      x <= b.maxX + margin &&
      z >= b.minZ - margin &&
      z <= b.maxZ + margin
    ) {
      return true;
    }
  }
  return false;
}

/**
 * 1. Builds ~320 LED Solar Streetlights along the 8 main boulevards using InstancedMesh (3 Draw Calls).
 */
function buildSolarStreetlights(horizontalRoads, verticalRoads, intersections) {
  const placements = [];
  const spacing = 18.6;
  const curbOffset = 0.65;

  for (const r of horizontalRoads) {
    const rb = r.bounds3JS;
    const cuts = intersections
      .filter((ix) => ix.hId === r.id)
      .map((ix) => [ix.x - ix.halfW - 2.2, ix.x + ix.halfW + 2.2])
      .sort((a, b) => a[0] - b[0]);

    const segs = subtractIntervals(rb.minX + 2, rb.maxX - 2, cuts);
    for (const [s, e] of segs) {
      for (let x = s + 4; x <= e - 4; x += spacing) {
        // North side (-Z) -> arm points +Z (rotY = -PI/2 if arm is along +X)
        placements.push({ x, z: rb.minZ - curbOffset, rotY: -Math.PI / 2 });
        // South side (+Z) -> arm points -Z (rotY = +PI/2)
        placements.push({ x, z: rb.maxZ + curbOffset, rotY: Math.PI / 2 });
      }
    }
  }

  for (const r of verticalRoads) {
    const rb = r.bounds3JS;
    const cuts = intersections
      .filter((ix) => ix.vId === r.id)
      .map((ix) => [ix.z - ix.halfD - 2.2, ix.z + ix.halfD + 2.2])
      .sort((a, b) => a[0] - b[0]);

    const segs = subtractIntervals(rb.minZ + 2, rb.maxZ - 2, cuts);
    for (const [s, e] of segs) {
      for (let z = s + 4; z <= e - 4; z += spacing) {
        // West side (-X) -> arm points +X (rotY = 0)
        placements.push({ x: rb.minX - curbOffset, z, rotY: 0 });
        // East side (+X) -> arm points -X (rotY = PI)
        placements.push({ x: rb.maxX + curbOffset, z, rotY: Math.PI });
      }
    }
  }

  // Cap near ~320 instances if slightly over
  const targetPlacements = placements.slice(0, 324);
  const count = targetPlacements.length;

  const boost = SCENIC_PROP_BOOST;
  const poleH = 2.8 * boost; // ~4.62 units
  const armLen = 0.9 * boost; // ~1.485 units

  // Pole + cantilever arm merged into 1 geometry (20 tris)
  const poleGeo = new THREE.CylinderGeometry(0.06 * boost, 0.1 * boost, poleH, 4, 1, true);
  poleGeo.translate(0, poleH * 0.5, 0);
  const armGeo = new THREE.BoxGeometry(armLen, 0.07 * boost, 0.07 * boost);
  armGeo.translate(armLen * 0.5, poleH - 0.12 * boost, 0);
  const poleAndArmGeo = safeMerge([prepGeo(poleGeo), prepGeo(armGeo)]);

  const solarGeo = new THREE.BoxGeometry(0.46 * boost, 0.04 * boost, 0.32 * boost);
  solarGeo.rotateZ(-0.28);
  solarGeo.translate(0.05 * boost, poleH + 0.1 * boost, 0);

  const ledHeadGeo = new THREE.BoxGeometry(0.32 * boost, 0.08 * boost, 0.18 * boost);
  ledHeadGeo.translate(armLen - 0.1 * boost, poleH - 0.18 * boost, 0);

  const poleMat = new THREE.MeshStandardMaterial({
    color: 0xb0bec5,
    metalness: 0.78,
    roughness: 0.34,
  });
  const solarMat = new THREE.MeshStandardMaterial({
    color: 0x0f294a,
    metalness: 0.65,
    roughness: 0.22,
  });
  const ledMat = new THREE.MeshStandardMaterial({
    color: 0xfff3d6,
    emissive: new THREE.Color(0xffc86b),
    emissiveIntensity: 1.5,
    roughness: 0.2,
    metalness: 0.1,
  });

  const poleInst = new THREE.InstancedMesh(poleAndArmGeo, poleMat, count);
  const solarInst = new THREE.InstancedMesh(solarGeo, solarMat, count);
  const ledInst = new THREE.InstancedMesh(ledHeadGeo, ledMat, count);

  poleInst.name = 'SolarStreetlightPoles';
  solarInst.name = 'SolarStreetlightPanels';
  ledInst.name = 'SolarStreetlightLEDHeads';

  const dummy = new THREE.Object3D();
  for (let i = 0; i < count; i += 1) {
    const p = targetPlacements[i];
    dummy.position.set(p.x, 0, p.z);
    dummy.rotation.set(0, p.rotY, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    poleInst.setMatrixAt(i, dummy.matrix);
    solarInst.setMatrixAt(i, dummy.matrix);
    ledInst.setMatrixAt(i, dummy.matrix);
  }
  poleInst.instanceMatrix.needsUpdate = true;
  solarInst.instanceMatrix.needsUpdate = true;
  ledInst.instanceMatrix.needsUpdate = true;

  const group = new THREE.Group();
  group.name = 'SolarStreetlightsGroup';
  group.add(poleInst, solarInst, ledInst);

  return { group, ledMat, count };
}

/**
 * 2. Builds 32 3-Color Traffic Light Poles at 8 major intersections (7 Draw Calls).
 *    Cycles N-S vs E-W on a realistic 12-second phase.
 */
function buildTrafficLights(intersections) {
  // Select 8 primary intersections across the campus
  const priorityPairs = [
    ['RD-SOUTH-MAIN', 'RD-WEST-LOGISTICS'],
    ['RD-SOUTH-MAIN', 'RD-CROSS-1'],
    ['RD-SOUTH-MAIN', 'RD-CROSS-2'],
    ['RD-SOUTH-MAIN', 'RD-CROSS-3'],
    ['RD-SPINE-SOUTH', 'RD-WEST-LOGISTICS'],
    ['RD-SPINE-SOUTH', 'RD-CROSS-1'],
    ['RD-SPINE-SOUTH', 'RD-CROSS-3'],
    ['RD-SPINE-NORTH', 'RD-CROSS-1'],
  ];

  const selected = [];
  for (const [hId, vId] of priorityPairs) {
    const found = intersections.find((ix) => ix.hId === hId && ix.vId === vId);
    if (found) selected.push(found);
  }
  // Fallback in case any pair wasn't found
  for (const ix of intersections) {
    if (selected.length >= 8) break;
    if (!selected.includes(ix)) selected.push(ix);
  }

  const poles = [];
  for (const ix of selected.slice(0, 8)) {
    const ox = ix.halfW + 0.9;
    const oz = ix.halfD + 0.9;
    // 4 corners: 2 N-S facing, 2 E-W facing
    // NE corner: faces N-S traffic (arm extends -X over vertical road)
    poles.push({ x: ix.x + ox, z: ix.z - oz, rotY: Math.PI, axis: 'NS' });
    // SW corner: faces N-S traffic (arm extends +X over vertical road)
    poles.push({ x: ix.x - ox, z: ix.z + oz, rotY: 0, axis: 'NS' });
    // NW corner: faces E-W traffic (arm extends +Z over horizontal road)
    poles.push({ x: ix.x - ox, z: ix.z - oz, rotY: -Math.PI / 2, axis: 'EW' });
    // SE corner: faces E-W traffic (arm extends -Z over horizontal road)
    poles.push({ x: ix.x + ox, z: ix.z + oz, rotY: Math.PI / 2, axis: 'EW' });
  }

  const boost = SCENIC_PROP_BOOST;
  const mastH = 2.9 * boost;
  const armLen = 2.1 * boost;

  // L-shaped gantry + signal housing box (36 tris)
  const mastGeo = new THREE.BoxGeometry(0.18 * boost, mastH, 0.18 * boost);
  mastGeo.translate(0, mastH * 0.5, 0);
  const armGeo = new THREE.BoxGeometry(armLen, 0.14 * boost, 0.14 * boost);
  armGeo.translate(armLen * 0.5, mastH - 0.15 * boost, 0);
  const housingGeo = new THREE.BoxGeometry(0.26 * boost, 0.72 * boost, 0.22 * boost);
  housingGeo.translate(armLen * 0.72, mastH - 0.45 * boost, 0);

  const gantryGeo = safeMerge([prepGeo(mastGeo), prepGeo(armGeo), prepGeo(housingGeo)]);
  const gantryMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    metalness: 0.72,
    roughness: 0.38,
  });

  const gantryInst = new THREE.InstancedMesh(gantryGeo, gantryMat, poles.length);
  gantryInst.name = 'TrafficLightLGantries';

  // Lamp geometries (positioned in front of housing along +Z and -Z so visible from both directions)
  const makeLampPairGeo = (yOffset) => {
    const f = new THREE.BoxGeometry(0.16 * boost, 0.16 * boost, 0.28 * boost);
    f.translate(armLen * 0.72, mastH - 0.45 * boost + yOffset * boost, 0);
    return f;
  };
  const redGeo = makeLampPairGeo(0.2);
  const amberGeo = makeLampPairGeo(0);
  const greenGeo = makeLampPairGeo(-0.2);

  const createLampMat = (hex) =>
    new THREE.MeshStandardMaterial({
      color: 0x111827,
      emissive: new THREE.Color(hex),
      emissiveIntensity: 0.05,
      roughness: 0.25,
      metalness: 0.1,
    });

  const nsMats = {
    red: createLampMat(0xef4444),
    amber: createLampMat(0xf59e0b),
    green: createLampMat(0x22c55e),
  };
  const ewMats = {
    red: createLampMat(0xef4444),
    amber: createLampMat(0xf59e0b),
    green: createLampMat(0x22c55e),
  };

  const nsPoles = poles.filter((p) => p.axis === 'NS');
  const ewPoles = poles.filter((p) => p.axis === 'EW');

  const nsRedInst = new THREE.InstancedMesh(redGeo, nsMats.red, nsPoles.length);
  const nsAmberInst = new THREE.InstancedMesh(amberGeo, nsMats.amber, nsPoles.length);
  const nsGreenInst = new THREE.InstancedMesh(greenGeo, nsMats.green, nsPoles.length);

  const ewRedInst = new THREE.InstancedMesh(redGeo, ewMats.red, ewPoles.length);
  const ewAmberInst = new THREE.InstancedMesh(amberGeo, ewMats.amber, ewPoles.length);
  const ewGreenInst = new THREE.InstancedMesh(greenGeo, ewMats.green, ewPoles.length);

  nsRedInst.name = 'TrafficLights_NS_Red';
  nsAmberInst.name = 'TrafficLights_NS_Amber';
  nsGreenInst.name = 'TrafficLights_NS_Green';
  ewRedInst.name = 'TrafficLights_EW_Red';
  ewAmberInst.name = 'TrafficLights_EW_Amber';
  ewGreenInst.name = 'TrafficLights_EW_Green';

  const dummy = new THREE.Object3D();
  poles.forEach((p, idx) => {
    dummy.position.set(p.x, 0, p.z);
    dummy.rotation.set(0, p.rotY, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    gantryInst.setMatrixAt(idx, dummy.matrix);
  });
  gantryInst.instanceMatrix.needsUpdate = true;

  const setGroupMatrices = (list, rInst, aInst, gInst) => {
    list.forEach((p, idx) => {
      dummy.position.set(p.x, 0, p.z);
      dummy.rotation.set(0, p.rotY, 0);
      dummy.updateMatrix();
      rInst.setMatrixAt(idx, dummy.matrix);
      aInst.setMatrixAt(idx, dummy.matrix);
      gInst.setMatrixAt(idx, dummy.matrix);
    });
    rInst.instanceMatrix.needsUpdate = true;
    aInst.instanceMatrix.needsUpdate = true;
    gInst.instanceMatrix.needsUpdate = true;
  };

  setGroupMatrices(nsPoles, nsRedInst, nsAmberInst, nsGreenInst);
  setGroupMatrices(ewPoles, ewRedInst, ewAmberInst, ewGreenInst);

  const group = new THREE.Group();
  group.name = 'TrafficSignals3ColorGroup';
  group.add(
    gantryInst,
    nsRedInst,
    nsAmberInst,
    nsGreenInst,
    ewRedInst,
    ewAmberInst,
    ewGreenInst
  );

  return { group, nsMats, ewMats, count: poles.length };
}

/**
 * Creates a crisp 4x2 CanvasTexture atlas for Highway Gantry & Roadside Signs.
 */
function buildHighwaySignAtlasTexture() {
  if (typeof document === 'undefined') {
    const data = new Uint8Array([13, 71, 161, 255]);
    const fallback = new THREE.DataTexture(data, 1, 1);
    fallback.needsUpdate = true;
    return fallback;
  }

  const cols = 2;
  const rows = 4;
  const cellW = 1024;
  const cellH = 256;

  const canvas = document.createElement('canvas');
  canvas.width = cols * cellW;
  canvas.height = rows * cellH;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#0d47a1';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const drawCell = (col, row, drawFn) => {
    const x0 = col * cellW;
    const y0 = row * cellH;
    ctx.save();
    ctx.translate(x0, y0);
    drawFn(ctx, cellW, cellH);
    ctx.restore();
  };

  const drawHighwayCard = (c, w, h, line1, line2, badge = 'GIGAFACTORY HWY') => {
    c.fillStyle = '#0d47a1';
    c.fillRect(0, 0, w, h);
    c.strokeStyle = '#ffffff';
    c.lineWidth = 10;
    c.strokeRect(14, 14, w - 28, h - 28);

    c.fillStyle = '#fbbf24';
    c.fillRect(32, 28, 220, 38);
    c.fillStyle = '#0f172a';
    c.font = 'bold 22px Inter, system-ui, sans-serif';
    c.textBaseline = 'middle';
    c.fillText(badge, 44, 47);

    c.fillStyle = '#ffffff';
    c.font = 'bold 34px Inter, system-ui, sans-serif';
    c.fillText(line1, 34, 118, w - 68);

    c.fillStyle = '#e0f2fe';
    c.font = 'bold 30px Inter, system-ui, sans-serif';
    c.fillText(line2, 34, 186, w - 68);
  };

  // Row 0: Primary Highway Gantries
  drawCell(0, 0, (c, w, h) =>
    drawHighwayCard(
      c,
      w,
      h,
      '⬆️ F01-F03: CASTING & BIW   |   ➡️ F04-F05: PAINT & ASSEMBLY',
      '⬅️ WH01: AS/RS LOGISTICS   |   40 KM/H INDUSTRIAL CORRIDOR',
      'SPINE EXPRESSWAY'
    )
  );
  drawCell(1, 0, (c, w, h) =>
    drawHighwayCard(
      c,
      w,
      h,
      '⬆️ F06A-F06B: CELL & PACK 40GWH   |   ➡️ F07: E-AXLE 800V',
      '⬅️ UT01: 220KV SUBSTATION & BESS   |   UT02-UT04 ENERGY',
      'NORTH ENERGY ZONE'
    )
  );

  // Row 1: Secondary Highway Gantries
  drawCell(0, 1, (c, w, h) =>
    drawHighwayCard(
      c,
      w,
      h,
      '⬆️ IOC01: AI CONTROL TOWER   |   ➡️ RD01: WIND TUNNEL',
      '⬅️ F08-1..5: SUPPLIER PARK   |   UT05: EV FIRE & CLINIC',
      'ADMIN & R&D BLVD'
    )
  );
  drawCell(1, 1, (c, w, h) =>
    drawHighwayCard(
      c,
      w,
      h,
      '⬆️ F09: EOL & ADAS TEST   |   ➡️ PG01: 16-TERRAIN TRACK',
      '⬅️ LY01: SOLAR EXPORT YARD   |   800V SUPERCHARGERS',
      'EAST PROVING ZONE'
    )
  );

  // Row 2: Speed Limit 40 km/h + AGV Crossing
  drawCell(0, 2, (c, w, h) => {
    c.fillStyle = '#f8fafc';
    c.fillRect(0, 0, w, h);
    c.strokeStyle = '#1e293b';
    c.lineWidth = 10;
    c.strokeRect(12, 12, w - 24, h - 24);

    // Red circle
    c.beginPath();
    c.arc(210, h * 0.5, 92, 0, Math.PI * 2);
    c.fillStyle = '#ffffff';
    c.fill();
    c.lineWidth = 22;
    c.strokeStyle = '#dc2626';
    c.stroke();

    c.fillStyle = '#0f172a';
    c.font = 'bold 88px Inter, system-ui, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('40', 210, h * 0.5 + 4);

    c.textAlign = 'left';
    c.font = 'bold 46px Inter, system-ui, sans-serif';
    c.fillText('SPEED LIMIT 40 km/h', 350, 96);
    c.fillStyle = '#475569';
    c.font = 'bold 32px Inter, system-ui, sans-serif';
    c.fillText('KHU VỰC XE TẢI & AGV HẠN CHẾ TỐC ĐỘ', 350, 164);
  });

  drawCell(1, 2, (c, w, h) => {
    c.fillStyle = '#fbbf24';
    c.fillRect(0, 0, w, h);
    c.strokeStyle = '#111827';
    c.lineWidth = 14;
    c.strokeRect(14, 14, w - 28, h - 28);

    c.fillStyle = '#111827';
    c.font = 'bold 54px Inter, system-ui, sans-serif';
    c.textBaseline = 'middle';
    c.fillText('⚠️  AGV / AMR CROSSING', 56, 92);
    c.font = 'bold 36px Inter, system-ui, sans-serif';
    c.fillText('CẢNH BÁO XE TỰ HÀNH BĂNG QUA ĐƯỜNG', 56, 170);
  });

  // Row 3: Roadside Zone Pointers
  drawCell(0, 3, (c, w, h) =>
    drawHighwayCard(
      c,
      w,
      h,
      '⬅️ WH01 AS/RS LOGISTICS   |   F01-F02 CASTING & STAMPING',
      'HEAVY TRUCK & COIL DELIVERY LANE',
      'LOGISTICS ROUTE'
    )
  );
  drawCell(1, 3, (c, w, h) =>
    drawHighwayCard(
      c,
      w,
      h,
      '➡️ F05 GENERAL ASSEMBLY   |   PG01 PROVING GROUND',
      'FINISHED EV EXPORT & ADAS CALIBRATION',
      'ASSEMBLY ROUTE'
    )
  );

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

/**
 * 3. Builds ~48 Highway Gantry & Roadside Directional Signs using 1 Atlas Mesh + 1 Merged Steel Frame Mesh (2 Draw Calls).
 */
function buildHighwayAndRoadsideSigns(roads, intersections) {
  const cols = 2;
  const rows = 4;
  const frameGeos = [];
  const boardGeos = [];

  const addAtlasBoard = (cx, cy, cz, w, h, rotY, col, row) => {
    const uMin = col / cols;
    const uMax = (col + 1) / cols;
    const vMax = 1 - row / rows;
    const vMin = 1 - (row + 1) / rows;

    const makeFace = (faceRotY, offsetZ) => {
      const geo = new THREE.PlaneGeometry(w, h).toNonIndexed();
      const uv = geo.getAttribute('uv');
      for (let i = 0; i < uv.count; i += 1) {
        uv.setXY(i, uMin + uv.getX(i) * (uMax - uMin), vMin + uv.getY(i) * (vMax - vMin));
      }
      if (faceRotY !== 0) geo.rotateY(faceRotY);
      geo.translate(0, 0, offsetZ);
      if (rotY !== 0) geo.rotateY(rotY);
      geo.translate(cx, cy, cz);
      boardGeos.push(geo);
    };

    makeFace(0, 0.06);
    makeFace(Math.PI, -0.06);
  };

  const addGantrySign = (x, z, span, rotY, col, row) => {
    const h = 4.8;
    const half = span * 0.5 + 0.4;

    const addPart = (lx, ly, lz, w, ph, d) => {
      const g = new THREE.BoxGeometry(w, ph, d);
      g.translate(lx, ly, lz);
      if (rotY !== 0) g.rotateY(rotY);
      g.translate(x, 0, z);
      frameGeos.push(prepGeo(g));
    };

    addPart(-half, h * 0.5, 0, 0.35, h, 0.35);
    addPart(half, h * 0.5, 0, 0.35, h, 0.35);
    addPart(0, h, 0, span + 1.0, 0.32, 0.32);

    addAtlasBoard(x, h + 0.75, 0, Math.min(8.5, span * 0.78), 1.65, rotY, col, row);
  };

  const addRoadsideSign = (x, z, rotY, col, row) => {
    const poleH = 2.9;
    const g = new THREE.BoxGeometry(0.16, poleH, 0.16);
    g.translate(x, poleH * 0.5, z);
    frameGeos.push(prepGeo(g));

    addAtlasBoard(x, poleH + 0.45, z, 2.8, 0.95, rotY, col, row);
  };

  // 12 Overhead Highway Gantries spanning RD-SOUTH-MAIN, RD-SPINE-SOUTH, RD-SPINE-NORTH, RD-WEST-LOGISTICS
  const roadById = Object.fromEntries(roads.map((r) => [r.id, r]));
  const sm = roadById['RD-SOUTH-MAIN'];
  const ss = roadById['RD-SPINE-SOUTH'];
  const sn = roadById['RD-SPINE-NORTH'];
  const wl = roadById['RD-WEST-LOGISTICS'];

  const gantries = [
    { road: sm, posBp: [240, 45], col: 0, row: 0 },
    { road: sm, posBp: [720, 45], col: 0, row: 0 },
    { road: sm, posBp: [1240, 45], col: 0, row: 1 },
    { road: sm, posBp: [1820, 45], col: 1, row: 1 },
    { road: ss, posBp: [240, 430], col: 0, row: 0 },
    { road: ss, posBp: [720, 430], col: 0, row: 0 },
    { road: ss, posBp: [1240, 430], col: 1, row: 1 },
    { road: ss, posBp: [1820, 430], col: 1, row: 1 },
    { road: sn, posBp: [240, 970], col: 1, row: 0 },
    { road: sn, posBp: [720, 970], col: 1, row: 0 },
    { road: wl, posBp: [45, 240], col: 0, row: 3 },
    { road: wl, posBp: [45, 720], col: 1, row: 0 },
  ];

  let totalSigns = 0;
  for (const gSpec of gantries) {
    if (!gSpec.road) continue;
    const p = bpTo3JS(gSpec.posBp[0], gSpec.posBp[1], 0);
    const rotY = gSpec.road.orientation === 'horizontal' ? Math.PI / 2 : 0;
    addGantrySign(p.x, p.z, gSpec.road.width3JS, rotY, gSpec.col, gSpec.row);
    totalSigns += 1;
  }

  // 36 Roadside Directional, Speed Limit (40 km/h), and AGV Crossing Signs (total = 48)
  const roadsideTypes = [
    [0, 2], // 40 km/h
    [1, 2], // AGV crossing
    [0, 3], // Logistics route
    [1, 3], // Assembly route
  ];

  let idx = 0;
  for (const r of roads) {
    const rb = r.bounds3JS;
    const step = r.orientation === 'horizontal' ? 95 : 65;
    if (r.orientation === 'horizontal') {
      for (let x = rb.minX + 35; x < rb.maxX - 35 && totalSigns < 48; x += step) {
        const nearIx = intersections.some((ix) => Math.abs(ix.x - x) < ix.halfW + 4);
        if (nearIx) continue;
        const [col, row] = roadsideTypes[idx % roadsideTypes.length];
        addRoadsideSign(x, rb.maxZ + 1.15, 0, col, row);
        idx += 1;
        totalSigns += 1;
      }
    } else {
      for (let z = rb.minZ + 35; z < rb.maxZ - 35 && totalSigns < 48; z += step) {
        const nearIx = intersections.some((ix) => Math.abs(ix.z - z) < ix.halfD + 4);
        if (nearIx) continue;
        const [col, row] = roadsideTypes[idx % roadsideTypes.length];
        addRoadsideSign(rb.maxX + 1.15, z, Math.PI / 2, col, row);
        idx += 1;
        totalSigns += 1;
      }
    }
  }

  const atlasTex = buildHighwaySignAtlasTexture();
  const boardsMesh = new THREE.Mesh(
    safeMerge(boardGeos),
    new THREE.MeshBasicMaterial({ map: atlasTex })
  );
  boardsMesh.name = 'HighwayAndRoadsideSignBoards';

  const framesMesh = new THREE.Mesh(
    safeMerge(frameGeos),
    new THREE.MeshStandardMaterial({
      color: 0x475569,
      metalness: 0.72,
      roughness: 0.4,
    })
  );
  framesMesh.name = 'HighwayGantryAndSignPosts';

  const group = new THREE.Group();
  group.name = 'HighwayAndRoadsideSignsGroup';
  group.add(framesMesh, boardsMesh);

  return { group, count: totalSigns };
}

/**
 * 4. Builds ~800 Urban Trees along main boulevards & retention ponds using InstancedMesh (2 Draw Calls).
 *    Progressively revealed from Epoch 1 (Month 3) to Epoch 5 (Month 21).
 */
function buildUrbanTrees(horizontalRoads, verticalRoads, intersections, buildings) {
  const rand = createSeededRandom(800350);
  const candidates = [];
  const treeOffset = 1.95;

  // Boulevard trees along both sides of horizontal & vertical roads
  for (const r of horizontalRoads) {
    const rb = r.bounds3JS;
    const cuts = intersections
      .filter((ix) => ix.hId === r.id)
      .map((ix) => [ix.x - ix.halfW - 2.6, ix.x + ix.halfW + 2.6])
      .sort((a, b) => a[0] - b[0]);
    const segs = subtractIntervals(rb.minX + 3, rb.maxX - 3, cuts);
    const isSouthMain = r.id === 'RD-SOUTH-MAIN';

    for (const [s, e] of segs) {
      for (let x = s + 2; x <= e - 2; x += 9.2) {
        const zN = rb.minZ - treeOffset;
        const zS = rb.maxZ + treeOffset;
        if (!isInsideAnyBuilding(x, zN, buildings)) {
          candidates.push({ x, z: zN, scale: 0.8 + rand() * 0.45 });
        }
        if (!isInsideAnyBuilding(x, zS, buildings)) {
          candidates.push({ x, z: zS, scale: 0.8 + rand() * 0.45 });
        }
        if (isSouthMain && rand() > 0.25) {
          // Center planted median trees on 6-lane South Blvd
          candidates.push({ x, z: rb.centerZ, scale: 0.68 + rand() * 0.3 });
        }
      }
    }
  }

  for (const r of verticalRoads) {
    const rb = r.bounds3JS;
    const cuts = intersections
      .filter((ix) => ix.vId === r.id)
      .map((ix) => [ix.z - ix.halfD - 2.6, ix.z + ix.halfD + 2.6])
      .sort((a, b) => a[0] - b[0]);
    const segs = subtractIntervals(rb.minZ + 3, rb.maxZ - 3, cuts);

    for (const [s, e] of segs) {
      for (let z = s + 2; z <= e - 2; z += 9.5) {
        const xW = rb.minX - treeOffset;
        const xE = rb.maxX + treeOffset;
        if (!isInsideAnyBuilding(xW, z, buildings)) {
          candidates.push({ x: xW, z, scale: 0.8 + rand() * 0.42 });
        }
        if (!isInsideAnyBuilding(xE, z, buildings)) {
          candidates.push({ x: xE, z, scale: 0.8 + rand() * 0.42 });
        }
      }
    }
  }

  // Trees around SE Ecological Retention Pond (center 235, 232)
  for (let i = 0; i < 90; i += 1) {
    const angle = (i / 90) * Math.PI * 2 + (rand() - 0.5) * 0.08;
    const rx = 56 + rand() * 14;
    const rz = 30 + rand() * 9;
    const x = 235 + Math.cos(angle) * rx;
    const z = 232 + Math.sin(angle) * rz;
    if (z > 183 && x < 333) {
      candidates.push({ x, z, scale: 0.85 + rand() * 0.55 });
    }
  }

  // Trees along East Drainage Canal banks (x = 334 & x = 370)
  for (let z = -255; z <= 255; z += 7.5) {
    candidates.push({ x: 333 - rand() * 3, z, scale: 0.85 + rand() * 0.45 });
    candidates.push({ x: 371 + rand() * 3, z, scale: 0.85 + rand() * 0.45 });
  }

  // Trees around West Stormwater Detention Basin (center -370, 115)
  for (let i = 0; i < 40; i += 1) {
    const angle = (i / 40) * Math.PI * 2;
    const x = -370 + Math.cos(angle) * (24 + rand() * 5);
    const z = 115 + Math.sin(angle) * (38 + rand() * 6);
    candidates.push({ x, z, scale: 0.8 + rand() * 0.45 });
  }

  // Deterministic Fisher-Yates shuffle so progressive Epoch 1 -> Epoch 5 planting looks natural across the whole campus
  for (let i = candidates.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = candidates[i];
    candidates[i] = candidates[j];
    candidates[j] = tmp;
  }

  const treeList = candidates.slice(0, 800);
  const maxCount = treeList.length;

  // Low-poly geometries: trunk (8 tris) + 5-sided cone canopy (10 tris) = 18 tris/tree
  const trunkGeo = new THREE.CylinderGeometry(0.14, 0.24, 1.35, 4, 1, true);
  trunkGeo.translate(0, 0.675, 0);

  const canopyGeo = new THREE.ConeGeometry(1.05, 2.35, 5);
  canopyGeo.translate(0, 2.3, 0);

  const trunkMat = new THREE.MeshStandardMaterial({
    color: 0x5d4037,
    roughness: 0.94,
    metalness: 0.0,
  });
  const canopyMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.85,
    metalness: 0.02,
  });

  const trunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, maxCount);
  const canopyInst = new THREE.InstancedMesh(canopyGeo, canopyMat, maxCount);
  trunkInst.name = 'UrbanTreeTrunks';
  canopyInst.name = 'UrbanTreeCanopies';

  const palette = [
    new THREE.Color(0x2e7d32),
    new THREE.Color(0x388e3c),
    new THREE.Color(0x43a047),
    new THREE.Color(0x1b5e20),
    new THREE.Color(0x558b2f),
  ];

  const dummy = new THREE.Object3D();
  for (let i = 0; i < maxCount; i += 1) {
    const t = treeList[i];
    dummy.position.set(t.x, 0, t.z);
    dummy.rotation.set(0, rand() * Math.PI * 2, 0);
    dummy.scale.set(t.scale, t.scale, t.scale);
    dummy.updateMatrix();
    trunkInst.setMatrixAt(i, dummy.matrix);
    canopyInst.setMatrixAt(i, dummy.matrix);
    canopyInst.setColorAt(i, palette[i % palette.length]);
  }
  trunkInst.instanceMatrix.needsUpdate = true;
  canopyInst.instanceMatrix.needsUpdate = true;
  if (canopyInst.instanceColor) canopyInst.instanceColor.needsUpdate = true;

  const group = new THREE.Group();
  group.name = 'UrbanTreesGroup';
  group.add(trunkInst, canopyInst);

  return { group, trunkInst, canopyInst, maxCount };
}

/**
 * Builds Smart Traffic & Urban Infrastructure Props (TASK-005):
 * - ~320 LED Solar Streetlights (InstancedMesh)
 * - 32 3-Color Traffic Signal Poles at 8 major intersections (12s N-S/E-W cycle)
 * - ~48 Highway Gantry & Roadside Signs with crisp CanvasTexture
 * - ~800 Urban Trees appearing progressively from Epoch 1 to Epoch 5 (InstancedMesh)
 *
 * Total budget: ~14 Draw Calls (< 25) and ~30,500 triangles (< 35,000).
 *
 * @returns {{ group: THREE.Group, updateTrafficLights: (elapsedTime?: number, currentMonth?: number) => void }}
 */
export function buildTrafficAndUrbanProps() {
  const group = new THREE.Group();
  group.name = 'GigafactoryTrafficAndUrbanProps';

  const roads = getRoadCorridorsSpec();
  const buildings = getAllBuildingsSpec();
  const horizontalRoads = roads.filter((r) => r.orientation === 'horizontal');
  const verticalRoads = roads.filter((r) => r.orientation === 'vertical');
  const intersections = computeRoadIntersections(horizontalRoads, verticalRoads);

  const streetlights = buildSolarStreetlights(horizontalRoads, verticalRoads, intersections);
  const trafficLights = buildTrafficLights(intersections);
  const signs = buildHighwayAndRoadsideSigns(roads, intersections);
  const trees = buildUrbanTrees(horizontalRoads, verticalRoads, intersections, buildings);

  group.add(streetlights.group, trafficLights.group, signs.group, trees.group);

  /**
   * Updates traffic signal 12-second N-S / E-W phases, streetlight LED illumination,
   * infrastructure installation visibility, and progressive Epoch 1..5 tree planting.
   *
   * @param {number} [elapsedTime=0]
   * @param {number} [currentMonth=24]
   */
  function updateTrafficLights(elapsedTime = 0, currentMonth = 24) {
    const m = Math.max(0, Number(currentMonth) || 0);
    const infraInstalled = m >= INFRA_INSTALL_MONTH;

    streetlights.group.visible = infraInstalled;
    trafficLights.group.visible = infraInstalled;
    signs.group.visible = infraInstalled;

    if (infraInstalled) {
      // Warm LED glow ramps up once power/substation & roads are active
      streetlights.ledMat.emissiveIntensity = m >= 6 ? 1.8 : 1.1;

      const phase = ((Number(elapsedTime) || 0) % TRAFFIC_CYCLE_SECONDS + TRAFFIC_CYCLE_SECONDS) % TRAFFIC_CYCLE_SECONDS;
      const nsGreen = phase < 4.5;
      const nsAmber = phase >= 4.5 && phase < 6.0;
      const ewGreen = phase >= 6.0 && phase < 10.5;
      const ewAmber = phase >= 10.5;

      const ON = 2.6;
      const OFF = 0.04;

      trafficLights.nsMats.green.emissiveIntensity = nsGreen ? ON : OFF;
      trafficLights.nsMats.amber.emissiveIntensity = nsAmber ? ON : OFF;
      trafficLights.nsMats.red.emissiveIntensity = ewGreen || ewAmber ? ON : OFF;

      trafficLights.ewMats.green.emissiveIntensity = ewGreen ? ON : OFF;
      trafficLights.ewMats.amber.emissiveIntensity = ewAmber ? ON : OFF;
      trafficLights.ewMats.red.emissiveIntensity = nsGreen || nsAmber ? ON : OFF;
    }

    // Progressive urban tree planting from Epoch 1 (Month 3) to Epoch 5 (Month 21)
    const treeProgress = THREE.MathUtils.clamp(
      (m - TREE_START_MONTH) / (TREE_COMPLETE_MONTH - TREE_START_MONTH),
      0,
      1
    );
    const visibleTrees = Math.round(trees.maxCount * treeProgress);
    trees.trunkInst.count = visibleTrees;
    trees.canopyInst.count = visibleTrees;
    trees.group.visible = visibleTrees > 0;
  }

  // Initialize at Month 0
  updateTrafficLights(0, 0);
  group.userData.updateTrafficLights = updateTrafficLights;
  group.userData.stats = {
    streetlights: streetlights.count,
    trafficLights: trafficLights.count,
    signs: signs.count,
    trees: trees.maxCount,
  };

  return { group, updateTrafficLights };
}
