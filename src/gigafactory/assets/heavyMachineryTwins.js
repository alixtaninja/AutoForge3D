import * as THREE from 'three';

/**
 * Thư viện Three.js Twin Máy Công Trình Hạng Nặng (TASK-006)
 * - 100% Pure Three.js PBR (MeshStandardMaterial)
 * - Tối ưu Low-Poly (< 1,800 triangles / model)
 * - Đặt đáy chuẩn tại y = 0, hỗ trợ khớp động học userData.joints / slewingPivot / trolley / drum
 */

// ============================================================================
// VẬT LIỆU PBR DÙNG CHUNG (SHARED MATERIALS)
// ============================================================================
const MAT = {
  concrete: new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.9, metalness: 0.05 }),
  darkChassis: new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.48, metalness: 0.62 }),
  rubber: new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.88, metalness: 0.06 }),
  steel: new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.32, metalness: 0.82 }),
  darkSteel: new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.4, metalness: 0.78 }),
  chrome: new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.14, metalness: 0.94 }),
  polishedDrum: new THREE.MeshStandardMaterial({ color: 0xdbe4ee, roughness: 0.18, metalness: 0.92 }),
  rustRedSteel: new THREE.MeshStandardMaterial({ color: 0x8d2b1d, roughness: 0.55, metalness: 0.48 }),
  craneAmber: new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.35, metalness: 0.25 }),
  catYellow: new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.34, metalness: 0.22 }),
  crawlerRed: new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.34, metalness: 0.25 }),
  mixerWhite: new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.24, metalness: 0.12 }),
  mixerBlue: new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.32, metalness: 0.18 }),
  tractorBlue: new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.3, metalness: 0.28 }),
  glass: new THREE.MeshStandardMaterial({
    color: 0x93c5fd,
    roughness: 0.1,
    metalness: 0.15,
    transparent: true,
    opacity: 0.42
  }),
  beaconAmber: new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.6,
    roughness: 0.2
  }),
  tailLightRed: new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xdc2626,
    emissiveIntensity: 1.2,
    roughness: 0.25
  }),
  headLightWhite: new THREE.MeshStandardMaterial({
    color: 0xfef9c3,
    emissive: 0xfef08a,
    emissiveIntensity: 1.1,
    roughness: 0.2
  })
};

function getPaintMaterial(color, fallbackMat) {
  if (color === undefined || color === null) return fallbackMat;
  if (typeof color === 'number' && fallbackMat.color.getHex() === color) return fallbackMat;
  return new THREE.MeshStandardMaterial({
    color,
    roughness: fallbackMat.roughness,
    metalness: fallbackMat.metalness
  });
}

function finalizeTwin(root, name) {
  root.name = name;
  root.traverse((obj) => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });
  return root;
}

function createWheel(radius, width, rimRadius = radius * 0.56) {
  const g = new THREE.Group();
  const tire = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, width, 12),
    MAT.rubber
  );
  tire.rotation.z = Math.PI / 2;
  const rim = new THREE.Mesh(
    new THREE.CylinderGeometry(rimRadius, rimRadius, width + 0.03, 10),
    MAT.steel
  );
  rim.rotation.z = Math.PI / 2;
  g.add(tire, rim);
  return g;
}

function createBeacon(x, y, z) {
  const b = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.16, 8), MAT.beaconAmber);
  b.position.set(x, y, z);
  return b;
}

function createHydraulicCylinder(length, radius = 0.055) {
  const g = new THREE.Group();
  const barrelLen = length * 0.58;
  const rodLen = length * 0.55;
  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, barrelLen, 8),
    MAT.darkChassis
  );
  barrel.position.y = barrelLen * 0.5;
  const rod = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.58, radius * 0.58, rodLen, 8),
    MAT.chrome
  );
  rod.position.y = barrelLen + rodLen * 0.35;
  g.add(barrel, rod);
  return g;
}

// ============================================================================
// 1. CẨU THÁP XÂY DỰNG (TOWER CRANE TWIN)
// ============================================================================
export function buildTowerCraneTwin(options = {}) {
  const {
    height = 42,
    jibLength = 38,
    color = 0xf59e0b
  } = options;

  const root = new THREE.Group();
  const paintMat = getPaintMaterial(color, MAT.craneAmber);
  const counterJibLen = Math.max(10, jibLength * 0.34);

  // 1. Chân đế bê tông + khối đối trọng chân tháp (grounded at y = 0)
  const pad = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.7, 6.4), MAT.concrete);
  pad.position.y = 0.35;
  root.add(pad);

  const crossBaseA = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.5, 0.8), MAT.darkSteel);
  crossBaseA.position.y = 0.95;
  const crossBaseB = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 5.6), MAT.darkSteel);
  crossBaseB.position.y = 0.95;
  root.add(crossBaseA, crossBaseB);

  const ballastGeo = new THREE.BoxGeometry(1.6, 1.1, 1.6);
  [
    [-1.7, 1.25, -1.7],
    [1.7, 1.25, -1.7],
    [-1.7, 1.25, 1.7],
    [1.7, 1.25, 1.7]
  ].forEach(([bx, by, bz]) => {
    const b = new THREE.Mesh(ballastGeo, MAT.concrete);
    b.position.set(bx, by, bz);
    root.add(b);
  });

  // 2. Thân tháp khung giằng mắt cáo chữ X
  const mastWidth = 2.0;
  const halfM = mastWidth * 0.5;
  const mastStartY = 1.2;
  const mastHeight = height - mastStartY;

  const chordGeo = new THREE.BoxGeometry(0.18, mastHeight, 0.18);
  [
    [-halfM, -halfM],
    [halfM, -halfM],
    [-halfM, halfM],
    [halfM, halfM]
  ].forEach(([cx, cz]) => {
    const chord = new THREE.Mesh(chordGeo, paintMat);
    chord.position.set(cx, mastStartY + mastHeight * 0.5, cz);
    root.add(chord);
  });

  // Khung giằng ngang + chéo theo từng đốt tháp
  const bayCount = Math.max(5, Math.min(8, Math.round(mastHeight / 5.2)));
  const bayH = mastHeight / bayCount;
  const diagLen = Math.hypot(mastWidth, bayH);
  const diagAngle = Math.atan2(mastWidth, bayH);
  const diagGeo = new THREE.BoxGeometry(0.09, diagLen, 0.09);
  const ringGeoX = new THREE.BoxGeometry(mastWidth, 0.11, 0.11);
  const ringGeoZ = new THREE.BoxGeometry(0.11, 0.11, mastWidth);

  for (let i = 0; i < bayCount; i++) {
    const y0 = mastStartY + i * bayH;
    const yMid = y0 + bayH * 0.5;
    const sign = i % 2 === 0 ? 1 : -1;

    // Vành ngang ở đỉnh mỗi 2 đốt để giữ khung thoáng & nhẹ poly
    if (i % 2 === 1 || i === bayCount - 1) {
      const rx1 = new THREE.Mesh(ringGeoX, paintMat);
      rx1.position.set(0, y0 + bayH, halfM);
      const rx2 = rx1.clone();
      rx2.position.z = -halfM;
      const rz1 = new THREE.Mesh(ringGeoZ, paintMat);
      rz1.position.set(halfM, y0 + bayH, 0);
      const rz2 = rz1.clone();
      rz2.position.x = -halfM;
      root.add(rx1, rx2, rz1, rz2);
    }

    // Thanh chéo 4 mặt
    const df = new THREE.Mesh(diagGeo, paintMat);
    df.position.set(0, yMid, halfM);
    df.rotation.z = sign * diagAngle;
    const db = new THREE.Mesh(diagGeo, paintMat);
    db.position.set(0, yMid, -halfM);
    db.rotation.z = -sign * diagAngle;
    const dl = new THREE.Mesh(diagGeo, paintMat);
    dl.position.set(-halfM, yMid, 0);
    dl.rotation.x = sign * diagAngle;
    const dr = new THREE.Mesh(diagGeo, paintMat);
    dr.position.set(halfM, yMid, 0);
    dr.rotation.x = -sign * diagAngle;
    root.add(df, db, dl, dr);
  }

  // Vòng mâm xoay (Slewing Ring)
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.35, 0.6, 12), MAT.darkChassis);
  collar.position.y = height - 0.15;
  root.add(collar);

  // 3. Cụm xoay trên đỉnh (slewingPivot)
  const slewingPivot = new THREE.Group();
  slewingPivot.name = 'slewingPivot';
  slewingPivot.position.set(0, height + 0.15, 0);
  root.add(slewingPivot);

  // Sàn máy xoay
  const turntable = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.5, 3.2), MAT.darkChassis);
  turntable.position.set(0, 0.25, 0);
  slewingPivot.add(turntable);

  // Cabin điều khiển lệch bên phải
  const cabBody = new THREE.Mesh(new THREE.BoxGeometry(1.35, 2.0, 1.9), paintMat);
  cabBody.position.set(1.65, 1.2, 0.7);
  const cabGlass = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.15, 0.12), MAT.glass);
  cabGlass.position.set(1.65, 1.4, 1.66);
  const cabSideGlass = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.05, 1.4), MAT.glass);
  cabSideGlass.position.set(2.33, 1.4, 0.7);
  slewingPivot.add(cabBody, cabGlass, cabSideGlass, createBeacon(1.65, 2.3, 0.7));

  // Chóp tháp chữ A (Cathead / Apex)
  const apexH = 5.4;
  const apexDiagLen = Math.hypot(0.9, apexH);
  const apexTilt = Math.atan2(0.9, apexH);
  const apexGeo = new THREE.BoxGeometry(0.18, apexDiagLen, 0.18);
  [
    [-0.75, 0.75, apexTilt, -apexTilt],
    [0.75, 0.75, apexTilt, apexTilt],
    [-0.75, -0.75, -apexTilt, -apexTilt],
    [0.75, -0.75, -apexTilt, apexTilt]
  ].forEach(([ax, az, rx, rz]) => {
    const leg = new THREE.Mesh(apexGeo, paintMat);
    leg.position.set(ax * 0.5, apexH * 0.5 + 0.4, az * 0.5);
    leg.rotation.set(rx, 0, rz);
    slewingPivot.add(leg);
  });
  const apexTip = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.45, 0.6), paintMat);
  apexTip.position.set(0, apexH + 0.4, 0);
  slewingPivot.add(apexTip, createBeacon(0, apexH + 0.72, 0));

  // Cần đối trọng phía sau (-Z)
  const counterJib = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.45, counterJibLen), paintMat);
  counterJib.position.set(0, 0.85, -counterJibLen * 0.5 - 0.5);
  slewingPivot.add(counterJib);

  // 4 Khối bê tông đối trọng
  for (let i = 0; i < 4; i++) {
    const cw = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.2, 0.9), MAT.concrete);
    cw.position.set(0, 1.2, -counterJibLen + 1.1 + i * 1.15);
    slewingPivot.add(cw);
  }

  // Cần chính phía trước (+Z) dạng giàn tam giác
  const jibY = 0.95;
  const jibHeight = 1.65;
  const jibWidth = 1.4;
  const topChord = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, jibLength), paintMat);
  topChord.position.set(0, jibY + jibHeight, jibLength * 0.5 + 0.5);
  const botChordL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, jibLength), paintMat);
  botChordL.position.set(-jibWidth * 0.5, jibY, jibLength * 0.5 + 0.5);
  const botChordR = botChordL.clone();
  botChordR.position.x = jibWidth * 0.5;
  slewingPivot.add(topChord, botChordL, botChordR);

  // Thanh giằng dọc cần chính
  const jibSegs = Math.max(6, Math.min(8, Math.round(jibLength / 4.8)));
  const jibSegLen = jibLength / jibSegs;
  const sideStrutLen = Math.hypot(jibHeight, jibWidth * 0.5);
  const sideStrutGeo = new THREE.BoxGeometry(0.08, sideStrutLen, 0.08);
  const sideAngle = Math.atan2(jibWidth * 0.5, jibHeight);

  for (let i = 0; i <= jibSegs; i++) {
    const zPos = 0.5 + i * jibSegLen;
    const sL = new THREE.Mesh(sideStrutGeo, paintMat);
    sL.position.set(-jibWidth * 0.25, jibY + jibHeight * 0.5, zPos);
    sL.rotation.z = -sideAngle;
    const sR = new THREE.Mesh(sideStrutGeo, paintMat);
    sR.position.set(jibWidth * 0.25, jibY + jibHeight * 0.5, zPos);
    sR.rotation.z = sideAngle;
    const crossBot = new THREE.Mesh(new THREE.BoxGeometry(jibWidth, 0.08, 0.08), paintMat);
    crossBot.position.set(0, jibY, zPos);
    slewingPivot.add(sL, sR, crossBot);
  }

  // Cáp giằng đỉnh tháp tới cần chính & cần đối trọng
  const foreStayEndZ = jibLength * 0.68;
  const foreStayLen = Math.hypot(foreStayEndZ, apexH + 0.4 - (jibY + jibHeight));
  const foreStay = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, foreStayLen, 4, 1, true), MAT.steel);
  foreStay.position.set(0, (apexH + 0.4 + jibY + jibHeight) * 0.5, foreStayEndZ * 0.5);
  foreStay.rotation.x = Math.atan2(foreStayEndZ, apexH + 0.4 - (jibY + jibHeight));

  const backStayEndZ = -counterJibLen * 0.85;
  const backStayLen = Math.hypot(Math.abs(backStayEndZ), apexH + 0.4 - 1.1);
  const backStay = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, backStayLen, 4, 1, true), MAT.steel);
  backStay.position.set(0, (apexH + 0.4 + 1.1) * 0.5, backStayEndZ * 0.5);
  backStay.rotation.x = -Math.atan2(Math.abs(backStayEndZ), apexH + 0.4 - 1.1);
  slewingPivot.add(foreStay, backStay);

  // 4. Xe con (Trolley) + Cáp đôi + Móc cẩu + Dầm thép chữ H treo bên dưới
  const trolley = new THREE.Group();
  trolley.name = 'trolley';
  trolley.position.set(0, jibY - 0.15, jibLength * 0.62);
  slewingPivot.add(trolley);

  const carriage = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.35, 1.4), MAT.darkChassis);
  trolley.add(carriage);

  const cableDrop = Math.min(13, height * 0.32);
  const cableGeo = new THREE.CylinderGeometry(0.035, 0.035, cableDrop, 4, 1, true);
  const cableL = new THREE.Mesh(cableGeo, MAT.steel);
  cableL.position.set(-0.22, -cableDrop * 0.5 - 0.15, 0);
  const cableR = cableL.clone();
  cableR.position.x = 0.22;
  trolley.add(cableL, cableR);

  const hookGroup = new THREE.Group();
  hookGroup.position.set(0, -cableDrop - 0.35, 0);
  trolley.add(hookGroup);

  const pulleyBlock = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.35), paintMat);
  const hookStem = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.5, 6), MAT.darkChassis);
  hookStem.position.y = -0.55;
  const hookCurved = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.07, 5, 7, Math.PI * 1.35), MAT.darkChassis);
  hookCurved.position.set(0, -0.82, 0);
  hookCurved.rotation.z = Math.PI * 0.75;
  hookGroup.add(pulleyBlock, hookStem, hookCurved);

  // Dầm thép chữ H đang được cẩu treo
  const beamGroup = new THREE.Group();
  beamGroup.position.set(0, -1.65, 0);
  const slingL = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.25, 6), MAT.steel);
  slingL.position.set(-1.1, 0.45, 0);
  slingL.rotation.z = -0.85;
  const slingR = slingL.clone();
  slingR.position.x = 1.1;
  slingR.rotation.z = 0.85;

  const hFlangeTop = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.1, 0.42), MAT.rustRedSteel);
  hFlangeTop.position.y = 0.2;
  const hFlangeBot = hFlangeTop.clone();
  hFlangeBot.position.y = -0.2;
  const hWeb = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.32, 0.1), MAT.rustRedSteel);
  beamGroup.add(slingL, slingR, hFlangeTop, hFlangeBot, hWeb);
  hookGroup.add(beamGroup);

  root.userData.slewingPivot = slewingPivot;
  root.userData.trolley = trolley;
  root.userData.joints = { slewingPivot, trolley, hookGroup };

  return finalizeTwin(root, 'ThreeJSTwin_TowerCrane');
}

// ============================================================================
// 2. CẨU BÁNH XÍCH 250 TẤN (CRAWLER CRANE TWIN)
// ============================================================================
export function buildCrawlerCraneTwin(options = {}) {
  const {
    boomLength = 21,
    boomAngle = (65 * Math.PI) / 180,
    color = 0xdc2626
  } = options;

  const root = new THREE.Group();
  const paintMat = getPaintMaterial(color, MAT.crawlerRed);

  // 1. Dàn chân bánh xích kép (grounded at y = 0)
  const trackSpanX = 2.5;
  const trackLen = 6.2;
  const trackH = 1.05;
  const trackW = 0.95;

  [-trackSpanX * 0.5, trackSpanX * 0.5].forEach((tx) => {
    const trackBelt = new THREE.Mesh(new THREE.BoxGeometry(trackW, trackH, trackLen - 0.9), MAT.rubber);
    trackBelt.position.set(tx, trackH * 0.5, 0);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(trackW * 0.72, trackH * 0.52, trackLen - 1.1), MAT.darkChassis);
    frame.position.set(tx, trackH * 0.5, 0);
    const frontRoller = new THREE.Mesh(new THREE.CylinderGeometry(trackH * 0.5, trackH * 0.5, trackW, 12), MAT.rubber);
    frontRoller.rotation.z = Math.PI / 2;
    frontRoller.position.set(tx, trackH * 0.5, (trackLen - 0.9) * 0.5);
    const rearRoller = frontRoller.clone();
    rearRoller.position.z = -(trackLen - 0.9) * 0.5;
    root.add(trackBelt, frame, frontRoller, rearRoller);
  });

  // Dầm ngang nối 2 bánh xích + mâm xoay
  const carbody = new THREE.Mesh(new THREE.BoxGeometry(trackSpanX + 0.3, 0.55, 2.8), MAT.darkChassis);
  carbody.position.y = 0.72;
  const slewRing = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 0.25, 12), MAT.steel);
  slewRing.position.y = 1.12;
  root.add(carbody, slewRing);

  // 2. Thân xoay trên (slewingPivot)
  const upperHouse = new THREE.Group();
  upperHouse.name = 'slewingPivot';
  upperHouse.position.y = 1.25;
  root.add(upperHouse);

  const body = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.75, 4.4), paintMat);
  body.position.set(0, 0.95, -0.4);
  const counterweight = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.5, 1.25), MAT.darkChassis);
  counterweight.position.set(0, 1.0, -3.1);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.05, 1.7, 1.75), MAT.mixerWhite);
  cab.position.set(1.3, 0.95, 1.1);
  const cabGlass = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.95, 0.1), MAT.glass);
  cabGlass.position.set(1.3, 1.15, 1.98);
  upperHouse.add(body, counterweight, cab, cabGlass, createBeacon(0, 1.95, -2.0));

  // Khung chữ A phía sau (Gantry)
  const gantry = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.6, 0.25), MAT.darkSteel);
  gantry.position.set(0, 2.35, -1.6);
  gantry.rotation.x = -0.25;
  upperHouse.add(gantry);

  // 3. Cần khung mắt cáo vươn nghiêng 65°
  const boomPivot = new THREE.Group();
  boomPivot.position.set(0, 1.2, 1.75);
  boomPivot.rotation.x = -(Math.PI / 2 - boomAngle); // Nghiêng về phía +Z
  upperHouse.add(boomPivot);

  const bw = 0.95;
  const boomChordGeo = new THREE.BoxGeometry(0.12, boomLength, 0.12);
  [
    [-bw * 0.5, -bw * 0.5],
    [bw * 0.5, -bw * 0.5],
    [-bw * 0.5, bw * 0.5],
    [bw * 0.5, bw * 0.5]
  ].forEach(([cx, cz]) => {
    const c = new THREE.Mesh(boomChordGeo, paintMat);
    c.position.set(cx, boomLength * 0.5, cz);
    boomPivot.add(c);
  });

  const segs = 7;
  const segH = boomLength / segs;
  const lacingLen = Math.hypot(bw, segH);
  const lacingAngle = Math.atan2(bw, segH);
  const lacingGeo = new THREE.BoxGeometry(0.07, lacingLen, 0.07);
  for (let i = 0; i < segs; i++) {
    const yMid = (i + 0.5) * segH;
    const sign = i % 2 === 0 ? 1 : -1;
    const lf = new THREE.Mesh(lacingGeo, paintMat);
    lf.position.set(0, yMid, bw * 0.5);
    lf.rotation.z = sign * lacingAngle;
    const lb = new THREE.Mesh(lacingGeo, paintMat);
    lb.position.set(0, yMid, -bw * 0.5);
    lb.rotation.z = -sign * lacingAngle;
    boomPivot.add(lf, lb);
  }

  const boomTip = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.6, 1.05), MAT.darkSteel);
  boomTip.position.set(0, boomLength, 0);
  boomPivot.add(boomTip);

  // Cáp neo cần từ Gantry tới đầu cần
  const tipYWorld = 1.2 + Math.sin(boomAngle) * boomLength;
  const tipZWorld = 1.75 + Math.cos(boomAngle) * boomLength;
  const guyLen = Math.hypot(tipZWorld + 1.9, tipYWorld - 3.5);
  const guyCable = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, guyLen, 6), MAT.steel);
  guyCable.position.set(0, (tipYWorld + 3.5) * 0.5, (tipZWorld - 1.9) * 0.5);
  guyCable.rotation.x = Math.atan2(tipZWorld + 1.9, tipYWorld - 3.5);
  upperHouse.add(guyCable);

  // Cáp treo móc cẩu thẳng đứng từ đầu cần
  const hookDrop = Math.max(4, tipYWorld * 0.42);
  const hoistCable = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, hookDrop, 6), MAT.steel);
  hoistCable.position.set(0, tipYWorld - hookDrop * 0.5, tipZWorld);
  const hookBlock = new THREE.Group();
  hookBlock.position.set(0, tipYWorld - hookDrop, tipZWorld);
  const blockMesh = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.65, 0.35), MAT.catYellow);
  const hookMesh = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.06, 6, 10, Math.PI * 1.3), MAT.darkChassis);
  hookMesh.position.y = -0.5;
  hookMesh.rotation.z = Math.PI * 0.7;
  hookBlock.add(blockMesh, hookMesh);
  upperHouse.add(hoistCable, hookBlock);

  root.userData.slewingPivot = upperHouse;
  root.userData.joints = { slewingPivot: upperHouse, boomPivot, hookBlock };

  return finalizeTwin(root, 'ThreeJSTwin_CrawlerCrane');
}

// ============================================================================
// 3. XE LU RUNG LÀM ĐƯỜNG (ROAD ROLLER TWIN)
// ============================================================================
export function buildRoadRollerTwin(options = {}) {
  const { color = 0xeab308 } = options;
  const root = new THREE.Group();
  const paintMat = getPaintMaterial(color, MAT.catYellow);

  // 1. Trống lu thép sáng bóng phía trước (+Z) — grounded at y = 0
  const drumRadius = 0.78;
  const drumWidth = 2.15;
  const frontDrum = new THREE.Group();
  frontDrum.position.set(0, drumRadius, 1.55);

  const drumMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(drumRadius, drumRadius, drumWidth, 20),
    MAT.polishedDrum
  );
  drumMesh.rotation.z = Math.PI / 2;
  const drumHubL = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.14, 10), paintMat);
  drumHubL.rotation.z = Math.PI / 2;
  drumHubL.position.x = -drumWidth * 0.5 - 0.05;
  const drumHubR = drumHubL.clone();
  drumHubR.position.x = drumWidth * 0.5 + 0.05;
  frontDrum.add(drumMesh, drumHubL, drumHubR);
  root.add(frontDrum);

  // Khung càng gạt bùn bao quanh trống lu
  const yokeSideL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.32, 1.65), paintMat);
  yokeSideL.position.set(-drumWidth * 0.5 - 0.14, drumRadius + 0.08, 1.2);
  const yokeSideR = yokeSideL.clone();
  yokeSideR.position.x = drumWidth * 0.5 + 0.14;
  const scraperFront = new THREE.Mesh(new THREE.BoxGeometry(drumWidth + 0.35, 0.12, 0.16), MAT.darkChassis);
  scraperFront.position.set(0, drumRadius + 0.12, 2.38);
  const yokeRear = new THREE.Mesh(new THREE.BoxGeometry(drumWidth + 0.35, 0.28, 0.35), paintMat);
  yokeRear.position.set(0, drumRadius + 0.1, 0.45);
  root.add(yokeSideL, yokeSideR, scraperFront, yokeRear);

  // 2. Khớp nối giữa (Articulated Steering Joint)
  const articulationPivot = new THREE.Group();
  articulationPivot.position.set(0, 0.85, 0.1);
  root.add(articulationPivot);

  const jointBlock = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.5, 10), MAT.darkChassis);
  articulationPivot.add(jointBlock);

  // Xi lanh lái
  [-0.45, 0.45].forEach((sx) => {
    const steerCyl = createHydraulicCylinder(0.85, 0.045);
    steerCyl.position.set(sx, 0, 0.2);
    steerCyl.rotation.x = Math.PI / 2;
    articulationPivot.add(steerCyl);
  });

  // 3. Thân sau, khoang động cơ, cabin kính + đèn cảnh báo
  const rearChassis = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.55, 2.25), MAT.darkChassis);
  rearChassis.position.set(0, 0.88, -1.2);
  const engineHood = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.92, 1.35), paintMat);
  engineHood.position.set(0, 1.55, -1.68);
  const grille = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.65, 0.08), MAT.darkChassis);
  grille.position.set(0, 1.52, -2.36);
  const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.7, 8), MAT.darkSteel);
  exhaust.position.set(0.52, 2.25, -1.85);
  root.add(rearChassis, engineHood, grille, exhaust);

  // Cabin kính + mái che vàng + beacon
  const cabFrame = new THREE.Mesh(new THREE.BoxGeometry(1.48, 1.25, 1.2), MAT.glass);
  cabFrame.position.set(0, 1.8, -0.45);
  const cabRoof = new THREE.Mesh(new THREE.BoxGeometry(1.64, 0.14, 1.45), paintMat);
  cabRoof.position.set(0, 2.48, -0.45);
  const beacon = createBeacon(0, 2.63, -0.45);
  root.add(cabFrame, cabRoof, beacon);

  // 4. Hai bánh lốp gai lớn phía sau (grounded at y = 0)
  const rearRadius = 0.72;
  const rearAxle = new THREE.Group();
  rearAxle.position.set(0, rearRadius, -1.55);
  const rearWheelL = createWheel(rearRadius, 0.48);
  rearWheelL.position.x = -0.96;
  const rearWheelR = createWheel(rearRadius, 0.48);
  rearWheelR.position.x = 0.96;
  rearAxle.add(rearWheelL, rearWheelR);
  root.add(rearAxle);

  root.userData.joints = { frontDrum, rearAxle, beacon, articulationPivot };

  return finalizeTwin(root, 'ThreeJSTwin_RoadRoller');
}

// ============================================================================
// 4. MÁY XÚC ĐÀO THỦY LỰC (EXCAVATOR TWIN)
// ============================================================================
export function buildExcavatorTwin(options = {}) {
  const { color = 0xeab308 } = options;
  const root = new THREE.Group();
  const paintMat = getPaintMaterial(color, MAT.catYellow);

  // 1. Dàn bánh xích kép (grounded at y = 0)
  const trackH = 0.74;
  const trackLen = 4.1;
  const trackW = 0.65;
  [-1.05, 1.05].forEach((tx) => {
    const belt = new THREE.Mesh(new THREE.BoxGeometry(trackW, trackH, trackLen - 0.7), MAT.rubber);
    belt.position.set(tx, trackH * 0.5, 0);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(trackW * 0.7, trackH * 0.52, trackLen - 0.85), MAT.darkChassis);
    frame.position.set(tx, trackH * 0.5, 0);
    const fWheel = new THREE.Mesh(new THREE.CylinderGeometry(trackH * 0.5, trackH * 0.5, trackW, 10), MAT.rubber);
    fWheel.rotation.z = Math.PI / 2;
    fWheel.position.set(tx, trackH * 0.5, (trackLen - 0.7) * 0.5);
    const rWheel = fWheel.clone();
    rWheel.position.z = -(trackLen - 0.7) * 0.5;
    root.add(belt, frame, fWheel, rWheel);
  });

  const xFrame = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.35, 1.8), MAT.darkChassis);
  xFrame.position.y = 0.52;
  const slewBase = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.82, 0.22, 12), MAT.darkSteel);
  slewBase.position.y = 0.78;
  root.add(xFrame, slewBase);

  // 2. Thân xoay 360° (slewingPivot)
  const upperHouse = new THREE.Group();
  upperHouse.name = 'slewingPivot';
  upperHouse.position.y = 0.9;
  root.add(upperHouse);

  const deck = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.35, 3.1), MAT.darkChassis);
  deck.position.set(0, 0.18, -0.35);
  const engineBay = new THREE.Mesh(new THREE.BoxGeometry(1.55, 1.05, 2.15), paintMat);
  engineBay.position.set(0.35, 0.85, -0.8);
  const counterweight = new THREE.Mesh(new THREE.BoxGeometry(2.45, 1.15, 0.85), paintMat);
  counterweight.position.set(0, 0.85, -1.95);
  const cwStripe = new THREE.Mesh(new THREE.BoxGeometry(2.48, 0.22, 0.88), MAT.darkChassis);
  cwStripe.position.set(0, 0.55, -1.95);
  const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.65, 8), MAT.darkSteel);
  exhaust.position.set(0.55, 1.65, -1.25);

  // Cabin kính lệch trái
  const cabFrame = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.55, 1.65), paintMat);
  cabFrame.position.set(-0.68, 1.1, 0.45);
  const cabWindowFront = new THREE.Mesh(new THREE.BoxGeometry(0.82, 1.15, 0.08), MAT.glass);
  cabWindowFront.position.set(-0.68, 1.15, 1.28);
  const cabWindowSide = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.05, 1.25), MAT.glass);
  cabWindowSide.position.set(-1.16, 1.15, 0.45);
  const beacon = createBeacon(-0.68, 1.95, 0.25);

  upperHouse.add(deck, engineBay, counterweight, cwStripe, exhaust, cabFrame, cabWindowFront, cabWindowSide, beacon);

  // 3. Cần chính (Boom) + Tay gầu (Stick) + Gầu răng thép (Bucket) + Xi lanh crôm
  const boomPivot = new THREE.Group();
  boomPivot.name = 'boomPivot';
  boomPivot.position.set(0.28, 0.72, 0.95);
  boomPivot.rotation.x = -0.68; // Vươn lên phía +Z
  upperHouse.add(boomPivot);

  const boomLower = new THREE.Mesh(new THREE.BoxGeometry(0.38, 2.55, 0.52), paintMat);
  boomLower.position.set(0, 1.25, 0);
  const boomUpper = new THREE.Mesh(new THREE.BoxGeometry(0.34, 2.3, 0.42), paintMat);
  boomUpper.position.set(0, 3.1, 0.58);
  boomUpper.rotation.x = 0.52;
  boomPivot.add(boomLower, boomUpper);

  // 2 Xi lanh nâng cần chính (mạ crôm)
  [-0.28, 0.28].forEach((cx) => {
    const boomCyl = createHydraulicCylinder(1.85, 0.065);
    boomCyl.position.set(cx, 0.2, 0.35);
    boomCyl.rotation.x = 0.18;
    boomPivot.add(boomCyl);
  });

  // Khớp tay gầu (Stick)
  const stickPivot = new THREE.Group();
  stickPivot.name = 'stickPivot';
  stickPivot.position.set(0, 4.05, 1.18);
  stickPivot.rotation.x = 1.55;
  boomPivot.add(stickPivot);

  const stickMesh = new THREE.Mesh(new THREE.BoxGeometry(0.28, 2.55, 0.34), paintMat);
  stickMesh.position.set(0, 1.22, 0);
  stickPivot.add(stickMesh);

  // Xi lanh tay gầu trên lưng cần chính
  const stickCyl = createHydraulicCylinder(1.7, 0.06);
  stickCyl.position.set(0, 2.35, -0.25);
  stickCyl.rotation.x = 0.45;
  boomPivot.add(stickCyl);

  // Khớp gầu đào (Bucket)
  const bucketPivot = new THREE.Group();
  bucketPivot.name = 'bucketPivot';
  bucketPivot.position.set(0, 2.45, 0);
  bucketPivot.rotation.x = 0.65;
  stickPivot.add(bucketPivot);

  const bucketCyl = createHydraulicCylinder(1.3, 0.05);
  bucketCyl.position.set(0, 0.8, -0.28);
  stickPivot.add(bucketCyl);

  const bucketBack = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.72, 0.62), MAT.darkSteel);
  bucketBack.position.set(0, 0.36, 0.25);
  const bucketLip = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.1, 0.42), MAT.darkChassis);
  bucketLip.position.set(0, 0.08, 0.52);
  bucketPivot.add(bucketBack, bucketLip);

  // 4 Răng gầu thép
  for (let i = 0; i < 4; i++) {
    const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.09, 0.24), MAT.steel);
    tooth.position.set(-0.32 + i * 0.21, 0.06, 0.78);
    bucketPivot.add(tooth);
  }

  root.userData.slewingPivot = upperHouse;
  root.userData.joints = { slewingPivot: upperHouse, boomPivot, stickPivot, bucketPivot };

  return finalizeTwin(root, 'ThreeJSTwin_Excavator');
}

// ============================================================================
// 5. XE ỦI ĐẤT HẠNG NẶNG (BULLDOZER TWIN - CAT D9 STYLE)
// ============================================================================
export function buildBulldozerTwin(options = {}) {
  const { color = 0xeab308 } = options;
  const root = new THREE.Group();
  const paintMat = getPaintMaterial(color, MAT.catYellow);

  // 1. Bánh xích tam giác cao (High-Drive Tracks) — grounded at y = 0
  [-1.22, 1.22].forEach((tx) => {
    const bottomTrack = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.56, 3.6), MAT.rubber);
    bottomTrack.position.set(tx, 0.28, 0);
    const frontSlope = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.42, 1.55), MAT.rubber);
    frontSlope.position.set(tx, 0.78, 0.75);
    frontSlope.rotation.x = 0.58;
    const rearSlope = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.42, 1.55), MAT.rubber);
    rearSlope.position.set(tx, 0.78, -0.75);
    rearSlope.rotation.x = -0.58;
    const topSprocket = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.74, 12), MAT.darkSteel);
    topSprocket.rotation.z = Math.PI / 2;
    topSprocket.position.set(tx, 1.18, 0);
    const trackFrame = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.36, 3.3), paintMat);
    trackFrame.position.set(tx, 0.44, 0);
    root.add(bottomTrack, frontSlope, rearSlope, topSprocket, trackFrame);
  });

  // 2. Thân xe, khoang máy, ống xả đôi & Cabin ROPS
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.7, 3.4), MAT.darkChassis);
  chassis.position.set(0, 0.82, 0);
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.55, 1.05, 1.95), paintMat);
  hood.position.set(0, 1.55, 0.65);
  const radiator = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.9, 0.16), MAT.darkChassis);
  radiator.position.set(0, 1.55, 1.65);
  const exhaustL = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.075, 0.75, 8), MAT.darkSteel);
  exhaustL.position.set(-0.48, 2.35, 0.85);
  const exhaustR = exhaustL.clone();
  exhaustR.position.x = 0.48;

  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.52, 1.35, 1.35), paintMat);
  cab.position.set(0, 2.05, -0.85);
  const cabGlassF = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.95, 0.08), MAT.glass);
  cabGlassF.position.set(0, 2.15, -0.16);
  const cabRoof = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.14, 1.55), paintMat);
  cabRoof.position.set(0, 2.78, -0.85);

  root.add(chassis, hood, radiator, exhaustL, exhaustR, cab, cabGlassF, cabRoof, createBeacon(0, 2.94, -0.85));

  // 3. Lưỡi ủi thép cong khổng lồ phía trước (+Z)
  const bladePivot = new THREE.Group();
  bladePivot.name = 'bladePivot';
  bladePivot.position.set(0, 0.55, 0.25);
  root.add(bladePivot);

  const pushArmL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.22, 2.3), paintMat);
  pushArmL.position.set(-1.35, 0, 1.15);
  const pushArmR = pushArmL.clone();
  pushArmR.position.x = 1.35;

  const bladeMain = new THREE.Mesh(new THREE.BoxGeometry(3.85, 1.35, 0.28), paintMat);
  bladeMain.position.set(0, 0.22, 2.35);
  bladeMain.rotation.x = 0.12;
  const bladeGuard = new THREE.Mesh(new THREE.BoxGeometry(3.85, 0.35, 0.22), MAT.darkSteel);
  bladeGuard.position.set(0, 0.98, 2.26);
  bladeGuard.rotation.x = -0.35;
  const cuttingEdge = new THREE.Mesh(new THREE.BoxGeometry(3.9, 0.16, 0.32), MAT.steel);
  cuttingEdge.position.set(0, -0.44, 2.44);
  bladePivot.add(pushArmL, pushArmR, bladeMain, bladeGuard, cuttingEdge);

  // 2 Xi lanh nâng lưỡi ủi
  [-0.55, 0.55].forEach((cx) => {
    const liftCyl = createHydraulicCylinder(1.5, 0.06);
    liftCyl.position.set(cx, 1.85, 1.62);
    liftCyl.rotation.x = 0.85;
    root.add(liftCyl);
  });

  // 4. Bộ cày xới đất phía sau (Ripper)
  const ripperPivot = new THREE.Group();
  ripperPivot.name = 'ripperPivot';
  ripperPivot.position.set(0, 0.92, -1.75);
  root.add(ripperPivot);

  const ripperBeam = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.28, 0.75), MAT.darkChassis);
  ripperBeam.position.set(0, 0, -0.4);
  ripperPivot.add(ripperBeam);

  [-0.52, 0.52].forEach((rx) => {
    const shank = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.95, 0.28), MAT.steel);
    shank.position.set(rx, -0.34, -0.62);
    shank.rotation.x = -0.25;
    ripperPivot.add(shank);
  });

  root.userData.joints = { bladePivot, ripperPivot };

  return finalizeTwin(root, 'ThreeJSTwin_Bulldozer');
}

// ============================================================================
// 6. XE BỒN TRỘN BÊ TÔNG 4 TRỤC (CONCRETE MIXER TRUCK TWIN)
// ============================================================================
export function buildConcreteMixerTruckTwin(options = {}) {
  const {
    color = 0xf8fafc,
    stripeColor = 0x2563eb
  } = options;

  const root = new THREE.Group();
  const paintMat = getPaintMaterial(color, MAT.mixerWhite);
  const stripeMat = getPaintMaterial(stripeColor, MAT.mixerBlue);

  // 1. Khung gầm xe tải 4 trục (grounded at y = 0)
  const frameRailL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.28, 8.2), MAT.darkChassis);
  frameRailL.position.set(-0.48, 0.78, -0.1);
  const frameRailR = frameRailL.clone();
  frameRailR.position.x = 0.48;
  const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.36, 0.25), MAT.darkSteel);
  frontBumper.position.set(0, 0.62, 4.05);
  root.add(frameRailL, frameRailR, frontBumper);

  // 8 Bánh xe trên 4 trục (Z: +3.1, +1.7, -1.8, -3.1)
  const wheelR = 0.52;
  [3.1, 1.7, -1.8, -3.1].forEach((wz) => {
    const wL = createWheel(wheelR, 0.34);
    wL.position.set(-1.02, wheelR, wz);
    const wR = createWheel(wheelR, 0.34);
    wR.position.set(1.02, wheelR, wz);
    root.add(wL, wR);
  });

  // 2. Cabin đầu xe
  const cabBody = new THREE.Mesh(new THREE.BoxGeometry(2.25, 1.95, 2.05), paintMat);
  cabBody.position.set(0, 1.88, 2.95);
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.82, 0.08), MAT.glass);
  windshield.position.set(0, 2.25, 3.98);
  const grille = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.65, 0.1), MAT.darkChassis);
  grille.position.set(0, 1.38, 3.99);
  const headL = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.16, 0.08), MAT.headLightWhite);
  headL.position.set(-0.82, 1.05, 4.0);
  const headR = headL.clone();
  headR.position.x = 0.82;
  root.add(cabBody, windshield, grille, headL, headR, createBeacon(0, 2.94, 3.35));

  // Giá đỡ bồn trước & sau + Bồn nước rửa
  const frontPedestal = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.15, 0.45), MAT.darkSteel);
  frontPedestal.position.set(0, 1.48, 1.45);
  const rearCradle = new THREE.Mesh(new THREE.BoxGeometry(1.35, 1.45, 0.55), MAT.darkSteel);
  rearCradle.position.set(0, 1.65, -2.85);
  const waterTank = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 1.1, 10), MAT.steel);
  waterTank.rotation.z = Math.PI / 2;
  waterTank.position.set(0, 2.15, 1.55);
  root.add(frontPedestal, rearCradle, waterTank);

  // 3. Bồn trộn bê tông nghiêng 15° có dải xoắn ốc xoay (userData.drum)
  const drumPivot = new THREE.Group();
  drumPivot.position.set(0, 2.15, -0.65);
  drumPivot.rotation.x = Math.PI / 2 - (15 * Math.PI) / 180; // Trục Y của drum hướng lên & nghiêng về sau
  root.add(drumPivot);

  const drum = new THREE.Group();
  drum.name = 'drum';
  drumPivot.add(drum);

  // Thân bồn 3 đoạn (nón trước, trụ giữa, nón sau)
  const coneFront = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 0.55, 1.35, 16), paintMat);
  coneFront.position.y = -1.35;
  const drumMid = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 1.45, 16), paintMat);
  drumMid.position.y = 0.05;
  const coneRear = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 1.15, 1.55, 16), paintMat);
  coneRear.position.y = 1.55;
  drum.add(coneFront, drumMid, coneRear);

  // Dải xoắn ốc xanh nổi bật quanh bồn để thấy rõ chuyển động quay
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const yOff = -0.9 + (i / 6) * 2.1;
    const r = 1.17 - Math.max(0, Math.abs(yOff) - 0.6) * 0.28;
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.85, 0.06), stripeMat);
    stripe.position.set(Math.sin(angle) * r, yOff, Math.cos(angle) * r);
    stripe.rotation.y = angle;
    stripe.rotation.z = 0.62;
    drum.add(stripe);
  }

  // 4. Phễu đổ bê tông phía sau
  const chute = new THREE.Group();
  chute.position.set(0, 2.15, -3.55);
  const hopper = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.22, 0.55, 10), MAT.darkSteel);
  hopper.position.set(0, 0.35, 0.15);
  const pourChute = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.14, 1.55), MAT.steel);
  pourChute.position.set(0, -0.38, -0.62);
  pourChute.rotation.x = 0.52;
  chute.add(hopper, pourChute);
  root.add(chute);

  root.userData.drum = drum;
  root.userData.joints = { drum, chute };

  return finalizeTwin(root, 'ThreeJSTwin_ConcreteMixerTruck');
}

// ============================================================================
// 7. XE ĐẦU KÉO RƠ-MOÓC SÀN THẤP CHỞ DẦM THÉP / CUỘN THÉP (HEAVY FLATBED TRAILER)
// ============================================================================
export function buildHeavyFlatbedTrailerTwin(options = {}) {
  const {
    color = 0x1d4ed8,
    cargoType = 'beam'
  } = options;

  const root = new THREE.Group();
  const paintMat = getPaintMaterial(color, MAT.tractorBlue);

  // 1. Đầu kéo (Tractor Unit) ở phía trước (+Z) — grounded at y = 0
  const tractorGroup = new THREE.Group();
  root.add(tractorGroup);

  const tChassis = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.3, 5.4), MAT.darkChassis);
  tChassis.position.set(0, 0.72, 4.3);
  tractorGroup.add(tChassis);

  const wheelR = 0.5;
  [6.1, 3.4, 2.2].forEach((wz) => {
    const wL = createWheel(wheelR, 0.34);
    wL.position.set(-1.02, wheelR, wz);
    const wR = createWheel(wheelR, 0.34);
    wR.position.set(1.02, wheelR, wz);
    tractorGroup.add(wL, wR);
  });

  const hood = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.15, 1.45), paintMat);
  hood.position.set(0, 1.42, 6.15);
  const grille = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.85, 0.08), MAT.chrome);
  grille.position.set(0, 1.42, 6.89);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.28, 2.05, 2.15), paintMat);
  cab.position.set(0, 1.98, 4.45);
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.78, 0.08), MAT.glass);
  windshield.position.set(0, 2.38, 5.54);
  const stackL = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 1.65, 8), MAT.chrome);
  stackL.position.set(-1.08, 2.65, 3.55);
  const stackR = stackL.clone();
  stackR.position.x = 1.08;
  tractorGroup.add(hood, grille, cab, windshield, stackL, stackR, createBeacon(0, 3.08, 4.8));

  // 2. Rơ-moóc sàn thấp (Lowboy Trailer)
  const trailerGroup = new THREE.Group();
  root.add(trailerGroup);

  // Cổ ngỗng nối mâm kéo (Gooseneck)
  const gooseneckTop = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.26, 2.4), MAT.darkSteel);
  gooseneckTop.position.set(0, 1.25, 1.85);
  const gooseneckDrop = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.72, 0.45), MAT.darkSteel);
  gooseneckDrop.position.set(0, 0.98, 0.65);
  gooseneckDrop.rotation.x = 0.55;

  // Sàn thấp chở hàng siêu trường siêu trọng
  const lowDeck = new THREE.Mesh(new THREE.BoxGeometry(2.65, 0.3, 7.6), MAT.darkSteel);
  lowDeck.position.set(0, 0.72, -3.15);
  const rearDeck = new THREE.Mesh(new THREE.BoxGeometry(2.65, 0.34, 2.45), MAT.darkChassis);
  rearDeck.position.set(0, 1.02, -8.05);
  trailerGroup.add(gooseneckTop, gooseneckDrop, lowDeck, rearDeck);

  // 3 Trục bánh sau rơ-moóc
  [-7.2, -8.1, -9.0].forEach((wz) => {
    const wL = createWheel(0.46, 0.34);
    wL.position.set(-1.05, 0.46, wz);
    const wR = createWheel(0.46, 0.34);
    wR.position.set(1.05, 0.46, wz);
    trailerGroup.add(wL, wR);
  });

  // Đèn hậu đỏ
  [-0.95, 0.95].forEach((lx) => {
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, 0.08), MAT.tailLightRed);
    tl.position.set(lx, 1.0, -9.28);
    trailerGroup.add(tl);
  });

  // 3. Hàng hóa trên sàn thấp: Dầm thép chữ H + Cuộn thép lớn + Dây chằng
  if (cargoType === 'coil') {
    const coil = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 1.45, 16), MAT.steel);
    coil.rotation.z = Math.PI / 2;
    coil.position.set(0, 1.82, -3.1);
    const innerCore = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.5, 12), MAT.darkChassis);
    innerCore.rotation.z = Math.PI / 2;
    innerCore.position.set(0, 1.82, -3.1);
    const cradle = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.25, 1.6), MAT.darkChassis);
    cradle.position.set(0, 0.98, -3.1);
    trailerGroup.add(coil, innerCore, cradle);
  } else {
    // 2 Dầm thép chữ H dài 6.8m + 1 Cuộn thép phụ phía trước
    [-0.55, 0.55].forEach((bx) => {
      const fTop = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.1, 6.6), MAT.rustRedSteel);
      fTop.position.set(bx, 1.42, -3.2);
      const fBot = fTop.clone();
      fBot.position.y = 0.95;
      const web = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.42, 6.6), MAT.rustRedSteel);
      web.position.set(bx, 1.18, -3.2);
      trailerGroup.add(fTop, fBot, web);
    });
    // Dây đai chằng hàng
    [-5.4, -3.2, -1.0].forEach((sz) => {
      const strap = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.65, 0.1), MAT.craneAmber);
      strap.position.set(0, 1.2, sz);
      trailerGroup.add(strap);
    });
  }

  root.userData.joints = { tractorGroup, trailerGroup };

  return finalizeTwin(root, 'ThreeJSTwin_HeavyFlatbedTrailer');
}

// ============================================================================
// DANH MỤC ĐĂNG KÝ CHO MODEL INSPECTOR & CÁC MODULE XÂY DỰNG
// ============================================================================
export const CONSTRUCTION_MACHINERY_CATALOG = [
  {
    key: 'machinery_tower_crane',
    nameVi: 'Cẩu Tháp Xây Dựng (Tower Crane)',
    builder: buildTowerCraneTwin,
    defaultScale: 0.14
  },
  {
    key: 'machinery_crawler_crane',
    nameVi: 'Cẩu Bánh Xích 250T (Crawler Crane)',
    builder: buildCrawlerCraneTwin,
    defaultScale: 0.22
  },
  {
    key: 'machinery_road_roller',
    nameVi: 'Xe Lu Rung Làm Đường (Road Roller)',
    builder: buildRoadRollerTwin,
    defaultScale: 0.85
  },
  {
    key: 'machinery_excavator',
    nameVi: 'Máy Xúc Đào Thủy Lực (Excavator)',
    builder: buildExcavatorTwin,
    defaultScale: 0.72
  },
  {
    key: 'machinery_bulldozer',
    nameVi: 'Xe Ủi Đất Hạng Nặng (Bulldozer CAT D9)',
    builder: buildBulldozerTwin,
    defaultScale: 0.78
  },
  {
    key: 'machinery_concrete_mixer',
    nameVi: 'Xe Bồn Trộn Bê Tông 4 Trục (Concrete Mixer)',
    builder: buildConcreteMixerTruckTwin,
    defaultScale: 0.55
  },
  {
    key: 'machinery_heavy_flatbed',
    nameVi: 'Xe Đầu Kéo Rơ-Moóc Sàn Thấp (Heavy Flatbed Trailer)',
    builder: buildHeavyFlatbedTrailerTwin,
    defaultScale: 0.42
  }
];
