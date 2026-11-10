import * as THREE from 'three';

/**
 * Generates procedural canvas textures for the factory floor, hazard markings, and rack labels
 */
export function createFloorTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Polished dark concrete base
  ctx.fillStyle = '#141c2b';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle tile grid
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, 508, 508);

  ctx.strokeStyle = 'rgba(148, 163, 184, 0.06)';
  ctx.lineWidth = 2;
  for (let i = 128; i < 512; i += 128) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 512);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.stroke();
  }

  // Corner crosshairs
  ctx.fillStyle = 'rgba(56, 189, 248, 0.14)';
  ctx.fillRect(0, 0, 12, 3);
  ctx.fillRect(0, 0, 3, 12);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(24, 18);
  tex.anisotropy = 4;
  return tex;
}

export function createHazardStripeTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#eab308';
  ctx.fillRect(0, 0, 256, 256);

  ctx.fillStyle = '#111827';
  for (let i = -256; i < 512; i += 64) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 32, 0);
    ctx.lineTo(i + 32 + 256, 256);
    ctx.lineTo(i + 256, 256);
    ctx.closePath();
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/**
 * Builds an articulated 6-axis industrial robotic arm (KUKA/ABB style)
 */
export function buildRobotArm({ id, stationId, name, color = 0xf97316, side = 1 }) {
  const root = new THREE.Group();
  root.userData = {
    Selectable: true,
    type: 'robot',
    id,
    stationId,
    name,
    status: 'ok',
    cycles: Math.floor(1200 + Math.random() * 800),
    temp: +(42 + Math.random() * 9).toFixed(1),
    powerKw: +(14 + Math.random() * 6).toFixed(1)
  };

  const darkMetal = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.7,
    roughness: 0.35
  });

  const orangePaint = new THREE.MeshStandardMaterial({
    color,
    metalness: 0.45,
    roughness: 0.25
  });

  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    metalness: 0.85,
    roughness: 0.2
  });

  // Pedestal base
  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.15, 0.6, 16), darkMetal);
  pedestal.position.y = 0.3;
  pedestal.castShadow = true;
  pedestal.receiveShadow = true;
  root.add(pedestal);

  // Rotating turret (J1)
  const turret = new THREE.Group();
  turret.position.y = 0.6;
  root.add(turret);

  const turretMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.85, 0.7, 16), orangePaint);
  turretMesh.position.y = 0.35;
  turretMesh.castShadow = true;
  turret.add(turretMesh);

  // Lower arm pivot (J2)
  const lowerArmPivot = new THREE.Group();
  lowerArmPivot.position.y = 0.75;
  turret.add(lowerArmPivot);

  const joint2 = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.05, 12), darkMetal);
  joint2.rotation.x = Math.PI / 2;
  lowerArmPivot.add(joint2);

  const lowerArm = new THREE.Mesh(new THREE.BoxGeometry(0.42, 2.3, 0.48), orangePaint);
  lowerArm.position.y = 1.1;
  lowerArm.castShadow = true;
  lowerArmPivot.add(lowerArm);

  // Upper arm pivot (J3)
  const upperArmPivot = new THREE.Group();
  upperArmPivot.position.y = 2.15;
  lowerArmPivot.add(upperArmPivot);

  const joint3 = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.85, 12), darkMetal);
  joint3.rotation.x = Math.PI / 2;
  upperArmPivot.add(joint3);

  const upperArm = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.34, 0.34), orangePaint);
  upperArm.position.x = 0.85 * side;
  upperArm.castShadow = true;
  upperArmPivot.add(upperArm);

  // Wrist & End-Effector (Welding / Paint / Gripper head)
  const wrist = new THREE.Group();
  wrist.position.x = 1.8 * side;
  upperArmPivot.add(wrist);

  const wristCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 0.55, 10), chromeMat);
  wristCyl.rotation.z = (Math.PI / 2) * side;
  wrist.add(wristCyl);

  // Glowing tip (laser/welder/nozzle)
  const tipMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), tipMat);
  tip.position.y = -0.25;
  wrist.add(tip);

  root.userData.joints = {
    turret,
    lowerArmPivot,
    upperArmPivot,
    wrist,
    tip,
    side,
    phase: Math.random() * Math.PI * 2
  };

  return root;
}

/**
 * Builds a multi-stage 3D Car mesh that visually evolves as it progresses along the line:
 * Stage 0: Stamped Bare Metal Chassis
 * Stage 1: Welded Body-in-White Rollcage
 * Stage 2: Painted Body Shell
 * Stage 3: Powertrain, Battery Pack & Wheels Mounted
 * Stage 4: Glass Windows, Headlights & Taillights Installed
 */
export function buildCarAssembly({ id, model = 'CyberSUV', colorHex = '#f97316', colorName = 'Cam Năng Lượng' }) {
  const car = new THREE.Group();
  car.userData = {
    Selectable: true,
    type: 'car',
    id,
    model,
    colorHex,
    colorName,
    stage: 0,
    progress: 0, // 0 -> 100%
    batterySoc: 98,
    vin: `AF-${2026}-${Math.floor(1000 + Math.random() * 9000)}`
  };

  const isSUV = model === 'CyberSUV';
  const isHyper = model === 'HyperGT';

  // Stage 0: Bare Chassis Platform + Battery Skateboard
  const chassisGroup = new THREE.Group();
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    metalness: 0.8,
    roughness: 0.35
  });
  const basePlate = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.22, 1.75), frameMat);
  basePlate.position.y = 0.42;
  basePlate.castShadow = true;
  chassisGroup.add(basePlate);

  const batteryPack = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 0.18, 1.4),
    new THREE.MeshStandardMaterial({ color: 0x0ea5e9, metalness: 0.5, roughness: 0.3 })
  );
  batteryPack.position.y = 0.32;
  chassisGroup.add(batteryPack);
  car.add(chassisGroup);

  // Stage 1: Body-in-White Structural Frame (Unpainted bare metal shell + pillars)
  const biwGroup = new THREE.Group();
  const bareSteelMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    metalness: 0.78,
    roughness: 0.28
  });

  const bodyH = isSUV ? 0.62 : isHyper ? 0.44 : 0.52;
  const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(3.9, bodyH, 1.82), bareSteelMat);
  lowerBody.position.y = 0.52 + bodyH / 2;
  lowerBody.castShadow = true;
  biwGroup.add(lowerBody);

  const cabinL = isSUV ? 2.35 : isHyper ? 1.75 : 2.0;
  const cabinH = isSUV ? 0.58 : isHyper ? 0.42 : 0.48;
  const cabinMesh = new THREE.Mesh(new THREE.BoxGeometry(cabinL, cabinH, 1.56), bareSteelMat);
  cabinMesh.position.set(isSUV ? -0.15 : -0.1, 0.52 + bodyH + cabinH / 2 - 0.04, 0);
  cabinMesh.castShadow = true;
  biwGroup.add(cabinMesh);
  biwGroup.visible = false;
  car.add(biwGroup);

  // Stage 3: Wheels & Suspension
  const wheelsGroup = new THREE.Group();
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.85 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.15 });
  const wheelPositions = [
    [1.22, 0.42, 0.92],
    [1.22, 0.42, -0.92],
    [-1.22, 0.42, 0.92],
    [-1.22, 0.42, -0.92]
  ];
  const wheelMeshes = [];
  wheelPositions.forEach(([wx, wy, wz]) => {
    const wGroup = new THREE.Group();
    wGroup.position.set(wx, wy, wz);
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.28, 18), tireMat);
    tire.rotation.x = Math.PI / 2;
    tire.castShadow = true;
    wGroup.add(tire);

    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.3, 12), rimMat);
    rim.rotation.x = Math.PI / 2;
    wGroup.add(rim);

    wheelsGroup.add(wGroup);
    wheelMeshes.push(wGroup);
  });
  wheelsGroup.visible = false;
  car.add(wheelsGroup);

  // Stage 4: Glass Windows, LED Headlights & Taillights
  const trimGroup = new THREE.Group();
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    metalness: 0.9,
    roughness: 0.1,
    transparent: true,
    opacity: 0.85
  });
  const glassWrap = new THREE.Mesh(
    new THREE.BoxGeometry(cabinL + 0.04, cabinH * 0.72, 1.59),
    glassMat
  );
  glassWrap.position.copy(cabinMesh.position);
  trimGroup.add(glassWrap);

  // Front LED Headlight bar
  const headLightMat = new THREE.MeshBasicMaterial({ color: 0xe0f2fe });
  const headLight = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 1.65), headLightMat);
  headLight.position.set(1.96, 0.78, 0);
  trimGroup.add(headLight);

  // Rear LED Taillight bar
  const tailLightMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
  const tailLight = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 1.65), tailLightMat);
  tailLight.position.set(-1.96, 0.82, 0);
  trimGroup.add(tailLight);

  trimGroup.visible = false;
  car.add(trimGroup);

  // Function to update visual assembly stage based on station progress
  car.userData.updateStage = (newStage) => {
    car.userData.stage = newStage;
    biwGroup.visible = newStage >= 1;

    if (newStage >= 2) {
      // Apply glossy metallic automotive paint
      bareSteelMat.color.set(colorHex);
      bareSteelMat.metalness = 0.65;
      bareSteelMat.roughness = 0.16;
    } else {
      bareSteelMat.color.setHex(0x94a3b8);
      bareSteelMat.metalness = 0.78;
      bareSteelMat.roughness = 0.28;
    }

    wheelsGroup.visible = newStage >= 3;
    trimGroup.visible = newStage >= 4;
  };

  car.userData.wheelMeshes = wheelMeshes;
  return car;
}

/**
 * Builds an Automated Guided Vehicle (AGV) logistics robot carrying parts crates
 */
export function buildAGV({ id, name, routeName, color = 0x0ea5e9, waypoints }) {
  const agv = new THREE.Group();
  agv.userData = {
    Selectable: true,
    type: 'agv',
    id,
    name,
    routeName,
    status: 'ok',
    battery: Math.floor(72 + Math.random() * 26),
    speedMps: +(2.1 + Math.random() * 0.5).toFixed(1),
    payload: 'Pin & Linh kiện Điện tử',
    waypoints,
    wpIndex: 0,
    progress: Math.random()
  };

  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.6,
    roughness: 0.35
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.35
  });

  const base = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.38, 1.35), bodyMat);
  base.position.y = 0.24;
  base.castShadow = true;
  agv.add(base);

  const bumper = new THREE.Mesh(new THREE.BoxGeometry(2.18, 0.1, 1.42), accentMat);
  bumper.position.y = 0.18;
  agv.add(bumper);

  // Cargo Crate on top
  const crateMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    metalness: 0.4,
    roughness: 0.55
  });
  const crate = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.75, 1.05), crateMat);
  crate.position.y = 0.8;
  crate.castShadow = true;
  agv.add(crate);

  // LiDAR Beacon
  const beacon = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.12, 0.25, 12),
    new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
  );
  beacon.position.set(0.75, 0.55, 0);
  agv.add(beacon);

  agv.userData.crate = crate;
  agv.userData.beacon = beacon;

  return agv;
}

/**
 * Builds a high-bay warehouse rack filled with color-coded component pallets
 */
export function buildWarehouseRack(x, z, labelId) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.userData = {
    Selectable: true,
    type: 'rack',
    id: labelId,
    name: `Kệ Kho Thông Minh ${labelId}`,
    status: 'ok',
    capacity: `${Math.floor(75 + Math.random() * 22)}%`,
    skuCount: Math.floor(38 + Math.random() * 20),
    category: 'Pin Lithium, Mâm đúc & Cảm biến'
  };

  const uprightMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, metalness: 0.6, roughness: 0.4 });
  const beamMat = new THREE.MeshStandardMaterial({ color: 0xf97316, metalness: 0.5, roughness: 0.4 });

  const width = 7.5;
  const depth = 1.8;
  const height = 6.2;

  // 6 Vertical Posts
  for (let ix = -1; ix <= 1; ix++) {
    for (let iz = -0.5; iz <= 0.5; iz += 1) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, height, 0.18), uprightMat);
      post.position.set(ix * (width / 2), height / 2, iz * depth);
      post.castShadow = true;
      group.add(post);
    }
  }

  const crateColors = [0x0ea5e9, 0x10b981, 0xf59e0b, 0x64748b];

  // 3 Shelf Levels
  [1.6, 3.4, 5.1].forEach((yLevel, lvlIdx) => {
    const beamFront = new THREE.Mesh(new THREE.BoxGeometry(width, 0.14, 0.12), beamMat);
    beamFront.position.set(0, yLevel, depth / 2);
    group.add(beamFront);

    const beamBack = new THREE.Mesh(new THREE.BoxGeometry(width, 0.14, 0.12), beamMat);
    beamBack.position.set(0, yLevel, -depth / 2);
    group.add(beamBack);

    // Pallets & Boxes on shelf
    for (let bx = -2.6; bx <= 2.6; bx += 1.7) {
      if (Math.random() > 0.15) {
        const boxH = 0.85 + Math.random() * 0.35;
        const cColor = crateColors[(lvlIdx + Math.abs(Math.round(bx))) % crateColors.length];
        const box = new THREE.Mesh(
          new THREE.BoxGeometry(1.25, boxH, 1.35),
          new THREE.MeshStandardMaterial({ color: cColor, roughness: 0.45, metalness: 0.25 })
        );
        box.position.set(bx, yLevel + 0.08 + boxH / 2, 0);
        box.castShadow = true;
        group.add(box);
      }
    }
  });

  return group;
}

/**
 * Builds an articulated Semi-Truck at the shipping dock
 */
export function buildCargoTruck({ id, name, dockNumber, zPos, accentColor = 0x0ea5e9 }) {
  const truck = new THREE.Group();
  truck.position.set(41, 0, zPos);
  truck.userData = {
    Selectable: true,
    type: 'truck',
    id,
    name,
    dockNumber,
    status: 'ok',
    destination: dockNumber === 1 ? 'Cảng Hải Phòng (Xuất khẩu)' : 'Showroom Trung Tâm TP.HCM',
    loadedCars: dockNumber === 1 ? '4 / 6 xe' : '5 / 6 xe',
    state: 'DOCKED', // DOCKED, DEPARTING, RETURNING
    timer: 0,
    baseX: 41
  };

  // Trailer
  const trailerMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.3, roughness: 0.4 });
  const trailer = new THREE.Mesh(new THREE.BoxGeometry(8.8, 3.1, 2.5), trailerMat);
  trailer.position.set(0, 2.15, 0);
  trailer.castShadow = true;
  truck.add(trailer);

  // Accent stripe on trailer
  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(8.84, 0.35, 2.54),
    new THREE.MeshStandardMaterial({ color: accentColor })
  );
  stripe.position.set(0, 2.2, 0);
  truck.add(stripe);

  // Tractor Cab
  const cabMat = new THREE.MeshStandardMaterial({ color: accentColor, metalness: 0.5, roughness: 0.3 });
  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.6, 2.4), cabMat);
  cab.position.set(6.0, 1.9, 0);
  cab.castShadow = true;
  truck.add(cab);

  const windshield = new THREE.Mesh(
    new THREE.BoxGeometry(0.15, 0.9, 2.1),
    new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1, metalness: 0.9 })
  );
  windshield.position.set(7.3, 2.35, 0);
  truck.add(windshield);

  // Wheels
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.85 });
  [-3.2, -1.8, 4.8, 6.4].forEach((wx) => {
    [-1.15, 1.15].forEach((wz) => {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.35, 16), tireMat);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(wx, 0.55, wz);
      truck.add(wheel);
    });
  });

  return truck;
}
