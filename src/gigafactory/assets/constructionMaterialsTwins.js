import * as THREE from 'three';

/**
 * Thư viện Three.js Twins — Vật Tư Xây Dựng & Công Nghiệp (TASK-007)
 * Thiết kế PBR low-poly (< 350 triangles/model), đặt đáy chuẩn tại y = 0.
 * Tương thích cả đại công trường 350Ha (Gigafactory) và trình soi ModelInspector.
 */

// --- Procedural Canvas Textures (nhẹ, dùng chung cho toàn bộ vật tư) ---

function createSafetyMeshTexture() {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.clearRect(0, 0, 64, 64);
  ctx.fillStyle = 'rgba(16, 185, 129, 0.28)';
  ctx.fillRect(0, 0, 64, 64);

  ctx.strokeStyle = 'rgba(5, 150, 105, 0.85)';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 64; i += 8) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 64);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(64, i);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 6);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createQRLabelTexture() {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(0, 0, 128, 128);

  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, 120, 120);

  // Header bar
  ctx.fillStyle = '#1E293B';
  ctx.fillRect(10, 10, 108, 18);
  ctx.fillStyle = '#F8FAFC';
  ctx.font = 'bold 11px monospace';
  ctx.fillText('AUTOFORGE COIL', 14, 23);

  // Deterministic pseudo-QR matrix
  ctx.fillStyle = '#0F172A';
  const cell = 7;
  const startX = 24;
  const startY = 36;
  for (let r = 0; r < 11; r++) {
    for (let c = 0; c < 11; c++) {
      const isFinder =
        (r < 3 && c < 3) ||
        (r < 3 && c >= 8) ||
        (r >= 8 && c < 3);
      if (isFinder || ((r * 7 + c * 13 + r * c) % 3 === 0)) {
        ctx.fillRect(startX + c * cell, startY + r * cell, cell - 1, cell - 1);
      }
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// --- Shared PBR Materials ---

const matPhenolicPlywood = new THREE.MeshStandardMaterial({
  color: 0x2b1d19,
  roughness: 0.42,
  metalness: 0.06
});

const matPineLumber = new THREE.MeshStandardMaterial({
  color: 0xc89b62,
  roughness: 0.78,
  metalness: 0.02
});

const matDarkTimber = new THREE.MeshStandardMaterial({
  color: 0x8b6239,
  roughness: 0.82,
  metalness: 0.02
});

const matSteelStrap = new THREE.MeshStandardMaterial({
  color: 0x111827,
  roughness: 0.35,
  metalness: 0.82
});

const matBlueTarp = new THREE.MeshStandardMaterial({
  color: 0x1d4ed8,
  roughness: 0.68,
  metalness: 0.05
});

const matColdRolledSteel = new THREE.MeshStandardMaterial({
  color: 0x94a3b8,
  roughness: 0.26,
  metalness: 0.88
});

const matBrushedAluminum = new THREE.MeshStandardMaterial({
  color: 0xdce4ec,
  roughness: 0.20,
  metalness: 0.92
});

const matOxideRedPrimer = new THREE.MeshStandardMaterial({
  color: 0x8d2b1d,
  roughness: 0.54,
  metalness: 0.42
});

const matGalvanizedSteel = new THREE.MeshStandardMaterial({
  color: 0xa3b1bf,
  roughness: 0.34,
  metalness: 0.78
});

const matSpunConcrete = new THREE.MeshStandardMaterial({
  color: 0xb0b7bf,
  roughness: 0.88,
  metalness: 0.04
});

const matLeanConcrete = new THREE.MeshStandardMaterial({
  color: 0xcbd5e1,
  roughness: 0.92,
  metalness: 0.02
});

const matRebarSteel = new THREE.MeshStandardMaterial({
  color: 0x5c3a2e,
  roughness: 0.58,
  metalness: 0.72
});

const matScaffoldSteel = new THREE.MeshStandardMaterial({
  color: 0x64748b,
  roughness: 0.38,
  metalness: 0.76
});

const matSafetyMesh = new THREE.MeshStandardMaterial({
  color: 0x10b981,
  map: createSafetyMeshTexture(),
  roughness: 0.7,
  metalness: 0.05,
  transparent: true,
  opacity: 0.52,
  side: THREE.DoubleSide,
  depthWrite: false
});

const matQRLabel = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  map: createQRLabelTexture(),
  roughness: 0.45,
  metalness: 0.05
});

function enableShadows(group) {
  group.traverse((obj) => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });
  return group;
}

/**
 * 1. Kiện Ván Ép Cốt Pha Phủ Phim & Gỗ Thông (~192 tris)
 * Xếp chồng trên thanh đà gỗ, buộc đai thép đen, có bạt che góc.
 */
export function buildPlywoodFormworkStackTwin(options = {}) {
  const root = new THREE.Group();
  root.name = 'MaterialTwin_PlywoodFormworkStack';
  root.userData = { materialType: 'plywood_formwork_stack', ...options };

  const len = 2.44;
  const wid = 1.22;

  // 3 thanh đà gỗ kê đáy tại y = 0 (3 * 12 = 36 tris)
  const skidGeo = new THREE.BoxGeometry(0.12, 0.10, wid);
  [-0.95, 0, 0.95].forEach((xPos) => {
    const skid = new THREE.Mesh(skidGeo, matDarkTimber);
    skid.position.set(xPos, 0.05, 0);
    root.add(skid);
  });

  // Tầng dưới: 3 lớp ván gỗ thông + 2 thanh kê (5 * 12 = 60 tris)
  const pineGeo = new THREE.BoxGeometry(len, 0.14, wid - 0.04);
  for (let i = 0; i < 3; i++) {
    const tier = new THREE.Mesh(pineGeo, matPineLumber);
    tier.position.set(0, 0.10 + 0.07 + i * 0.18, 0);
    root.add(tier);
  }
  const spacerGeo = new THREE.BoxGeometry(0.08, 0.04, wid - 0.04);
  [-0.85, 0.85].forEach((xPos) => {
    const spacer = new THREE.Mesh(spacerGeo, matDarkTimber);
    spacer.position.set(xPos, 0.62, 0);
    root.add(spacer);
  });

  // Tầng trên: 3 kiện ván ép cốt pha phủ phim đen (3 * 12 = 36 tris)
  const plyGeo = new THREE.BoxGeometry(len, 0.16, wid);
  for (let i = 0; i < 3; i++) {
    const ply = new THREE.Mesh(plyGeo, matPhenolicPlywood);
    ply.position.set(0, 0.64 + 0.08 + i * 0.165, 0);
    root.add(ply);
  }

  // 3 đai thép đen buộc kiện (3 * 12 = 36 tris)
  const strapGeo = new THREE.BoxGeometry(0.035, 1.06, wid + 0.03);
  [-0.78, 0, 0.78].forEach((xPos) => {
    const strap = new THREE.Mesh(strapGeo, matSteelStrap);
    strap.position.set(xPos, 0.63, 0);
    root.add(strap);
  });

  // Tấm bạt xanh che một góc trên (2 * 12 = 24 tris)
  const tarpTop = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.025, 0.78), matBlueTarp);
  tarpTop.position.set(0.76, 1.15, 0.24);
  const tarpSide = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.42, 0.025), matBlueTarp);
  tarpSide.position.set(0.76, 0.94, 0.62);
  root.add(tarpTop, tarpSide);

  return enableShadows(root);
}

/**
 * 2. Cuộn Thép / Nhôm Cán Nguội Khổng Lồ (~312 tris)
 * Hình trụ rỗng tâm (LatheGeometry), đặt trên giá đỡ chữ V, đai thép buộc & nhãn mã QR.
 */
export function buildSteelCoilTwin(options = { isAluminum: false }) {
  const { isAluminum = false } = options;
  const root = new THREE.Group();
  root.name = isAluminum ? 'MaterialTwin_AluminumCoil' : 'MaterialTwin_SteelCoil';
  root.userData = { materialType: 'steel_coil', isAluminum, ...options };

  const coilMat = isAluminum ? matBrushedAluminum : matColdRolledSteel;
  const outerR = 0.80;
  const innerR = 0.28;
  const coilWidth = 1.40;
  const halfW = coilWidth / 2;

  // Giá đỡ gỗ/thép chữ V chống lăn tại y = 0 (6 * 12 = 72 tris)
  const runnerGeo = new THREE.BoxGeometry(0.14, 0.08, 1.48);
  [-0.58, 0.58].forEach((xPos) => {
    const runner = new THREE.Mesh(runnerGeo, matDarkTimber);
    runner.position.set(xPos, 0.04, 0);
    root.add(runner);
  });

  const crossGeo = new THREE.BoxGeometry(1.32, 0.08, 0.14);
  [-0.55, 0.55].forEach((zPos) => {
    const cross = new THREE.Mesh(crossGeo, matDarkTimber);
    cross.position.set(0, 0.12, zPos);
    root.add(cross);
  });

  const chockGeo = new THREE.BoxGeometry(0.22, 0.18, 1.42);
  const chockL = new THREE.Mesh(chockGeo, matPineLumber);
  chockL.position.set(-0.46, 0.24, 0);
  chockL.rotation.z = -0.46;
  const chockR = new THREE.Mesh(chockGeo, matPineLumber);
  chockR.position.set(0.46, 0.24, 0);
  chockR.rotation.z = 0.46;
  root.add(chockL, chockR);

  // Thân cuộn thép rỗng tâm bằng LatheGeometry (4 * 18 * 2 = 144 tris)
  const profile = [
    new THREE.Vector2(outerR, -halfW),
    new THREE.Vector2(outerR, halfW),
    new THREE.Vector2(innerR, halfW),
    new THREE.Vector2(innerR, -halfW),
    new THREE.Vector2(outerR, -halfW)
  ];
  const coilGeo = new THREE.LatheGeometry(profile, 18);
  coilGeo.rotateX(Math.PI / 2); // Trục lỗ rỗng dọc theo Z
  const coilMesh = new THREE.Mesh(coilGeo, coilMat);
  coilMesh.position.set(0, 0.92, 0);
  root.add(coilMesh);

  // 3 đai thép buộc quanh cuộn (3 * 14 * 2 = 84 tris)
  const bandGeo = new THREE.CylinderGeometry(outerR + 0.012, outerR + 0.012, 0.045, 14, 1, true);
  bandGeo.rotateX(Math.PI / 2);
  [-0.46, 0, 0.46].forEach((zPos) => {
    const band = new THREE.Mesh(bandGeo, matSteelStrap);
    band.position.set(0, 0.92, zPos);
    root.add(band);
  });

  // Nhãn mã QR dán mặt trước (12 tris)
  const qrTag = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.26, 0.015), matQRLabel);
  qrTag.position.set(0.50, 0.92, halfW + 0.012);
  root.add(qrTag);

  return enableShadows(root);
}

/**
 * 3. Bó Dầm Thép Kết Cấu Chữ H / Chữ I Dài 12m (~312 tris)
 * Sơn chống rỉ đỏ oxit sắt (#8D2B1D) & xám kẽm, xếp 2 tầng trên gỗ kê.
 */
export function buildSteelGirderStackTwin(options = {}) {
  const root = new THREE.Group();
  root.name = 'MaterialTwin_SteelGirderStack';
  root.userData = { materialType: 'steel_girder_stack', ...options };

  const length = 12.0;
  const beamW = 0.34;
  const beamH = 0.42;
  const flangeT = 0.045;
  const webT = 0.04;

  // 3 thanh gỗ kê đáy tại y = 0 (3 * 12 = 36 tris)
  const dunnageGeo = new THREE.BoxGeometry(1.56, 0.12, 0.16);
  [-4.4, 0, 4.4].forEach((zPos) => {
    const d = new THREE.Mesh(dunnageGeo, matDarkTimber);
    d.position.set(0, 0.06, zPos);
    root.add(d);
  });

  // Helper tạo 1 dầm chữ H (3 boxes = 36 tris)
  const flangeGeo = new THREE.BoxGeometry(beamW, flangeT, length);
  const webGeo = new THREE.BoxGeometry(webT, beamH - flangeT * 2, length);
  const createHBeam = (x, y, mat) => {
    const bot = new THREE.Mesh(flangeGeo, mat);
    bot.position.set(x, y + flangeT / 2, 0);
    const web = new THREE.Mesh(webGeo, mat);
    web.position.set(x, y + beamH / 2, 0);
    const top = new THREE.Mesh(flangeGeo, mat);
    top.position.set(x, y + beamH - flangeT / 2, 0);
    root.add(bot, web, top);
  };

  // Tầng 1: 3 dầm chữ H sơn đỏ oxit sắt (3 * 36 = 108 tris)
  [-0.46, 0, 0.46].forEach((xPos) => createHBeam(xPos, 0.12, matOxideRedPrimer));

  // 3 thanh gỗ kê giữa tầng 1 và tầng 2 (3 * 12 = 36 tris)
  const spacerGeo = new THREE.BoxGeometry(1.50, 0.08, 0.14);
  [-4.4, 0, 4.4].forEach((zPos) => {
    const s = new THREE.Mesh(spacerGeo, matPineLumber);
    s.position.set(0, 0.12 + beamH + 0.04, zPos);
    root.add(s);
  });

  // Tầng 2: 3 dầm chữ H mạ kẽm xám (3 * 36 = 108 tris)
  [-0.46, 0, 0.46].forEach((xPos) => createHBeam(xPos, 0.12 + beamH + 0.08, matGalvanizedSteel));

  // 2 đai thép buộc bó dầm (2 * 12 = 24 tris)
  const strapGeo = new THREE.BoxGeometry(1.42, 0.96, 0.04);
  [-3.2, 3.2].forEach((zPos) => {
    const strap = new THREE.Mesh(strapGeo, matSteelStrap);
    strap.position.set(0, 0.58, zPos);
    root.add(strap);
  });

  return enableShadows(root);
}

/**
 * 4. Chồng Cọc Ống Bê Tông Ly Tâm Dự Ứng Lực & Ống Cống Thoát Nước (~344 tris)
 * Cọc ống đầu bọc vành thép xếp hình tháp + 2 ống cống bê tông.
 */
export function buildConcretePileStackTwin(options = {}) {
  const root = new THREE.Group();
  root.name = 'MaterialTwin_ConcretePileStack';
  root.userData = { materialType: 'concrete_pile_stack', ...options };

  const pileR = 0.24;
  const pileLen = 7.6;

  // 2 thanh đà gỗ kê tại y = 0 (2 * 12 = 24 tris)
  const skidGeo = new THREE.BoxGeometry(2.6, 0.10, 0.18);
  [-2.6, 2.6].forEach((zPos) => {
    const skid = new THREE.Mesh(skidGeo, matDarkTimber);
    skid.position.set(0, 0.05, zPos);
    root.add(skid);
  });

  // 3 cọc bê tông ly tâm xếp tháp (2 đáy + 1 đỉnh) (3 * 32 = 96 tris)
  // + 6 vành thép bọc 2 đầu cọc (6 * 16 = 96 tris)
  const pileGeo = new THREE.CylinderGeometry(pileR, pileR, pileLen, 8);
  pileGeo.rotateX(Math.PI / 2);
  const ringGeo = new THREE.CylinderGeometry(pileR + 0.012, pileR + 0.012, 0.16, 8, 1, true);
  ringGeo.rotateX(Math.PI / 2);

  const pileCoords = [
    [-0.78, 0.10 + pileR],
    [-0.26, 0.10 + pileR],
    [-0.52, 0.10 + pileR + pileR * 1.73]
  ];
  pileCoords.forEach(([px, py]) => {
    const pile = new THREE.Mesh(pileGeo, matSpunConcrete);
    pile.position.set(px, py, 0);
    root.add(pile);

    [-pileLen / 2 + 0.08, pileLen / 2 - 0.08].forEach((rz) => {
      const ring = new THREE.Mesh(ringGeo, matGalvanizedSteel);
      ring.position.set(px, py, rz);
      root.add(ring);
    });
  });

  // 2 ống cống bê tông thoát nước rỗng tâm bên cạnh (2 * 64 = 128 tris)
  const pipeOuterR = 0.42;
  const pipeInnerR = 0.32;
  const pipeLen = 2.4;
  const pipeProfile = [
    new THREE.Vector2(pipeOuterR, -pipeLen / 2),
    new THREE.Vector2(pipeOuterR, pipeLen / 2),
    new THREE.Vector2(pipeInnerR, pipeLen / 2),
    new THREE.Vector2(pipeInnerR, -pipeLen / 2),
    new THREE.Vector2(pipeOuterR, -pipeLen / 2)
  ];
  const pipeGeo = new THREE.LatheGeometry(pipeProfile, 8);
  pipeGeo.rotateX(Math.PI / 2);

  [-1.35, 1.35].forEach((zPos) => {
    const pipe = new THREE.Mesh(pipeGeo, matSpunConcrete);
    pipe.position.set(0.68, 0.10 + pipeOuterR, zPos);
    root.add(pipe);
  });

  return enableShadows(root);
}

/**
 * 5. Mô-đun Giàn Giáo Khung Thép & Lưới Bao Che An Toàn (~318 tris)
 * Kèm 2 sàn thao tác, thang leo và lưới bao che màu xanh bán trong suốt.
 */
export function buildScaffoldingBayTwin(options = { width: 12, height: 10 }) {
  const { width = 12, height = 10, depth = 1.8 } = options;
  const root = new THREE.Group();
  root.name = 'MaterialTwin_ScaffoldingBay';
  root.userData = { materialType: 'scaffolding_bay', width, height, depth };

  const halfW = width / 2;
  const halfD = depth / 2;

  // 8 trụ đứng thép (4 cột x 2 hàng trước/sau) (8 * 12 = 96 tris)
  const postGeo = new THREE.BoxGeometry(0.08, height, 0.08);
  const xCols = [-halfW, -halfW / 3, halfW / 3, halfW];
  [-halfD, halfD].forEach((zPos) => {
    xCols.forEach((xPos) => {
      const post = new THREE.Mesh(postGeo, matScaffoldSteel);
      post.position.set(xPos, height / 2, zPos);
      root.add(post);
    });
  });

  // 6 thanh giằng ngang trước/sau tại 3 cao độ (6 * 12 = 72 tris)
  const ledgerGeo = new THREE.BoxGeometry(width, 0.06, 0.06);
  const levels = [height * 0.33, height * 0.66, height - 0.1];
  levels.forEach((yPos) => {
    [-halfD, halfD].forEach((zPos) => {
      const ledger = new THREE.Mesh(ledgerGeo, matScaffoldSteel);
      ledger.position.set(0, yPos, zPos);
      root.add(ledger);
    });
  });

  // 2 sàn thao tác (tầng 1 & tầng 2) (2 * 12 = 24 tris)
  const plankGeo = new THREE.BoxGeometry(width - 0.12, 0.06, depth - 0.16);
  [levels[0], levels[1]].forEach((yPos) => {
    const plank = new THREE.Mesh(plankGeo, matGalvanizedSteel);
    plank.position.set(0, yPos + 0.04, 0);
    root.add(plank);
  });

  // 2 thanh giằng chéo chữ X mặt trước (2 * 12 = 24 tris)
  const diagLen = Math.hypot(width / 3, height * 0.66) - 0.10;
  const diagGeo = new THREE.BoxGeometry(0.05, diagLen, 0.05);
  const angle = Math.atan2(width / 3, height * 0.66);
  const diag1 = new THREE.Mesh(diagGeo, matScaffoldSteel);
  diag1.position.set(0, height * 0.33 + 0.05, halfD);
  diag1.rotation.z = angle;
  const diag2 = new THREE.Mesh(diagGeo, matScaffoldSteel);
  diag2.position.set(0, height * 0.33 + 0.05, halfD);
  diag2.rotation.z = -angle;
  root.add(diag1, diag2);

  // Thang leo bên hông (2 thanh dọc + 6 bậc = 8 * 12 = 96 tris)
  const ladderH = levels[1];
  const railGeo = new THREE.BoxGeometry(0.045, ladderH, 0.045);
  [-0.22, 0.22].forEach((xOff) => {
    const rail = new THREE.Mesh(railGeo, matGalvanizedSteel);
    rail.position.set(-halfW + 0.55 + xOff, ladderH / 2, halfD + 0.12);
    root.add(rail);
  });
  const rungGeo = new THREE.BoxGeometry(0.44, 0.035, 0.035);
  for (let i = 1; i <= 6; i++) {
    const rung = new THREE.Mesh(rungGeo, matGalvanizedSteel);
    rung.position.set(-halfW + 0.55, (ladderH / 7) * i, halfD + 0.12);
    root.add(rung);
  }

  // Lưới bao che an toàn màu xanh lá bán trong suốt (3 planes = 6 tris)
  const meshH = height * 0.88;
  const frontNet = new THREE.Mesh(new THREE.PlaneGeometry(width, meshH), matSafetyMesh);
  frontNet.position.set(0, meshH / 2 + 0.3, halfD + 0.04);
  const leftNet = new THREE.Mesh(new THREE.PlaneGeometry(depth, meshH), matSafetyMesh);
  leftNet.rotation.y = Math.PI / 2;
  leftNet.position.set(-halfW - 0.04, meshH / 2 + 0.3, 0);
  const rightNet = new THREE.Mesh(new THREE.PlaneGeometry(depth, meshH), matSafetyMesh);
  rightNet.rotation.y = Math.PI / 2;
  rightNet.position.set(halfW + 0.04, meshH / 2 + 0.3, 0);
  root.add(frontNet, leftNet, rightNet);

  return enableShadows(root);
}

/**
 * 6. Lồng Thép Đài Móng & Ván Khuôn Chờ Đổ Bê Tông (~300 tris)
 * Bê tông lót đáy + 4 ván khuôn phủ phim có nẹp gỗ + lưới thép đan ô vuông & thép chờ cột.
 */
export function buildRebarCageAndFormworkTwin(options = {}) {
  const root = new THREE.Group();
  root.name = 'MaterialTwin_RebarCageAndFormwork';
  root.userData = { materialType: 'rebar_cage_formwork', ...options };

  const padSize = 4.2;
  const fwSize = 3.6;
  const fwH = 0.72;

  // Bê tông lót đáy tại y = 0 (12 tris)
  const blindingPad = new THREE.Mesh(new THREE.BoxGeometry(padSize, 0.10, padSize), matLeanConcrete);
  blindingPad.position.set(0, 0.05, 0);
  root.add(blindingPad);

  // 4 thành ván khuôn phủ phim đen bao quanh (4 * 12 = 48 tris)
  const wallNSGeo = new THREE.BoxGeometry(fwSize + 0.08, fwH, 0.06);
  const wallEWGeo = new THREE.BoxGeometry(0.06, fwH, fwSize);
  [-fwSize / 2, fwSize / 2].forEach((zPos) => {
    const w = new THREE.Mesh(wallNSGeo, matPhenolicPlywood);
    w.position.set(0, 0.10 + fwH / 2, zPos);
    root.add(w);
  });
  [-fwSize / 2, fwSize / 2].forEach((xPos) => {
    const w = new THREE.Mesh(wallEWGeo, matPhenolicPlywood);
    w.position.set(xPos, 0.10 + fwH / 2, 0);
    root.add(w);
  });

  // 4 thanh gỗ chống nẹp ván khuôn bên ngoài (4 * 12 = 48 tris)
  const ribGeo = new THREE.BoxGeometry(0.10, fwH + 0.08, 0.10);
  [
    [0, 0.10 + fwH / 2, fwSize / 2 + 0.08],
    [0, 0.10 + fwH / 2, -fwSize / 2 - 0.08],
    [fwSize / 2 + 0.08, 0.10 + fwH / 2, 0],
    [-fwSize / 2 - 0.08, 0.10 + fwH / 2, 0]
  ].forEach(([rx, ry, rz]) => {
    const rib = new THREE.Mesh(ribGeo, matPineLumber);
    rib.position.set(rx, ry, rz);
    root.add(rib);
  });

  // Lưới thép đài móng đan ô vuông: 5 thanh dọc + 5 thanh ngang (10 * 12 = 120 tris)
  const barLen = fwSize - 0.24;
  const barXGeo = new THREE.BoxGeometry(barLen, 0.04, 0.04);
  const barZGeo = new THREE.BoxGeometry(0.04, 0.04, barLen);
  const offsets = [-1.4, -0.7, 0, 0.7, 1.4];
  offsets.forEach((off) => {
    const bx = new THREE.Mesh(barXGeo, matRebarSteel);
    bx.position.set(0, 0.28, off);
    const bz = new THREE.Mesh(barZGeo, matRebarSteel);
    bz.position.set(off, 0.32, 0);
    root.add(bx, bz);
  });

  // 4 thanh thép chờ cột vươn lên ở tâm đài móng + 2 đai vuông (6 * 12 = 72 tris)
  const dowelGeo = new THREE.BoxGeometry(0.045, 1.55, 0.045);
  [
    [-0.25, -0.25],
    [0.25, -0.25],
    [-0.25, 0.25],
    [0.25, 0.25]
  ].forEach(([dx, dz]) => {
    const dowel = new THREE.Mesh(dowelGeo, matRebarSteel);
    dowel.position.set(dx, 0.20 + 1.55 / 2, dz);
    root.add(dowel);
  });

  const tieGeo = new THREE.BoxGeometry(0.56, 0.035, 0.56);
  [0.95, 1.45].forEach((ty) => {
    const tie = new THREE.Mesh(tieGeo, matSteelStrap);
    tie.position.set(0, ty, 0);
    root.add(tie);
  });

  return enableShadows(root);
}

/**
 * Danh mục vật tư xây dựng phục vụ tích hợp ModelInspectorModal (TASK-015)
 */
export const CONSTRUCTION_MATERIALS_CATALOG = [
  {
    key: 'mat_plywood_formwork_stack',
    nameVi: 'Kiện Ván Ép Cốt Pha Phủ Phim & Gỗ Thông',
    builder: () => buildPlywoodFormworkStackTwin(),
    defaultScale: 1.0
  },
  {
    key: 'mat_steel_coil',
    nameVi: 'Cuộn Thép Cán Nguội (Cold-Rolled Steel Coil)',
    builder: () => buildSteelCoilTwin({ isAluminum: false }),
    defaultScale: 1.0
  },
  {
    key: 'mat_steel_girder_stack',
    nameVi: 'Bó Dầm Thép Kết Cấu Chữ H / Chữ I (12m)',
    builder: () => buildSteelGirderStackTwin(),
    defaultScale: 1.0
  },
  {
    key: 'mat_concrete_pile_stack',
    nameVi: 'Chồng Cọc Ống Bê Tông Ly Tâm & Ống Cống',
    builder: () => buildConcretePileStackTwin(),
    defaultScale: 1.0
  },
  {
    key: 'mat_scaffolding_bay',
    nameVi: 'Mô-đun Giàn Giáo Khung Thép & Lưới An Toàn',
    builder: () => buildScaffoldingBayTwin({ width: 12, height: 10 }),
    defaultScale: 1.0
  },
  {
    key: 'mat_rebar_cage_formwork',
    nameVi: 'Lồng Thép Đài Móng & Ván Khuôn Đổ Bê Tông',
    builder: () => buildRebarCageAndFormworkTwin(),
    defaultScale: 1.0
  }
];
