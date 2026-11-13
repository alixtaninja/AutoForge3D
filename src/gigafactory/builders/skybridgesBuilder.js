import * as THREE from 'three';
import {
  getSkybridgesSpec,
  getBuildingStageAtMonth,
} from '../config/masterSpecLoader.js';

/**
 * Elevated Skybridges Builder (TASK-009)
 * Builds SB-01..SB-05 enclosed glass-and-truss conveyor bridges at +9.5m..+18m
 * with T-piers and animated moving car bodies, CTB battery packs, E-axles, and JIS modules.
 */

const MAT = {
  pierConcrete: new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.85, metalness: 0.08 }),
  trussSteel: new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.42, metalness: 0.72 }),
  deckFloor: new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.65, metalness: 0.35 }),
  roofCap: new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.5, metalness: 0.45 }),
  glassWall: new THREE.MeshStandardMaterial({
    color: 0xbae6fd,
    emissive: 0x0284c7,
    emissiveIntensity: 0.14,
    roughness: 0.1,
    metalness: 0.15,
    transparent: true,
    opacity: 0.32,
    depthWrite: false,
  }),
  conveyorRail: new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4, metalness: 0.5 }),
  biwSilver: new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.28, metalness: 0.82 }),
  batteryPack: new THREE.MeshStandardMaterial({ color: 0x312e81, roughness: 0.38, metalness: 0.55 }),
  batteryAccent: new THREE.MeshStandardMaterial({ color: 0xa855f7, roughness: 0.3, metalness: 0.4 }),
  eAxleMetal: new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.25, metalness: 0.85 }),
  eAxleCore: new THREE.MeshStandardMaterial({ color: 0x4527a0, roughness: 0.35, metalness: 0.5 }),
  jisModule: new THREE.MeshStandardMaterial({ color: 0x00838f, roughness: 0.45, metalness: 0.3 }),
};

const PAINT_COLORS = [0xef4444, 0x3b82f6, 0x10b981, 0xf8fafc, 0xf59e0b];

function buildTPier(height, bridgeWidth) {
  const pier = new THREE.Group();
  const stemH = Math.max(0.5, height - 0.35);

  const footing = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.35, 1.4), MAT.pierConcrete);
  footing.position.y = 0.175;
  footing.receiveShadow = true;
  pier.add(footing);

  const stem = new THREE.Mesh(new THREE.BoxGeometry(0.75, stemH, 0.75), MAT.pierConcrete);
  stem.position.y = stemH * 0.5;
  stem.castShadow = true;
  pier.add(stem);

  const capW = bridgeWidth + 0.6;
  const cap = new THREE.Mesh(new THREE.BoxGeometry(capW, 0.45, 1.1), MAT.trussSteel);
  cap.position.y = height - 0.22;
  cap.castShadow = true;
  pier.add(cap);

  return pier;
}

function buildPayloadMesh(bridgeId, index) {
  const g = new THREE.Group();

  if (bridgeId === 'SB-01' || bridgeId === 'SB-02') {
    const bodyMat =
      bridgeId === 'SB-01'
        ? MAT.biwSilver
        : new THREE.MeshStandardMaterial({
            color: PAINT_COLORS[index % PAINT_COLORS.length],
            roughness: 0.22,
            metalness: 0.65,
          });
    const lower = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.42, 1.85), bodyMat);
    lower.position.y = 0.32;
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.32, 0.98), bodyMat);
    cabin.position.set(0, 0.65, -0.08);
    g.add(lower, cabin);
  } else if (bridgeId === 'SB-03') {
    const pack = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.22, 1.45), MAT.batteryPack);
    pack.position.y = 0.25;
    const busbar = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.08, 1.15), MAT.batteryAccent);
    busbar.position.y = 0.38;
    g.add(pack, busbar);
  } else if (bridgeId === 'SB-04') {
    const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.9, 10), MAT.eAxleMetal);
    housing.rotation.z = Math.PI * 0.5;
    housing.position.y = 0.3;
    const inverter = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.22, 0.42), MAT.eAxleCore);
    inverter.position.y = 0.48;
    g.add(housing, inverter);
  } else {
    const pallet = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.14, 1.2), MAT.trussSteel);
    pallet.position.y = 0.15;
    const seatL = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.48, 0.42), MAT.jisModule);
    seatL.position.set(-0.26, 0.46, 0);
    const seatR = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.48, 0.42), MAT.jisModule);
    seatR.position.set(0.26, 0.46, 0);
    g.add(pallet, seatL, seatR);
  }

  return g;
}

function buildSingleSkybridge(spec) {
  const bridgeGroup = new THREE.Group();
  bridgeGroup.name = `Skybridge_${spec.id}`;

  const pts = (spec.waypoints3JS || []).map((p) => new THREE.Vector3(p.x, p.y, p.z));
  if (pts.length < 2) {
    return { group: bridgeGroup, payloads: [], segments: [], totalLength: 0, spec };
  }

  const width = spec.width3JS || 2.0;
  const height = spec.height3JS || 1.8;

  const segments = [];
  let totalLength = 0;

  for (let i = 0; i < pts.length - 1; i++) {
    const start = pts[i];
    const end = pts[i + 1];
    const dir = new THREE.Vector3().subVectors(end, start);
    const len = dir.length();
    if (len < 0.01) continue;

    const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    const segGroup = new THREE.Group();
    segGroup.position.copy(mid);

    const lookTarget = end.clone();
    segGroup.lookAt(lookTarget);

    // Bottom steel deck
    const deck = new THREE.Mesh(new THREE.BoxGeometry(width, 0.22, len), MAT.deckFloor);
    deck.position.y = 0.11;
    deck.castShadow = true;
    deck.receiveShadow = true;
    segGroup.add(deck);

    // Central conveyor rail
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.08, len), MAT.conveyorRail);
    rail.position.y = 0.24;
    segGroup.add(rail);

    // Roof cap
    const roof = new THREE.Mesh(new THREE.BoxGeometry(width + 0.16, 0.18, len), MAT.roofCap);
    roof.position.y = height;
    roof.castShadow = true;
    segGroup.add(roof);

    // Transparent glass side walls
    [-width * 0.48, width * 0.48].forEach((sx) => {
      const glass = new THREE.Mesh(new THREE.BoxGeometry(0.08, height - 0.3, len), MAT.glassWall);
      glass.position.set(sx, height * 0.5 + 0.05, 0);
      segGroup.add(glass);
    });

    // Warren-truss vertical posts & top/bottom chords along segment
    const bayCount = Math.max(2, Math.round(len / 4.5));
    const bayLen = len / bayCount;
    [-width * 0.5, width * 0.5].forEach((sx) => {
      const topChord = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, len), MAT.trussSteel);
      topChord.position.set(sx, height - 0.1, 0);
      const botChord = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, len), MAT.trussSteel);
      botChord.position.set(sx, 0.18, 0);
      segGroup.add(topChord, botChord);

      for (let b = 0; b <= bayCount; b++) {
        const bz = -len * 0.5 + b * bayLen;
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, height - 0.2, 0.12), MAT.trussSteel);
        post.position.set(sx, height * 0.5, bz);
        segGroup.add(post);

        if (b < bayCount) {
          const diagLen = Math.hypot(bayLen, height - 0.3);
          const diag = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, diagLen), MAT.trussSteel);
          diag.position.set(sx, height * 0.5, bz + bayLen * 0.5);
          const pitch = Math.atan2(height - 0.3, bayLen) * (b % 2 === 0 ? 1 : -1);
          diag.rotation.x = pitch;
          segGroup.add(diag);
        }
      }
    });

    bridgeGroup.add(segGroup);

    // T-Piers along segment
    const pierSpacing = 22;
    const pierCount = Math.max(1, Math.floor(len / pierSpacing));
    const yaw = Math.atan2(dir.x, dir.z);
    for (let p = 1; p <= pierCount; p++) {
      const t = p / (pierCount + 1);
      const pierPos = new THREE.Vector3().lerpVectors(start, end, t);
      const pier = buildTPier(pierPos.y, width);
      pier.position.set(pierPos.x, 0, pierPos.z);
      pier.rotation.y = yaw;
      bridgeGroup.add(pier);
    }

    segments.push({
      start,
      end,
      length: len,
      startDist: totalLength,
      endDist: totalLength + len,
      yaw,
    });
    totalLength += len;
  }

  // Also place T-piers at intermediate polyline elbows (for multi-segment SB-05)
  for (let i = 1; i < pts.length - 1; i++) {
    const pt = pts[i];
    const dir = new THREE.Vector3().subVectors(pts[i + 1], pts[i - 1]);
    const pier = buildTPier(pt.y, width);
    pier.position.set(pt.x, 0, pt.z);
    pier.rotation.y = Math.atan2(dir.x, dir.z);
    bridgeGroup.add(pier);
  }

  // Animated payloads inside the enclosed glass bridge
  const payloadCount = Math.max(3, Math.min(10, Math.round(totalLength / 14)));
  const payloadGroup = new THREE.Group();
  const payloads = [];
  for (let i = 0; i < payloadCount; i++) {
    const mesh = buildPayloadMesh(spec.id, i);
    payloadGroup.add(mesh);
    payloads.push({
      mesh,
      offset: i / payloadCount,
    });
  }
  bridgeGroup.add(payloadGroup);

  return {
    group: bridgeGroup,
    payloadGroup,
    payloads,
    segments,
    totalLength,
    spec,
  };
}

function samplePolyline(segments, totalLength, tNormalized) {
  const dist = ((tNormalized % 1) + 1) % 1 * totalLength;
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (dist <= seg.endDist || i === segments.length - 1) {
      const localT = seg.length > 0 ? (dist - seg.startDist) / seg.length : 0;
      return {
        x: THREE.MathUtils.lerp(seg.start.x, seg.end.x, localT),
        y: THREE.MathUtils.lerp(seg.start.y, seg.end.y, localT),
        z: THREE.MathUtils.lerp(seg.start.z, seg.end.z, localT),
        yaw: seg.yaw,
      };
    }
  }
  return { x: 0, y: 0, z: 0, yaw: 0 };
}

/**
 * Builds all 5 elevated skybridges (SB-01..SB-05) with T-piers and animated payloads.
 *
 * @param {import('../core/constructionTimeline.js').ConstructionTimelineController} [timelineController]
 * @returns {{ group: THREE.Group, update: (elapsedTime?: number, currentMonth?: number) => void }}
 */
export function buildSkybridges(timelineController = null) {
  const group = new THREE.Group();
  group.name = 'Gigafactory_Skybridges_SB01_SB05';

  const specs = getSkybridgesSpec();
  const bridges = specs.map((spec) => {
    const built = buildSingleSkybridge(spec);
    group.add(built.group);
    return built;
  });

  function getBuildingStage(buildingId, currentMonth) {
    if (timelineController?.getBuildingState) {
      return timelineController.getBuildingState(buildingId).stageIndex;
    }
    return getBuildingStageAtMonth(buildingId, currentMonth).stageIndex;
  }

  function update(elapsedTime = 0, currentMonth = 0) {
    bridges.forEach((b, bIdx) => {
      const fromStage = getBuildingStage(b.spec.from_building, currentMonth);
      const toStage = getBuildingStage(b.spec.to_building, currentMonth);
      const maxStage = Math.max(fromStage, toStage);

      const bridgeVisible = maxStage >= 2 || currentMonth >= 11;
      b.group.visible = bridgeVisible;
      if (!bridgeVisible) return;

      const payloadsActive = maxStage >= 3 || currentMonth >= 15;
      b.payloadGroup.visible = payloadsActive;
      if (!payloadsActive || b.totalLength <= 0) return;

      const speed = 3.2; // world units per second
      const cycleSpeed = speed / b.totalLength;
      b.payloads.forEach((p) => {
        const t = (p.offset + elapsedTime * cycleSpeed + bIdx * 0.13) % 1;
        const pos = samplePolyline(b.segments, b.totalLength, t);
        p.mesh.position.set(pos.x, pos.y + 0.22, pos.z);
        p.mesh.rotation.y = pos.yaw;
      });
    });
  }

  update(0, timelineController?.currentMonth ?? 0);

  return {
    group,
    update,
  };
}
