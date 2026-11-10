import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  createFloorTexture,
  createHazardStripeTexture,
  buildRobotArm,
  buildCarAssembly,
  buildAGV,
  buildWarehouseRack,
  buildCargoTruck
} from './factoryBuilder.js';

// ==========================================
// 1. DỮ LIỆU ĐỊNH NGHĨA DÂY CHUYỀN SẢN XUẤT
// ==========================================
const STATIONS = [
  {
    id: 'ST-01',
    index: 1,
    name: 'Trạm Dập Thủy Lực 2000T',
    code: 'STAMP-01',
    stage: 0,
    x: -28,
    z: 0,
    status: 'ok',
    cycleTime: '12.4s',
    powerKw: 380,
    temp: 54.2,
    description: 'Dập tấm hợp kim nhôm-thép cường lực thành khung sàn Skateboard chịu lực.'
  },
  {
    id: 'ST-02',
    index: 2,
    name: 'Trạm Hàn Robot Laser BIW',
    code: 'WELD-02',
    stage: 1,
    x: -14,
    z: 0,
    status: 'ok',
    cycleTime: '14.0s',
    powerKw: 310,
    temp: 68.5,
    description: '4 cánh tay Robot KUKA 6 trục hàn điểm laser định hình khung vỏ Body-in-White.'
  },
  {
    id: 'ST-03',
    index: 3,
    name: 'Buồng Sơn Tĩnh Điện Nano',
    code: 'PAINT-03',
    stage: 2,
    x: 0,
    z: 0,
    status: 'ok',
    cycleTime: '15.2s',
    powerKw: 290,
    temp: 62.0,
    description: 'Phun sơn tự động đa lớp chống ăn mòn và sấy khô bằng tia hồng ngoại.'
  },
  {
    id: 'ST-04',
    index: 4,
    name: 'Lắp Ráp Động Cơ & Pin EV',
    code: 'POWR-04',
    stage: 3,
    x: 14,
    z: 0,
    status: 'ok',
    cycleTime: '13.8s',
    powerKw: 245,
    temp: 48.0,
    description: 'Tích hợp cụm động cơ điện kép, hệ thống treo khí nén và 4 bánh xe hợp kim.'
  },
  {
    id: 'ST-05',
    index: 5,
    name: 'Nội Thất, Kính & Điện Tử AI',
    code: 'TRIM-05',
    stage: 4,
    x: 24,
    z: 0,
    status: 'ok',
    cycleTime: '13.1s',
    powerKw: 165,
    temp: 41.5,
    description: 'Lắp kính chắn gió panorama, cụm đèn Matrix LED và nạp firmware tự lái.'
  },
  {
    id: 'ST-06',
    index: 6,
    name: 'Cổng Quét Kiểm Định 3D LiDAR',
    code: 'QAQC-06',
    stage: 4,
    x: 33,
    z: 0,
    status: 'ok',
    cycleTime: '9.5s',
    powerKw: 90,
    temp: 36.8,
    description: 'Quét quang học 360° kiểm tra khe hở lắp ghép, căn chỉnh thước lái và xuất xưởng.'
  }
];

const CAR_MODELS = ['CyberSUV', 'AeroSedan', 'HyperGT'];
const CAR_COLORS = [
  { hex: '#f97316', name: 'Cam Năng Lượng' },
  { hex: '#0ea5e9', name: 'Xanh Cyber' },
  { hex: '#10b981', name: 'Xanh Ngọc Lục' },
  { hex: '#ef4444', name: 'Đỏ Đua' },
  { hex: '#eab308', name: 'Vàng Solar' },
  { hex: '#e2e8f0', name: 'Bạc Titanium' }
];

// ==========================================
// 2. TRẠNG THÁI MÔ PHỎNG (STATE)
// ==========================================
const state = {
  simSpeed: 1,
  paused: false,
  nightShift: false,
  producedCount: 142,
  revenueMillions: 6.39,
  inventory: {
    steel: 84,
    battery: 72,
    chips: 91
  },
  selectedObject: null,
  cameraMode: 'overview',
  nextCarId: 143,
  selectedSpawnColor: { hex: '#f97316', name: 'Cam Năng Lượng' }
};

// ==========================================
// 3. KHỞI TẠO THREE.JS SCENE, CAMERA, RENDERER
// ==========================================
const container = document.getElementById('canvas-container');
const labelsContainer = document.getElementById('labels-container');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x090d16);
scene.fog = new THREE.FogExp2(0x090d16, 0.0065);

const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.5, 260);
camera.position.set(-22, 34, 46);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.maxPolarAngle = Math.PI / 2 - 0.03;
controls.minDistance = 8;
controls.maxDistance = 120;
controls.target.set(3, 1.5, 0);

// ==========================================
// 4. HỆ THỐNG ÁNH SÁNG NHÀ MÁY (LIGHTING)
// ==========================================
const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x1e293b, 0.85);
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight(0xfffbeb, 1.65);
dirLight.position.set(28, 48, 32);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
dirLight.shadow.camera.near = 5;
dirLight.shadow.camera.far = 130;
const d = 52;
dirLight.shadow.camera.left = -d;
dirLight.shadow.camera.right = d;
dirLight.shadow.camera.top = d;
dirLight.shadow.camera.bottom = -d;
dirLight.shadow.bias = -0.0005;
scene.add(dirLight);

// Đèn trần nhà xưởng chiếu điểm dọc dây chuyền
const stationSpotLights = [];
STATIONS.forEach((st) => {
  const pLight = new THREE.PointLight(0x38bdf8, 1.5, 22, 1.5);
  pLight.position.set(st.x, 9.5, st.z);
  scene.add(pLight);
  stationSpotLights.push(pLight);
});

// ==========================================
// 5. XÂY DỰNG MÔI TRƯỜNG NHÀ XƯỞNG 3D
// ==========================================
const selectableObjects = [];
const stationMeshes = new Map();
const robots = [];
const carsOnLine = [];
const agvFleet = [];
const cargoTrucks = [];
const floatingLabels = [];

const floorTex = createFloorTexture();
const hazardTex = createHazardStripeTexture();

function buildFactoryEnvironment() {
  // Sàn nhà máy chính
  const floorGeo = new THREE.PlaneGeometry(116, 76);
  const floorMat = new THREE.MeshStandardMaterial({
    map: floorTex,
    roughness: 0.55,
    metalness: 0.2
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // Đường viền an toàn xung quanh dây chuyền chính
  const hazardMat = new THREE.MeshBasicMaterial({ map: hazardTex });
  hazardTex.repeat.set(35, 1);
  const lineBorderFront = new THREE.Mesh(new THREE.PlaneGeometry(74, 0.35), hazardMat);
  lineBorderFront.rotation.x = -Math.PI / 2;
  lineBorderFront.position.set(2, 0.02, 4.3);
  scene.add(lineBorderFront);

  const lineBorderBack = new THREE.Mesh(new THREE.PlaneGeometry(74, 0.35), hazardMat);
  lineBorderBack.rotation.x = -Math.PI / 2;
  lineBorderBack.position.set(2, 0.02, -4.3);
  scene.add(lineBorderBack);

  // Băng chuyền chính (Main Assembly Conveyor Track)
  const conveyorBase = new THREE.Mesh(
    new THREE.BoxGeometry(72, 0.32, 3.2),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7, roughness: 0.35 })
  );
  conveyorBase.position.set(2, 0.16, 0);
  conveyorBase.receiveShadow = true;
  scene.add(conveyorBase);

  // Các thanh ray dẫn hướng phát sáng dọc chuyền
  const railMat = new THREE.MeshBasicMaterial({ color: 0x0ea5e9 });
  [-1.35, 1.35].forEach((rz) => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(71.5, 0.05, 0.08), railMat);
    rail.position.set(2, 0.34, rz);
    scene.add(rail);
  });

  // Làn đường từ trường cho xe AGV (AGV Magnetic Guide Paths)
  const agvPathMat = new THREE.MeshBasicMaterial({
    color: 0x0284c7,
    transparent: true,
    opacity: 0.35
  });
  const agvLaneSouth = new THREE.Mesh(new THREE.PlaneGeometry(66, 0.9), agvPathMat);
  agvLaneSouth.rotation.x = -Math.PI / 2;
  agvLaneSouth.position.set(0, 0.015, 8.5);
  scene.add(agvLaneSouth);

  const agvLaneNorth = new THREE.Mesh(new THREE.PlaneGeometry(66, 0.9), agvPathMat);
  agvLaneNorth.rotation.x = -Math.PI / 2;
  agvLaneNorth.position.set(0, 0.015, -8.5);
  scene.add(agvLaneNorth);

  // Hệ khung cột thép nhà xưởng & dầm cầu trục (Gantry Pillars & Trusses)
  const pillarMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.65, roughness: 0.4 });
  for (let px = -38; px <= 38; px += 19) {
    [-22, 22].forEach((pz) => {
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.65, 13, 0.65), pillarMat);
      col.position.set(px, 6.5, pz);
      col.castShadow = true;
      scene.add(col);
    });
    const roofBeam = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.55, 44.5), pillarMat);
    roofBeam.position.set(px, 12.8, 0);
    scene.add(roofBeam);
  }
}

// ==========================================
// 6. XÂY DỰNG 6 TRẠM SẢN XUẤT & ROBOT
// ==========================================
let stampingRamMesh = null;
let paintMistParticles = null;
let qcLaserBeam = null;

function buildProductionStations() {
  STATIONS.forEach((st) => {
    const stGroup = new THREE.Group();
    stGroup.position.set(st.x, 0, st.z);
    stGroup.userData = {
      Selectable: true,
      type: 'station',
      ...st
    };

    // Nền trạm
    const pad = new THREE.Mesh(
      new THREE.BoxGeometry(9.5, 0.12, 7.6),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6 })
    );
    pad.position.y = 0.06;
    pad.receiveShadow = true;
    stGroup.add(pad);

    // Đèn báo trạng thái cột (Andon Tower Light)
    const beaconPole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 4.2, 8),
      new THREE.MeshStandardMaterial({ color: 0x64748b })
    );
    beaconPole.position.set(-4.2, 2.1, -3.3);
    stGroup.add(beaconPole);

    const beaconLamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0x10b981 })
    );
    beaconLamp.position.set(-4.2, 4.3, -3.3);
    stGroup.add(beaconLamp);
    stGroup.userData.beaconLamp = beaconLamp;

    // Thiết bị đặc thù từng trạm
    if (st.index === 1) {
      // Trạm 1: Máy dập thủy lực khổng lồ 2000T
      const archMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7, roughness: 0.3 });
      const leftCol = new THREE.Mesh(new THREE.BoxGeometry(2.6, 6.8, 1.1), archMat);
      leftCol.position.set(0, 3.4, 2.35);
      leftCol.castShadow = true;
      stGroup.add(leftCol);

      const rightCol = new THREE.Mesh(new THREE.BoxGeometry(2.6, 6.8, 1.1), archMat);
      rightCol.position.set(0, 3.4, -2.35);
      rightCol.castShadow = true;
      stGroup.add(rightCol);

      const topCrown = new THREE.Mesh(
        new THREE.BoxGeometry(3.2, 1.3, 6.2),
        new THREE.MeshStandardMaterial({ color: 0xf97316, metalness: 0.4, roughness: 0.3 })
      );
      topCrown.position.set(0, 6.5, 0);
      topCrown.castShadow = true;
      stGroup.add(topCrown);

      stampingRamMesh = new THREE.Mesh(
        new THREE.BoxGeometry(2.4, 1.4, 2.2),
        new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.2 })
      );
      stampingRamMesh.position.set(0, 4.2, 0);
      stGroup.add(stampingRamMesh);
    } else if (st.index === 2 || st.index === 4 || st.index === 5) {
      // Trạm 2, 4, 5: Các cặp cánh tay Robot 6 trục hai bên dây chuyền
      const armColor = st.index === 2 ? 0xf97316 : st.index === 4 ? 0x0ea5e9 : 0x10b981;
      const positions = [
        [-1.8, 2.8, 1],
        [1.8, 2.8, 1],
        [-1.8, -2.8, -1],
        [1.8, -2.8, -1]
      ];
      positions.forEach(([rx, rz, side], idx) => {
        const bot = buildRobotArm({
          id: `${st.code}-R${idx + 1}`,
          stationId: st.id,
          name: `Robot ${st.code} #${idx + 1}`,
          color: armColor,
          side
        });
        bot.position.set(st.x + rx, 0, st.z + rz);
        bot.rotation.y = rz > 0 ? Math.PI / 2 : -Math.PI / 2;
        scene.add(bot);
        robots.push(bot);
        selectableObjects.push(bot);
      });
    } else if (st.index === 3) {
      // Trạm 3: Buồng Sơn Tĩnh Điện trong suốt (Glass Paint Booth)
      const boothFrame = new THREE.Mesh(
        new THREE.BoxGeometry(8.2, 4.6, 5.4),
        new THREE.MeshStandardMaterial({
          color: 0x38bdf8,
          transparent: true,
          opacity: 0.16,
          roughness: 0.1,
          metalness: 0.8
        })
      );
      boothFrame.position.y = 2.3;
      stGroup.add(boothFrame);

      // 2 Robot phun sơn bên trong
      [-1.5, 1.5].forEach((rz, idx) => {
        const bot = buildRobotArm({
          id: `PAINT-R${idx + 1}`,
          stationId: st.id,
          name: `Robot Phun Sơn Nano #${idx + 1}`,
          color: 0x0ea5e9,
          side: idx === 0 ? 1 : -1
        });
        bot.position.set(st.x, 0, st.z + rz * 1.9);
        bot.rotation.y = rz > 0 ? Math.PI / 2 : -Math.PI / 2;
        scene.add(bot);
        robots.push(bot);
        selectableObjects.push(bot);
      });
    } else if (st.index === 6) {
      // Trạm 6: Cổng vòm Quét Kiểm Định 3D LiDAR
      const archGeo = new THREE.BoxGeometry(2.2, 4.5, 5.0);
      const archMat = new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        metalness: 0.8,
        roughness: 0.2
      });
      const portal = new THREE.Mesh(archGeo, archMat);
      portal.position.y = 2.25;
      stGroup.add(portal);

      // Khoét rỗng giữa bằng khung sáng
      qcLaserBeam = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 3.6, 3.8),
        new THREE.MeshBasicMaterial({
          color: 0x10b981,
          transparent: true,
          opacity: 0.32
        })
      );
      qcLaserBeam.position.set(0, 2.0, 0);
      stGroup.add(qcLaserBeam);
    }

    scene.add(stGroup);
    stationMeshes.set(st.id, stGroup);
    selectableObjects.push(stGroup);
    createFloatingLabel(stGroup, `${st.index}. ${st.code}`, new THREE.Vector3(0, 6.2, 0));
  });
}

// ==========================================
// 7. HỆ THỐNG HẠT TIA LỬA HÀN (WELDING SPARKS)
// ==========================================
const SPARK_COUNT = 120;
const sparkGeo = new THREE.BufferGeometry();
const sparkPositions = new Float32Array(SPARK_COUNT * 3);
const sparkVelocities = [];

for (let i = 0; i < SPARK_COUNT; i++) {
  sparkPositions[i * 3] = -14;
  sparkPositions[i * 3 + 1] = 1.6;
  sparkPositions[i * 3 + 2] = 0;
  sparkVelocities.push({
    vx: (Math.random() - 0.5) * 6,
    vy: Math.random() * 5 + 1,
    vz: (Math.random() - 0.5) * 6,
    life: Math.random()
  });
}
sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPositions, 3));
const sparkMat = new THREE.PointsMaterial({
  color: 0xfbbf24,
  size: 0.22,
  transparent: true,
  opacity: 0.9
});
const sparkSystem = new THREE.Points(sparkGeo, sparkMat);
scene.add(sparkSystem);

function updateSparks(dt) {
  const weldStation = STATIONS[1];
  const isWeldActive = weldStation.status !== 'fault' && !state.paused;
  sparkSystem.visible = isWeldActive;
  if (!isWeldActive) return;

  const posAttr = sparkGeo.attributes.position;
  for (let i = 0; i < SPARK_COUNT; i++) {
    const v = sparkVelocities[i];
    v.life += dt * 1.8 * state.simSpeed;
    if (v.life >= 1) {
      v.life = 0;
      posAttr.setXYZ(
        i,
        weldStation.x + (Math.random() - 0.5) * 3.5,
        1.5 + Math.random() * 0.6,
        (Math.random() - 0.5) * 1.4
      );
    } else {
      const x = posAttr.getX(i) + v.vx * dt * state.simSpeed;
      const y = Math.max(0.1, posAttr.getY(i) + (v.vy - 9.8 * v.life) * dt * state.simSpeed);
      const z = posAttr.getZ(i) + v.vz * dt * state.simSpeed;
      posAttr.setXYZ(i, x, y, z);
    }
  }
  posAttr.needsUpdate = true;
}

// ==========================================
// 8. KHO LINH KIỆN, ĐỘI XE AGV & BÃI XE TẢI
// ==========================================
function buildLogisticsAndWarehouse() {
  // 8 Kệ kho thông minh (4 kệ phía Bắc, 4 kệ phía Nam)
  const rackCoords = [
    [-24, -15, 'RACK-N1'],
    [-8, -15, 'RACK-N2'],
    [8, -15, 'RACK-N3'],
    [24, -15, 'RACK-N4'],
    [-24, 15, 'RACK-S1'],
    [-8, 15, 'RACK-S2'],
    [8, 15, 'RACK-S3'],
    [24, 15, 'RACK-S4']
  ];
  rackCoords.forEach(([rx, rz, id]) => {
    const rack = buildWarehouseRack(rx, rz, id);
    scene.add(rack);
    selectableObjects.push(rack);
  });

  // 4 Xe tự hành AGV chạy vòng tròn cấp phát vật tư
  const loopSouth = [
    new THREE.Vector3(-28, 0, 8.5),
    new THREE.Vector3(26, 0, 8.5),
    new THREE.Vector3(26, 0, 11.5),
    new THREE.Vector3(-28, 0, 11.5)
  ];
  const loopNorth = [
    new THREE.Vector3(26, 0, -8.5),
    new THREE.Vector3(-28, 0, -8.5),
    new THREE.Vector3(-28, 0, -11.5),
    new THREE.Vector3(26, 0, -11.5)
  ];

  const agvConfigs = [
    { id: 'AGV-01', name: 'AGV Carrier Alpha', routeName: 'Tuyến Nam (Pin & Mâm)', waypoints: loopSouth, wpIndex: 0, color: 0x0ea5e9 },
    { id: 'AGV-02', name: 'AGV Carrier Beta', routeName: 'Tuyến Nam (Khung Gầm)', waypoints: loopSouth, wpIndex: 2, color: 0x10b981 },
    { id: 'AGV-03', name: 'AGV Carrier Gamma', routeName: 'Tuyến Bắc (Thép Cuộn)', waypoints: loopNorth, wpIndex: 0, color: 0xf59e0b },
    { id: 'AGV-04', name: 'AGV Carrier Delta', routeName: 'Tuyến Bắc (Vi Mạch AI)', waypoints: loopNorth, wpIndex: 2, color: 0x38bdf8 }
  ];

  agvConfigs.forEach((cfg) => {
    const agv = buildAGV(cfg);
    agv.userData.wpIndex = cfg.wpIndex;
    const startPt = cfg.waypoints[cfg.wpIndex];
    agv.position.copy(startPt);
    scene.add(agv);
    agvFleet.push(agv);
    selectableObjects.push(agv);
    createFloatingLabel(agv, cfg.id, new THREE.Vector3(0, 1.9, 0));
  });

  // 2 Xe tải vận chuyển thành phẩm ở Cổng Xuất Hàng (Đông)
  const truck1 = buildCargoTruck({
    id: 'TRUCK-01',
    name: 'Container Vận Tải #01',
    dockNumber: 1,
    zPos: -6.5,
    accentColor: 0xf97316
  });
  const truck2 = buildCargoTruck({
    id: 'TRUCK-02',
    name: 'Container Vận Tải #02',
    dockNumber: 2,
    zPos: 6.5,
    accentColor: 0x0ea5e9
  });
  scene.add(truck1, truck2);
  cargoTrucks.push(truck1, truck2);
  selectableObjects.push(truck1, truck2);
  createFloatingLabel(truck1, 'DOCK-01 // TRUCK', new THREE.Vector3(0, 4.2, 0));
  createFloatingLabel(truck2, 'DOCK-02 // TRUCK', new THREE.Vector3(0, 4.2, 0));
}

// ==========================================
// 9. QUẢN LÝ XE TRÊN CHUYỀN & NHÃN NỔI 3D
// ==========================================
function createFloatingLabel(targetObj, text, offset = new THREE.Vector3(0, 3, 0)) {
  const el = document.createElement('div');
  el.className = 'world-label';
  el.innerHTML = `<span class="status-dot"></span><span>${text}</span>`;
  el.addEventListener('click', (e) => {
    e.stopPropagation();
    selectObject(targetObj);
  });
  labelsContainer.appendChild(el);
  const labelRecord = { targetObj, el, offset };
  floatingLabels.push(labelRecord);
  targetObj.userData.labelEl = el;
  return labelRecord;
}

function removeFloatingLabel(targetObj) {
  const idx = floatingLabels.findIndex((item) => item.targetObj === targetObj);
  if (idx !== -1) {
    floatingLabels[idx].el.remove();
    floatingLabels.splice(idx, 1);
  }
}

function spawnCarOnLine({ model, colorHex, colorName, initialProgress = 0 }) {
  // Kiểm tra tránh đè lên xe vừa vào đầu chuyền
  const tooClose = carsOnLine.some((c) => Math.abs(c.userData.progress - initialProgress) < 11);
  if (tooClose && initialProgress === 0) {
    addLog('⚠️ Đầu băng chuyền đang bận, vui lòng đợi vài giây để đưa xe tiếp theo vào.');
    return null;
  }

  const carId = `CAR-${state.nextCarId++}`;
  const car = buildCarAssembly({
    id: carId,
    model: model || CAR_MODELS[Math.floor(Math.random() * CAR_MODELS.length)],
    colorHex: colorHex || CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)].hex,
    colorName: colorName || 'Tiêu chuẩn'
  });

  car.userData.progress = initialProgress;
  updateCarWorldPosition(car);
  scene.add(car);
  carsOnLine.push(car);
  selectableObjects.push(car);
  createFloatingLabel(car, `${carId} (${car.userData.model})`, new THREE.Vector3(0, 2.2, 0));

  // Tiêu hao nhẹ tồn kho khi tạo xe mới
  if (initialProgress === 0) {
    state.inventory.steel = Math.max(15, state.inventory.steel - 2);
    state.inventory.battery = Math.max(15, state.inventory.battery - 3);
    state.inventory.chips = Math.max(15, state.inventory.chips - 1);
    updateInventoryUI();
    addLog(`🚘 Đã đưa khung gầm <strong>${carId}</strong> (${car.userData.model}) vào Trạm Dập #1.`);
  }

  return car;
}

function updateCarWorldPosition(car) {
  // progress 0 -> 100 tương ứng x từ -33 đến +36
  const x = -33 + (car.userData.progress / 100) * 69;
  car.position.set(x, 0, 0);

  // Xác định stage lắp ráp dựa theo toạ độ X qua từng trạm
  let stage = 0;
  if (x >= -17) stage = 1; // Đã qua trạm Hàn BIW
  if (x >= -2) stage = 2;  // Đã qua buồng Sơn
  if (x >= 12) stage = 3;  // Đã lắp Động cơ & Bánh xe
  if (x >= 22) stage = 4;  // Đã lắp Kính & Đèn LED

  if (car.userData.stage !== stage) {
    car.userData.updateStage(stage);
  }
}

// Khởi tạo sẵn 6 xe rải đều trên dây chuyền lúc mở app
function seedInitialCars() {
  const initialProgresses = [6, 23, 41, 59, 76, 91];
  initialProgresses.forEach((prog, i) => {
    const colorObj = CAR_COLORS[i % CAR_COLORS.length];
    const model = CAR_MODELS[i % CAR_MODELS.length];
    spawnCarOnLine({
      model,
      colorHex: colorObj.hex,
      colorName: colorObj.name,
      initialProgress: prog
    });
  });
}

// ==========================================
// 10. VÒNG LẶP CẬP NHẬT MÔ PHỎNG (SIMULATION)
// ==========================================
function updateSimulation(dt, elapsed) {
  if (state.paused) return;
  const effDt = dt * state.simSpeed;

  // Kiểm tra xem có trạm nào đang dừng sự cố không
  const faultStation = STATIONS.find((s) => s.status === 'fault');
  const lineSpeedMultiplier = faultStation ? 0.15 : 1.0;

  // 1. Di chuyển các xe trên băng chuyền
  for (let i = carsOnLine.length - 1; i >= 0; i--) {
    const car = carsOnLine[i];
    car.userData.progress += effDt * 2.35 * lineSpeedMultiplier;
    updateCarWorldPosition(car);

    // Xoay bánh xe nếu đã lắp bánh (stage >= 3)
    if (car.userData.stage >= 3) {
      car.userData.wheelMeshes.forEach((w) => {
        w.rotation.z -= effDt * 3.2 * lineSpeedMultiplier;
      });
    }

    // Khi xe hoàn tất kiểm định ở cuối băng chuyền (progress >= 100)
    if (car.userData.progress >= 100) {
      state.producedCount += 1;
      state.revenueMillions = +(state.revenueMillions + 0.045).toFixed(2);
      addLog(`✅ Xe <strong>${car.userData.id}</strong> (${car.userData.model}) vượt qua kiểm định 3D LiDAR và xuất xưởng!`);

      if (state.selectedObject === car) {
        state.selectedObject = null;
      }
      removeFloatingLabel(car);
      scene.remove(car);
      const selIdx = selectableObjects.indexOf(car);
      if (selIdx !== -1) selectableObjects.splice(selIdx, 1);
      carsOnLine.splice(i, 1);

      // Tự động cấp phôi xe mới ở đầu chuyền để dây chuyền luôn sôi động
      const nextColor = CAR_COLORS[state.producedCount % CAR_COLORS.length];
      const nextModel = CAR_MODELS[state.producedCount % CAR_MODELS.length];
      spawnCarOnLine({
        model: nextModel,
        colorHex: nextColor.hex,
        colorName: nextColor.name,
        initialProgress: 0
      });
    }
  }

  // 2. Hoạt ảnh máy dập thủy lực Trạm 1 & tia quét Trạm 6
  if (stampingRamMesh && STATIONS[0].status !== 'fault') {
    stampingRamMesh.position.y = 3.2 + Math.abs(Math.sin(elapsed * 2.8 * state.simSpeed)) * 1.45;
  }
  if (qcLaserBeam) {
    qcLaserBeam.position.x = Math.sin(elapsed * 3.5 * state.simSpeed) * 0.85;
  }

  // 3. Hoạt ảnh các cánh tay Robot 6 trục
  robots.forEach((bot) => {
    const parentSt = STATIONS.find((s) => s.id === bot.userData.stationId);
    if (parentSt && parentSt.status === 'fault') return;

    const j = bot.userData.joints;
    const t = elapsed * 2.4 * state.simSpeed + j.phase;
    j.turret.rotation.y = Math.sin(t) * 0.55;
    j.lowerArmPivot.rotation.z = Math.cos(t * 1.2) * 0.32 * j.side;
    j.upperArmPivot.rotation.z = (-0.35 + Math.sin(t * 1.6) * 0.35) * j.side;
    j.wrist.rotation.y = Math.cos(t * 2.2) * 0.6;
  });

  // 4. Di chuyển đội xe tự hành AGV trên làn từ trường
  agvFleet.forEach((agv) => {
    const d = agv.userData;
    const wps = d.waypoints;
    const currWp = wps[d.wpIndex];
    const nextWp = wps[(d.wpIndex + 1) % wps.length];

    const segDist = currWp.distanceTo(nextWp);
    d.progress += (effDt * d.speedMps * 2.2) / segDist;

    if (d.progress >= 1) {
      d.progress = 0;
      d.wpIndex = (d.wpIndex + 1) % wps.length;
    }

    const p0 = wps[d.wpIndex];
    const p1 = wps[(d.wpIndex + 1) % wps.length];
    agv.position.lerpVectors(p0, p1, d.progress);

    const dir = new THREE.Vector3().subVectors(p1, p0).normalize();
    agv.rotation.y = Math.atan2(-dir.z, dir.x);
  });

  // 5. Hoạt ảnh xe tải Container xuất bến & quay lại
  cargoTrucks.forEach((truck) => {
    const td = truck.userData;
    if (td.state === 'DEPARTING') {
      truck.position.x += effDt * 9.5;
      if (truck.position.x >= 75) {
        td.state = 'RETURNING';
      }
    } else if (td.state === 'RETURNING') {
      truck.position.x -= effDt * 8.5;
      if (truck.position.x <= td.baseX) {
        truck.position.x = td.baseX;
        td.state = 'DOCKED';
        addLog(`🚛 <strong>${td.name}</strong> đã cập bến Dock #${td.dockNumber} sẵn sàng nhận lô xe mới.`);
      }
    }
  });

  // 6. Cập nhật hạt tia lửa hàn
  updateSparks(dt);
}

// ==========================================
// 11. TƯƠNG TÁC CLICK 3D (RAYCASTER) & CAMERA
// ==========================================
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let pointerDownPos = { x: 0, y: 0 };

renderer.domElement.addEventListener('pointerdown', (e) => {
  pointerDownPos = { x: e.clientX, y: e.clientY };
});

renderer.domElement.addEventListener('pointerup', (e) => {
  const moveDist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
  if (moveDist > 6) return; // Người dùng đang kéo xoay camera chứ không phải click

  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(selectableObjects, true);

  if (intersects.length > 0) {
    let obj = intersects[0].object;
    while (obj && !obj.userData?.Selectable) {
      obj = obj.parent;
    }
    if (obj) {
      selectObject(obj);
    }
  }
});

// Vòng sáng đánh dấu đối tượng đang được chọn dưới sàn
const selectionRing = new THREE.Mesh(
  new THREE.RingGeometry(2.2, 2.65, 32),
  new THREE.MeshBasicMaterial({ color: 0xf97316, side: THREE.DoubleSide })
);
selectionRing.rotation.x = -Math.PI / 2;
selectionRing.position.y = 0.08;
selectionRing.visible = false;
scene.add(selectionRing);

function selectObject(obj) {
  state.selectedObject = obj;
  renderStationList();
  renderAGVList();
  renderInspector();

  floatingLabels.forEach((item) => {
    item.el.classList.toggle('selected', item.targetObj === obj);
  });

  // Di chuyển tâm nhìn camera mượt mà tới đối tượng được chọn
  const worldPos = new THREE.Vector3();
  obj.getWorldPosition(worldPos);
  animateCameraTarget(worldPos);
}

let desiredCamTarget = null;
let desiredCamPos = null;

function animateCameraTarget(targetVec, camPosVec = null) {
  desiredCamTarget = targetVec.clone();
  if (camPosVec) {
    desiredCamPos = camPosVec.clone();
  } else {
    desiredCamPos = null;
  }
}

function setCameraPreset(preset) {
  state.cameraMode = preset;
  document.querySelectorAll('.cam-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.cam === preset);
  });

  if (preset === 'overview') {
    animateCameraTarget(new THREE.Vector3(2, 1.5, 0), new THREE.Vector3(-22, 34, 46));
  } else if (preset === 'stamping') {
    animateCameraTarget(new THREE.Vector3(-21, 2, 0), new THREE.Vector3(-34, 13, 18));
  } else if (preset === 'paint') {
    animateCameraTarget(new THREE.Vector3(7, 2, 0), new THREE.Vector3(2, 13, 19));
  } else if (preset === 'qc') {
    animateCameraTarget(new THREE.Vector3(34, 2, 0), new THREE.Vector3(24, 14, 22));
  } else if (preset === 'topdown') {
    animateCameraTarget(new THREE.Vector3(2, 0, 0), new THREE.Vector3(2, 68, 4));
  }
}

// ==========================================
// 12. CẬP NHẬT GIAO DIỆN HUD & INSPECTOR
// ==========================================
function renderStationList() {
  const listEl = document.getElementById('station-list');
  listEl.innerHTML = STATIONS.map((st) => {
    const selObj = state.selectedObject;
    const isSelected = selObj && selObj.userData?.id === st.id;
    const statusText = st.status === 'ok' ? 'HOẠT ĐỘNG' : st.status === 'warn' ? 'CẢNH BÁO' : 'TẠM DỪNG';
    return `
      <div class="station-item ${isSelected ? 'active' : ''}" data-stid="${st.id}">
        <div class="st-left">
          <span class="st-index">${st.index}</span>
          <div class="st-info">
            <span class="st-name">${st.name}</span>
            <span class="st-sub">${st.code} • Chu kỳ ${st.cycleTime}</span>
          </div>
        </div>
        <span class="st-status ${st.status}">${statusText}</span>
      </div>
    `;
  }).join('');

  listEl.querySelectorAll('.station-item').forEach((el) => {
    el.addEventListener('click', () => {
      const mesh = stationMeshes.get(el.dataset.stid);
      if (mesh) selectObject(mesh);
    });
  });
}

function renderAGVList() {
  const listEl = document.getElementById('agv-list');
  listEl.innerHTML = agvFleet.map((agv) => {
    const d = agv.userData;
    const isSel = state.selectedObject === agv;
    return `
      <div class="agv-card ${isSel ? 'active' : ''}" data-agvid="${d.id}">
        <div class="agv-top">
          <span>🤖 ${d.id}</span>
          <span class="accent-emerald">${d.battery}%</span>
        </div>
        <div class="agv-task">${d.routeName}</div>
      </div>
    `;
  }).join('');

  listEl.querySelectorAll('.agv-card').forEach((el) => {
    el.addEventListener('click', () => {
      const target = agvFleet.find((a) => a.userData.id === el.dataset.agvid);
      if (target) selectObject(target);
    });
  });
}

function renderInspector() {
  const contentEl = document.getElementById('inspector-content');
  const catEl = document.getElementById('insp-category');
  const obj = state.selectedObject;

  if (!obj) {
    catEl.textContent = 'TRẠNG THÁI CHỌN 3D';
    contentEl.innerHTML = `
      <div style="color: var(--text-muted); font-size: 12px; line-height: 1.5; padding: 8px 0;">
        💡 <strong>Mẹo điều khiển:</strong> Click trực tiếp vào bất kỳ <strong>Khung Xe Hơi</strong>, <strong>Cánh Tay Robot</strong>, <strong>Trạm Dây Chuyền</strong>, <strong>Xe Tự Hành AGV</strong> hoặc <strong>Kệ Kho</strong> nào trong không gian 3D để kiểm tra thông số thời gian thực và điều khiển.
      </div>
    `;
    return;
  }

  const d = obj.userData;
  if (d.type === 'station') {
    const st = STATIONS.find((s) => s.id === d.id) || d;
    catEl.textContent = 'TRẠM DÂY CHUYỀN SẢN XUẤT';
    const isFault = st.status === 'fault';
    contentEl.innerHTML = `
      <div class="insp-title-row">
        <span class="insp-title">${st.name}</span>
        <span class="insp-id">${st.code}</span>
      </div>
      <p style="font-size:11px; color:var(--text-muted); line-height:1.4;">${st.description}</p>
      <div class="insp-grid">
        <div class="insp-metric"><span class="m-label">Trạng thái</span><span class="m-val ${isFault ? 'accent-red' : 'accent-emerald'}">${isFault ? 'DỪNG BẢO TRÌ' : 'ĐANG CHẠY TỐT'}</span></div>
        <div class="insp-metric"><span class="m-label">Chu kỳ Takt</span><span class="m-val">${st.cycleTime}</span></div>
        <div class="insp-metric"><span class="m-label">Công suất điện</span><span class="m-val">${st.powerKw} kW</span></div>
        <div class="insp-metric"><span class="m-label">Nhiệt độ cụm máy</span><span class="m-val">${st.temp}°C</span></div>
      </div>
      <div class="insp-actions">
        <button id="btn-toggle-fault" class="insp-btn ${isFault ? '' : 'warn-btn'}">
          ${isFault ? '🔧 Khôi Phục Vận Hành Trạm' : '⚡ Giả Lập Dừng Bảo Trì'}
        </button>
      </div>
    `;
    document.getElementById('btn-toggle-fault')?.addEventListener('click', () => {
      st.status = st.status === 'fault' ? 'ok' : 'fault';
      const lamp = obj.userData.beaconLamp;
      if (lamp) {
        lamp.material.color.setHex(st.status === 'fault' ? 0xef4444 : 0x10b981);
      }
      const dot = obj.userData.labelEl?.querySelector('.status-dot');
      if (dot) {
        dot.classList.toggle('fault', st.status === 'fault');
      }
      addLog(
        st.status === 'fault'
          ? `🚨 <strong>${st.name}</strong> chuyển sang chế độ Dừng Bảo Trì. Tốc độ chuyền giảm.`
          : `✅ <strong>${st.name}</strong> đã hoàn tất bảo trì và hoạt động 100% công suất.`
      );
      renderStationList();
      renderInspector();
    });
  } else if (d.type === 'car') {
    catEl.textContent = 'PHƯƠNG TIỆN ĐANG LẮP RÁP';
    const stageNames = [
      '1/5: Khung Sàn Skateboard',
      '2/5: Hàn Khung Vỏ BIW',
      '3/5: Phun Sơn Nano Tĩnh Điện',
      '4/5: Lắp Động Cơ, Pin & Bánh Xe',
      '5/5: Lắp Kính, Đèn LED & Kiểm Định'
    ];
    contentEl.innerHTML = `
      <div class="insp-title-row">
        <span class="insp-title">${d.model}</span>
        <span class="insp-id">${d.id}</span>
      </div>
      <div class="insp-grid">
        <div class="insp-metric"><span class="m-label">Số khung VIN</span><span class="m-val">${d.vin}</span></div>
        <div class="insp-metric"><span class="m-label">Tiến độ dây chuyền</span><span class="m-val accent-cyan">${Math.min(100, Math.round(d.progress))}%</span></div>
        <div class="insp-metric"><span class="m-label">Màu sơn ngoại thất</span><span class="m-val" style="color:${d.colorHex}">${d.colorName}</span></div>
        <div class="insp-metric"><span class="m-label">Công đoạn hiện tại</span><span class="m-val">${stageNames[d.stage]}</span></div>
      </div>
      <div class="insp-actions">
        <button id="btn-cam-follow-this-car" class="insp-btn">🎥 Camera Đi Theo Xe Này</button>
      </div>
    `;
    document.getElementById('btn-cam-follow-this-car')?.addEventListener('click', () => {
      setCameraPreset('followCar');
    });
  } else if (d.type === 'robot') {
    catEl.textContent = 'CÁNH TAY ROBOT 6 TRỤC';
    contentEl.innerHTML = `
      <div class="insp-title-row">
        <span class="insp-title">${d.name}</span>
        <span class="insp-id">${d.id}</span>
      </div>
      <div class="insp-grid">
        <div class="insp-metric"><span class="m-label">Thuộc trạm</span><span class="m-val">${d.stationId}</span></div>
        <div class="insp-metric"><span class="m-label">Chu kỳ hoàn tất</span><span class="m-val accent-emerald">${d.cycles.toLocaleString()}</span></div>
        <div class="insp-metric"><span class="m-label">Nhiệt độ Servo</span><span class="m-val">${d.temp}°C</span></div>
        <div class="insp-metric"><span class="m-label">Công suất tức thời</span><span class="m-val">${d.powerKw} kW</span></div>
      </div>
    `;
  } else if (d.type === 'agv') {
    catEl.textContent = 'ROBOT VẬN CHUYỂN TỰ HÀNH AGV';
    contentEl.innerHTML = `
      <div class="insp-title-row">
        <span class="insp-title">${d.name}</span>
        <span class="insp-id">${d.id}</span>
      </div>
      <div class="insp-grid">
        <div class="insp-metric"><span class="m-label">Tuyến hoạt động</span><span class="m-val">${d.routeName}</span></div>
        <div class="insp-metric"><span class="m-label">Dung lượng Pin</span><span class="m-val accent-emerald">${d.battery}%</span></div>
        <div class="insp-metric"><span class="m-label">Vận tốc di chuyển</span><span class="m-val">${d.speedMps} m/s</span></div>
        <div class="insp-metric"><span class="m-label">Hàng hóa chuyên chở</span><span class="m-val">${d.payload}</span></div>
      </div>
      <div class="insp-actions">
        <button id="btn-cam-follow-this-agv" class="insp-btn">🎥 Camera Đi Theo AGV</button>
      </div>
    `;
    document.getElementById('btn-cam-follow-this-agv')?.addEventListener('click', () => {
      setCameraPreset('followAGV');
    });
  } else if (d.type === 'rack') {
    catEl.textContent = 'KỆ KHO LINH KIỆN THÔNG MINH';
    contentEl.innerHTML = `
      <div class="insp-title-row">
        <span class="insp-title">${d.name}</span>
        <span class="insp-id">${d.id}</span>
      </div>
      <div class="insp-grid">
        <div class="insp-metric"><span class="m-label">Độ lấp đầy kệ</span><span class="m-val accent-cyan">${d.capacity}</span></div>
        <div class="insp-metric"><span class="m-label">Số lượng Pallet SKU</span><span class="m-val">${d.skuCount} kiện</span></div>
        <div class="insp-metric" style="grid-column: span 2;"><span class="m-label">Nhóm linh kiện lưu trữ</span><span class="m-val">${d.category}</span></div>
      </div>
    `;
  } else if (d.type === 'truck') {
    catEl.textContent = 'ĐỘI XE CONTAINER XUẤT XƯỞNG';
    contentEl.innerHTML = `
      <div class="insp-title-row">
        <span class="insp-title">${d.name}</span>
        <span class="insp-id">DOCK #${d.dockNumber}</span>
      </div>
      <div class="insp-grid">
        <div class="insp-metric"><span class="m-label">Trạng thái bến</span><span class="m-val accent-emerald">${d.state}</span></div>
        <div class="insp-metric"><span class="m-label">Số lượng xe chuyên chở</span><span class="m-val">${d.loadedCars}</span></div>
        <div class="insp-metric" style="grid-column: span 2;"><span class="m-label">Điểm đến giao hàng</span><span class="m-val">${d.destination}</span></div>
      </div>
      <div class="insp-actions">
        <button id="btn-dispatch-selected-truck" class="insp-btn">🚛 Lệnh Xuất Bến Ngay</button>
      </div>
    `;
    document.getElementById('btn-dispatch-selected-truck')?.addEventListener('click', () => {
      if (d.state === 'DOCKED') {
        d.state = 'DEPARTING';
        addLog(`🚛 <strong>${d.name}</strong> bắt đầu rời cảng Dock #${d.dockNumber} đi ${d.destination}.`);
        renderInspector();
      }
    });
  }
}

function updateInventoryUI() {
  document.getElementById('inv-steel-txt').textContent = `${state.inventory.steel}%`;
  document.getElementById('inv-steel-bar').style.width = `${state.inventory.steel}%`;
  document.getElementById('inv-battery-txt').textContent = `${state.inventory.battery}%`;
  document.getElementById('inv-battery-bar').style.width = `${state.inventory.battery}%`;
  document.getElementById('inv-chips-txt').textContent = `${state.inventory.chips}%`;
  document.getElementById('inv-chips-bar').style.width = `${state.inventory.chips}%`;
}

function updateTopKPIs() {
  document.getElementById('kpi-produced').textContent = state.producedCount.toLocaleString();
  document.getElementById('kpi-wip').textContent = carsOnLine.length;

  const hasFault = STATIONS.some((s) => s.status === 'fault');
  const oeeEl = document.getElementById('kpi-oee');
  oeeEl.textContent = hasFault ? '74.2%' : '96.4%';
  oeeEl.className = `kpi-value ${hasFault ? 'accent-amber' : 'accent-emerald'}`;

  const totalPower = STATIONS.reduce((acc, s) => acc + (s.status === 'fault' ? 40 : s.powerKw), 0);
  document.getElementById('kpi-power').textContent = totalPower.toLocaleString();
  document.getElementById('kpi-revenue').textContent = `$${state.revenueMillions.toFixed(2)}M`;
}

function addLog(htmlMsg) {
  const logEl = document.getElementById('event-log');
  const now = new Date();
  const timeStr = now.toTimeString().slice(0, 8);
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.innerHTML = `<span class="log-time">[${timeStr}]</span><span class="log-msg">${htmlMsg}</span>`;
  logEl.prepend(entry);
  while (logEl.children.length > 25) {
    logEl.lastChild.remove();
  }
}

// Cập nhật vị trí nhãn nổi 2D bám theo toạ độ 3D
function updateFloatingLabels() {
  const halfW = window.innerWidth / 2;
  const halfH = window.innerHeight / 2;

  floatingLabels.forEach(({ targetObj, el, offset }) => {
    const pos = new THREE.Vector3();
    targetObj.getWorldPosition(pos);
    pos.add(offset);
    pos.project(camera);

    if (pos.z > 1) {
      el.style.display = 'none';
      return;
    }
    const x = pos.x * halfW + halfW;
    const y = -(pos.y * halfH) + halfH;
    el.style.display = 'flex';
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
  });
}

// ==========================================
// 13. GẮN SỰ KIỆN NÚT BẤM ĐIỀU KHIỂN UI
// ==========================================
function setupUIEvents() {
  // Tốc độ mô phỏng
  document.getElementById('btn-pause').addEventListener('click', (e) => {
    state.paused = !state.paused;
    e.currentTarget.textContent = state.paused ? '▶' : '⏸';
    e.currentTarget.classList.toggle('active', state.paused);
    addLog(state.paused ? '⏸ Đã tạm dừng dây chuyền mô phỏng.' : '▶️ Tiếp tục vận hành dây chuyền nhà máy.');
  });

  document.querySelectorAll('[data-speed]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.simSpeed = Number(btn.dataset.speed);
      state.paused = false;
      document.getElementById('btn-pause').textContent = '⏸';
      document.getElementById('btn-pause').classList.remove('active');
      document.querySelectorAll('[data-speed]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      addLog(`⚡ Đã chuyển tốc độ mô phỏng sang <strong>${state.simSpeed}x</strong>.`);
    });
  });

  // Chế độ Ca Ngày / Ca Đêm
  document.getElementById('btn-daynight').addEventListener('click', (e) => {
    state.nightShift = !state.nightShift;
    if (state.nightShift) {
      scene.background.setHex(0x04070d);
      scene.fog.color.setHex(0x04070d);
      dirLight.intensity = 0.45;
      hemiLight.intensity = 0.35;
      stationSpotLights.forEach((l) => (l.intensity = 2.6));
      e.currentTarget.textContent = '☀️ Ca Ngày';
      addLog('🌙 Chuyển sang <strong>Chế độ Ca Đêm</strong>: Bật hệ thống đèn LED cao áp nội xưởng.');
    } else {
      scene.background.setHex(0x090d16);
      scene.fog.color.setHex(0x090d16);
      dirLight.intensity = 1.65;
      hemiLight.intensity = 0.85;
      stationSpotLights.forEach((l) => (l.intensity = 1.5));
      e.currentTarget.textContent = '🌙 Ca Đêm';
      addLog('☀️ Chuyển sang <strong>Chế độ Ca Ngày</strong>: Ánh sáng tiêu chuẩn.');
    }
  });

  // Chọn màu sơn xe mới
  document.querySelectorAll('.color-swatch').forEach((swatch) => {
    swatch.addEventListener('click', () => {
      document.querySelectorAll('.color-swatch').forEach((s) => s.classList.remove('active'));
      swatch.classList.add('active');
      state.selectedSpawnColor = {
        hex: swatch.dataset.color,
        name: swatch.dataset.name
      };
    });
  });

  // Nút Đưa khung xe mới vào chuyền
  document.getElementById('btn-spawn-car').addEventListener('click', () => {
    const model = document.getElementById('select-model').value;
    const newCar = spawnCarOnLine({
      model,
      colorHex: state.selectedSpawnColor.hex,
      colorName: state.selectedSpawnColor.name,
      initialProgress: 0
    });
    if (newCar) {
      selectObject(newCar);
    }
  });

  // Tiếp liệu kho bằng AGV
  document.getElementById('btn-resupply').addEventListener('click', () => {
    state.inventory.steel = Math.min(100, state.inventory.steel + 14);
    state.inventory.battery = Math.min(100, state.inventory.battery + 18);
    state.inventory.chips = Math.min(100, state.inventory.chips + 12);
    updateInventoryUI();
    addLog('📦 Đội xe tự hành <strong>AGV</strong> đã nạp đầy vật tư Thép, Pin Lithium & Vi mạch AI vào kệ.');
  });

  // Điều xe tải xuất hàng
  document.getElementById('btn-dispatch-truck').addEventListener('click', () => {
    const dockedTruck = cargoTrucks.find((t) => t.userData.state === 'DOCKED');
    if (dockedTruck) {
      dockedTruck.userData.state = 'DEPARTING';
      addLog(`🚛 Lệnh điều phối: <strong>${dockedTruck.userData.name}</strong> xuất bến giao lô xe thành phẩm!`);
      selectObject(dockedTruck);
    } else {
      addLog('ℹ️ Cả 2 xe Container đang trên đường vận chuyển và sẽ sớm quay lại Dock.');
    }
  });

  // Đóng Inspector
  document.getElementById('btn-close-inspector').addEventListener('click', () => {
    state.selectedObject = null;
    selectionRing.visible = false;
    floatingLabels.forEach((l) => l.el.classList.remove('selected'));
    renderStationList();
    renderAGVList();
    renderInspector();
  });

  // Các nút chuyển góc nhìn Camera
  document.querySelectorAll('.cam-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      setCameraPreset(btn.dataset.cam);
    });
  });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

// ==========================================
// 14. KHỞI CHẠY ỨNG DỤNG & VÒNG LẶP RENDER
// ==========================================
buildFactoryEnvironment();
buildProductionStations();
buildLogisticsAndWarehouse();
seedInitialCars();
setupUIEvents();

renderStationList();
renderAGVList();
renderInspector();
updateInventoryUI();

addLog('🏭 Hệ thống <strong>AutoForge 3D Digital Twin</strong> đã khởi tạo thành công.');
addLog('🤖 10 cánh tay Robot KUKA & 4 xe tự hành AGV đang đồng bộ thời gian thực.');

const clock = new THREE.Clock();
let uiUpdateTimer = 0;

function animate() {
  requestAnimationFrame(animate);

  const dt = Math.min(clock.getDelta(), 0.1);
  const elapsed = clock.getElapsedTime();

  updateSimulation(dt, elapsed);

  // Cập nhật vòng sáng dưới đối tượng được chọn
  if (state.selectedObject) {
    const wp = new THREE.Vector3();
    state.selectedObject.getWorldPosition(wp);
    selectionRing.position.set(wp.x, 0.08, wp.z);
    selectionRing.rotation.z = elapsed * 1.5;
    selectionRing.visible = true;
  } else {
    selectionRing.visible = false;
  }

  // Chế độ Camera đi theo Xe hoặc AGV
  if (state.cameraMode === 'followCar' && carsOnLine.length > 0) {
    const targetCar =
      state.selectedObject?.userData?.type === 'car' ? state.selectedObject : carsOnLine[0];
    const cp = new THREE.Vector3();
    targetCar.getWorldPosition(cp);
    controls.target.lerp(new THREE.Vector3(cp.x + 2, 1.5, cp.z), 0.08);
    camera.position.lerp(new THREE.Vector3(cp.x - 9, 6.5, cp.z + 11), 0.05);
  } else if (state.cameraMode === 'followAGV' && agvFleet.length > 0) {
    const targetAgv =
      state.selectedObject?.userData?.type === 'agv' ? state.selectedObject : agvFleet[0];
    const ap = new THREE.Vector3();
    targetAgv.getWorldPosition(ap);
    controls.target.lerp(new THREE.Vector3(ap.x, 1.0, ap.z), 0.1);
    camera.position.lerp(new THREE.Vector3(ap.x - 7, 6.0, ap.z + 8), 0.06);
  } else if (desiredCamTarget) {
    controls.target.lerp(desiredCamTarget, 0.08);
    if (desiredCamPos) {
      camera.position.lerp(desiredCamPos, 0.06);
      if (camera.position.distanceTo(desiredCamPos) < 0.35) {
        desiredCamPos = null;
      }
    }
    if (controls.target.distanceTo(desiredCamTarget) < 0.15 && !desiredCamPos) {
      desiredCamTarget = null;
    }
  }

  controls.update();
  renderer.render(scene, camera);
  updateFloatingLabels();

  uiUpdateTimer += dt;
  if (uiUpdateTimer > 0.35) {
    uiUpdateTimer = 0;
    updateTopKPIs();
    if (state.selectedObject?.userData?.type === 'car') {
      renderInspector();
    }
  }
}

animate();
