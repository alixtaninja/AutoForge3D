import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { instantiateSimReady, SIMREADY_ASSETS } from './simreadyLoader.js';

/**
 * Metadata chẩn đoán về các khớp động học (Kinematics) trích xuất từ dữ liệu gốc NVIDIA SimReady USD
 */
export const SIMREADY_METADATA = {
  vehicle_forklift_orange_a01: {
    title: 'Xe Nâng Hàng Cam (Yale Electric Forklift)',
    forwardAxis: '+Z (Mũi càng hướng theo trục +Z, xoay 0 để tiến tới)',
    joints: [
      { name: 'Càng Nâng Thủy Lực (sm_fork_a01_obj_00)', type: 'Prismatic (Tịnh tiến thẳng đứng)', range: '0m - 1.51m', axis: 'Y' },
      { name: 'Vô Lăng Lái (sm_rudder_a01_obj_00)', type: 'Revolute (Xoay góc lái)', range: '-45° đến +45°', axis: 'Y' },
      { name: '4 Bánh Xe Chịu Lực (sm_wheel1..4)', type: 'Revolute (Lăn bánh tròn)', range: 'Vô hạn', axis: 'X/Z' }
    ]
  },
  vehicle_forklift_blue_a01: {
    title: 'Xe Nâng Hàng Xanh (Crown Electric Forklift)',
    forwardAxis: '+Z (Mũi càng hướng theo trục +Z, xoay 0 để tiến tới)',
    joints: [
      { name: 'Càng Nâng Thủy Lực (sm_fork_a01_obj_00)', type: 'Prismatic (Tịnh tiến)', range: '0m - 1.51m', axis: 'Y' },
      { name: 'Vô Lăng Lái (sm_rudder_a01_obj_00)', type: 'Revolute (Xoay góc lái)', range: '-45° đến +45°', axis: 'Y' },
      { name: 'Bánh Xe Tải Trọng', type: 'Revolute (Quay tròn)', range: 'Vô hạn', axis: 'X' }
    ]
  },
  robotic_system_arm_b01: {
    title: 'Cánh Tay Robot Lắp Ráp 6 Trục (KUKA SimReady)',
    forwardAxis: '+X (Đầu thao tác vươn dọc trục +X)',
    joints: [
      { name: 'Khớp Trụ Xoay Tròn (armBase_01_obj_00)', type: 'Revolute (Yaw/Xoay thân đế)', range: '-180° đến +180°', axis: 'Y' },
      { name: 'Khớp Nâng Thân Đứng (armheight_01_obj_00)', type: 'Prismatic (Độ cao đế)', range: '0m - 0.20m', axis: 'Y' },
      { name: 'Khớp Vai Chính (armShoulder_01_obj_00)', type: 'Revolute (Gập vai chính)', range: '-90° đến 0°', axis: 'Z' },
      { name: 'Khớp Khuỷu Tay (armShoulder_02_obj_00)', type: 'Revolute (Uốn khuỷu tay)', range: '-90° đến +45°', axis: 'Z' },
      { name: 'Khớp Cổ Tay Xoay (armShoulder_03_obj_00)', type: 'Revolute (Xoay đầu hàn/kẹp)', range: '-90° đến +90°', axis: 'X' },
      { name: 'Đầu Kẹp Thao Tác (armShoulder_04_obj_00)', type: 'Revolute (Điều hướng gắp)', range: '-90° đến +90°', axis: 'Y' }
    ]
  },
  robotic_system_a01: {
    title: 'Trạm Robot Tự Động 4 Nhánh (Multi-Arm Cell)',
    forwardAxis: 'Đa hướng tâm (Omni-radial)',
    joints: [
      { name: 'Trụ Thân Trung Tâm (base_01..05)', type: 'Rigid Core (Trục đỡ cố định)', range: 'Cố định', axis: 'Y' },
      { name: '4 Cánh Tay Thao Tác Nhỏ (elbowBig_01..04)', type: 'Revolute (Gập đa chiều)', range: '-80° đến +80°', axis: 'Tọa độ chéo' },
      { name: 'Bộ Trượt Tuyến Tính (slider_01..04)', type: 'Prismatic (Đẩy lắp linh kiện)', range: '0.32m', axis: 'X/Z' }
    ]
  },
  conveyor_belt_a05: {
    title: 'Mô-đun Băng Chuyền Dây Chuyền Ô Tô',
    forwardAxis: 'Dọc theo trục ray +Z',
    joints: [
      { name: 'Con Lăn Băng Chuyền', type: 'Continuous Motion', range: 'Tốc độ 1.2 m/s', axis: 'Z' }
    ]
  },
  engineAssembly_electric_engine_a01: {
    title: 'Cụm Động Cơ Điện Kép & Hộp Số EV Dual-Motor',
    forwardAxis: 'Trục truyền động bánh trước/sau',
    joints: [
      { name: 'Trục Rotor Điện', type: 'Rotational Rotor', range: '0 - 18,000 RPM', axis: 'X' }
    ]
  },
  bodyPart_hood_c01: {
    title: 'Nắp Capo Khí Động Học Ô Tô Điện',
    forwardAxis: 'Mặt hướng trước xe',
    joints: [
      { name: 'Bản Lề Mở Nắp (Hood Hinge)', type: 'Revolute (Lật nắp)', range: '0° đến 65°', axis: 'X' }
    ]
  },
  wheelAssembly_tire_c01: {
    title: 'Cụm Bánh Xe Sport Alloy 20 Inch',
    forwardAxis: 'Mặt lốp lăn tiếp xúc mặt đường',
    joints: [
      { name: 'Moay-ơ Trục Bánh (Wheel Hub)', type: 'Revolute (Quay trục lái & lăn)', range: '360°', axis: 'Z' }
    ]
  }
};

/**
 * Trình Quản Lý Cửa Sổ Soi & Chẩn Đoán Mô Hình 3D (SimReady Model Diagnostic Inspector)
 */
export class ModelInspectorModal {
  constructor() {
    this.modalEl = document.getElementById('inspector-modal');
    this.containerEl = document.getElementById('modal-canvas-container');
    this.selectEl = document.getElementById('modal-model-select');
    this.closeBtn = document.getElementById('modal-close');
    this.backdropEl = document.getElementById('modal-backdrop');

    this.btnWireframe = document.getElementById('modal-btn-wireframe');
    this.btnAxes = document.getElementById('modal-btn-axes');
    this.btnAnim = document.getElementById('modal-btn-anim');

    this.dimsEl = document.getElementById('diag-dims');
    this.jointsEl = document.getElementById('diag-joints');
    this.treeEl = document.getElementById('diag-tree');

    this.wireframeMode = false;
    this.showAxes = true;
    this.runAnim = true;

    this.currentModelKey = 'robotic_system_arm_b01';
    this.currentInstance = null;
    this.axesHelper = null;
    this.subJoints = {};

    this.initThree();
    this.initEvents();
  }

  initThree() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0f172a);

    // Lưới tọa độ sàn ô vuông
    const grid = new THREE.GridHelper(10, 20, 0x3b82f6, 0x1e293b);
    grid.position.y = -0.01;
    this.scene.add(grid);

    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    this.camera.position.set(2.8, 2.5, 3.8);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.target.set(0, 0.8, 0);

    // Ánh sáng chiếu soi chi tiết
    const ambient = new THREE.AmbientLight(0xffffff, 1.2);
    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.8);
    dirLight1.position.set(5, 8, 5);
    const dirLight2 = new THREE.DirectionalLight(0x60a5fa, 1.2);
    dirLight2.position.set(-5, 4, -5);
    this.scene.add(ambient, dirLight1, dirLight2);

    this.axesHelper = new THREE.AxesHelper(1.8);
    this.axesHelper.renderOrder = 999;
    this.axesHelper.material.depthTest = false;
    this.scene.add(this.axesHelper);

    // Mũi tên hướng tiến của xe/đầu gắp (Forward Vector Arrow: Màu Vàng)
    this.forwardArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0.05, 0), 2.2, 0xfacc15, 0.35, 0.18);
    this.scene.add(this.forwardArrow);

    this.clock = new THREE.Clock();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  initEvents() {
    this.closeBtn.addEventListener('click', () => this.hide());
    this.backdropEl.addEventListener('click', () => this.hide());

    document.getElementById('btn-model-inspector')?.addEventListener('click', () => {
      this.show(this.currentModelKey);
    });

    this.selectEl.addEventListener('change', (e) => {
      this.loadModel(e.target.value);
    });

    this.btnWireframe.addEventListener('click', () => {
      this.wireframeMode = !this.wireframeMode;
      this.btnWireframe.classList.toggle('active', this.wireframeMode);
      if (this.currentInstance) {
        this.currentInstance.traverse((child) => {
          if (child.isMesh && child.material) {
            child.material.wireframe = this.wireframeMode;
          }
        });
      }
    });

    this.btnAxes.addEventListener('click', () => {
      this.showAxes = !this.showAxes;
      this.btnAxes.classList.toggle('active', this.showAxes);
      this.axesHelper.visible = this.showAxes;
      this.forwardArrow.visible = this.showAxes;
    });

    this.btnAnim.addEventListener('click', () => {
      this.runAnim = !this.runAnim;
      this.btnAnim.classList.toggle('active', this.runAnim);
    });

    window.addEventListener('resize', () => {
      if (!this.modalEl.classList.contains('hidden')) {
        this.resize();
      }
    });
  }

  show(modelKey = null) {
    if (modelKey) {
      this.selectEl.value = modelKey;
      this.currentModelKey = modelKey;
    }
    this.modalEl.classList.remove('hidden');
    if (!this.containerEl.contains(this.renderer.domElement)) {
      this.containerEl.appendChild(this.renderer.domElement);
    }
    this.resize();
    this.loadModel(this.currentModelKey);
  }

  hide() {
    this.modalEl.classList.add('hidden');
  }

  resize() {
    const rect = this.containerEl.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      this.camera.aspect = rect.width / rect.height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(rect.width, rect.height);
    }
  }

  loadModel(modelKey) {
    this.currentModelKey = modelKey;
    if (this.currentInstance) {
      this.scene.remove(this.currentInstance);
      this.currentInstance = null;
    }
    this.subJoints = {};

    const instance = instantiateSimReady(modelKey, { scale: 1 });
    if (!instance) {
      this.dimsEl.innerHTML = '<div class="diag-stat"><span class="lbl">Trạng thái</span><span class="val">Chưa tải</span></div>';
      return;
    }

    this.currentInstance = instance;
    this.scene.add(instance);

    // Tính BoundingBox thực tế
    const box = new THREE.Box3().setFromObject(instance);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);

    this.controls.target.set(0, size.y * 0.45, 0);
    this.camera.position.set(size.x * 1.6 + 1.5, size.y * 1.1 + 1.2, size.z * 1.6 + 2.0);
    this.controls.update();

    // Tìm và liên kết các khớp chuyển động
    instance.traverse((child) => {
      const name = child.name;
      if (name.includes('armBase') || name.includes('armheight') || name.includes('armShoulder') || name.includes('sm_fork') || name.includes('sm_rudder') || name.includes('wheel')) {
        this.subJoints[name] = child;
      }
    });

    // Cập nhật hướng mũi tên Vector tiến
    if (modelKey.includes('forklift')) {
      // Forklift có mũi càng hướng theo trục +Z
      this.forwardArrow.setDirection(new THREE.Vector3(0, 0, 1));
      this.forwardArrow.setLength(size.z * 1.3);
    } else if (modelKey.includes('arm')) {
      // Robot vươn tay theo trục +X
      this.forwardArrow.setDirection(new THREE.Vector3(1, 0, 0));
      this.forwardArrow.setLength(size.x * 1.4);
    } else {
      this.forwardArrow.setDirection(new THREE.Vector3(0, 0, 1));
      this.forwardArrow.setLength(1.8);
    }

    this.renderDiagnostics(modelKey, size, box, instance);
  }

  renderDiagnostics(modelKey, size, box, instance) {
    // 1. Kích thước vật lý
    this.dimsEl.innerHTML = `
      <div class="diag-stat"><span class="lbl">Chiều Rộng X</span><span class="val">${size.x.toFixed(2)} m</span></div>
      <div class="diag-stat"><span class="lbl">Chiều Cao Y</span><span class="val">${size.y.toFixed(2)} m</span></div>
      <div class="diag-stat"><span class="lbl">Chiều Dài Z</span><span class="val">${size.z.toFixed(2)} m</span></div>
    `;

    // 2. Danh sách khớp động học
    const meta = SIMREADY_METADATA[modelKey] || {
      title: modelKey,
      forwardAxis: 'Chuẩn Three.js Y-up',
      joints: [{ name: 'Mô hình nguyên khối (Single Mesh)', type: 'Rigid', range: 'N/A', axis: 'N/A' }]
    };

    let jointsHtml = `<div class="joint-card" style="border-left-color: #facc15;"><div class="joint-header"><span>HƯỚNG TRỤC TIẾN CHÍNH</span><span>${meta.forwardAxis}</span></div></div>`;
    meta.joints.forEach((j) => {
      jointsHtml += `
        <div class="joint-card">
          <div class="joint-header">
            <span>${j.name}</span>
            <span style="color:#2563eb;">${j.type}</span>
          </div>
          <div class="joint-meta">Phạm vi: ${j.range} • Trục: ${j.axis}</div>
        </div>
      `;
    });
    this.jointsEl.innerHTML = jointsHtml;

    // 3. Cây phân cấp Scenegraph
    const treeLines = [];
    function walk(node, depth = 0) {
      if (treeLines.length > 40) return;
      const indent = '&nbsp;'.repeat(depth * 3);
      const isM = node.isMesh ? 'mesh' : node.name.includes('joint') ? 'joint' : '';
      const tag = node.isMesh ? '📦' : '⚙️';
      treeLines.push(`<div class="tree-node ${isM}">${indent}${tag} ${node.name || 'Group'}</div>`);
      if (node.children) {
        node.children.forEach((c) => walk(c, depth + 1));
      }
    }
    walk(instance);
    this.treeEl.innerHTML = treeLines.join('');
  }

  animate() {
    requestAnimationFrame(this.animate);
    if (this.modalEl.classList.contains('hidden')) return;

    const dt = this.clock.getDelta();
    const t = this.clock.getElapsedTime();

    if (this.runAnim && this.currentInstance) {
      // Mô phỏng động học khớp theo đúng cơ chế NVIDIA SimReady
      if (this.currentModelKey.includes('robotic_system_arm_b01')) {
        const jBase = this.subJoints['armBase_01_obj_00'];
        const jHeight = this.subJoints['armheight_01_obj_00'];
        const jSh1 = this.subJoints['armShoulder_01_obj_00'];
        const jSh2 = this.subJoints['armShoulder_02_obj_00'];
        const jSh3 = this.subJoints['armShoulder_03_obj_00'];
        const jSh4 = this.subJoints['armShoulder_04_obj_00'];

        if (jBase) jBase.rotation.y = Math.sin(t * 1.5) * 0.85;
        if (jHeight) jHeight.position.y = 0.585 + (Math.sin(t * 2) * 0.5 + 0.5) * 0.08;
        if (jSh1) jSh1.rotation.z = -Math.PI / 4 + Math.sin(t * 1.8) * 0.45;
        if (jSh2) jSh2.rotation.z = Math.cos(t * 1.6) * 0.55;
        if (jSh3) jSh3.rotation.x = Math.sin(t * 2.2) * 0.75;
        if (jSh4) jSh4.rotation.y = Math.cos(t * 2.5) * 0.85;
      } else if (this.currentModelKey.includes('forklift')) {
        const jFork = this.subJoints['sm_fork_a01_obj_00'];
        const jRudder = this.subJoints['sm_rudder_a01_obj_00'];
        if (jFork) {
          // Càng nâng chạy lên xuống nhịp nhàng
          jFork.position.y = 0.0038 + (Math.sin(t * 1.8) * 0.5 + 0.5) * 0.65;
        }
        if (jRudder) {
          jRudder.rotation.y = Math.sin(t * 2) * 0.45;
        }
      }
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
