import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/**
 * Tạo Texture chữ/logo chất lượng cao để dán lên nóc nhà máy, biển cổng Dock và thùng xe tải
 */
export function createLogoBannerTexture(title, subtitle, bgColor = '#1e40af', textColor = '#ffffff') {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, 1024, 256);

  // Vẽ icon khối lập phương isometric
  ctx.fillStyle = '#60a5fa';
  ctx.beginPath();
  ctx.arc(135, 128, 66, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = '800 72px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(title, 235, 132);

  if (subtitle) {
    ctx.fillStyle = '#bfdbfe';
    ctx.font = '600 38px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(subtitle, 238, 188);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function createTruckSideTexture(brandName, tagline, accentHex = '#2563eb') {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Nền thùng xe trắng kem sạch sẽ
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, 1024, 512);

  // Các đường gân kim loại mảnh trên thùng xe
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 3;
  for (let x = 64; x < 1024; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 20);
    ctx.lineTo(x, 460);
    ctx.stroke();
  }

  // Dải màu thương hiệu bên dưới
  ctx.fillStyle = accentHex;
  ctx.fillRect(0, 445, 1024, 67);

  // Logo hộp vuông
  ctx.fillStyle = accentHex;
  ctx.beginPath();
  ctx.roundRect(140, 155, 115, 115, 22);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = '800 66px sans-serif';
  ctx.fillText('A', 173, 236);

  // Tên thương hiệu
  ctx.fillStyle = '#0f172a';
  ctx.font = '800 84px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(brandName, 290, 225);

  ctx.fillStyle = '#64748b';
  ctx.font = '600 34px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(tagline, 294, 275);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function createCorrugatedWallTexture(baseColor = '#2563eb', stripeColor = '#1d4ed8') {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 256, 256);

  ctx.fillStyle = stripeColor;
  for (let x = 0; x < 256; x += 16) {
    ctx.fillRect(x, 0, 6, 256);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Xây dựng tòa nhà máy màu xanh Cobalt kiểu WareTrack có 3 cửa cuốn xuất hàng (Bay D1, D2, D3)
 * Hỗ trợ chế độ mở mái (Cutaway / X-Ray) để quan sát dây chuyền lắp ráp ô tô bên trong
 */
export function buildFactoryBuilding() {
  const group = new THREE.Group();
  const roofGroup = new THREE.Group();

  const wallTex = createCorrugatedWallTexture('#2563eb', '#1d4ed8');
  wallTex.repeat.set(14, 2);

  const roofTex = createCorrugatedWallTexture('#3b82f6', '#2563eb');
  roofTex.repeat.set(18, 6);

  const blueWallMat = new THREE.MeshStandardMaterial({
    map: wallTex,
    roughness: 0.45,
    metalness: 0.15
  });

  const trimBlueMat = new THREE.MeshStandardMaterial({
    color: 0x1e40af,
    roughness: 0.4,
    metalness: 0.2
  });

  const roofMat = new THREE.MeshStandardMaterial({
    map: roofTex,
    roughness: 0.42,
    metalness: 0.18
  });

  // Kích thước xưởng chính: dài 42m (X: -21..21), rộng 20m (Z: -14..6), cao 7.5m
  // Tường hậu (Phía Bắc Z = -14)
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(42, 7.5, 0.45), blueWallMat);
  backWall.position.set(0, 3.75, -14);
  backWall.castShadow = true;
  backWall.receiveShadow = true;
  group.add(backWall);

  // Tường bên Trái (Phía Tây X = -21) có cổng cho vật tư vào
  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.45, 7.5, 20), blueWallMat);
  leftWall.position.set(-21, 3.75, -4);
  leftWall.castShadow = true;
  leftWall.receiveShadow = true;
  group.add(leftWall);

  // Khối nhà phụ bên trái (Annex Building giống WareTrack)
  const annex = new THREE.Mesh(new RoundedBoxGeometry(9, 6.2, 12, 3, 0.15), blueWallMat);
  annex.position.set(-25.2, 3.1, -6.5);
  annex.castShadow = true;
  annex.receiveShadow = true;
  group.add(annex);

  // Tường bên Phải (Phía Đông X = 21)
  const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.45, 7.5, 20), blueWallMat);
  rightWall.position.set(21, 3.75, -4);
  rightWall.castShadow = true;
  rightWall.receiveShadow = true;
  group.add(rightWall);

  // Mặt tiền phía Nam (Z = 6) với 3 cổng xuất hàng lớn (Bay D1, D2, D3) và vách kính
  const frontTopFascia = new THREE.Mesh(new THREE.BoxGeometry(42.4, 2.3, 0.5), blueWallMat);
  frontTopFascia.position.set(0, 6.4, 6);
  frontTopFascia.castShadow = true;
  group.add(frontTopFascia);

  // Các trụ phân cách giữa các cổng Dock Bays (X = -14, -4, 6, 16)
  const pillarXPositions = [-19.5, -10.5, -1.5, 7.5, 16.5, 20.5];
  pillarXPositions.forEach((px, idx) => {
    const w = idx === 0 || idx === 5 ? 2.8 : 2.2;
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(w, 5.3, 0.55), blueWallMat);
    pillar.position.set(px, 2.65, 6);
    pillar.castShadow = true;
    pillar.receiveShadow = true;
    group.add(pillar);
  });

  // Khung viền trắng & biển mã số Bay D3, D2, D1 trên mỗi cửa xuất hàng
  const bayCenters = [
    { x: -15.0, code: 'D3', sub: 'BAY 3 • PARTS' },
    { x: -6.0, code: 'D2', sub: 'BAY 2 •OUTBOUND' },
    { x: 3.0, code: 'D1', sub: 'BAY 1 • EXPRESS' },
    { x: 12.0, code: 'D0', sub: 'SHOWROOM GATE' }
  ];

  const whiteFrameMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });
  bayCenters.forEach((bay) => {
    // Khung bao cửa cuốn
    const topBar = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.28, 0.65), whiteFrameMat);
    topBar.position.set(bay.x, 5.15, 6.05);
    group.add(topBar);

    // Tấm cửa cuốn nửa mở màu xám bạc
    const shutter = new THREE.Mesh(
      new THREE.BoxGeometry(6.4, 0.9, 0.15),
      new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.4, metalness: 0.3 })
    );
    shutter.position.set(bay.x, 4.65, 6.0);
    group.add(shutter);

    // Biển hiệu Bay
    const signTex = createLogoBannerTexture(bay.code, bay.sub, '#1e3a8a', '#ffffff');
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(2.6, 0.65),
      new THREE.MeshBasicMaterial({ map: signTex })
    );
    sign.position.set(bay.x, 5.85, 6.28);
    group.add(sign);

    // Vạch kẻ vàng dẫn hướng xe tải trước mỗi cửa Bay
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    [-3.1, 3.1].forEach((offsetX) => {
      const guideLine = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 11.5), lineMat);
      guideLine.rotation.x = -Math.PI / 2;
      guideLine.position.set(bay.x + offsetX, 0.03, 12.2);
      group.add(guideLine);
    });
  });

  // Biển tên nhà máy lớn trên mặt tiền
  const mainBannerTex = createLogoBannerTexture('AutoTrack', 'PLT-01 • RIVERSIDE AUTO PLANT', '#1e40af', '#ffffff');
  const mainBanner = new THREE.Mesh(
    new THREE.PlaneGeometry(9.5, 1.9),
    new THREE.MeshBasicMaterial({ map: mainBannerTex })
  );
  mainBanner.position.set(-1.5, 6.75, 6.29);
  group.add(mainBanner);

  // Phần Mái Nhà Xưởng (Roof Group — có thể bật/tắt chế độ Cutaway X-Ray)
  const leftSlope = new THREE.Mesh(new THREE.BoxGeometry(43.2, 0.35, 11.2), roofMat);
  leftSlope.position.set(0, 8.6, -9.1);
  leftSlope.rotation.x = -0.18;
  leftSlope.castShadow = true;
  roofGroup.add(leftSlope);

  const rightSlope = new THREE.Mesh(new THREE.BoxGeometry(43.2, 0.35, 11.2), roofMat);
  rightSlope.position.set(0, 8.6, 1.1);
  rightSlope.rotation.x = 0.18;
  rightSlope.castShadow = true;
  roofGroup.add(rightSlope);

  // Logo tròn lớn trên mái nhà giống hệt WareTrack
  const roofLogoTex = createLogoBannerTexture('PLT-01', 'AUTOTRACK GIGAFACTORY', '#2563eb', '#ffffff');
  const roofLogo = new THREE.Mesh(
    new THREE.PlaneGeometry(11, 2.8),
    new THREE.MeshBasicMaterial({ map: roofLogoTex })
  );
  roofLogo.rotation.x = -Math.PI / 2 + 0.18;
  roofLogo.position.set(-1.5, 8.95, 1.5);
  roofGroup.add(roofLogo);

  const annexRoof = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.35, 12.6), trimBlueMat);
  annexRoof.position.set(-25.2, 6.35, -6.5);
  roofGroup.add(annexRoof);

  group.add(roofGroup);
  group.userData.roofGroup = roofGroup;

  return group;
}

/**
 * Mô hình Pallet gỗ chất đầy thùng Carton / kiện linh kiện màu sắc sắc nét
 */
export function buildPalletStack({ x = 0, z = 0, boxCount = 6, boxType = 'cardboard', id, name }) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.userData = {
    Selectable: true,
    type: 'pallet',
    id: id || `PLT-${Math.floor(100 + Math.random() * 900)}`,
    name: name || 'Kiện Linh Kiện Ô Tô',
    boxType,
    units: boxCount * 24,
    status: 'In Stock'
  };

  // Đế Pallet gỗ ấm áp
  const woodMat = new THREE.MeshStandardMaterial({ color: 0xd9a05b, roughness: 0.65 });
  const palletBase = new THREE.Mesh(new RoundedBoxGeometry(2.2, 0.22, 2.2, 2, 0.04), woodMat);
  palletBase.position.y = 0.11;
  palletBase.castShadow = true;
  palletBase.receiveShadow = true;
  group.add(palletBase);

  const isBluePlastic = boxType === 'plastic';
  const boxMat = new THREE.MeshStandardMaterial({
    color: isBluePlastic ? 0x2563eb : 0xd4a373,
    roughness: 0.5,
    metalness: 0.05
  });
  const tapeMat = new THREE.MeshBasicMaterial({ color: isBluePlastic ? 0x93c5fd : 0xfef3c7 });

  const positions = [
    [-0.48, 0.55, -0.48],
    [0.48, 0.55, -0.48],
    [-0.48, 0.55, 0.48],
    [0.48, 0.55, 0.48],
    [-0.45, 1.32, -0.2],
    [0.45, 1.32, 0.25]
  ];

  for (let i = 0; i < Math.min(boxCount, positions.length); i++) {
    const [bx, by, bz] = positions[i];
    const box = new THREE.Mesh(new RoundedBoxGeometry(0.86, 0.72, 0.86, 2, 0.06), boxMat);
    box.position.set(bx, by, bz);
    box.castShadow = true;
    box.receiveShadow = true;
    group.add(box);

    // Nhãn trắng & băng keo trên mỗi thùng hàng
    const label = new THREE.Mesh(new THREE.PlaneGeometry(0.38, 0.22), tapeMat);
    label.position.set(bx, by + 0.05, bz + 0.435);
    group.add(label);
  }

  return group;
}

/**
 * Mô hình Xe Nâng Hàng (Forklift) màu vàng-xanh dương tươi sáng giống hệt WareTrack
 */
export function buildForklift({ id, name, taskDesc, waypoints }) {
  const forklift = new THREE.Group();
  forklift.userData = {
    Selectable: true,
    type: 'forklift',
    id,
    name,
    taskDesc,
    battery: 86,
    operator: id === 'FL-01' ? 'Minh Trần' : 'Hoàng Lê',
    status: 'Working',
    waypoints,
    wpIndex: 0,
    progress: Math.random()
  };

  const yellowMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.32, metalness: 0.15 });
  const blueTrimMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.35, metalness: 0.2 });
  const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.5 });

  // Thân xe nâng bo tròn
  const body = new THREE.Mesh(new RoundedBoxGeometry(2.1, 1.05, 1.35, 3, 0.18), yellowMat);
  body.position.set(-0.2, 0.75, 0);
  body.castShadow = true;
  forklift.add(body);

  // Ốp sườn xanh dương giống trong ảnh WareTrack
  const sideBlue = new THREE.Mesh(new RoundedBoxGeometry(1.1, 0.45, 1.4, 2, 0.08), blueTrimMat);
  sideBlue.position.set(0.15, 0.55, 0);
  forklift.add(sideBlue);

  // Khung bảo vệ cabin (Roll Cage)
  const cagePositions = [
    [-0.75, 1.75, 0.55],
    [-0.75, 1.75, -0.55],
    [0.45, 1.75, 0.55],
    [0.45, 1.75, -0.55]
  ];
  cagePositions.forEach(([cx, cy, cz]) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 1.25, 8), darkMetalMat);
    post.position.set(cx, cy, cz);
    forklift.add(post);
  });

  const cageRoof = new THREE.Mesh(new RoundedBoxGeometry(1.4, 0.1, 1.25, 2, 0.03), darkMetalMat);
  cageRoof.position.set(-0.15, 2.38, 0);
  forklift.add(cageRoof);

  // Ghế lái & Người vận hành đội mũ bảo hộ
  const driverBody = new THREE.Mesh(
    new RoundedBoxGeometry(0.45, 0.65, 0.45, 2, 0.1),
    new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.5 })
  );
  driverBody.position.set(-0.2, 1.45, 0);
  forklift.add(driverBody);

  const driverHead = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 12, 12),
    new THREE.MeshStandardMaterial({ color: 0xfde68a, roughness: 0.4 })
  );
  driverHead.position.set(-0.2, 1.95, 0);
  forklift.add(driverHead);

  // Cột nâng thủy lực phía trước (Mast & Forks)
  [-0.38, 0.38].forEach((fz) => {
    const mast = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.5, 0.14), darkMetalMat);
    mast.position.set(0.95, 1.35, fz);
    mast.castShadow = true;
    forklift.add(mast);

    const tine = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.08, 0.16), darkMetalMat);
    tine.position.set(1.55, 0.42, fz);
    forklift.add(tine);
  });

  // Kiện hàng đang được nâng trên càng
  const carriedBox = new THREE.Mesh(
    new RoundedBoxGeometry(0.95, 0.85, 1.1, 2, 0.06),
    new THREE.MeshStandardMaterial({ color: 0xd4a373, roughness: 0.5 })
  );
  carriedBox.position.set(1.55, 0.88, 0);
  carriedBox.castShadow = true;
  forklift.add(carriedBox);

  // 4 Bánh xe cao su đen + mâm vàng
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 });
  [
    [0.55, 0.36, 0.68],
    [0.55, 0.36, -0.68],
    [-0.85, 0.32, 0.68],
    [-0.85, 0.32, -0.68]
  ].forEach(([wx, wy, wz]) => {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(wy, wy, 0.28, 16), tireMat);
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(wx, wy, wz);
    forklift.add(wheel);
  });

  return forklift;
}

/**
 * Mô hình Xe Tải Logistics (Box Truck / Semi-Truck) chi tiết cao với cabin xanh, thùng trắng in logo
 */
export function buildDetailedTruck({ id, code, company, tagline, cabColor = 0x2563eb, accentHex = '#2563eb', bay, state = 'Loading', progressText = '4/6' }) {
  const truck = new THREE.Group();
  truck.userData = {
    Selectable: true,
    type: 'truck',
    id,
    code,
    name: `${code} • ${company}`,
    company,
    bay,
    state,
    progressText,
    destination: bay === 'Bay 1' ? 'Philadelphia, PA' : bay === 'Bay 2' ? 'Newark Hub, NJ' : 'Boston Auto Mall'
  };

  // Thùng xe tải có logo hai bên hông
  const sideTex = createTruckSideTexture(company, tagline, accentHex);
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0.1 });
  const sideMat = new THREE.MeshStandardMaterial({ map: sideTex, roughness: 0.32, metalness: 0.08 });

  const boxMaterials = [
    sideMat,  // Right
    sideMat,  // Left
    whiteMat, // Top
    whiteMat, // Bottom
    whiteMat, // Front
    whiteMat  // Back
  ];

  const cargoBox = new THREE.Mesh(new THREE.BoxGeometry(3.4, 3.3, 8.8), boxMaterials);
  cargoBox.position.set(0, 2.35, 0);
  cargoBox.castShadow = true;
  cargoBox.receiveShadow = true;
  truck.add(cargoBox);

  // Khung gầm đen
  const chassisMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.45, 10.6), chassisMat);
  chassis.position.set(0, 0.68, 1.1);
  truck.add(chassis);

  // Đầu kéo Cabin bo tròn hiện đại
  const cabMat = new THREE.MeshStandardMaterial({ color: cabColor, roughness: 0.25, metalness: 0.2 });
  const cabMain = new THREE.Mesh(new RoundedBoxGeometry(3.15, 2.55, 2.85, 4, 0.24), cabMat);
  cabMain.position.set(0, 1.95, 6.1);
  cabMain.castShadow = true;
  cabMain.receiveShadow = true;
  truck.add(cabMain);

  // Mui lướt gió khí động học trên nóc cabin (Wind Deflector)
  const deflector = new THREE.Mesh(new RoundedBoxGeometry(2.9, 0.65, 1.6, 3, 0.18), cabMat);
  deflector.position.set(0, 3.4, 5.6);
  deflector.rotation.x = 0.25;
  truck.add(deflector);

  // Kính chắn gió & cửa sổ bên màu xanh đen bóng
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1, metalness: 0.85 });
  const windshield = new THREE.Mesh(new RoundedBoxGeometry(2.75, 0.95, 0.15, 2, 0.05), glassMat);
  windshield.position.set(0, 2.35, 7.5);
  truck.add(windshield);

  const sideWindows = new THREE.Mesh(new RoundedBoxGeometry(3.22, 0.82, 1.45, 2, 0.05), glassMat);
  sideWindows.position.set(0, 2.35, 6.45);
  truck.add(sideWindows);

  // Lưới tản nhiệt & Cản trước + Đèn pha LED
  const grille = new THREE.Mesh(
    new RoundedBoxGeometry(2.1, 0.85, 0.12, 2, 0.04),
    new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.6, roughness: 0.3 })
  );
  grille.position.set(0, 1.35, 7.52);
  truck.add(grille);

  const bumper = new THREE.Mesh(
    new RoundedBoxGeometry(3.25, 0.42, 0.45, 2, 0.1),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 })
  );
  bumper.position.set(0, 0.78, 7.45);
  truck.add(bumper);

  const headLightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  [-1.15, 1.15].forEach((hx) => {
    const hl = new THREE.Mesh(new RoundedBoxGeometry(0.45, 0.22, 0.1, 2, 0.04), headLightMat);
    hl.position.set(hx, 1.12, 7.54);
    truck.add(hl);
  });

  // 6 Cụm bánh xe tải lớn kèm mâm bạc
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.8, roughness: 0.2 });
  [-2.8, -1.3, 6.1].forEach((wz) => {
    [-1.45, 1.45].forEach((wx) => {
      const wGroup = new THREE.Group();
      wGroup.position.set(wx, 0.56, wz);
      const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.56, 0.38, 20), tireMat);
      tire.rotation.z = Math.PI / 2;
      tire.castShadow = true;
      wGroup.add(tire);

      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.4, 14), rimMat);
      rim.rotation.z = Math.PI / 2;
      wGroup.add(rim);
      truck.add(wGroup);
    });
  });

  return truck;
}

/**
 * Mô hình Container Hàng Hải màu xanh Teal (MAERA LINE) giống hệt góc trái WareTrack
 */
export function buildShippingContainer(x, z) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.userData = {
    Selectable: true,
    type: 'container',
    id: 'CNT-4092',
    name: 'Container Linh Kiện Nhập Khẩu (MAERA LINE)',
    status: 'Staged',
    contents: '320 Bộ Khung Gầm & Pin EV'
  };

  const tex = createTruckSideTexture('MAERA LINE', 'GLOBAL AUTOMOTIVE FREIGHT', '#0d9488');
  const tealMat = new THREE.MeshStandardMaterial({ color: 0x14b8a6, roughness: 0.45, metalness: 0.2 });
  const sideMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.4, metalness: 0.15 });

  const box = new THREE.Mesh(
    new RoundedBoxGeometry(3.6, 3.4, 9.6, 3, 0.1),
    [sideMat, sideMat, tealMat, tealMat, tealMat, tealMat]
  );
  box.position.y = 1.7;
  box.castShadow = true;
  box.receiveShadow = true;
  group.add(box);

  return group;
}

/**
 * Mô hình Ô Tô Điện 3D sắc nét trên dây chuyền lắp ráp bên trong nhà máy
 * Biến đổi trực quan qua các công đoạn lắp ráp
 */
export function buildSleekCar({ id, model = 'Apex SUV', colorHex = '#ef4444', colorName = 'Đỏ Coral' }) {
  const car = new THREE.Group();
  car.userData = {
    Selectable: true,
    type: 'car',
    id,
    model,
    colorHex,
    colorName,
    stage: 0,
    progress: 0,
    vin: `AT-2026-${Math.floor(1000 + Math.random() * 9000)}`
  };

  // Giai đoạn 0: Khung gầm Skateboard + Pin Lithium xanh
  const chassisMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.6, roughness: 0.35 });
  const baseChassis = new THREE.Mesh(new RoundedBoxGeometry(3.6, 0.24, 1.72, 2, 0.06), chassisMat);
  baseChassis.position.y = 0.42;
  baseChassis.castShadow = true;
  car.add(baseChassis);

  // Giai đoạn 1 & 2: Thân xe bo tròn mượt mà (RoundedBoxGeometry + Clearcoat)
  const bodyGroup = new THREE.Group();
  const bodyPaintMat = new THREE.MeshPhysicalMaterial({
    color: 0x94a3b8,
    roughness: 0.22,
    metalness: 0.25,
    clearcoat: 0.85,
    clearcoatRoughness: 0.12
  });

  const lowerHull = new THREE.Mesh(new RoundedBoxGeometry(3.75, 0.62, 1.82, 4, 0.18), bodyPaintMat);
  lowerHull.position.y = 0.72;
  lowerHull.castShadow = true;
  bodyGroup.add(lowerHull);

  const upperCabin = new THREE.Mesh(new RoundedBoxGeometry(2.15, 0.56, 1.56, 4, 0.22), bodyPaintMat);
  upperCabin.position.set(-0.15, 1.22, 0);
  upperCabin.castShadow = true;
  bodyGroup.add(upperCabin);
  car.add(bodyGroup);

  // Giai đoạn 3: Kính chắn gió, Đèn pha LED & Bánh xe Sport
  const detailsGroup = new THREE.Group();
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.08, metalness: 0.9 });
  const glassBand = new THREE.Mesh(new RoundedBoxGeometry(2.2, 0.4, 1.59, 3, 0.12), glassMat);
  glassBand.position.set(-0.15, 1.24, 0);
  detailsGroup.add(glassBand);

  const headLight = new THREE.Mesh(
    new RoundedBoxGeometry(0.1, 0.12, 1.55, 2, 0.04),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  headLight.position.set(1.86, 0.82, 0);
  detailsGroup.add(headLight);

  const tailLight = new THREE.Mesh(
    new RoundedBoxGeometry(0.1, 0.12, 1.55, 2, 0.04),
    new THREE.MeshBasicMaterial({ color: 0xef4444 })
  );
  tailLight.position.set(-1.86, 0.85, 0);
  detailsGroup.add(tailLight);

  const tireMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.85, roughness: 0.15 });
  [
    [1.18, 0.38, 0.88],
    [1.18, 0.38, -0.88],
    [-1.18, 0.38, 0.88],
    [-1.18, 0.38, -0.88]
  ].forEach(([wx, wy, wz]) => {
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.26, 18), tireMat);
    tire.rotation.x = Math.PI / 2;
    tire.position.set(wx, wy, wz);
    detailsGroup.add(tire);

    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.28, 12), rimMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.set(wx, wy, wz);
    detailsGroup.add(rim);
  });

  car.add(detailsGroup);

  car.userData.updateStage = (stage) => {
    car.userData.stage = stage;
    bodyGroup.visible = stage >= 1;
    if (stage >= 2) {
      bodyPaintMat.color.set(colorHex);
    } else {
      bodyPaintMat.color.setHex(0xcbd5e1);
    }
    detailsGroup.visible = stage >= 3;
  };

  return car;
}

/**
 * Cánh tay Robot lắp ráp sơn màu Cam - Trắng tươi sáng bên trong dây chuyền
 */
export function buildAssemblyRobot({ id, name, x, z, side = 1 }) {
  const root = new THREE.Group();
  root.position.set(x, 0, z);
  root.userData = {
    Selectable: true,
    type: 'robot',
    id,
    name,
    status: 'Operational',
    cycles: Math.floor(1400 + Math.random() * 500)
  };

  const baseMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.5 });
  const armMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.28, metalness: 0.2 });

  const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.8, 0.5, 16), baseMat);
  ped.position.y = 0.25;
  ped.castShadow = true;
  root.add(ped);

  const turret = new THREE.Group();
  turret.position.y = 0.5;
  root.add(turret);

  const lower = new THREE.Mesh(new RoundedBoxGeometry(0.38, 1.85, 0.38, 3, 0.08), armMat);
  lower.position.y = 0.9;
  lower.castShadow = true;
  turret.add(lower);

  const upperPivot = new THREE.Group();
  upperPivot.position.y = 1.75;
  turret.add(upperPivot);

  const upper = new THREE.Mesh(new RoundedBoxGeometry(0.32, 0.32, 1.55, 3, 0.08), armMat);
  upper.position.z = 0.65 * side;
  upper.castShadow = true;
  upperPivot.add(upper);

  root.userData.joints = { turret, upperPivot, side, phase: Math.random() * Math.PI * 2 };
  return root;
}

/**
 * Cây xanh Stylised Low-Poly tròn trịa tươi mát xung quanh khuôn viên giống hệt WareTrack
 */
export function buildStylizedTree(x, z, scale = 1) {
  const tree = new THREE.Group();
  tree.position.set(x, 0, z);
  tree.scale.setScalar(scale);

  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.34, 1.8, 10),
    new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 })
  );
  trunk.position.y = 0.9;
  trunk.castShadow = true;
  tree.add(trunk);

  const foliage = new THREE.Mesh(
    new THREE.SphereGeometry(1.55, 20, 20),
    new THREE.MeshStandardMaterial({ color: 0x4ade80, roughness: 0.55, metalness: 0.05 })
  );
  foliage.position.y = 2.65;
  foliage.scale.set(1, 1.12, 1);
  foliage.castShadow = true;
  foliage.receiveShadow = true;
  tree.add(foliage);

  return tree;
}

/**
 * Kệ Kho Cao Tầng (High-Bay Pallet Rack) bên phải nhà máy giống hệt WareTrack
 */
export function buildExteriorStorageRack(x, z, id) {
  const rack = new THREE.Group();
  rack.position.set(x, 0, z);
  rack.userData = {
    Selectable: true,
    type: 'rack',
    id,
    name: `Kệ Ngoại Khu ${id}`,
    status: '88% Full',
    pallets: '24 Kiện Phụ Tùng'
  };

  const postMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.4 });
  const beamMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4 });
  const boxMat = new THREE.MeshStandardMaterial({ color: 0xd4a373, roughness: 0.5 });

  [-2.6, 0, 2.6].forEach((px) => {
    [-0.85, 0.85].forEach((pz) => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 6.2, 0.16), postMat);
      post.position.set(px, 3.1, pz);
      post.castShadow = true;
      rack.add(post);
    });
  });

  [1.6, 3.4, 5.1].forEach((y) => {
    [-0.85, 0.85].forEach((pz) => {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.14, 0.12), beamMat);
      beam.position.set(0, y, pz);
      rack.add(beam);
    });

    [-1.7, -0.55, 0.6, 1.75].forEach((bx) => {
      const carton = new THREE.Mesh(new RoundedBoxGeometry(0.95, 1.05, 1.35, 2, 0.05), boxMat);
      carton.position.set(bx, y + 0.6, 0);
      carton.castShadow = true;
      rack.add(carton);
    });
  });

  return rack;
}
