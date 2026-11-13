import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/**
 * Thư viện các Mô Hình Three.js Twin (Tái tạo trung thực từ NVIDIA SimReady)
 * Giúp giảm 90% - 98% số đa giác & 0 KB tải mạng, tối ưu cho quy mô nhiều nhà xưởng
 */

// Vật liệu dùng chung (Shared Materials) để giảm tối đa GPU state switches
const matDarkChassis = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.45, metalness: 0.65 });
const matRubberBlack = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.85, metalness: 0.05 });
const matSteel = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.32, metalness: 0.82 });
const matChrome = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.16, metalness: 0.92 });
const matGlossWhite = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2, metalness: 0.08 });
const matRoughWhite = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.48, metalness: 0.25 });
const matAluminum = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.28, metalness: 0.85 });
const matYaleOrange = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.3, metalness: 0.18 });
const matYaleBlue = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.3, metalness: 0.18 });
const matConveyorBlue = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.35, metalness: 0.55 });
const matConveyorBelt = new THREE.MeshStandardMaterial({ color: 0x1e3a5f, roughness: 0.78, metalness: 0.08 });
const matRackBlue = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.32, metalness: 0.55 });
const matRackOrange = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.3, metalness: 0.4 });
const matRedAccent = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.3, metalness: 0.25 });
const matEmissiveBlue = new THREE.MeshStandardMaterial({
  color: 0x2563eb,
  emissive: 0x3b82f6,
  emissiveIntensity: 1.5,
  roughness: 0.2
});
const matGlass = new THREE.MeshStandardMaterial({
  color: 0xbae6fd,
  roughness: 0.1,
  metalness: 0.1,
  transparent: true,
  opacity: 0.35
});

/**
 * 1. Xe Nâng Điện Yale Three.js Twin (~2,900 tris thay vì 122,895 tris GLB)
 * Giữ nguyên trục tiến +Z, cabin, vô lăng (sm_rudder_a01_obj_00) và càng nâng (sm_fork_a01_obj_00)
 */
export function buildForkliftTwin({ color = 'orange', targetHeight = 1.96 } = {}) {
  const root = new THREE.Group();
  root.name = `ThreeJSTwin_Forklift_${color}`;
  const bodyPaint = color === 'blue' ? matYaleBlue : matYaleOrange;

  // Khối thân chính (sm_body_a01_obj_00)
  const bodyGroup = new THREE.Group();
  bodyGroup.name = 'sm_body_a01_obj_00';

  // Đế gầm & đối trọng sau bo tròn đặc trưng của Yale
  const chassis = new THREE.Mesh(new RoundedBoxGeometry(0.84, 0.26, 1.38, 2, 0.05), matDarkChassis);
  chassis.position.set(0, 0.26, 0.05);

  const counterweight = new THREE.Mesh(new RoundedBoxGeometry(0.82, 0.62, 0.62, 3, 0.12), bodyPaint);
  counterweight.position.set(0, 0.62, -0.34);

  const sideSkirtL = new THREE.Mesh(new RoundedBoxGeometry(0.08, 0.42, 0.72, 2, 0.03), bodyPaint);
  sideSkirtL.position.set(-0.38, 0.48, 0.18);
  const sideSkirtR = sideSkirtL.clone();
  sideSkirtR.position.x = 0.38;

  // Ghế ngồi & táp-lô
  const seatBase = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.10, 0.40, 2, 0.03), matRubberBlack);
  seatBase.position.set(0, 0.76, -0.05);
  const seatBack = new THREE.Mesh(new RoundedBoxGeometry(0.40, 0.42, 0.09, 2, 0.03), matRubberBlack);
  seatBack.position.set(0, 0.98, -0.22);
  seatBack.rotation.x = -0.15;

  // Khung lồng bảo vệ Cabin (ROPS) + Kính chắn gió
  const pillarGeo = new THREE.CylinderGeometry(0.028, 0.028, 1.15, 8);
  const pillarPositions = [
    [-0.36, 1.32, 0.42, 0.08],
    [0.36, 1.32, 0.42, 0.08],
    [-0.36, 1.34, -0.45, -0.06],
    [0.36, 1.34, -0.45, -0.06]
  ];
  pillarPositions.forEach(([px, py, pz, tilt]) => {
    const p = new THREE.Mesh(pillarGeo, matDarkChassis);
    p.position.set(px, py, pz);
    p.rotation.x = tilt;
    bodyGroup.add(p);
  });

  const roofFrame = new THREE.Mesh(new RoundedBoxGeometry(0.78, 0.05, 0.96, 2, 0.02), matDarkChassis);
  roofFrame.position.set(0, 1.90, -0.02);

  // Các thanh nan bảo vệ nóc cabin
  for (let i = -3; i <= 3; i++) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(0.70, 0.02, 0.04), matDarkChassis);
    slat.position.set(0, 1.91, i * 0.12 - 0.02);
    bodyGroup.add(slat);
  }

  const windshield = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.72, 0.015), matGlass);
  windshield.position.set(0, 1.44, 0.43);
  windshield.rotation.x = 0.08;

  // Trụ nâng đứng 2 ray phía trước (+Z)
  const mastRailL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.72, 0.11), matDarkChassis);
  mastRailL.position.set(-0.26, 0.96, 0.68);
  const mastRailR = mastRailL.clone();
  mastRailR.position.x = 0.26;
  const mastCrossTop = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.07, 0.09), matDarkChassis);
  mastCrossTop.position.set(0, 1.80, 0.68);
  const mastPiston = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.038, 1.45, 10), matChrome);
  mastPiston.position.set(0, 0.85, 0.66);

  bodyGroup.add(
    chassis, counterweight, sideSkirtL, sideSkirtR,
    seatBase, seatBack, roofFrame, windshield,
    mastRailL, mastRailR, mastCrossTop, mastPiston
  );

  // Vô lăng lái (sm_ruddebase -> sm_rudder_a01_obj_00)
  const rudderBase = new THREE.Group();
  rudderBase.name = 'sm_ruddebase_a01_obj_00';
  rudderBase.position.set(0, 0.85, 0.34);
  const steerCol = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.42, 10), matDarkChassis);
  steerCol.rotation.x = -0.35;
  rudderBase.add(steerCol);

  const rudder = new THREE.Group();
  rudder.name = 'sm_rudder_a01_obj_00';
  rudder.position.set(0, 0.18, -0.07);
  const wheelRim = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.018, 8, 18), matRubberBlack);
  wheelRim.rotation.x = Math.PI / 2 - 0.35;
  rudder.add(wheelRim);
  rudderBase.add(rudder);
  bodyGroup.add(rudderBase);

  // 4 Bánh xe (sm_wheel1..4_a01_obj_00)
  const wheelConfigs = [
    { name: 'sm_wheel1_a01_obj_00', pos: [-0.39, 0.20, 0.44], r: 0.20 },
    { name: 'sm_wheel2_a01_obj_00', pos: [0.39, 0.20, 0.44], r: 0.20 },
    { name: 'sm_wheel3_a01_obj_00', pos: [-0.36, 0.16, -0.45], r: 0.16 },
    { name: 'sm_wheel4_a01_obj_00', pos: [0.36, 0.16, -0.45], r: 0.16 }
  ];
  wheelConfigs.forEach((wc) => {
    const wg = new THREE.Group();
    wg.name = wc.name;
    wg.position.set(...wc.pos);
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(wc.r, wc.r, 0.14, 16), matRubberBlack);
    tire.rotation.z = Math.PI / 2;
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(wc.r * 0.55, wc.r * 0.55, 0.148, 12), matSteel);
    hub.rotation.z = Math.PI / 2;
    wg.add(tire, hub);
    bodyGroup.add(wg);
  });

  // Càng nâng thủy lực (sm_fork_a01_obj_00)
  const forkGroup = new THREE.Group();
  forkGroup.name = 'sm_fork_a01_obj_00';
  forkGroup.position.set(0, 0.08, 0.74);

  const carriage = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.48, 0.05), matDarkChassis);
  carriage.position.set(0, 0.24, 0);
  forkGroup.add(carriage);

  [-0.18, 0.18].forEach((fx) => {
    const forkVert = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.44, 0.03), matSteel);
    forkVert.position.set(fx, 0.22, 0.03);
    const forkBlade = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.035, 0.86), matSteel);
    forkBlade.position.set(fx, 0.018, 0.46);
    forkGroup.add(forkVert, forkBlade);
  });
  bodyGroup.add(forkGroup);
  root.add(bodyGroup);

  root.traverse((n) => {
    n.userData.restPosition = n.position.clone();
    n.userData.restRotation = n.rotation.clone();
  });

  const scale = targetHeight / 1.96;
  root.scale.setScalar(scale);
  return root;
}

/**
 * 2. Trạm Robot Đa Trục 4 Tay Three.js Twin (~3,800 tris thay vì 166,124 tris GLB)
 * Giữ nguyên 4 nhánh trượt tuyến tính + 4 cánh tay khớp khuỷu
 */
export function buildMultiArmStationTwin({ targetHeight = 2.4 } = {}) {
  const root = new THREE.Group();
  root.name = 'ThreeJSTwin_MultiArmStation';

  const base1 = new THREE.Group();
  base1.name = 'base_01_obj_00';
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.72, 0.18, 16), matDarkChassis);
  plinth.position.y = 0.09;
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.54, 1.05, 16), matGlossWhite);
  col.position.y = 0.70;
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.12, 16), matSteel);
  band.position.y = 1.02;
  const topHub = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.44, 0.28, 16), matDarkChassis);
  topHub.position.y = 1.36;
  const ledRing = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.015, 8, 24), matEmissiveBlue);
  ledRing.rotation.x = Math.PI / 2;
  ledRing.position.y = 1.24;

  base1.add(plinth, col, band, topHub, ledRing);

  // 4 Nhánh tay đối xứng 90 độ
  for (let i = 0; i < 4; i++) {
    const branch = new THREE.Group();
    branch.rotation.y = (i * Math.PI) / 2;
    branch.position.y = 1.44;

    const slider = new THREE.Group();
    slider.name = `slider_0${i + 1}_obj_00`;
    const rail = new THREE.Mesh(new RoundedBoxGeometry(0.75, 0.10, 0.16, 2, 0.02), matSteel);
    rail.position.x = 0.55;
    slider.add(rail);

    const elbowBig = new THREE.Group();
    elbowBig.name = `elbowBig_0${i + 1}_obj_00`;
    elbowBig.position.set(0.86, 0.05, 0);
    const arm1 = new THREE.Mesh(new RoundedBoxGeometry(0.12, 0.55, 0.12, 2, 0.03), matGlossWhite);
    arm1.position.y = 0.27;
    const redCap = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.14, 12), matRedAccent);
    redCap.rotation.x = Math.PI / 2;
    elbowBig.add(arm1, redCap);

    const elbowSmall = new THREE.Group();
    elbowSmall.name = `elbowSmall_0${i + 1}_obj_00`;
    elbowSmall.position.set(0, 0.54, 0);
    const arm2 = new THREE.Mesh(new RoundedBoxGeometry(0.45, 0.09, 0.09, 2, 0.02), matGlossWhite);
    arm2.position.x = 0.22;
    const gripper = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.18, 10), matChrome);
    gripper.position.set(0.44, -0.09, 0);
    elbowSmall.add(arm2, gripper);

    elbowBig.add(elbowSmall);
    slider.add(elbowBig);
    branch.add(slider);
    base1.add(branch);
  }

  root.add(base1);
  const scale = targetHeight / 2.25;
  root.scale.setScalar(scale);
  return root;
}

/**
 * 3. Băng Chuyền Công Nghiệp Three.js Twin (~1,100 tris thay vì 47,602 tris GLB)
 */
export function buildConveyorTwin({ targetLength = 2.4 } = {}) {
  const root = new THREE.Group();
  root.name = 'ThreeJSTwin_Conveyor';

  // Mặt băng tải cao su xanh đậm
  const belt = new THREE.Mesh(new RoundedBoxGeometry(2.38, 0.06, 0.88, 2, 0.02), matConveyorBelt);
  belt.position.y = 0.82;

  // 2 Thanh ray khung thép sơn xanh công nghiệp
  const railF = new THREE.Mesh(new RoundedBoxGeometry(2.42, 0.14, 0.06, 2, 0.015), matConveyorBlue);
  railF.position.set(0, 0.80, 0.47);
  const railB = railF.clone();
  railB.position.z = -0.47;

  // Thanh chặn đầu cam an toàn
  const capL = new THREE.Mesh(new RoundedBoxGeometry(0.05, 0.12, 0.96, 2, 0.02), matRackOrange);
  capL.position.set(-1.20, 0.80, 0);
  const capR = capL.clone();
  capR.position.x = 1.20;

  // 4 Chân trụ thép + đế cao su chống trượt
  const legGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.76, 8);
  const footGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.03, 10);
  [
    [-0.95, 0.44],
    [0.95, 0.44],
    [-0.95, -0.44],
    [0.95, -0.44]
  ].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(legGeo, matSteel);
    leg.position.set(lx, 0.39, lz);
    const foot = new THREE.Mesh(footGeo, matRubberBlack);
    foot.position.set(lx, 0.015, lz);
    root.add(leg, foot);
  });

  // Thanh giằng ngang + Motor kéo bên hông
  const crossBar1 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.88), matSteel);
  crossBar1.position.set(-0.95, 0.25, 0);
  const crossBar2 = crossBar1.clone();
  crossBar2.position.x = 0.95;

  const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.26, 12), matDarkChassis);
  motor.rotation.x = Math.PI / 2;
  motor.position.set(0.65, 0.72, 0.58);

  root.add(belt, railF, railB, capL, capR, crossBar1, crossBar2, motor);
  const scale = targetLength / 2.42;
  root.scale.setScalar(scale);
  return root;
}

/**
 * 4. Kệ Hàng Công Nghiệp H3m Three.js Twin (~1,400 tris thay vì 85,987 tris GLB)
 */
export function buildRackTwin({ targetHeight = 3.0 } = {}) {
  const root = new THREE.Group();
  root.name = 'ThreeJSTwin_RackH3m';

  const postGeo = new THREE.BoxGeometry(0.08, 3.0, 0.08);
  const footGeo = new THREE.BoxGeometry(0.14, 0.02, 0.14);
  [
    [-1.25, -0.52],
    [1.25, -0.52],
    [-1.25, 0.52],
    [1.25, 0.52]
  ].forEach(([px, pz]) => {
    const post = new THREE.Mesh(postGeo, matRackBlue);
    post.position.set(px, 1.5, pz);
    const foot = new THREE.Mesh(footGeo, matDarkChassis);
    foot.position.set(px, 0.01, pz);
    root.add(post, foot);
  });

  // 3 tầng thanh dầm cam & mặt sàn thép mạ kẽm
  [0.25, 1.45, 2.65].forEach((ly) => {
    const beamF = new THREE.Mesh(new THREE.BoxGeometry(2.50, 0.10, 0.05), matRackOrange);
    beamF.position.set(0, ly, 0.52);
    const beamB = beamF.clone();
    beamB.position.z = -0.52;

    const shelfDeck = new THREE.Mesh(new THREE.BoxGeometry(2.42, 0.03, 1.00), matSteel);
    shelfDeck.position.set(0, ly + 0.04, 0);
    root.add(beamF, beamB, shelfDeck);
  });

  const scale = targetHeight / 3.0;
  root.scale.setScalar(scale);
  return root;
}

/**
 * 5. Cụm Động Cơ Điện EV Three.js Twin (~1,800 tris thay vì 65,374 tris GLB)
 */
export function buildElectricEngineTwin({ targetHeight = 0.85 } = {}) {
  const root = new THREE.Group();
  root.name = 'ThreeJSTwin_ElectricEngineEV';

  // Thân motor nhôm trụ có các vòng tản nhiệt
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.56, 20), matAluminum);
  core.rotation.z = Math.PI / 2;
  core.position.y = 0.30;
  root.add(core);

  for (let i = -3; i <= 3; i++) {
    const fin = new THREE.Mesh(new THREE.CylinderGeometry(0.265, 0.265, 0.018, 20), matAluminum);
    fin.rotation.z = Math.PI / 2;
    fin.position.set(i * 0.065, 0.30, 0);
    root.add(fin);
  }

  // Nắp đầu thép & trục truyền động
  const endBellL = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.08, 18), matSteel);
  endBellL.rotation.z = Math.PI / 2;
  endBellL.position.set(-0.32, 0.30, 0);
  const endBellR = endBellL.clone();
  endBellR.position.x = 0.32;

  const driveShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.18, 14), matChrome);
  driveShaft.rotation.z = Math.PI / 2;
  driveShaft.position.set(0.42, 0.30, 0);

  // Hộp Inverter trắng phía trên + cáp cao áp cam
  const inverter = new THREE.Mesh(new RoundedBoxGeometry(0.38, 0.16, 0.32, 2, 0.03), matRoughWhite);
  inverter.position.set(0, 0.58, 0);

  const hvConnector = new THREE.Mesh(new RoundedBoxGeometry(0.10, 0.08, 0.08, 2, 0.02), matRackOrange);
  hvConnector.position.set(-0.12, 0.58, 0.19);

  // Chân đế gắn khung xe
  const mount = new THREE.Mesh(new RoundedBoxGeometry(0.52, 0.06, 0.42, 2, 0.02), matDarkChassis);
  mount.position.y = 0.03;

  root.add(endBellL, endBellR, driveShaft, inverter, hvConnector, mount);
  const scale = targetHeight / 0.68;
  root.scale.setScalar(scale);
  return root;
}

/**
 * 6. Cụm Bánh Lốp Xe Sport 20" Three.js Twin (~1,600 tris thay vì 22,672 tris GLB)
 */
export function buildWheelTwin({ targetHeight = 0.72 } = {}) {
  const root = new THREE.Group();
  root.name = 'ThreeJSTwin_WheelSport20';

  const tireGroup = new THREE.Group();
  tireGroup.position.y = 0.36;

  // Lốp cao su bo tròn
  const tire = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.095, 14, 28), matRubberBlack);
  tireGroup.add(tire);

  // Mâm hợp kim 5 chấu kép
  const rimRing = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.02, 10, 24), matAluminum);
  tireGroup.add(rimRing);

  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.14, 16), matChrome);
  hub.rotation.x = Math.PI / 2;
  tireGroup.add(hub);

  for (let i = 0; i < 5; i++) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.36, 0.035), matAluminum);
    spoke.rotation.z = (i * Math.PI) / 5;
    tireGroup.add(spoke);
  }

  // Đĩa phanh bên trong
  const rotor = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.025, 20), matSteel);
  rotor.rotation.x = Math.PI / 2;
  rotor.position.z = -0.04;
  tireGroup.add(rotor);

  root.add(tireGroup);
  const scale = targetHeight / 0.72;
  root.scale.setScalar(scale);
  return root;
}
