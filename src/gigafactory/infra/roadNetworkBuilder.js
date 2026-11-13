import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  WORLD_SCALE,
  bpTo3JS,
  getAllBuildingsSpec,
  getRoadCorridorsSpec,
} from '../config/masterSpecLoader.js';

const PAVING_COMPLETE_MONTH = 2.5;
const ROAD_SURFACE_Y = 0.05;
const GRAVEL_SURFACE_Y = 0.03;
const PAVING_SURFACE_Y = 0.055;
const MARKING_Y = 0.065;
const CURB_HEIGHT = 0.14;
const CURB_WIDTH = 0.35;

/**
 * Normalizes a geometry so it is non-indexed and has matching attributes
 * (position, normal, uv) before calling mergeGeometries.
 */
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

function createFlatRectGeo(x, z, widthX, depthZ, y) {
  const geo = new THREE.PlaneGeometry(widthX, depthZ);
  geo.rotateX(-Math.PI / 2);
  geo.translate(x, y, z);
  return prepGeo(geo);
}

function createBoxGeo(x, y, z, widthX, heightY, depthZ) {
  const geo = new THREE.BoxGeometry(widthX, heightY, depthZ);
  geo.translate(x, y, z);
  return prepGeo(geo);
}

function safeMerge(geos) {
  if (!geos || geos.length === 0) return null;
  const merged = mergeGeometries(geos, false);
  for (const g of geos) g.dispose();
  return merged;
}

/**
 * Splits a 1D interval [start, end] by subtracting a sorted list of [cutStart, cutEnd] intervals.
 */
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
  return segments.filter(([s, e]) => e - s > 0.5);
}

/**
 * Computes perpendicular access spurs connecting each of the 24 buildings
 * to its nearest main road corridor.
 */
function computeBuildingSpurs(buildings, roads) {
  const spurs = [];
  const spurWidth = 14 * WORLD_SCALE; // 3.5 units (14m)

  for (const b of buildings) {
    const { minX, maxX, minZ, maxZ, centerX, centerZ } = b.bounds3JS;
    let best = null;

    for (const r of roads) {
      const rb = r.bounds3JS;
      if (r.orientation === 'horizontal') {
        // Building X overlaps road X range
        const overlapMinX = Math.max(minX + 1.5, rb.minX + 2);
        const overlapMaxX = Math.min(maxX - 1.5, rb.maxX - 2);
        if (overlapMaxX <= overlapMinX) continue;

        const spurX = THREE.MathUtils.clamp(centerX, overlapMinX, overlapMaxX);
        let gap = Infinity;
        let zStart = 0;
        let zEnd = 0;

        if (minZ >= rb.maxZ) {
          gap = minZ - rb.maxZ;
          zStart = rb.maxZ;
          zEnd = minZ;
        } else if (maxZ <= rb.minZ) {
          gap = rb.minZ - maxZ;
          zStart = maxZ;
          zEnd = rb.minZ;
        }

        if (gap > 0.2 && gap < 45 && (!best || gap < best.gap)) {
          best = {
            gap,
            x: spurX,
            z: (zStart + zEnd) * 0.5,
            widthX: spurWidth,
            depthZ: zEnd - zStart + 0.5,
          };
        }
      } else {
        // Vertical road: building Z overlaps road Z range
        const overlapMinZ = Math.max(minZ + 1.5, rb.minZ + 2);
        const overlapMaxZ = Math.min(maxZ - 1.5, rb.maxZ - 2);
        if (overlapMaxZ <= overlapMinZ) continue;

        const spurZ = THREE.MathUtils.clamp(centerZ, overlapMinZ, overlapMaxZ);
        let gap = Infinity;
        let xStart = 0;
        let xEnd = 0;

        if (minX >= rb.maxX) {
          gap = minX - rb.maxX;
          xStart = rb.maxX;
          xEnd = minX;
        } else if (maxX <= rb.minX) {
          gap = rb.minX - maxX;
          xStart = maxX;
          xEnd = rb.minX;
        }

        if (gap > 0.2 && gap < 45 && (!best || gap < best.gap)) {
          best = {
            gap,
            x: (xStart + xEnd) * 0.5,
            z: spurZ,
            widthX: xEnd - xStart + 0.5,
            depthZ: spurWidth,
          };
        }
      }
    }

    if (best) {
      spurs.push(best);
    }
  }

  return spurs;
}

/**
 * Builds two Security Gatehouses + Weighbridge Gates:
 * 1) West Logistics Gate on RD-WEST-LOGISTICS
 * 2) South R&D/Admin Gate on RD-SOUTH-MAIN (near IOC01 / RD01)
 */
function buildGatehousesGroup() {
  const gateGroup = new THREE.Group();
  gateGroup.name = 'SecurityGatehouses';

  const frameGeos = [];
  const canopyGeos = [];
  const glassGeos = [];
  const hazardGeos = [];

  const addGatehouse = (xBp, yBp, roadWidthM, rotateY) => {
    const pos = bpTo3JS(xBp, yBp, 0);
    const span = roadWidthM * WORLD_SCALE + 1.4;
    const halfSpan = span * 0.5;

    const transformBox = (lx, ly, lz, w, h, d, targetList) => {
      const geo = new THREE.BoxGeometry(w, h, d);
      if (rotateY !== 0) {
        geo.translate(lx, ly, lz);
        geo.rotateY(rotateY);
        geo.translate(pos.x, 0, pos.z);
      } else {
        geo.translate(pos.x + lx, ly, pos.z + lz);
      }
      targetList.push(prepGeo(geo));
    };

    // 3 Support pillars (left, center island, right)
    transformBox(-halfSpan + 0.35, 1.4, 0, 0.55, 2.8, 0.7, frameGeos);
    transformBox(0, 1.4, 0, 0.75, 2.8, 1.6, frameGeos);
    transformBox(halfSpan - 0.35, 1.4, 0, 0.55, 2.8, 0.7, frameGeos);

    // Overhead canopy roof
    transformBox(0, 3.0, 0, span + 1.0, 0.45, 2.4, canopyGeos);
    // Fascia sign board on canopy
    transformBox(0, 3.1, 1.25, span * 0.65, 0.55, 0.12, hazardGeos);

    // Glass security kiosk in center island
    transformBox(0, 1.15, 0, 0.95, 1.4, 1.9, glassGeos);

    // Barrier arms (inbound & outbound)
    transformBox(-halfSpan * 0.5, 0.75, 0.85, halfSpan * 0.72, 0.1, 0.1, hazardGeos);
    transformBox(halfSpan * 0.5, 0.75, -0.85, halfSpan * 0.72, 0.1, 0.1, hazardGeos);

    // Dual Weighbridge steel deck plates (Trạm Cân Điện Tử)
    transformBox(-halfSpan * 0.5, 0.08, -2.2, halfSpan * 0.65, 0.08, 3.2, frameGeos);
    transformBox(halfSpan * 0.5, 0.08, 2.2, halfSpan * 0.65, 0.08, 3.2, frameGeos);
    // Yellow safety curbs around weighbridges
    transformBox(-halfSpan * 0.5, 0.1, -3.85, halfSpan * 0.68, 0.12, 0.16, hazardGeos);
    transformBox(halfSpan * 0.5, 0.1, 3.85, halfSpan * 0.68, 0.12, 0.16, hazardGeos);
  };

  // 1. West Logistics Gate (spanning RD-WEST-LOGISTICS, 28m wide, near South-West entry)
  addGatehouse(45, 95, 28, 0);

  // 2. South R&D / Admin Gate (spanning RD-SOUTH-MAIN, 36m wide, near IOC01/RD01)
  addGatehouse(1390, 45, 36, Math.PI / 2);

  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.45,
    metalness: 0.72,
  });
  const canopyMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.35,
    metalness: 0.3,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.12,
    metalness: 0.2,
    transparent: true,
    opacity: 0.72,
  });
  const hazardMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.38,
    metalness: 0.25,
  });

  const frameMesh = new THREE.Mesh(safeMerge(frameGeos), frameMat);
  const canopyMesh = new THREE.Mesh(safeMerge(canopyGeos), canopyMat);
  const glassMesh = new THREE.Mesh(safeMerge(glassGeos), glassMat);
  const hazardMesh = new THREE.Mesh(safeMerge(hazardGeos), hazardMat);

  frameMesh.name = 'GatehouseFramesAndWeighbridges';
  canopyMesh.name = 'GatehouseCanopies';
  glassMesh.name = 'GatehouseGlassKiosks';
  hazardMesh.name = 'GatehouseBarriersAndSignage';

  gateGroup.add(frameMesh, canopyMesh, glassMesh, hazardMesh);
  return gateGroup;
}

/**
 * Builds the 350Ha Gigafactory Road Network (TASK-004):
 * - 8 main corridors from getRoadCorridorsSpec() + access spurs to 24 buildings
 * - Construction state (Month 0..2.5): gravel roadbed + active asphalt paving progress
 * - Completed state (Month >= 2.5): #26292E asphalt, concrete curbs, planted center median
 *   on 6-lane RD-SOUTH-MAIN, dashed white lane markings, solid yellow centerlines,
 *   zebra crosswalks at 12 intersections, and 2 Security Gatehouses + Weighbridges.
 * - Merged geometries for < 15 Draw Calls and < 12,000 triangles.
 */
export function buildGigafactoryRoadNetwork() {
  const group = new THREE.Group();
  group.name = 'GigafactoryRoadNetwork';

  const roads = getRoadCorridorsSpec();
  const buildings = getAllBuildingsSpec();
  const spurs = computeBuildingSpurs(buildings, roads);

  const horizontalRoads = roads.filter((r) => r.orientation === 'horizontal');
  const verticalRoads = roads.filter((r) => r.orientation === 'vertical');

  // Detect all intersections between horizontal and vertical boulevards
  const intersections = [];
  for (const h of horizontalRoads) {
    const hb = h.bounds3JS;
    for (const v of verticalRoads) {
      const vb = v.bounds3JS;
      const intersectsX = vb.minX <= hb.maxX + 0.5 && vb.maxX >= hb.minX - 0.5;
      const intersectsZ = hb.minZ <= vb.maxZ + 0.5 && hb.maxZ >= vb.minZ - 0.5;
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

  // 1. Road surfaces (gravel & asphalt)
  const gravelGeos = [];
  const asphaltGeos = [];

  for (const r of roads) {
    const { centerX, centerZ, widthX, depthZ } = r.bounds3JS;
    gravelGeos.push(createFlatRectGeo(centerX, centerZ, widthX, depthZ, GRAVEL_SURFACE_Y));
    asphaltGeos.push(createFlatRectGeo(centerX, centerZ, widthX, depthZ, ROAD_SURFACE_Y));
  }
  for (const s of spurs) {
    gravelGeos.push(createFlatRectGeo(s.x, s.z, s.widthX, s.depthZ, GRAVEL_SURFACE_Y));
    asphaltGeos.push(createFlatRectGeo(s.x, s.z, s.widthX, s.depthZ, ROAD_SURFACE_Y));
  }

  const gravelMat = new THREE.MeshStandardMaterial({
    color: 0x8d7e6a,
    roughness: 0.96,
    metalness: 0.02,
  });
  const asphaltMat = new THREE.MeshStandardMaterial({
    color: 0x26292e,
    roughness: 0.84,
    metalness: 0.05,
  });

  const gravelMesh = new THREE.Mesh(safeMerge(gravelGeos), gravelMat);
  gravelMesh.name = 'GravelRoadbed';
  gravelMesh.receiveShadow = true;

  const asphaltMesh = new THREE.Mesh(safeMerge(asphaltGeos), asphaltMat);
  asphaltMesh.name = 'AsphaltRoadNetwork';
  asphaltMesh.receiveShadow = true;

  // Active paving strip during Month 0..2.5 (half-width along RD-SOUTH-MAIN)
  const southMain = horizontalRoads.find((r) => r.id === 'RD-SOUTH-MAIN') || horizontalRoads[0];
  const smBounds = southMain.bounds3JS;
  const pavingGeo = new THREE.PlaneGeometry(smBounds.widthX, smBounds.depthZ * 0.5);
  pavingGeo.rotateX(-Math.PI / 2);
  // Shift geometry so X=0 is at the West end for clean scale.x progress
  pavingGeo.translate(smBounds.widthX * 0.5, PAVING_SURFACE_Y, 0);
  const pavingMesh = new THREE.Mesh(pavingGeo, asphaltMat);
  pavingMesh.name = 'ActiveAsphaltPavingStrip';
  pavingMesh.position.set(smBounds.minX, 0, smBounds.centerZ - smBounds.depthZ * 0.25);

  // 2. Concrete curbs, planted center median (RD-SOUTH-MAIN), yellow centerlines, white dashed markings
  const curbGeos = [];
  const medianGrassGeos = [];
  const whiteMarkingGeos = [];
  const yellowMarkingGeos = [];

  for (const r of horizontalRoads) {
    const rb = r.bounds3JS;
    const cuts = intersections
      .filter((ix) => ix.hId === r.id)
      .map((ix) => [ix.x - ix.halfW - 0.6, ix.x + ix.halfW + 0.6])
      .sort((a, b) => a[0] - b[0]);

    const segs = subtractIntervals(rb.minX, rb.maxX, cuts);
    const isSixLane = r.lanes >= 6 || r.id === 'RD-SOUTH-MAIN';

    for (const [s, e] of segs) {
      const len = e - s;
      const cx = (s + e) * 0.5;

      // Outer concrete curbs
      curbGeos.push(createBoxGeo(cx, CURB_HEIGHT * 0.5, rb.minZ - CURB_WIDTH * 0.5, len, CURB_HEIGHT, CURB_WIDTH));
      curbGeos.push(createBoxGeo(cx, CURB_HEIGHT * 0.5, rb.maxZ + CURB_WIDTH * 0.5, len, CURB_HEIGHT, CURB_WIDTH));

      if (isSixLane) {
        // Planted center median on 6-lane South Blvd
        const medianWidth = 1.1;
        curbGeos.push(createBoxGeo(cx, CURB_HEIGHT * 0.45, rb.centerZ - medianWidth * 0.5, len, CURB_HEIGHT * 0.9, 0.18));
        curbGeos.push(createBoxGeo(cx, CURB_HEIGHT * 0.45, rb.centerZ + medianWidth * 0.5, len, CURB_HEIGHT * 0.9, 0.18));
        medianGrassGeos.push(createBoxGeo(cx, 0.06, rb.centerZ, len, 0.12, medianWidth - 0.18));

        // Solid yellow edge lines flanking median
        yellowMarkingGeos.push(createFlatRectGeo(cx, rb.centerZ - medianWidth * 0.5 - 0.22, len, 0.12, MARKING_Y));
        yellowMarkingGeos.push(createFlatRectGeo(cx, rb.centerZ + medianWidth * 0.5 + 0.22, len, 0.12, MARKING_Y));

        // 4 dashed white lane dividers (2 per direction for 3+3 lanes)
        const laneOffsets = [-3.15, -1.9, 1.9, 3.15];
        for (let dx = s + 1.5; dx < e - 1.5; dx += 6.0) {
          const dashLen = Math.min(2.4, e - dx - 0.4);
          if (dashLen <= 0.4) continue;
          for (const offZ of laneOffsets) {
            whiteMarkingGeos.push(createFlatRectGeo(dx + dashLen * 0.5, rb.centerZ + offZ, dashLen, 0.12, MARKING_Y));
          }
        }
      } else {
        // 4-lane road: double solid yellow centerline
        yellowMarkingGeos.push(createFlatRectGeo(cx, rb.centerZ - 0.12, len, 0.1, MARKING_Y));
        yellowMarkingGeos.push(createFlatRectGeo(cx, rb.centerZ + 0.12, len, 0.1, MARKING_Y));

        // 2 dashed white lane dividers
        const laneOffsets = [-rb.depthZ * 0.25, rb.depthZ * 0.25];
        for (let dx = s + 1.5; dx < e - 1.5; dx += 6.0) {
          const dashLen = Math.min(2.4, e - dx - 0.4);
          if (dashLen <= 0.4) continue;
          for (const offZ of laneOffsets) {
            whiteMarkingGeos.push(createFlatRectGeo(dx + dashLen * 0.5, rb.centerZ + offZ, dashLen, 0.11, MARKING_Y));
          }
        }
      }
    }
  }

  for (const r of verticalRoads) {
    const rb = r.bounds3JS;
    const cuts = intersections
      .filter((ix) => ix.vId === r.id)
      .map((ix) => [ix.z - ix.halfD - 0.6, ix.z + ix.halfD + 0.6])
      .sort((a, b) => a[0] - b[0]);

    const segs = subtractIntervals(rb.minZ, rb.maxZ, cuts);

    for (const [s, e] of segs) {
      const len = e - s;
      const cz = (s + e) * 0.5;

      // Outer concrete curbs
      curbGeos.push(createBoxGeo(rb.minX - CURB_WIDTH * 0.5, CURB_HEIGHT * 0.5, cz, CURB_WIDTH, CURB_HEIGHT, len));
      curbGeos.push(createBoxGeo(rb.maxX + CURB_WIDTH * 0.5, CURB_HEIGHT * 0.5, cz, CURB_WIDTH, CURB_HEIGHT, len));

      // Double solid yellow centerline
      yellowMarkingGeos.push(createFlatRectGeo(rb.centerX - 0.12, cz, 0.1, len, MARKING_Y));
      yellowMarkingGeos.push(createFlatRectGeo(rb.centerX + 0.12, cz, 0.1, len, MARKING_Y));

      // 2 dashed white lane dividers
      const laneOffsets = [-rb.widthX * 0.25, rb.widthX * 0.25];
      for (let dz = s + 1.5; dz < e - 1.5; dz += 6.0) {
        const dashLen = Math.min(2.4, e - dz - 0.4);
        if (dashLen <= 0.4) continue;
        for (const offX of laneOffsets) {
          whiteMarkingGeos.push(createFlatRectGeo(rb.centerX + offX, dz + dashLen * 0.5, 0.11, dashLen, MARKING_Y));
        }
      }
    }
  }

  // 3. Zebra crosswalks at 12 primary intersections
  const crosswalkIntersections = intersections.slice(0, 12);
  for (const ix of crosswalkIntersections) {
    const stripeCount = 5;
    const stripeLen = 1.25;
    const stripeThick = 0.35;

    // North & South zebra bars (crossing vertical road)
    const spanX = ix.halfW * 1.65;
    const stepX = spanX / stripeCount;
    for (let i = 0; i < stripeCount; i++) {
      const sx = ix.x - spanX * 0.5 + stepX * (i + 0.5);
      whiteMarkingGeos.push(createFlatRectGeo(sx, ix.z - ix.halfD - 0.85, stripeThick, stripeLen, MARKING_Y));
      whiteMarkingGeos.push(createFlatRectGeo(sx, ix.z + ix.halfD + 0.85, stripeThick, stripeLen, MARKING_Y));
    }

    // West & East zebra bars (crossing horizontal road)
    const spanZ = ix.halfD * 1.65;
    const stepZ = spanZ / stripeCount;
    for (let i = 0; i < stripeCount; i++) {
      const sz = ix.z - spanZ * 0.5 + stepZ * (i + 0.5);
      whiteMarkingGeos.push(createFlatRectGeo(ix.x - ix.halfW - 0.85, sz, stripeLen, stripeThick, MARKING_Y));
      whiteMarkingGeos.push(createFlatRectGeo(ix.x + ix.halfW + 0.85, sz, stripeLen, stripeThick, MARKING_Y));
    }
  }

  const curbMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.85,
    metalness: 0.08,
  });
  const grassMat = new THREE.MeshStandardMaterial({
    color: 0x2e7d32,
    roughness: 0.9,
    metalness: 0.02,
  });
  const whitePaintMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.55,
    metalness: 0.05,
  });
  const yellowPaintMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    roughness: 0.55,
    metalness: 0.05,
  });

  const curbsMesh = new THREE.Mesh(safeMerge(curbGeos), curbMat);
  curbsMesh.name = 'RoadConcreteCurbs';

  const medianGrassMesh = new THREE.Mesh(safeMerge(medianGrassGeos), grassMat);
  medianGrassMesh.name = 'SouthBlvdPlantedMedian';

  const whiteMarkingsMesh = new THREE.Mesh(safeMerge(whiteMarkingGeos), whitePaintMat);
  whiteMarkingsMesh.name = 'WhiteLaneMarkingsAndCrosswalks';

  const yellowMarkingsMesh = new THREE.Mesh(safeMerge(yellowMarkingGeos), yellowPaintMat);
  yellowMarkingsMesh.name = 'YellowCenterlines';

  // 4. Security Gatehouses & Weighbridges
  const gatehousesGroup = buildGatehousesGroup();

  // Group into construction phase vs completed phase
  const constructionGroup = new THREE.Group();
  constructionGroup.name = 'RoadConstructionPhase';
  constructionGroup.add(gravelMesh, pavingMesh);

  const completedGroup = new THREE.Group();
  completedGroup.name = 'RoadCompletedPhase';
  completedGroup.add(
    asphaltMesh,
    curbsMesh,
    medianGrassMesh,
    whiteMarkingsMesh,
    yellowMarkingsMesh,
    gatehousesGroup
  );

  group.add(constructionGroup, completedGroup);

  /**
   * Updates road network visual state for a given EPC month (0..24).
   * - Month 0..2.5: gravel roadbed + progressive asphalt paving strip
   * - Month >= 2.5: full paved asphalt, curbs, median, lane markings, crosswalks, gates
   */
  function updateRoadsByMonth(currentMonth = 0) {
    const m = Math.max(0, Number(currentMonth) || 0);
    const isCompleted = m >= PAVING_COMPLETE_MONTH;

    constructionGroup.visible = !isCompleted;
    completedGroup.visible = isCompleted;

    if (!isCompleted) {
      const progress = THREE.MathUtils.clamp(m / PAVING_COMPLETE_MONTH, 0.02, 1.0);
      pavingMesh.scale.x = progress;
    }
  }

  // Initialize at month 0
  updateRoadsByMonth(0);
  group.userData.updateRoadsByMonth = updateRoadsByMonth;

  return { group, updateRoadsByMonth };
}
