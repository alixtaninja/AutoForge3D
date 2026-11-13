import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ModelInspectorModal } from './modelInspector.js';
import { BenchmarkLabModal } from './benchmarkLab.js';
import {
  buildFactoryBuilding,
  buildPalletStack,
  buildForklift,
  buildDetailedTruck,
  buildShippingContainer,
  buildSleekCar,
  buildAssemblyRobot,
  buildSimReadyConveyorLine,
  buildStylizedTree,
  buildExteriorStorageRack,
  buildSimReadyFactoryProps
} from './factoryBuilder.js';

// ==========================================
// 1. MÔ HÌNH DỮ LIỆU CHUẨN (UNDERLYING DATA MODEL)
// Sites, Docks, Trucks, Forklifts, Assembly Cars, Inventory, Shipments
// ==========================================
const DATA_STORE = {
  site: {
    id: 'PLT-01',
    name: 'Riverside Auto Plant',
    address: '1200 Forge Parkway, Newark NJ',
    status: 'Operational',
    stockOnHand: 1412,
    stockCapacity: 1800,
    outboundToday: 24,
    putAwaysToday: 18,
    oee: '96.8%'
  },
  docks: [
    { id: 'BAY-1', name: 'Bay 1', site: 'PLT-01', truckCode: 'TRK-2051 • AutoTrack', status: 'Loading', progress: '4/6', x: 3.0, z: 6.0 },
    { id: 'BAY-2', name: 'Bay 2', site: 'PLT-01', truckCode: 'TRK-2104 • Velocity', status: 'Loading', progress: '2/6', x: -6.0, z: 6.0 },
    { id: 'BAY-3', name: 'Bay 3', site: 'PLT-01', truckCode: 'TRK-2287 • Bluepeak', status: 'En route', progress: '3 min', x: -15.0, z: 6.0 }
  ],
  inventory: [
    { id: 'INV-1', emoji: '📦', name: 'Cardboard Box (Parts)', count: 1906, status: 'In Stock' },
    { id: 'INV-2', emoji: '🟦', name: 'Plastic Container (EV Battery)', count: 297, status: 'In Stock' },
    { id: 'INV-3', emoji: '🛞', name: 'Sport Alloy Wheels 20"', count: 212, status: 'Low Stock' },
    { id: 'INV-4', emoji: '🖥️', name: 'LiDAR & AI Control Unit', count: 4448, status: 'In Stock' }
  ],
  shipments: [
    {
      id: '#SHP-78442',
      truckCode: 'TRK-2051 • AutoTrack',
      destination: 'Philadelphia, PA',
      status: 'Loading',
      bayInfo: 'PLT-01 • Bay 1 • 12 min left',
      loaded: 4,
      total: 6
    }
  ]
};

const CAR_COLORS = [
  { hex: '#ef4444', name: 'Đỏ Coral' },
  { hex: '#2563eb', name: 'Xanh Cobalt' },
  { hex: '#10b981', name: 'Xanh Emerald' },
  { hex: '#f59e0b', name: 'Vàng Amber' },
  { hex: '#8b5cf6', name: 'Tím Indigo' },
  { hex: '#0ea5e9', name: 'Xanh Sky' }
];

const CAR_MODELS = ['Apex EV SUV', 'Aero GT Sedan', 'Cyber Crossover'];

const state = {
  simSpeed: 1,
  paused: false,
  roofCutaway: false, // Bắt đầu hiển thị mái xanh đặc trưng như ảnh WareTrack, người dùng có thể bấm nút hoặc zoom gần để mở mái
  activeBottomTab: 'docks',
  selectedObj: null,
  nextCarSeq: 107
};

// ==========================================
// 2. KHỞI TẠO THREE.JS SCENE (SÁNG TƯƠI RỰC RỠ NHƯ WARETRACK)
// ==========================================
const container = document.getElementById('canvas-container');
const labelsContainer = document.getElementById('labels-container');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xeef2f6);
scene.fog = new THREE.Fog(0xeef2f6, 75, 165);

const camera = new THREE.PerspectiveCamera(34, window.innerWidth / window.innerHeight, 0.5, 250);
// Đặt góc nhìn Isometric 3/4 giống hệt khung hình mẫu WareTrack
camera.position.set(-28, 30, 44);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false;
renderer.shadowMap.needsUpdate = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
container.appendChild(renderer.domElement);
window.__threeRenderer = renderer;
window.__threeScene = scene;

// Tạo môi trường phản xạ ánh sáng tự nhiên (IBL) giúp kim loại và sơn xe tươi sáng
const pmremGenerator = new THREE.PMREMGenerator(renderer);
scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.maxPolarAngle = Math.PI / 2 - 0.04;
controls.minDistance = 12;
controls.maxDistance = 110;
controls.target.set(-2, 2.5, 2);

// ==========================================
// 3. HỆ THỐNG ÁNH SÁNG BAN NGÀY TƯƠI SÁNG (DAYLIGHT LIGHTING)
// ==========================================
const hemiLight = new THREE.HemisphereLight(0xffffff, 0xdbeafe, 1.35);
hemiLight.position.set(0, 50, 0);
scene.add(hemiLight);

const sunLight = new THREE.DirectionalLight(0xfffbeb, 1.85);
sunLight.position.set(-32, 48, 38);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 1024;
sunLight.shadow.mapSize.height = 1024;
sunLight.shadow.camera.near = 5;
sunLight.shadow.camera.far = 140;
const d = 48;
sunLight.shadow.camera.left = -d;
sunLight.shadow.camera.right = d;
sunLight.shadow.camera.top = d;
sunLight.shadow.camera.bottom = -d;
sunLight.shadow.bias = -0.0003;
sunLight.shadow.normalBias = 0.02;
scene.add(sunLight);

// ==========================================
// 4. DỰNG KHUÔN VIÊN NHÀ MÁY, ĐƯỜNG NỘI BỘ, XE TẢI, XE NÂNG & DÂY CHUYỀN
// ==========================================
const selectableObjects = [];
const pinMarkers = [];
const trucksList = [];
const forkliftsList = [];
const assemblyCars = [];
const assemblyRobots = [];
let factoryBuilding = null;

function buildCampusGround() {
  // Mặt nền khuôn viên xám sáng sạch sẽ
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(220, 220),
    new THREE.MeshStandardMaterial({ color: 0xe9eef4, roughness: 0.85, metalness: 0.02 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Sân bê tông khu vực nhà máy & bãi bốc dỡ (Yard Apron)
  const yardApron = new THREE.Mesh(
    new THREE.PlaneGeometry(82, 54),
    new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.7, metalness: 0.05 })
  );
  yardApron.rotation.x = -Math.PI / 2;
  yardApron.position.set(0, 0.01, 2);
  yardApron.receiveShadow = true;
  scene.add(yardApron);

  // Sàn dây chuyền bên trong nhà máy
  const interiorFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(41.5, 19.5),
    new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.5 })
  );
  interiorFloor.rotation.x = -Math.PI / 2;
  interiorFloor.position.set(0, 0.02, -4);
  interiorFloor.receiveShadow = true;
  scene.add(interiorFloor);

  // Đường xe tải chạy phía trước (Main Logistics Roadway)
  const roadMat = new THREE.MeshStandardMaterial({ color: 0xdbe3ec, roughness: 0.75 });
  const mainRoad = new THREE.Mesh(new THREE.PlaneGeometry(110, 10.5), roadMat);
  mainRoad.rotation.x = -Math.PI / 2;
  mainRoad.position.set(0, 0.02, 23);
  mainRoad.receiveShadow = true;
  scene.add(mainRoad);

  // Vạch kẻ đường đứt nét màu trắng
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (let rx = -48; rx <= 48; rx += 6) {
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.22), dashMat);
    dash.rotation.x = -Math.PI / 2;
    dash.position.set(rx, 0.03, 23);
    scene.add(dash);
  }
}

function buildInteriorAssemblyLine() {
  // Hệ thống băng chuyền lắp ráp ô tô sử dụng mô hình NVIDIA SimReady (`conveyor_belt_a05.glb`)
  scene.add(buildSimReadyConveyorLine());

  // Viền xanh dương dọc băng chuyền
  [-1.45, 1.45].forEach((oz) => {
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(37, 0.08, 0.14),
      new THREE.MeshBasicMaterial({ color: 0x2563eb })
    );
    rail.position.set(0, 0.3, -4.5 + oz);
    scene.add(rail);
  });

  // 8 Cánh tay Robot lắp ráp hai bên dây chuyền
  const robotX = [-12, -4, 4, 12];
  robotX.forEach((rx, idx) => {
    const botNorth = buildAssemblyRobot({
      id: `ROB-N${idx + 1}`,
      name: `Robot Lắp Ráp #${idx * 2 + 1}`,
      x: rx,
      z: -7.2,
      side: 1
    });
    const botSouth = buildAssemblyRobot({
      id: `ROB-S${idx + 1}`,
      name: `Robot Lắp Ráp #${idx * 2 + 2}`,
      x: rx,
      z: -1.8,
      side: -1
    });
    scene.add(botNorth, botSouth);
    assemblyRobots.push(botNorth, botSouth);
    selectableObjects.push(botNorth, botSouth);
  });

  // Khởi tạo 6 xe ô tô đang lắp ráp trên dây chuyền
  for (let i = 0; i < 6; i++) {
    const cColor = CAR_COLORS[i % CAR_COLORS.length];
    const car = buildSleekCar({
      id: `CAR-${101 + i}`,
      model: CAR_MODELS[i % CAR_MODELS.length],
      colorHex: cColor.hex,
      colorName: cColor.name
    });
    car.userData.progress = i * 16.5 + 5;
    updateCarPositionOnLine(car);
    scene.add(car);
    assemblyCars.push(car);
    selectableObjects.push(car);
  }
}

function updateCarPositionOnLine(car) {
  const x = -17.5 + (car.userData.progress / 100) * 35;
  car.position.set(x, 0.28, -4.5);

  let stage = 0;
  if (car.userData.progress >= 22) stage = 1;
  if (car.userData.progress >= 48) stage = 2;
  if (car.userData.progress >= 72) stage = 3;
  car.userData.updateStage(stage);
}

function buildExteriorYardObjects() {
  // 1. Tòa nhà máy chính màu xanh Cobalt giống hệt WareTrack
  factoryBuilding = buildFactoryBuilding();
  factoryBuilding.userData = {
    Selectable: true,
    type: 'plant',
    id: 'PLT-01',
    name: 'Riverside Auto Plant'
  };
  scene.add(factoryBuilding);
  selectableObjects.push(factoryBuilding);

  // 2. Container MAERA LINE màu xanh ngọc bên trái sân
  const maeraContainer = buildShippingContainer(-24.5, 10.5);
  maeraContainer.rotation.y = Math.PI / 2;
  scene.add(maeraContainer);
  selectableObjects.push(maeraContainer);

  // 3. Các kiện Pallet thùng Carton ở từng cửa Bay D1, D2, D3 và sân bãi + Ghim Pin xanh giống hệt WareTrack
  const palletConfigs = [
    { x: -15.0, z: 6.8, count: 6, type: 'cardboard', id: 'PLT-BAY3', name: 'Lô Linh Kiện Cửa D3', pin: false },
    { x: -6.0, z: 6.8, count: 6, type: 'cardboard', id: 'PLT-BAY2', name: 'Lô Phụ Tùng Cửa D2', pin: false },
    { x: 3.0, z: 6.8, count: 6, type: 'cardboard', id: 'PLT-BAY1', name: 'Lô Xuất Hàng Cửa D1', pin: true },
    { x: 12.0, z: 7.5, count: 6, type: 'cardboard', id: 'PLT-GATE0', name: 'Lô Hàng Sẵn Sàng Bốc Xếp', pin: true },
    { x: -2.2, z: 13.5, count: 6, type: 'cardboard', id: 'PLT-STAGE1', name: 'Pallet Đệm Trung Chuyển #1', pin: true },
    { x: -15.5, z: 18.2, count: 5, type: 'cardboard', id: 'PLT-STAGE2', name: 'Pallet Đệm Trung Chuyển #2', pin: false },
    { x: -19.5, z: 18.2, count: 5, type: 'cardboard', id: 'PLT-STAGE3', name: 'Pallet Đệm Trung Chuyển #3', pin: false },
    // Các kiện nhựa xanh dương (Blue Plastic Containers) phía bên phải nhà máy giống ảnh mẫu
    { x: 25.5, z: 2.5, count: 6, type: 'plastic', id: 'PLT-BLUE1', name: 'Kiện Vỏ Pin Nhựa Xanh #1', pin: true },
    { x: 28.5, z: 0.5, count: 6, type: 'plastic', id: 'PLT-BLUE2', name: 'Kiện Vỏ Pin Nhựa Xanh #2', pin: false },
    { x: 26.0, z: -2.5, count: 5, type: 'plastic', id: 'PLT-BLUE3', name: 'Kiện Vỏ Pin Nhựa Xanh #3', pin: false },
    { x: 11.5, z: -18.5, count: 6, type: 'plastic', id: 'PLT-BLUE4', name: 'Kiện Vỏ Pin Khu Bắc', pin: false }
  ];

  palletConfigs.forEach((pc) => {
    const p = buildPalletStack({
      x: pc.x,
      z: pc.z,
      boxCount: pc.count,
      boxType: pc.type,
      id: pc.id,
      name: pc.name
    });
    scene.add(p);
    selectableObjects.push(p);
    if (pc.pin) {
      createPinMarker(p, '', 'teardrop', new THREE.Vector3(0, 2.3, 0));
    }
  });

  // 4. Kệ kho cao tầng phía Đông Bắc giống hệt ảnh WareTrack
  const rack1 = buildExteriorStorageRack(18.5, -15.5, 'RACK-E1');
  scene.add(rack1);
  selectableObjects.push(rack1);

  // 5. Hai chiếc Xe Nâng (Forklifts) chạy trên hành lang an toàn, không đâm xuyên Pallet hay Xe Tải
  // FL-01: Vận chuyển kiện hàng từ Cửa Bay 1 (x=3.0, z=9.2) sang Bãi Tập Kết Đông (x=8.5, z=14.0)
  const fl1Waypoints = [
    new THREE.Vector3(3.0, 0, 9.2),  // WP0: Điểm lấy hàng Cửa Bay 1 (PICKUP)
    new THREE.Vector3(8.5, 0, 9.2),  // WP1: Hành lang Đông Bắc
    new THREE.Vector3(8.5, 0, 14.0), // WP2: Điểm hạ hàng Bãi Tập Kết (DROPOFF)
    new THREE.Vector3(3.0, 0, 14.0)  // WP3: Hành lang quay về
  ];
  // FL-02: Vận chuyển kiện hàng từ Cửa Bay 3 (x=-11.5, z=9.5) sang Bãi Tập Kết Tây (x=-19.5, z=13.8)
  const fl2Waypoints = [
    new THREE.Vector3(-11.5, 0, 9.5),  // WP0: Điểm lấy hàng Cửa Bay 2/3 (PICKUP)
    new THREE.Vector3(-19.5, 0, 9.5),  // WP1: Hành lang Tây Bắc
    new THREE.Vector3(-19.5, 0, 13.8), // WP2: Điểm hạ hàng Khu Tập Kết Tây (DROPOFF)
    new THREE.Vector3(-11.5, 0, 13.8)  // WP3: Hành lang quay về
  ];

  const fl1 = buildForklift({
    id: 'FL-01',
    name: 'Forklift FL-01 (Yale EV)',
    taskDesc: 'Bốc kiện hàng Cửa Bay 1 → Bãi Tập Kết',
    waypoints: fl1Waypoints
  });
  const fl2 = buildForklift({
    id: 'FL-02',
    name: 'Forklift FL-02 (Crown EV)',
    taskDesc: 'Luân chuyển Pallet Cửa Bay 3 → Kho Tây',
    waypoints: fl2Waypoints
  });
  fl2.userData.opState = 'TRANSIT_LOADED';
  fl2.userData.liftHeight = 0.22;

  scene.add(fl1, fl2);
  forkliftsList.push(fl1, fl2);
  selectableObjects.push(fl1, fl2);
  createPinMarker(fl1, 'FL-01', 'pill', new THREE.Vector3(0, 2.9, 0));
  createPinMarker(fl2, 'FL-02', 'pill', new THREE.Vector3(0, 2.9, 0));

  // 6. Đội Xe Tải (Trucks) giống hệt bố cục WareTrack
  // Xe tải 1: TRK-2051 (AutoTrack) đang đậu bốc hàng trước cửa Bay 2 / Bay 1
  const truck1 = buildDetailedTruck({
    id: 'TRK-2051',
    code: 'TRK-2051',
    company: 'AutoTrack',
    tagline: 'DELIVERING ON TIME, EVERY TIME',
    cabColor: 0x2563eb,
    accentHex: '#2563eb',
    bay: 'Bay 1',
    state: 'Loading',
    progressText: '4/6'
  });
  truck1.position.set(-7.5, 0, 16.2);
  truck1.rotation.y = -Math.PI / 2;
  truck1.userData.baseX = -7.5;
  truck1.userData.motionState = 'PARKED';
  scene.add(truck1);
  trucksList.push(truck1);
  selectableObjects.push(truck1);
  createPinMarker(truck1, 'TRK-2051 • AutoTrack', 'pill', new THREE.Vector3(0, 4.4, 0));

  // Xe tải 2: TRK-2287 (Bluepeak) đang chạy trên đường nội bộ phía trước
  const truck2 = buildDetailedTruck({
    id: 'TRK-2287',
    code: 'TRK-2287',
    company: 'Bluepeak',
    tagline: 'SMART LOGISTICS NETWORK',
    cabColor: 0x1e293b,
    accentHex: '#0284c7',
    bay: 'Bay 3',
    state: 'En route',
    progressText: '3 min'
  });
  truck2.position.set(8.5, 0, 22.8);
  truck2.rotation.y = -Math.PI / 2;
  truck2.userData.motionState = 'CRUISING';
  scene.add(truck2);
  trucksList.push(truck2);
  selectableObjects.push(truck2);
  createPinMarker(truck2, 'TRK-2287 • Bluepeak', 'pill', new THREE.Vector3(0, 4.4, 0));

  // Xe tải 3: TRK-2104 (Velocity) đang chờ xuất phát
  const truck3 = buildDetailedTruck({
    id: 'TRK-2104',
    code: 'TRK-2104',
    company: 'Velocity',
    tagline: 'AUTO CARRIER EXPRESS',
    cabColor: 0x0d9488,
    accentHex: '#0d9488',
    bay: 'Bay 2',
    state: 'Loading',
    progressText: '2/6'
  });
  truck3.position.set(22.5, 0, 22.8);
  truck3.rotation.y = -Math.PI / 2;
  truck3.userData.motionState = 'CRUISING';
  scene.add(truck3);
  trucksList.push(truck3);
  selectableObjects.push(truck3);

  // 7. Các thiết bị nhà xưởng phụ trợ NVIDIA SimReady (Pallet Jack, Rào chắn an toàn Dock, Thùng phuy công nghiệp)
  scene.add(buildSimReadyFactoryProps());

  // 8. Cây xanh Stylised tròn trịa xung quanh khuôn viên
  const treeCoords = [
    [6, -22, 1.1],
    [13, -24, 0.85],
    [22, -20, 1.15],
    [32, -14, 0.95],
    [35, -6, 1.05],
    [-32, -18, 1.1],
    [-36, -6, 0.9]
  ];
  treeCoords.forEach(([tx, tz, sc]) => {
    scene.add(buildStylizedTree(tx, tz, sc));
  });
}

// ==========================================
// 5. QUẢN LÝ PIN MARKERS 3D (GIỐNG HỆT WARETRACK)
// ==========================================
function createPinMarker(targetObj, labelText, style = 'pill', offset = new THREE.Vector3(0, 3, 0)) {
  const el = document.createElement('div');
  el.className = 'pin-marker';

  if (style === 'teardrop') {
    el.innerHTML = `<div class="teardrop-pin"></div>`;
  } else {
    el.innerHTML = `
      <div class="pin-pill">
        <span class="pin-dot"></span>
        <span>${labelText}</span>
      </div>
    `;
  }

  el.addEventListener('click', (e) => {
    e.stopPropagation();
    selectObject3D(targetObj);
  });

  labelsContainer.appendChild(el);
  const record = { targetObj, el, offset };
  pinMarkers.push(record);
  targetObj.userData.pinEl = el;
  return record;
}

function updatePinMarkers() {
  const halfW = window.innerWidth / 2;
  const halfH = window.innerHeight / 2;

  pinMarkers.forEach(({ targetObj, el, offset }) => {
    const wp = new THREE.Vector3();
    targetObj.getWorldPosition(wp);
    wp.add(offset);
    wp.project(camera);

    if (wp.z > 1) {
      el.style.display = 'none';
      return;
    }

    const x = wp.x * halfW + halfW;
    const y = -(wp.y * halfH) + halfH;
    el.style.display = 'flex';
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
  });
}

// ==========================================
// 6. VÒNG LẶP MÔ PHỎNG SỐNG ĐỘNG (SIMULATION LOOP)
// ==========================================
function updateSimulation(dt, elapsed) {
  if (state.paused) return;
  const effDt = dt * state.simSpeed;

  // 1. Máy trạng thái Xe Nâng thực tế (Forklift Industrial State Machine):
  // PICKING (Đứng yên nâng kiện hàng) -> TRANSIT_LOADED (Chạy giữ nguyên độ cao càng an toàn)
  // -> DROPPING (Đứng yên hạ kiện hàng xuống bãi) -> TRANSIT_EMPTY (Chạy không tải về điểm lấy hàng)
  forkliftsList.forEach((fl) => {
    const d = fl.userData;
    const wps = d.waypoints;

    if (d.opState === 'PICKING') {
      d.opTimer += effDt;
      const alpha = Math.min(1, d.opTimer / 1.4);
      // Càng nâng từ sát đất (0.01m) lên độ cao hành trình an toàn (0.22m)
      d.liftHeight = 0.01 + alpha * 0.21;
      if (d.cargoNode) d.cargoNode.visible = alpha > 0.25;
      if (d.rudderNode) {
        const restRudderY = d.rudderNode.userData.restRotation?.y || 0;
        d.rudderNode.rotation.y = restRudderY;
      }
      if (d.opTimer >= 1.4) {
        d.opTimer = 0;
        d.opState = 'TRANSIT_LOADED';
      }
    } else if (d.opState === 'DROPPING') {
      d.opTimer += effDt;
      const alpha = Math.min(1, d.opTimer / 1.4);
      // Hạ càng nâng êm ái từ 0.22m xuống 0.01m để đặt kiện hàng
      d.liftHeight = 0.22 * (1 - alpha) + 0.01;
      if (d.cargoNode) d.cargoNode.visible = alpha < 0.75;
      if (d.rudderNode) {
        const restRudderY = d.rudderNode.userData.restRotation?.y || 0;
        d.rudderNode.rotation.y = restRudderY;
      }
      if (d.opTimer >= 1.4) {
        d.opTimer = 0;
        d.opState = 'TRANSIT_EMPTY';
      }
    } else {
      // Đang di chuyển (TRANSIT_LOADED hoặc TRANSIT_EMPTY) — giữ độ cao càng cố định, KHÔNG nhấp nhô lên xuống!
      d.liftHeight = d.opState === 'TRANSIT_LOADED' ? 0.22 : 0.03;
      if (d.cargoNode) d.cargoNode.visible = d.opState === 'TRANSIT_LOADED';

      const p0 = wps[d.wpIndex];
      const p1 = wps[(d.wpIndex + 1) % wps.length];
      const dist = p0.distanceTo(p1);

      const moveDist = effDt * 3.1;
      d.progress += moveDist / dist;

      // Xoay các bánh xe nâng theo quãng đường lăn thực tế
      if (d.wheelNodes && d.wheelNodes.length > 0) {
        d.wheelNodes.forEach((w) => {
          w.rotation.x += moveDist * 3.2;
        });
      }

      if (d.progress >= 1) {
        d.progress = 0;
        d.wpIndex = (d.wpIndex + 1) % wps.length;
        fl.position.copy(wps[d.wpIndex]);

        // Khi tới WP2 (Điểm tập kết) -> dừng lại hạ hàng (DROPPING)
        if (d.wpIndex === 2 && d.opState === 'TRANSIT_LOADED') {
          d.opState = 'DROPPING';
          d.opTimer = 0;
        }
        // Khi quay về WP0 (Cửa Bay) -> dừng lại xúc kiện hàng mới (PICKING)
        else if (d.wpIndex === 0 && d.opState === 'TRANSIT_EMPTY') {
          d.opState = 'PICKING';
          d.opTimer = 0;
        }
      } else {
        fl.position.lerpVectors(p0, p1, d.progress);
      }

      // Hướng mũi xe nâng đúng theo hướng vector di chuyển (+Z là mũi càng)
      const curr = wps[d.wpIndex];
      const next = wps[(d.wpIndex + 1) % wps.length];
      const dir = new THREE.Vector3().subVectors(next, curr).normalize();
      if (dir.lengthSq() > 0.001) {
        const targetAngle = Math.atan2(dir.x, dir.z);
        let diff = targetAngle - fl.rotation.y;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        fl.rotation.y += diff * Math.min(1, effDt * 7.5);

        if (d.rudderNode) {
          const restRudderY = d.rudderNode.userData.restRotation?.y || 0;
          d.rudderNode.rotation.y = restRudderY + Math.max(-0.45, Math.min(0.45, diff * 1.2));
        }
      }
    }

    // Áp dụng vị trí càng nâng chuẩn xác theo restPosition (thùng hàng đã gắn làm con trực tiếp của forkNode)
    if (d.forkNode) {
      const restY = d.forkNode.userData.restPosition ? d.forkNode.userData.restPosition.y : 0.0038;
      d.forkNode.position.y = restY + d.liftHeight;
    }
  });

  // 2. Di chuyển các Xe Ô Tô trên dây chuyền bên trong nhà máy
  assemblyCars.forEach((car) => {
    car.userData.progress += effDt * 2.8;
    if (car.userData.progress >= 100) {
      car.userData.progress = 0;
      const nextColor = CAR_COLORS[state.nextCarSeq % CAR_COLORS.length];
      car.userData.colorHex = nextColor.hex;
      car.userData.colorName = nextColor.name;
      car.userData.id = `CAR-${state.nextCarSeq++}`;
      DATA_STORE.site.stockOnHand += 1;
      document.getElementById('kpi-stock-val').textContent = DATA_STORE.site.stockOnHand.toLocaleString();
    }
    updateCarPositionOnLine(car);
  });

  // 3. Chuỗi Động Học 6 Trục Liên Kết Chặt Chẽ (Connected 6-DOF Kinematic Chain) cho Cánh Tay Robot
  // Nhờ đã tái cấu trúc phân cấp Cha-Con bằng attach(), khi xoay khớp Vai thì Khuỷu tay + Cổ tay + Đầu hàn
  // luôn di chuyển liền khối tuyệt đối (0.00m khe hở), không bao giờ bị tách rời hay lơ lửng!
  assemblyRobots.forEach((bot) => {
    const j = bot.userData.joints;
    if (!j || !j.nodeBase) return;

    // Chu kỳ 4 pha công nghiệp: [0..1.5] Vươn tới thân xe -> [1.5..4.2] Hàn điểm / Lắp ráp -> [4.2..5.2] Rút tay lên -> [5.2..6.28] Chờ
    const cycleLen = Math.PI * 2;
    const t = (elapsed * 1.85 * state.simSpeed + j.phase) % cycleLen;

    let reachFactor = 0; // 0: Tư thế thu gọn chuẩn, 1: Vươn sát vào khung xe trên băng chuyền
    let weldSweep = 0;   // Quét dọc theo mối hàn khi đang tiếp xúc thân xe
    let isWorking = false;

    if (t < 1.4) {
      // Pha 1: Hạ vai và vươn cánh tay xuống khung xe (Smoothstep)
      const u = t / 1.4;
      reachFactor = u * u * (3 - 2 * u);
    } else if (t < 4.2) {
      // Pha 2: Giữ đầu công cụ sát thân xe và quét mối hàn chính xác
      reachFactor = 1.0;
      isWorking = true;
      const wPhase = ((t - 1.4) / 2.8) * Math.PI * 2;
      weldSweep = Math.sin(wPhase);
    } else if (t < 5.4) {
      // Pha 3: Rút cánh tay lên vị trí an toàn
      const u = 1 - (t - 4.2) / 1.2;
      reachFactor = u * u * (3 - 2 * u);
    } else {
      // Pha 4: Tư thế chờ chuẩn bị đón xe tiếp theo
      reachFactor = 0;
    }

    // Khớp 1 (Prismatic Y): Nâng hạ thân trụ đứng (0m .. +0.08m)
    if (j.nodeHeight && j.nodeHeight.userData.restPosition) {
      j.nodeHeight.position.y = j.nodeHeight.userData.restPosition.y + reachFactor * 0.06;
    }

    // Khớp 2 (Revolute Y): Xoay đế tròn theo đường hàn dọc thân xe
    if (j.nodeBase && j.nodeBase.userData.restRotation) {
      j.nodeBase.rotation.y = j.nodeBase.userData.restRotation.y + weldSweep * 0.28 * reachFactor;
    }

    // Khớp 3 (Revolute Z - Vai chính): Gập cánh tay trên vươn về phía trước (+X là hướng băng chuyền)
    if (j.nodeShoulder1 && j.nodeShoulder1.userData.restRotation) {
      const pitch1 = -0.12 - reachFactor * 0.42 + (isWorking ? Math.sin(t * 6) * 0.03 : 0);
      j.nodeShoulder1.rotation.z = j.nodeShoulder1.userData.restRotation.z + pitch1;
    }

    // Khớp 4 (Revolute Z - Khuỷu tay): Phối hợp nghịch đảo với vai để mũi hàn luôn hướng xuống thân xe
    if (j.nodeShoulder2 && j.nodeShoulder2.userData.restRotation) {
      const pitch2 = 0.18 + reachFactor * 0.36 + (isWorking ? Math.cos(t * 6) * 0.04 : 0);
      j.nodeShoulder2.rotation.z = j.nodeShoulder2.userData.restRotation.z + pitch2;
    }

    // Khớp 5 (Revolute X - Cổ tay): Xoay định hướng đầu công cụ
    if (j.nodeShoulder3 && j.nodeShoulder3.userData.restRotation) {
      j.nodeShoulder3.rotation.x = j.nodeShoulder3.userData.restRotation.x + weldSweep * 0.55;
    }

    // Khớp 6 (Revolute Y - Đầu hàn/kẹp): Xoay tinh chỉnh mũi hàn
    if (j.nodeShoulder4 && j.nodeShoulder4.userData.restRotation) {
      j.nodeShoulder4.rotation.y = j.nodeShoulder4.userData.restRotation.y + Math.sin(t * 4) * 0.35 * reachFactor;
    }

    // Hiệu ứng hồ quang hàn / Laser chỉ bật đúng pha 2 khi mũi hàn tiếp xúc thân xe
    if (j.sparkMesh) {
      const flash = isWorking && Math.sin(elapsed * 32 + j.phase) > -0.2;
      j.sparkMesh.visible = flash;
      if (flash) {
        const s = 0.85 + Math.random() * 0.65;
        j.sparkMesh.scale.set(s, s, s);
      }
    }
  });

  // 4. Xe tải chạy trên làn đường phía trước
  trucksList.forEach((trk) => {
    if (trk.userData.motionState === 'CRUISING') {
      trk.position.x -= effDt * 3.8;
      if (trk.position.x < -52) {
        trk.position.x = 52;
      }
    } else if (trk.userData.motionState === 'DEPARTING') {
      trk.position.x -= effDt * 7.5;
      if (trk.position.x < -52) {
        trk.position.x = trk.userData.baseX;
        trk.userData.motionState = 'PARKED';
      }
    }
  });
}

// ==========================================
// 7. CLICK TƯƠNG TÁC 3D & ĐỒNG BỘ UI DỮ LIỆU
// ==========================================
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let downPos = { x: 0, y: 0 };

const selectionRing = new THREE.Mesh(
  new THREE.RingGeometry(2.3, 2.75, 36),
  new THREE.MeshBasicMaterial({ color: 0x2563eb, side: THREE.DoubleSide })
);
selectionRing.rotation.x = -Math.PI / 2;
selectionRing.position.y = 0.06;
selectionRing.visible = false;
scene.add(selectionRing);

renderer.domElement.addEventListener('pointerdown', (e) => {
  downPos = { x: e.clientX, y: e.clientY };
});

renderer.domElement.addEventListener('pointerup', (e) => {
  if (Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y) > 6) return;

  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(selectableObjects, true);

  if (hits.length > 0) {
    let obj = hits[0].object;
    while (obj && !obj.userData?.Selectable) {
      obj = obj.parent;
    }
    if (obj) {
      selectObject3D(obj);
    }
  }
});

let camGoalTarget = null;
let camGoalPos = null;

function flyCameraTo(targetVec, posVec = null) {
  camGoalTarget = targetVec.clone();
  camGoalPos = posVec ? posVec.clone() : null;
}

function selectObject3D(obj) {
  state.selectedObj = obj;

  pinMarkers.forEach((m) => {
    m.el.classList.toggle('selected', m.targetObj === obj);
  });

  const wp = new THREE.Vector3();
  obj.getWorldPosition(wp);
  flyCameraTo(wp);

  // Nếu chọn Ô tô hoặc Robot bên trong xưởng thì tự động bật mở mái X-Ray để nhìn rõ
  if (obj.userData.type === 'car' || obj.userData.type === 'robot') {
    setRoofCutaway(true);
  }

  renderRightInspectorCard();
  renderBottomTabs();
}

function setRoofCutaway(open) {
  state.roofCutaway = open;
  if (factoryBuilding?.userData?.roofGroup) {
    factoryBuilding.userData.roofGroup.visible = !open;
  }
  const btn = document.getElementById('btn-cutaway');
  btn.classList.toggle('active', open);
  btn.textContent = open ? '🏠 Đóng Mái Xưởng' : '🏠 Mở Mái Xưởng (X-Ray)';
}

function renderRightInspectorCard() {
  const obj = state.selectedObj;
  const tagEl = document.getElementById('insp-tag');
  const titleEl = document.getElementById('insp-title');
  const subEl = document.getElementById('insp-subtitle');
  const badgeEl = document.getElementById('insp-status-badge');
  const sumEl = document.getElementById('insp-status-summary');

  if (!obj || obj.userData.type === 'plant') {
    tagEl.textContent = 'DEPOT • PLT-01';
    titleEl.textContent = DATA_STORE.site.name;
    subEl.textContent = DATA_STORE.site.address;
    badgeEl.textContent = 'Operational';
    badgeEl.className = 'status-badge green';
    sumEl.textContent = '2 docked • 1 arriving • 6 cars on line';

    document.getElementById('m1-label').textContent = 'Stock on hand';
    document.getElementById('m1-val').textContent = DATA_STORE.site.stockOnHand.toLocaleString();
    document.getElementById('m1-max').textContent = '/ 1,800';
    document.getElementById('m2-label').textContent = 'Truck bays';
    document.getElementById('m2-val').textContent = '2';
    document.getElementById('m2-max').textContent = '/ 3 busy';
    return;
  }

  const d = obj.userData;
  const assetNote = d.simreadyAsset ? ` • SimReady: ${d.simreadyAsset}` : '';
  if (d.type === 'truck') {
    tagEl.textContent = `TRUCK • ${d.code}`;
    titleEl.textContent = d.name;
    subEl.textContent = `Điểm đến: ${d.destination}${assetNote}`;
    badgeEl.textContent = d.state;
    badgeEl.className = `status-badge ${d.state === 'Loading' ? 'green' : 'blue'}`;
    sumEl.textContent = `Vị trí: ${d.bay} • Tiến độ: ${d.progressText}`;

    document.getElementById('m1-label').textContent = ' Tải trọng lô xe';
    document.getElementById('m1-val').textContent = d.progressText;
    document.getElementById('m1-max').textContent = 'kiện xe';
  } else if (d.type === 'forklift') {
    tagEl.textContent = `FORKLIFT • ${d.id}`;
    titleEl.textContent = d.name;
    subEl.textContent = `Người lái: ${d.operator}${assetNote}`;
    badgeEl.textContent = d.opState || d.status;
    badgeEl.className = 'status-badge green';
    sumEl.textContent = d.taskDesc;

    document.getElementById('m1-label').textContent = 'Dung lượng Pin EV';
    document.getElementById('m1-val').textContent = `${d.battery}%`;
    document.getElementById('m1-max').textContent = 'Lithium';
  } else if (d.type === 'car') {
    tagEl.textContent = `ASSEMBLY LINE • ${d.id}`;
    titleEl.textContent = `${d.model} (${d.colorName})`;
    subEl.textContent = `VIN: ${d.vin}${assetNote}`;
    badgeEl.textContent = `Hoàn thiện ${Math.round(d.progress)}%`;
    badgeEl.className = 'status-badge blue';
    sumEl.textContent = `Công đoạn ${d.stage + 1}/4 trên băng chuyền chính`;
  } else if (d.type === 'pallet' || d.type === 'rack' || d.type === 'container') {
    tagEl.textContent = `STORAGE • ${d.id}`;
    titleEl.textContent = d.name;
    subEl.textContent = `Lưu trữ & tập kết vật tư${assetNote}`;
    badgeEl.textContent = d.status || 'In Stock';
    badgeEl.className = 'status-badge green';
    sumEl.textContent = d.contents || `${d.units || 144} đơn vị linh kiện sẵn sàng`;
  } else if (d.type === 'robot') {
    tagEl.textContent = `ROBOTICS • ${d.id}`;
    titleEl.textContent = d.name;
    subEl.textContent = `Công đoạn: ${d.stationTask || 'Lắp Ráp Ô Tô'}`;
    badgeEl.textContent = 'Operational';
    badgeEl.className = 'status-badge green';
    sumEl.textContent = `${d.stationTask || 'Gia công tự động'} • ${d.cycles.toLocaleString()} chu kỳ • SimReady: ${d.simreadyAsset}`;

    document.getElementById('m1-label').textContent = 'Công đoạn trạm';
    document.getElementById('m1-val').textContent = d.id;
    document.getElementById('m1-max').textContent = 'Line 1';
  }
}

function renderBottomTabs() {
  const listEl = document.getElementById('bottom-tabs-list');
  const tab = state.activeBottomTab;

  if (tab === 'docks') {
    listEl.innerHTML = DATA_STORE.docks.map((dk) => `
      <div class="tab-row" data-dockx="${dk.x}" data-dockz="${dk.z}">
        <div class="tr-left">
          <span class="tr-title">${dk.name}</span>
          <span class="tr-sub">${dk.site}</span>
        </div>
        <div class="tr-mid">
          <span class="dot-blue"></span>
          <span>${dk.truckCode}</span>
        </div>
        <div class="tr-right">
          <span class="status-badge ${dk.status === 'Loading' ? 'green' : 'blue'}">${dk.status}</span>
          <span class="tr-sub">${dk.progress} ›</span>
        </div>
      </div>
    `).join('');

    listEl.querySelectorAll('.tab-row').forEach((row) => {
      row.addEventListener('click', () => {
        const x = parseFloat(row.dataset.dockx);
        const z = parseFloat(row.dataset.dockz);
        flyCameraTo(new THREE.Vector3(x, 2.5, z), new THREE.Vector3(x - 8, 12, z + 18));
      });
    });
  } else if (tab === 'cars') {
    listEl.innerHTML = assemblyCars.map((car) => {
      const d = car.userData;
      return `
        <div class="tab-row" data-carid="${d.id}">
          <div class="tr-left">
            <span class="tr-title">${d.id} • ${d.model}</span>
            <span class="tr-sub">${d.vin}</span>
          </div>
          <div class="tr-mid">
            <span class="dot-blue" style="background:${d.colorHex}"></span>
            <span>${d.colorName}</span>
          </div>
          <div class="tr-right">
            <span class="status-badge blue">${Math.round(d.progress)}%</span>
            <span class="tr-sub">Xem 3D ›</span>
          </div>
        </div>
      `;
    }).join('');

    listEl.querySelectorAll('.tab-row').forEach((row) => {
      row.addEventListener('click', () => {
        const targetCar = assemblyCars.find((c) => c.userData.id === row.dataset.carid);
        if (targetCar) {
          setRoofCutaway(true);
          selectObject3D(targetCar);
        }
      });
    });
  } else if (tab === 'forklifts') {
    listEl.innerHTML = forkliftsList.map((fl) => {
      const d = fl.userData;
      return `
        <div class="tab-row" data-flid="${d.id}">
          <div class="tr-left">
            <span class="tr-title">${d.id}</span>
            <span class="tr-sub">Người lái: ${d.operator}</span>
          </div>
          <div class="tr-mid">
            <span class="dot-blue"></span>
            <span>${d.taskDesc}</span>
          </div>
          <div class="tr-right">
            <span class="status-badge green">${d.battery}% Pin</span>
            <span class="tr-sub">›</span>
          </div>
        </div>
      `;
    }).join('');

    listEl.querySelectorAll('.tab-row').forEach((row) => {
      row.addEventListener('click', () => {
        const targetFl = forkliftsList.find((f) => f.userData.id === row.dataset.flid);
        if (targetFl) selectObject3D(targetFl);
      });
    });
  } else if (tab === 'trucks') {
    listEl.innerHTML = trucksList.map((trk) => {
      const d = trk.userData;
      return `
        <div class="tab-row" data-trkid="${d.id}">
          <div class="tr-left">
            <span class="tr-title">${d.code}</span>
            <span class="tr-sub">${d.company}</span>
          </div>
          <div class="tr-mid">
            <span class="dot-blue"></span>
            <span>${d.destination}</span>
          </div>
          <div class="tr-right">
            <span class="status-badge ${d.state === 'Loading' ? 'green' : 'blue'}">${d.state}</span>
            <span class="tr-sub">›</span>
          </div>
        </div>
      `;
    }).join('');

    listEl.querySelectorAll('.tab-row').forEach((row) => {
      row.addEventListener('click', () => {
        const targetTrk = trucksList.find((t) => t.userData.id === row.dataset.trkid);
        if (targetTrk) selectObject3D(targetTrk);
      });
    });
  }
}

// ==========================================
// 8. SỰ KIỆN NÚT BẤM GIAO DIỆN & TÌM KIẾM
// ==========================================
function setupUIEvents() {
  // Bật/tắt mở mái nhà xưởng (Cutaway X-Ray)
  document.getElementById('btn-cutaway').addEventListener('click', () => {
    setRoofCutaway(!state.roofCutaway);
    if (state.roofCutaway) {
      flyCameraTo(new THREE.Vector3(0, 1.5, -4.5), new THREE.Vector3(-12, 22, 18));
    }
  });

  // Chuyển chế độ 60 FPS Turbo / Ultra CAD
  const btnPerf = document.getElementById('btn-perf-toggle');
  let isTurbo = true;
  if (btnPerf) {
    btnPerf.addEventListener('click', () => {
      isTurbo = !isTurbo;
      if (isTurbo) {
        btnPerf.textContent = '⚡ 60 FPS Turbo';
        btnPerf.classList.add('active');
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.0));
        sunLight.shadow.mapSize.width = 512;
        sunLight.shadow.mapSize.height = 512;
        if (sunLight.shadow.map) {
          sunLight.shadow.map.dispose();
          sunLight.shadow.map = null;
        }
        assemblyRobots.forEach(rob => rob.userData.setUltraMode?.(false));
      } else {
        btnPerf.textContent = '💎 Ultra CAD';
        btnPerf.classList.remove('active');
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        sunLight.shadow.mapSize.width = 1024;
        sunLight.shadow.mapSize.height = 1024;
        if (sunLight.shadow.map) {
          sunLight.shadow.map.dispose();
          sunLight.shadow.map = null;
        }
        assemblyRobots.forEach(rob => rob.userData.setUltraMode?.(true));
      }
    });
  }

  // Tốc độ mô phỏng
  document.getElementById('btn-pause').addEventListener('click', (e) => {
    state.paused = !state.paused;
    e.currentTarget.textContent = state.paused ? '▶' : '⏸';
    e.currentTarget.classList.toggle('active', state.paused);
  });

  document.querySelectorAll('.spd-btn[data-speed]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.simSpeed = Number(btn.dataset.speed);
      state.paused = false;
      document.getElementById('btn-pause').textContent = '⏸';
      document.querySelectorAll('.spd-btn[data-speed]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Thanh công cụ Camera bên phải
  document.getElementById('cam-zoom-in').addEventListener('click', () => {
    camera.position.lerp(controls.target, 0.22);
  });
  document.getElementById('cam-zoom-out').addEventListener('click', () => {
    const dir = new THREE.Vector3().subVectors(camera.position, controls.target).multiplyScalar(1.25);
    camera.position.copy(controls.target).add(dir);
  });
  document.getElementById('cam-rotate-left').addEventListener('click', () => {
    const offset = new THREE.Vector3().subVectors(camera.position, controls.target);
    offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.45);
    camera.position.copy(controls.target).add(offset);
  });
  document.getElementById('cam-rotate-right').addEventListener('click', () => {
    const offset = new THREE.Vector3().subVectors(camera.position, controls.target);
    offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), -0.45);
    camera.position.copy(controls.target).add(offset);
  });
  document.getElementById('cam-home').addEventListener('click', () => {
    setRoofCutaway(false);
    flyCameraTo(new THREE.Vector3(-2, 2.5, 2), new THREE.Vector3(-28, 30, 44));
  });
  document.getElementById('cam-interior').addEventListener('click', () => {
    setRoofCutaway(true);
    flyCameraTo(new THREE.Vector3(0, 1.5, -4.5), new THREE.Vector3(-10, 19, 14));
  });

  // Reset về tổng quan nhà máy
  document.getElementById('btn-reset-selection').addEventListener('click', () => {
    state.selectedObj = null;
    selectionRing.visible = false;
    pinMarkers.forEach((m) => m.el.classList.remove('selected'));
    renderRightInspectorCard();
    flyCameraTo(new THREE.Vector3(-2, 2.5, 2), new THREE.Vector3(-28, 30, 44));
  });

  // Nút Đưa xe mới vào chuyền (mở mái nhà máy và nhảy tới đầu chuyền)
  document.getElementById('btn-spawn-car').addEventListener('click', () => {
    setRoofCutaway(true);
    const firstCar = assemblyCars[0];
    if (firstCar) {
      selectObject3D(firstCar);
    }
  });

  // Nút Điều xe tải xuất bến
  document.getElementById('btn-dispatch-truck').addEventListener('click', () => {
    const mainTruck = trucksList[0];
    if (mainTruck) {
      mainTruck.userData.motionState = 'DEPARTING';
      DATA_STORE.site.outboundToday += 1;
      document.getElementById('m3-val').textContent = DATA_STORE.site.outboundToday;
      selectObject3D(mainTruck);
    }
  });

  // Click thẻ Shipment dưới đáy để focus vào xe tải TRK-2051
  document.getElementById('ship-summary-box').addEventListener('click', () => {
    if (trucksList[0]) selectObject3D(trucksList[0]);
  });

  // Chuyển đổi các Tab góc phải dưới (Docks / Chuyền Xe / Xe Nâng / Xe Tải)
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.activeBottomTab = btn.dataset.tab;
      document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      renderBottomTabs();
    });
  });

  // Ô tìm kiếm nhanh trên thanh Navbar
  const searchInput = document.getElementById('search-input');
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const q = searchInput.value.trim().toLowerCase();
      if (!q) return;
      const match = selectableObjects.find((obj) => {
        const d = obj.userData;
        return (
          d.id?.toLowerCase().includes(q) ||
          d.name?.toLowerCase().includes(q) ||
          d.company?.toLowerCase().includes(q)
        );
      });
      if (match) {
        selectObject3D(match);
      }
    }
  });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

// ==========================================
// 9. KHỞI CHẠY TỨC THÌ (0MS BLOCKING) + STREAMING HẬU TRƯỜNG + CACHE
// ==========================================
buildCampusGround();
buildInteriorAssemblyLine();
buildExteriorYardObjects();
setupUIEvents();
renderRightInspectorCard();
renderBottomTabs();

const modelInspector = new ModelInspectorModal();
const benchmarkLab = new BenchmarkLabModal();

document.getElementById('card-btn-inspector')?.addEventListener('click', () => {
  modelInspector.show(modelInspector.currentModelKey);
});

document.getElementById('card-btn-benchmark')?.addEventListener('click', () => {
  benchmarkLab.show();
});

const navMetaEl = document.getElementById('nav-site-meta');
if (navMetaEl) {
  navMetaEl.textContent = '100% Three.js Twin Mode • 60 FPS Turbo • 0 MB GLB Stream';
}

const clock = new THREE.Clock();
let shadowFrameTick = 0;

function animate() {
  requestAnimationFrame(animate);

  // Khi đang mở Benchmark Lab, tạm ngưng render nhà máy nền để tập trung 100% GPU/CPU cho bài test
  if (benchmarkLab && benchmarkLab.isOpen) return;

  const dt = Math.min(clock.getDelta(), 0.1);
  const elapsed = clock.getElapsedTime();

  updateSimulation(dt, elapsed);

  // Giảm tải GPU: Chỉ cập nhật Shadow Map mỗi 4 frames (15Hz shadow update thay vì 60Hz liên tục)
  shadowFrameTick++;
  if (shadowFrameTick % 4 === 0) {
    renderer.shadowMap.needsUpdate = true;
  }

  if (state.selectedObj && state.selectedObj.userData.type !== 'plant') {
    const wp = new THREE.Vector3();
    state.selectedObj.getWorldPosition(wp);
    selectionRing.position.set(wp.x, 0.06, wp.z);
    selectionRing.rotation.z = elapsed * 1.6;
    selectionRing.visible = true;
  } else {
    selectionRing.visible = false;
  }

  if (camGoalTarget) {
    controls.target.lerp(camGoalTarget, 0.08);
    if (camGoalPos) {
      camera.position.lerp(camGoalPos, 0.06);
      if (camera.position.distanceTo(camGoalPos) < 0.4) camGoalPos = null;
    }
    if (controls.target.distanceTo(camGoalTarget) < 0.15 && !camGoalPos) {
      camGoalTarget = null;
    }
  }

  controls.update();
  renderer.render(scene, camera);
  updatePinMarkers();
}

animate();
