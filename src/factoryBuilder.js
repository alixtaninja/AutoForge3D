import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { instantiateSimReady } from './simreadyLoader.js';

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
 * Mô hình Pallet gỗ chất đầy thùng Carton / kiện linh kiện sử dụng tài sản 3D NVIDIA SimReady GLB
 * (`pallet_assembly_a02.glb`, `pallet_assembly_b01.glb`, `pallet_a01.glb`, `box_cardboard_a01.glb`, `crate_blue_a01.glb`)
 */
export function buildPalletStack({ x = 0, z = 0, boxCount = 6, boxType = 'cardboard', id, name }) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  const isBluePlastic = boxType === 'plastic';
  const assetKey = isBluePlastic ? 'pallet_assembly_b01' : 'pallet_assembly_a02';

  group.userData = {
    Selectable: true,
    type: 'pallet',
    id: id || `PLT-${Math.floor(100 + Math.random() * 900)}`,
    name: name || 'Kiện Linh Kiện Ô Tô (SimReady)',
    simreadyAsset: `${assetKey}.glb`,
    boxType,
    units: boxCount * 24,
    status: 'In Stock'
  };

  // Thử khởi tạo từ mô hình NVIDIA SimReady GLB thực tế
  const simPallet = instantiateSimReady(assetKey, { scale: 1.65 });
  if (simPallet) {
    group.add(simPallet);

    // Chồng thêm các thùng carton / khay nhựa xanh SimReady thực tế lên trên
    const extraItemKey = isBluePlastic ? 'crate_blue_a01' : 'box_cardboard_a01';
    const extraOffsets = [
      [-0.36, 0.86, -0.28],
      [0.36, 0.86, 0.28],
      [0.0, 0.86, -0.32]
    ];
    for (let i = 0; i < Math.min(3, Math.max(1, boxCount - 3)); i++) {
      const item = instantiateSimReady(extraItemKey, { scale: isBluePlastic ? 1.55 : 1.15, rotationY: i * 0.6 });
      if (item) {
        const [ox, oy, oz] = extraOffsets[i];
        item.position.set(ox, oy, oz);
        group.add(item);
      }
    }
    return group;
  }

  // Fallback nếu chưa tải xong GLB
  const woodMat = new THREE.MeshStandardMaterial({ color: 0xd9a05b, roughness: 0.65 });
  const palletBase = new THREE.Mesh(new RoundedBoxGeometry(2.2, 0.22, 2.2, 2, 0.04), woodMat);
  palletBase.position.y = 0.11;
  palletBase.castShadow = true;
  palletBase.receiveShadow = true;
  group.add(palletBase);

  return group;
}

/**
 * Mô hình Xe Nâng Hàng (Forklift) sử dụng tài sản 3D NVIDIA SimReady GLB
 * (`vehicle_forklift_orange_a01.glb` & `vehicle_forklift_blue_a01.glb`)
 */
export function buildForklift({ id, name, taskDesc, waypoints }) {
  const forklift = new THREE.Group();
  const assetKey = id === 'FL-01' ? 'vehicle_forklift_orange_a01' : 'vehicle_forklift_blue_a01';

  forklift.userData = {
    Selectable: true,
    type: 'forklift',
    id,
    name,
    simreadyAsset: `${assetKey}.glb`,
    taskDesc,
    battery: id === 'FL-01' ? 88 : 92,
    operator: id === 'FL-01' ? 'Minh Trần' : 'Hoàng Lê',
    status: 'Working',
    waypoints,
    wpIndex: 0,
    progress: Math.random()
  };

  // Mô hình NVIDIA SimReady Forklift có mũi càng hướng theo trục +Z, nên xoay -Math.PI/2 để khớp hướng di chuyển +X
  const simForklift = instantiateSimReady(assetKey, {
    targetHeight: 2.35,
    rotationY: -Math.PI / 2
  });

  if (simForklift) {
    forklift.add(simForklift);

    // Đặt thêm kiện hàng SimReady đang nâng trên càng xe nâng
    const carriedCargo = instantiateSimReady('box_cardboard_a01', { scale: 1.25 });
    if (carriedCargo) {
      carriedCargo.position.set(1.15, 0.28, 0);
      forklift.add(carriedCargo);
    }
    return forklift;
  }

  // Fallback nếu chưa tải GLB
  const yellowMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.32, metalness: 0.15 });
  const body = new THREE.Mesh(new RoundedBoxGeometry(2.1, 1.05, 1.35, 3, 0.18), yellowMat);
  body.position.set(-0.2, 0.75, 0);
  forklift.add(body);
  return forklift;
}

/**
 * Mô hình Xe Tải Logistics (Box Truck / Semi-Truck) chi tiết cao với cabin xanh, thùng trắng in logo
 * kèm theo Lốp & Mâm xe thực tế từ NVIDIA SimReady (`wheelAssembly_tire_c01.glb`)
 */
export function buildDetailedTruck({ id, code, company, tagline, cabColor = 0x2563eb, accentHex = '#2563eb', bay, state = 'Loading', progressText = '4/6' }) {
  const truck = new THREE.Group();
  truck.userData = {
    Selectable: true,
    type: 'truck',
    id,
    code,
    name: `${code} • ${company}`,
    simreadyAsset: 'wheelAssembly_tire_c01.glb + Custom Box Trailer',
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

  // Cản trước sử dụng mô hình NVIDIA SimReady (`bodyPart_bumper_front_d01.glb`) hoặc lưới tản nhiệt
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

  // 6 Cụm bánh xe tải sử dụng mô hình lốp NVIDIA SimReady (`wheelAssembly_tire_c01.glb`)
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.8, roughness: 0.2 });
  [-2.8, -1.3, 6.1].forEach((wz) => {
    [-1.45, 1.45].forEach((wx) => {
      const simTire = instantiateSimReady('wheelAssembly_tire_c01', {
        targetHeight: 1.12,
        rotationY: wx > 0 ? 0 : Math.PI
      });
      if (simTire) {
        simTire.position.set(wx, 0, wz);
        truck.add(simTire);
      } else {
        const wGroup = new THREE.Group();
        wGroup.position.set(wx, 0.56, wz);
        const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.56, 0.38, 20), tireMat);
        tire.rotation.z = Math.PI / 2;
        wGroup.add(tire);
        const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.4, 14), rimMat);
        rim.rotation.z = Math.PI / 2;
        wGroup.add(rim);
        truck.add(wGroup);
      }
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
 * Mô hình Ô Tô Điện 3D trên dây chuyền lắp ráp kết hợp các cụm linh kiện thực tế từ NVIDIA SimReady:
 * - Giai đoạn 0 (Powertrain): Khung gầm + Động cơ điện NVIDIA SimReady (`engineAssembly_electric_engine_a01.glb`)
 * - Giai đoạn 1 & 2 (Body-in-White & Paint): Thân xe + Nắp Capo (`bodyPart_hood_c01.glb`), Cửa xe (`bodyPart_door_front_b01.glb`), Cản trước (`bodyPart_bumper_front_d01.glb`)
 * - Giai đoạn 3 (Final Trim): 4 Cụm bánh lốp NVIDIA SimReady (`wheelAssembly_tire_c01.glb`)
 */
export function buildSleekCar({ id, model = 'Apex SUV', colorHex = '#ef4444', colorName = 'Đỏ Coral' }) {
  const car = new THREE.Group();
  car.userData = {
    Selectable: true,
    type: 'car',
    id,
    model,
    simreadyAsset: 'engineAssembly_electric_engine_a01 + bodyPart_hood_c01 + bodyPart_door_front_b01 + wheelAssembly_tire_c01',
    colorHex,
    colorName,
    stage: 0,
    progress: 0,
    vin: `AT-2026-${Math.floor(1000 + Math.random() * 9000)}`
  };

  // Giai đoạn 0: Khung gầm Skateboard + Động cơ điện NVIDIA SimReady (`engineAssembly_electric_engine_a01.glb`)
  const chassisMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.6, roughness: 0.35 });
  const baseChassis = new THREE.Mesh(new RoundedBoxGeometry(3.6, 0.22, 1.72, 2, 0.06), chassisMat);
  baseChassis.position.y = 0.38;
  baseChassis.castShadow = true;
  car.add(baseChassis);

  const simEngine = instantiateSimReady('engineAssembly_electric_engine_a01', { scale: 1.55 });
  if (simEngine) {
    simEngine.position.set(1.05, 0.48, 0);
    car.add(simEngine);
  }

  // Giai đoạn 1 & 2: Thân xe kết hợp Nắp Capo, Cửa trước và Cản trước NVIDIA SimReady GLB
  const bodyGroup = new THREE.Group();
  const bodyPaintMat = new THREE.MeshPhysicalMaterial({
    color: 0x94a3b8,
    roughness: 0.22,
    metalness: 0.25,
    clearcoat: 0.85,
    clearcoatRoughness: 0.12
  });

  const lowerHull = new THREE.Mesh(new RoundedBoxGeometry(3.55, 0.56, 1.76, 4, 0.16), bodyPaintMat);
  lowerHull.position.y = 0.68;
  lowerHull.castShadow = true;
  bodyGroup.add(lowerHull);

  const upperCabin = new THREE.Mesh(new RoundedBoxGeometry(2.05, 0.54, 1.54, 4, 0.2), bodyPaintMat);
  upperCabin.position.set(-0.2, 1.18, 0);
  upperCabin.castShadow = true;
  bodyGroup.add(upperCabin);

  // Gắn Nắp Capo thực tế từ NVIDIA SimReady (`bodyPart_hood_c01.glb`)
  const simHood = instantiateSimReady('bodyPart_hood_c01', { scale: 1.05 });
  if (simHood) {
    simHood.position.set(1.12, 0.92, 0);
    bodyGroup.add(simHood);
  }

  // Gắn Cản trước thực tế từ NVIDIA SimReady (`bodyPart_bumper_front_d01.glb`)
  const simBumper = instantiateSimReady('bodyPart_bumper_front_d01', { scale: 0.88 });
  if (simBumper) {
    simBumper.position.set(1.75, 0.42, 0);
    bodyGroup.add(simBumper);
  }

  // Gắn 2 Cửa xe thực tế từ NVIDIA SimReady (`bodyPart_door_front_b01.glb`)
  [-0.88, 0.88].forEach((dz) => {
    const simDoor = instantiateSimReady('bodyPart_door_front_b01', {
      scale: 0.92,
      rotationY: Math.PI / 2
    });
    if (simDoor) {
      simDoor.position.set(0.05, 0.52, dz);
      bodyGroup.add(simDoor);
    }
  });

  car.add(bodyGroup);

  // Giai đoạn 3: Kính chắn gió, Đèn pha LED & 4 Bánh xe NVIDIA SimReady (`wheelAssembly_tire_c01.glb`)
  const detailsGroup = new THREE.Group();
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.08, metalness: 0.9 });
  const glassBand = new THREE.Mesh(new RoundedBoxGeometry(2.1, 0.38, 1.57, 3, 0.12), glassMat);
  glassBand.position.set(-0.2, 1.2, 0);
  detailsGroup.add(glassBand);

  const headLight = new THREE.Mesh(
    new RoundedBoxGeometry(0.1, 0.12, 1.5, 2, 0.04),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  headLight.position.set(1.82, 0.82, 0);
  detailsGroup.add(headLight);

  const tailLight = new THREE.Mesh(
    new RoundedBoxGeometry(0.1, 0.12, 1.5, 2, 0.04),
    new THREE.MeshBasicMaterial({ color: 0xef4444 })
  );
  tailLight.position.set(-1.82, 0.85, 0);
  detailsGroup.add(tailLight);

  [
    [1.18, 0, 0.88],
    [1.18, 0, -0.88],
    [-1.18, 0, 0.88],
    [-1.18, 0, -0.88]
  ].forEach(([wx, wy, wz]) => {
    const simWheel = instantiateSimReady('wheelAssembly_tire_c01', {
      targetHeight: 0.76,
      rotationY: wz > 0 ? Math.PI / 2 : -Math.PI / 2
    });
    if (simWheel) {
      simWheel.position.set(wx, wy, wz);
      detailsGroup.add(simWheel);
    }
  });

  car.add(detailsGroup);

  // Cho phép đổi màu sơn trực tiếp lên cả các bộ phận SimReady trên thân xe
  car.userData.updateStage = (stage) => {
    car.userData.stage = stage;
    bodyGroup.visible = stage >= 1;
    const targetHex = stage >= 2 ? colorHex : '#cbd5e1';
    bodyPaintMat.color.set(targetHex);
    bodyGroup.traverse((child) => {
      if (child.isMesh && child !== lowerHull && child !== upperCabin && child.material) {
        if (!child.userData.clonedMat) {
          child.material = child.material.clone();
          child.userData.clonedMat = true;
        }
        child.material.color.set(targetHex);
      }
    });
    detailsGroup.visible = stage >= 3;
  };

  return car;
}

/**
 * Cánh tay Robot lắp ráp công nghiệp sử dụng tài sản 3D NVIDIA SimReady GLB
 * (`robotic_system_arm_b01.glb` và `robotic_system_a01.glb`)
 */
export function buildAssemblyRobot({ id, name, x, z, side = 1 }) {
  const root = new THREE.Group();
  root.position.set(x, 0, z);

  const isCellBot = id.endsWith('2') || id.endsWith('4');
  const assetKey = isCellBot ? 'robotic_system_a01' : 'robotic_system_arm_b01';

  root.userData = {
    Selectable: true,
    type: 'robot',
    id,
    name,
    simreadyAsset: `${assetKey}.glb`,
    status: 'Operational',
    cycles: Math.floor(1400 + Math.random() * 500)
  };

  const turret = new THREE.Group();
  root.add(turret);

  const upperPivot = new THREE.Group();
  turret.add(upperPivot);

  const simRobot = instantiateSimReady(assetKey, {
    targetHeight: isCellBot ? 2.65 : 2.35,
    rotationY: side > 0 ? 0 : Math.PI
  });

  if (simRobot) {
    upperPivot.add(simRobot);
  } else {
    const armMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.28, metalness: 0.2 });
    const lower = new THREE.Mesh(new RoundedBoxGeometry(0.38, 1.85, 0.38, 3, 0.08), armMat);
    lower.position.y = 0.9;
    upperPivot.add(lower);
  }

  root.userData.joints = { turret, upperPivot, side, phase: Math.random() * Math.PI * 2 };
  return root;
}

/**
 * Hệ thống Băng Chuyền Lắp Ráp Công Nghiệp ghép từ các mô-đun NVIDIA SimReady (`conveyor_belt_a05.glb`)
 */
export function buildSimReadyConveyorLine() {
  const lineGroup = new THREE.Group();

  // Ghép dọc các cụm băng chuyền SimReady dọc theo trục X từ -16 đến +16 tại Z = -4.5
  for (let cx = -15; cx <= 15; cx += 3.0) {
    const seg = instantiateSimReady('conveyor_belt_a05', {
      scale: 1.45,
      rotationY: Math.PI / 2
    });
    if (seg) {
      seg.scale.y = 0.22; // Hạ thấp độ cao mặt băng chuyền để xe ô tô lăn bánh mượt trên mặt sàn
      seg.position.set(cx, 0, -4.5);
      lineGroup.add(seg);
    }
  }

  // Mặt ray dẫn hướng trung tâm
  const beltBase = new THREE.Mesh(
    new THREE.BoxGeometry(37, 0.24, 2.85),
    new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4, metalness: 0.45 })
  );
  beltBase.position.set(0, 0.12, -4.5);
  beltBase.receiveShadow = true;
  lineGroup.add(beltBase);

  return lineGroup;
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
 * Kệ Kho Cao Tầng (High-Bay Pallet Rack) sử dụng tài sản 3D NVIDIA SimReady GLB
 * (`rack_h3m_s02.glb`, `storage_tire_rack_c01.glb`, `pallet_assembly_a02.glb`, `pallet_assembly_b01.glb`)
 */
export function buildExteriorStorageRack(x, z, id) {
  const rack = new THREE.Group();
  rack.position.set(x, 0, z);
  rack.userData = {
    Selectable: true,
    type: 'rack',
    id,
    name: `Kệ Kho SimReady ${id}`,
    simreadyAsset: 'rack_h3m_s02.glb + storage_tire_rack_c01.glb',
    status: '88% Full',
    pallets: '24 Kiện Phụ Tùng & Lốp'
  };

  // Ghép 2 dãy kệ công nghiệp NVIDIA SimReady (`rack_h3m_s02.glb`)
  [-2.2, 2.2].forEach((rx) => {
    const simRack = instantiateSimReady('rack_h3m_s02', { scale: 1.5 });
    if (simRack) {
      simRack.position.set(rx, 0, 0);
      rack.add(simRack);
    }

    // Xếp các kiện Pallet SimReady lên các tầng kệ
    [0.05, 2.05].forEach((ry, levelIdx) => {
      const p = instantiateSimReady(levelIdx === 0 ? 'pallet_assembly_a02' : 'pallet_assembly_b01', { scale: 1.25 });
      if (p) {
        p.position.set(rx, ry, 0);
        rack.add(p);
      }
    });
  });

  // Đặt thêm Giá Để Lốp Xe Ô Tô NVIDIA SimReady (`storage_tire_rack_c01.glb`) bên cạnh
  const tireRack = instantiateSimReady('storage_tire_rack_c01', { scale: 2.1, rotationY: Math.PI / 2 });
  if (tireRack) {
    tireRack.position.set(5.4, 0, 0.2);
    rack.add(tireRack);
  }

  return rack;
}

/**
 * Tạo các thiết bị phụ trợ nhà xưởng từ bộ NVIDIA SimReady
 * (`palletJack_lowProfile_a01.glb`, `barrier_gate_safetyDock_a02.glb`, `drum_plastic_blue_a01.glb`)
 */
export function buildSimReadyFactoryProps() {
  const propsGroup = new THREE.Group();

  // 1. Cổng rào an toàn màu vàng tại các cửa xuất hàng (`barrier_gate_safetyDock_a02.glb`)
  [-11.5, -2.5, 6.5].forEach((gx) => {
    const gate = instantiateSimReady('barrier_gate_safetyDock_a02', { scale: 0.95 });
    if (gate) {
      gate.position.set(gx, 0, 6.35);
      propsGroup.add(gate);
    }
  });

  // 2. Xe nâng tay thủy lực (`palletJack_lowProfile_a01.glb`) gần khu vực tập kết Pallet
  [
    [-9.5, 8.2, 0.4],
    [8.2, 8.5, -0.6]
  ].forEach(([px, pz, rot]) => {
    const jack = instantiateSimReady('palletJack_lowProfile_a01', { scale: 1.35, rotationY: rot });
    if (jack) {
      jack.position.set(px, 0, pz);
      propsGroup.add(jack);
    }
  });

  // 3. Thùng phuy nhựa xanh công nghiệp (`drum_plastic_blue_a01.glb`) bên hông nhà máy
  [
    [-22.5, -1.2],
    [-23.3, -1.2],
    [-22.9, -2.0]
  ].forEach(([dx, dz]) => {
    const drum = instantiateSimReady('drum_plastic_blue_a01', { scale: 2.2 });
    if (drum) {
      drum.position.set(dx, 0, dz);
      propsGroup.add(drum);
    }
  });

  return propsGroup;
}

