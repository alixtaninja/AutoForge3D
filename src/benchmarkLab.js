import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { instantiateSimReady, onSimReadyAssetReady, QA_AUDIT_REGISTRY } from './simreadyLoader.js';
import { buildDetailedTruck, buildForklift, buildSleekCar, buildOptimizedLODRobotArm } from './factoryBuilder.js';

export class BenchmarkLabModal {
  constructor() {
    this.modalEl = document.getElementById('benchmark-modal');
    this.containerEl = document.getElementById('benchmark-canvas-container');
    this.closeBtn = document.getElementById('benchmark-modal-close');
    this.backdropEl = document.getElementById('benchmark-modal-backdrop');

    // Controls
    this.selectAsset = document.getElementById('bm-asset-select');
    this.countButtons = document.querySelectorAll('.bm-count-btn');
    this.btnShadows = document.getElementById('bm-toggle-shadows');
    this.btnInstancing = document.getElementById('bm-toggle-instancing');
    this.btnAnim = document.getElementById('bm-toggle-anim');
    this.dprButtons = document.querySelectorAll('.bm-dpr-btn');
    this.btnAutoRun = document.getElementById('bm-btn-autorun');

    // Telemetry display elements
    this.fpsValueEl = document.getElementById('bm-val-fps');
    this.frameTimeEl = document.getElementById('bm-val-frametime');
    this.drawCallsEl = document.getElementById('bm-val-drawcalls');
    this.trianglesEl = document.getElementById('bm-val-triangles');
    this.meshesEl = document.getElementById('bm-val-meshes');
    this.geomsEl = document.getElementById('bm-val-geoms');
    this.fpsBarEl = document.getElementById('bm-fps-bar');
    this.verdictBoxEl = document.getElementById('bm-verdict-box');
    this.autoRunLogEl = document.getElementById('bm-autorun-log');

    // State
    this.currentAsset = 'robotic_system_arm_b01_optimized';
    this.currentCount = 1;
    this.enableShadows = false;
    this.enableInstancing = true;
    this.enableAnim = true;
    this.currentDpr = 1.0;
    this.isAutoRunning = false;
    this.isOpen = false;

    // Benchmarking performance metrics
    this.lastTime = performance.now();
    this.frameCount = 0;
    this.fpsHistory = [];
    this.currentFps = 60;
    this.currentFrameTimeMs = 16.6;

    // Spawned objects container
    this.spawnGroup = new THREE.Group();
    this.animatedNodes = [];

    this.initThree();
    this.initEvents();
  }

  initThree() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0b1120);

    // Sàn lưới Benchmark công nghệ cao
    const grid = new THREE.GridHelper(50, 50, 0x3b82f6, 0x1e293b);
    grid.position.y = -0.01;
    this.scene.add(grid);

    this.camera = new THREE.PerspectiveCamera(45, 1, 0.2, 300);
    this.camera.position.set(4, 5, 8);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      stencil: false,
      depth: true
    });
    this.renderer.setPixelRatio(this.currentDpr);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = true;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.target.set(0, 1, 0);

    // Hệ thống chiếu sáng thử nghiệm
    this.ambientLight = new THREE.AmbientLight(0xffffff, 1.25);
    this.scene.add(this.ambientLight);

    this.dirLight = new THREE.DirectionalLight(0xfffbeb, 1.8);
    this.dirLight.position.set(10, 20, 15);
    this.dirLight.castShadow = this.enableShadows;
    this.dirLight.shadow.mapSize.width = 1024;
    this.dirLight.shadow.mapSize.height = 1024;
    const d = 25;
    this.dirLight.shadow.camera.left = -d;
    this.dirLight.shadow.camera.right = d;
    this.dirLight.shadow.camera.top = d;
    this.dirLight.shadow.camera.bottom = -d;
    this.dirLight.shadow.bias = -0.0003;
    this.scene.add(this.dirLight);

    this.scene.add(this.spawnGroup);

    this.clock = new THREE.Clock();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  initEvents() {
    this.closeBtn?.addEventListener('click', () => this.hide());
    this.backdropEl?.addEventListener('click', () => this.hide());

    document.getElementById('btn-benchmark-lab')?.addEventListener('click', () => {
      this.show();
    });

    this.selectAsset?.addEventListener('change', (e) => {
      this.currentAsset = e.target.value;
      this.rebuildBenchmarkScene();
    });

    this.countButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        this.countButtons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentCount = parseInt(btn.dataset.count, 10);
        this.rebuildBenchmarkScene();
      });
    });

    this.btnShadows?.addEventListener('click', () => {
      this.enableShadows = !this.enableShadows;
      this.btnShadows.classList.toggle('active', this.enableShadows);
      this.btnShadows.textContent = this.enableShadows ? '🌓 Bóng Đổ: BẬT' : '🌓 Bóng Đổ: TẮT';
      this.dirLight.castShadow = this.enableShadows;
      this.updateShadowCasters();
    });

    this.btnInstancing?.addEventListener('click', () => {
      this.enableInstancing = !this.enableInstancing;
      this.btnInstancing.classList.toggle('active', this.enableInstancing);
      this.btnInstancing.textContent = this.enableInstancing ? '⚡ Shared Ref: BẬT' : '⚡ Shared Ref: TẮT';
      this.rebuildBenchmarkScene();
    });

    this.btnAnim?.addEventListener('click', () => {
      this.enableAnim = !this.enableAnim;
      this.btnAnim.classList.toggle('active', this.enableAnim);
      this.btnAnim.textContent = this.enableAnim ? '🔄 Chuyển Động: BẬT' : '🔄 Chuyển Động: TẮT';
    });

    this.dprButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        this.dprButtons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentDpr = parseFloat(btn.dataset.dpr);
        this.renderer.setPixelRatio(this.currentDpr);
        this.resize();
      });
    });

    this.btnAutoRun?.addEventListener('click', () => {
      this.runAutomatedStressBenchmark();
    });
  }

  show() {
    this.isOpen = true;
    this.modalEl.classList.remove('hidden');
    if (!this.containerEl.contains(this.renderer.domElement)) {
      this.containerEl.appendChild(this.renderer.domElement);
    }
    this.resize();
    this.rebuildBenchmarkScene();
  }

  hide() {
    this.isOpen = false;
    this.modalEl.classList.add('hidden');
  }

  resize() {
    if (!this.containerEl) return;
    const w = this.containerEl.clientWidth || 640;
    const h = this.containerEl.clientHeight || 480;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  updateShadowCasters() {
    this.spawnGroup.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = this.enableShadows;
        child.receiveShadow = this.enableShadows;
      }
    });
  }

  clearSpawnGroup() {
    while (this.spawnGroup.children.length > 0) {
      const obj = this.spawnGroup.children[0];
      this.spawnGroup.remove(obj);
    }
    this.animatedNodes = [];
  }

  rebuildBenchmarkScene() {
    this.clearSpawnGroup();

    const count = this.currentCount;
    const asset = this.currentAsset;

    // Tính toán ma trận vị trí dạng lưới (Grid Layout)
    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);

    let spacingX = 3.5;
    let spacingZ = 3.5;
    let cameraDistance = 8;

    if (asset === 'detailed_truck') {
      spacingX = 5.0;
      spacingZ = 12.0;
      cameraDistance = Math.max(12, cols * 7);
    } else if (asset === 'sleek_car') {
      spacingX = 4.0;
      spacingZ = 6.5;
      cameraDistance = Math.max(8, cols * 5);
    } else if (asset.includes('arm')) {
      spacingX = 3.8;
      spacingZ = 3.8;
      cameraDistance = Math.max(7, cols * 4);
    } else if (asset.includes('pallet') || asset.includes('crate')) {
      spacingX = 2.0;
      spacingZ = 2.0;
      cameraDistance = Math.max(5, cols * 2.5);
    }

    const offsetX = ((cols - 1) * spacingX) / 2;
    const offsetZ = ((rows - 1) * spacingZ) / 2;

    // Tối ưu hóa InstancedMesh: Khi bật Shared Ref/Instancing cho vật thể lặp lại (pallet, crate, drum)
    const canUseInstancing = (asset.includes('pallet') || asset.includes('crate') || asset.includes('drum')) && this.enableInstancing;
    if (canUseInstancing) {
      const template = instantiateSimReady(asset);
      if (template) {
        const dummy = new THREE.Object3D();
        const submeshes = [];
        template.traverse((c) => {
          if (c.isMesh && c.geometry && c.material) {
            submeshes.push(c);
          }
        });

        if (submeshes.length > 0) {
          submeshes.forEach((meshTemplate) => {
            const instancedMesh = new THREE.InstancedMesh(meshTemplate.geometry, meshTemplate.material, count);
            instancedMesh.castShadow = this.enableShadows;
            instancedMesh.receiveShadow = this.enableShadows;

            for (let i = 0; i < count; i++) {
              const col = i % cols;
              const row = Math.floor(i / cols);
              const posX = col * spacingX - offsetX;
              const posZ = row * spacingZ - offsetZ;

              dummy.position.set(posX, 0, posZ);
              dummy.rotation.set(0, 0, 0);
              dummy.scale.set(1, 1, 1);
              dummy.updateMatrix();
              instancedMesh.setMatrixAt(i, dummy.matrix);
            }
            instancedMesh.instanceMatrix.needsUpdate = true;
            this.spawnGroup.add(instancedMesh);
          });

          this.updateShadowCasters();
          this.controls.target.set(0, 0.8, 0);
          this.camera.position.set(offsetX + cameraDistance * 0.7, cameraDistance * 0.8, offsetZ + cameraDistance);
          this.controls.update();
          return;
        }
      }
    }

    for (let i = 0; i < count; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const posX = col * spacingX - offsetX;
      const posZ = row * spacingZ - offsetZ;

      const item = this.createBenchmarkItem(asset, i);
      if (item) {
        item.position.set(posX, 0, posZ);
        this.spawnGroup.add(item);
      }
    }

    this.updateShadowCasters();

    // Điều chỉnh vị trí camera nhìn bao quát toàn bộ cụm vật thể
    const targetY = asset === 'detailed_truck' ? 2.5 : 1.2;
    this.controls.target.set(0, targetY, 0);
    this.camera.position.set(offsetX + cameraDistance * 0.7, cameraDistance * 0.8, offsetZ + cameraDistance);
    this.controls.update();
  }

  createBenchmarkItem(assetName, index) {
    if (assetName === 'detailed_truck') {
      const truck = buildDetailedTruck({
        id: `BM-TRK-${index}`,
        code: `TK-${index}`,
        company: 'AutoTrack Logistics',
        tagline: 'Benchmark Unit',
        bay: 'Bay 1'
      });
      truck.scale.setScalar(0.75);
      return truck;
    }

    if (assetName === 'sleek_car') {
      const car = buildSleekCar({
        id: `BM-CAR-${index}`,
        stage: 3,
        colorHex: index % 2 === 0 ? '#2563eb' : '#dc2626',
        colorName: 'Apex Racing'
      });
      return car;
    }

    if (assetName === 'robotic_arm_lod') {
      const lodArm = buildOptimizedLODRobotArm({ targetHeight: 2.35, rotationY: 0 });
      const joints = {};
      lodArm.traverse((child) => {
        if (child.name === 'armBase_01_obj_00') joints.base = child;
        if (child.name === 'armShoulder_01_obj_00') joints.shoulder = child;
        if (child.name === 'armShoulder_02_obj_00') joints.elbow = child;
        if (child.name === 'armShoulder_03_obj_00') joints.wrist = child;
      });
      this.animatedNodes.push({ type: 'arm', joints, seed: index * 0.4 });
      return lodArm;
    }

    // Các mô hình NVIDIA SimReady GLB
    const instance = instantiateSimReady(assetName);
    if (!instance) {
      // Fallback nếu mô hình đang nạp
      const placeholder = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 1.5, 1.5),
        new THREE.MeshStandardMaterial({ color: 0x3b82f6, wireframe: true })
      );
      placeholder.position.y = 0.75;
      onSimReadyAssetReady(assetName, () => {
        if (this.isOpen) this.rebuildBenchmarkScene();
      });
      return placeholder;
    }

    // Thu thập các khớp động học để phục vụ bài test animation
    if (assetName === 'robotic_system_arm_b01' || assetName === 'robotic_system_arm_b01_optimized') {
      const joints = {};
      instance.traverse((child) => {
        if (child.name === 'armBase_01_obj_00') joints.base = child;
        if (child.name === 'armShoulder_01_obj_00') joints.shoulder = child;
        if (child.name === 'armShoulder_02_obj_00') joints.elbow = child;
        if (child.name === 'armShoulder_03_obj_00') joints.wrist = child;
      });
      this.animatedNodes.push({ type: 'arm', joints, seed: index * 0.4 });
    } else if (assetName.startsWith('vehicle_forklift')) {
      let forkNode = null;
      let rudderNode = null;
      instance.traverse((child) => {
        if (child.name === 'sm_fork_a01_obj_00') forkNode = child;
        if (child.name === 'sm_rudder_a01_obj_00') rudderNode = child;
      });
      this.animatedNodes.push({ type: 'forklift', forkNode, rudderNode, seed: index * 0.5 });
    }

    return instance;
  }

  animate() {
    requestAnimationFrame(this.animate);
    if (!this.isOpen) return;

    const now = performance.now();
    const delta = now - this.lastTime;
    this.lastTime = now;

    // Tính toán FPS tức thời
    if (delta > 0) {
      const instantFps = 1000 / delta;
      // Exponential Moving Average để số đo mượt mà không rung giật
      this.currentFps = this.currentFps * 0.9 + instantFps * 0.1;
      this.currentFrameTimeMs = delta;
    }

    // Chạy động học khớp nối nếu bật chế độ Chuyển Động
    if (this.enableAnim && this.animatedNodes.length > 0) {
      const t = this.clock.getElapsedTime();
      this.animatedNodes.forEach((item) => {
        if (item.type === 'arm' && item.joints) {
          const s = item.seed;
          if (item.joints.base) item.joints.base.rotation.y = Math.sin(t * 1.5 + s) * 0.6;
          if (item.joints.shoulder) item.joints.shoulder.rotation.z = -0.4 + Math.sin(t * 2 + s) * 0.3;
          if (item.joints.elbow) item.joints.elbow.rotation.z = Math.cos(t * 2 + s) * 0.4;
          if (item.joints.wrist) item.joints.wrist.rotation.x = Math.sin(t * 3 + s) * 0.5;
        } else if (item.type === 'forklift') {
          const s = item.seed;
          if (item.forkNode) item.forkNode.position.y = 0.08 + Math.abs(Math.sin(t * 1.8 + s)) * 0.35;
          if (item.rudderNode) item.rudderNode.rotation.y = Math.sin(t * 2.2 + s) * 0.45;
        }
      });
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);

    this.frameCount++;
    if (this.frameCount % 5 === 0) {
      this.updateTelemetryHUD();
    }
  }

  updateTelemetryHUD() {
    if (!this.fpsValueEl) return;

    const fps = Math.round(this.currentFps * 10) / 10;
    this.fpsValueEl.textContent = `${fps.toFixed(1)} FPS`;

    // Đổi màu sắc theo mức độ mượt mà
    if (fps >= 55) {
      this.fpsValueEl.style.color = '#10b981'; // Xanh lá - Cực mượt
      if (this.fpsBarEl) this.fpsBarEl.style.backgroundColor = '#10b981';
    } else if (fps >= 35) {
      this.fpsValueEl.style.color = '#f59e0b'; // Vàng cam - Chấp nhận được
      if (this.fpsBarEl) this.fpsBarEl.style.backgroundColor = '#f59e0b';
    } else {
      this.fpsValueEl.style.color = '#ef4444'; // Đỏ - Giật lag
      if (this.fpsBarEl) this.fpsBarEl.style.backgroundColor = '#ef4444';
    }

    if (this.fpsBarEl) {
      const pct = Math.min(100, Math.max(0, (fps / 60) * 100));
      this.fpsBarEl.style.width = `${pct}%`;
    }

    if (this.frameTimeEl) {
      this.frameTimeEl.textContent = `${(this.currentFrameTimeMs).toFixed(1)} ms`;
    }

    // WebGL Pipeline stats
    const rInfo = this.renderer.info;
    if (this.drawCallsEl) this.drawCallsEl.textContent = rInfo.render.calls;
    if (this.trianglesEl) this.trianglesEl.textContent = rInfo.render.triangles.toLocaleString();

    let meshCount = 0;
    this.spawnGroup.traverse((child) => {
      if (child.isMesh) meshCount++;
    });
    if (this.meshesEl) this.meshesEl.textContent = meshCount;
    if (this.geomsEl) this.geomsEl.textContent = rInfo.memory.geometries;
  }

  /**
   * Chạy quy trình Thử Nghiệm Tự Động từ 1x đến 50x và sinh báo cáo chẩn đoán
   */
  async runAutomatedStressBenchmark() {
    if (this.isAutoRunning) return;
    this.isAutoRunning = true;
    this.btnAutoRun.disabled = true;
    this.btnAutoRun.textContent = '⏳ Đang Chạy Thử Nghiệm Stress Test...';

    const testTiers = [1, 5, 10, 25, 50];
    const results = [];

    this.autoRunLogEl.innerHTML = '<div class="log-line">🚀 Bắt đầu đo kiểm đa tầng hiệu năng GPU/CPU...</div>';

    for (const count of testTiers) {
      this.currentCount = count;
      this.countButtons.forEach((b) => {
        b.classList.toggle('active', parseInt(b.dataset.count, 10) === count);
      });
      this.rebuildBenchmarkScene();

      // Đợi 1.2s để FPS ổn định
      await new Promise((r) => setTimeout(r, 1200));

      const fpsSnap = Math.round(this.currentFps * 10) / 10;
      const callsSnap = this.renderer.info.render.calls;
      const trisSnap = this.renderer.info.render.triangles;

      results.push({ count, fps: fpsSnap, calls: callsSnap, tris: trisSnap });

      this.autoRunLogEl.innerHTML += `
        <div class="log-line">
          • Tầng <strong>${count}×</strong>: 
          <span style="color:${fpsSnap >= 55 ? '#10b981' : fpsSnap >= 35 ? '#f59e0b' : '#ef4444'}">${fpsSnap} FPS</span> 
          | Calls: <strong>${callsSnap}</strong> | Triangles: <strong>${(trisSnap / 1000).toFixed(0)}k</strong>
        </div>
      `;
      this.autoRunLogEl.scrollTop = this.autoRunLogEl.scrollHeight;
    }

    // Đánh giá nút thắt cổ chai
    const fps1 = results[0].fps;
    const fps50 = results[results.length - 1].fps;
    let verdict = '';
    let recommendation = '';

    if (fps50 >= 50) {
      verdict = '🟢 HIỆU NĂNG XUẤT SẮC (ULTRA SMOOTH)';
      recommendation = 'Phần cứng và trình duyệt của bạn xử lý WebGL rất mạnh mẽ. Bạn hoàn toàn có thể chạy ở chế độ "💎 Ultra CAD" với đầy đủ bóng đổ 1024x1024.';
    } else if (fps50 >= 30) {
      verdict = '🟡 HIỆU NĂNG KHÁ (STANDARD TWIN)';
      recommendation = 'Tốc độ khung hình giảm nhẹ khi nhân bản trên 25 vật thể do số lượng lệnh vẽ CPU tăng. Khuyến nghị: Giữ chế độ "⚡ 60 FPS Turbo" và bật Shared Ref.';
    } else {
      verdict = '🔴 NGHẼN BĂNG THÔNG GPU / CPU (BOTTLENECK DETECTED)';
      if (results[results.length - 1].calls > 500) {
        recommendation = 'Nghẽn tại CPU Draw Calls (hơn 500 lệnh vẽ/frame). Khuyến nghị: Bật Shared References, tắt bóng đổ nội thất và giữ số lượng chi tiết ở mức tinh giản.';
      } else {
        recommendation = 'Nghẽn tại GPU Vertex/Fillrate. Khuyến nghị: Chuyển DPR về 1.0× hoặc 0.75× trên màn hình 4K/Retina và tắt Shadows.';
      }
    }

    this.verdictBoxEl.innerHTML = `
      <div class="verdict-card">
        <div class="verdict-title">${verdict}</div>
        <p class="verdict-desc">${recommendation}</p>
      </div>
    `;

    this.btnAutoRun.disabled = false;
    this.btnAutoRun.textContent = '🚀 Chạy Lại Stress Test (1× → 50×)';
    this.isAutoRunning = false;
  }
}
