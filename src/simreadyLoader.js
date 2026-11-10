import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

/**
 * Bộ quản lý tải và nhân bản (clone) các mô hình 3D NVIDIA SimReady GLB
 * đã được nén tối ưu cho Three.js (EXT_meshopt_compression + EXT_texture_webp)
 * Nguồn gốc: nvidia/simready-assets -> codepawl/simready-glb (CC-BY 4.0)
 * Lưu trữ cục bộ & Mirror: alixtaninja/simready-glb
 */
const gltfLoader = new GLTFLoader();
gltfLoader.setMeshoptDecoder(MeshoptDecoder);

const modelCache = new Map();

export const SIMREADY_ASSETS = [
  'vehicle_forklift_orange_a01',
  'vehicle_forklift_blue_a01',
  'pallet_assembly_a02',
  'pallet_assembly_b01',
  'pallet_a01',
  'box_cardboard_a01',
  'crate_blue_a01',
  'rack_h3m_s02',
  'storage_tire_rack_c01',
  'robotic_system_arm_b01',
  'robotic_system_a01',
  'conveyor_belt_a05',
  'engineAssembly_electric_engine_a01',
  'bodyPart_hood_c01',
  'bodyPart_door_front_b01',
  'bodyPart_bumper_front_d01',
  'wheelAssembly_tire_c01',
  'palletJack_lowProfile_a01',
  'barrier_gate_safetyDock_a02',
  'drum_plastic_blue_a01'
];

/**
 * Chuẩn hóa một mô hình GLTF sao cho tâm đáy (bottom-center) nằm tại (0, 0, 0)
 * và bật đổ bóng (castShadow / receiveShadow) cho toàn bộ Mesh.
 */
function normalizeSceneTemplate(rootScene) {
  const wrapper = new THREE.Group();
  const cloned = rootScene.clone(true);

  cloned.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      if (child.material) {
        child.material.envMapIntensity = 1.15;
      }
    }
  });

  // Tính BoundingBox thực tế để đưa đáy về Y = 0 và tâm X, Z về 0
  const box = new THREE.Box3().setFromObject(cloned);
  const center = new THREE.Vector3();
  box.getCenter(center);

  cloned.position.set(-center.x, -box.min.y, -center.z);
  wrapper.add(cloned);

  const size = new THREE.Vector3();
  box.getSize(size);
  wrapper.userData.originalSize = size;

  return wrapper;
}

/**
 * Tải trước toàn bộ danh sách mô hình NVIDIA SimReady GLB và cập nhật tiến độ
 */
export async function preloadSimReadyModels(onProgress) {
  let loadedCount = 0;
  const total = SIMREADY_ASSETS.length;

  const promises = SIMREADY_ASSETS.map(async (assetName) => {
    const url = `${import.meta.env.BASE_URL}models/simready/${assetName}.glb`;
    try {
      const gltf = await gltfLoader.loadAsync(url);
      const template = normalizeSceneTemplate(gltf.scene);
      modelCache.set(assetName, template);
    } catch (err) {
      console.warn(`[SimReady] Không thể tải ${assetName}.glb:`, err);
    } finally {
      loadedCount += 1;
      if (onProgress) {
        onProgress(loadedCount, total, assetName);
      }
    }
  });

  await Promise.all(promises);
  return modelCache;
}

/**
 * Lấy bản sao (clone) của một mô hình NVIDIA SimReady đã tải và tự động co giãn
 * theo chiều cao mục tiêu (targetHeight) hoặc tỷ lệ (scale)
 */
export function instantiateSimReady(assetName, { targetHeight = null, scale = 1, rotationY = 0 } = {}) {
  const template = modelCache.get(assetName);
  if (!template) return null;

  const instance = template.clone(true);
  const origSize = template.userData.originalSize || new THREE.Vector3(1, 1, 1);

  if (targetHeight && origSize.y > 0.001) {
    const s = (targetHeight / origSize.y) * scale;
    instance.scale.setScalar(s);
  } else {
    instance.scale.setScalar(scale);
  }

  if (rotationY !== 0) {
    instance.rotation.y = rotationY;
  }

  return instance;
}
