const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const MODELS_CONFIG = [
  // 1. Xe Nâng (Rất nặng: 330k tris -> giảm về ~40k tris, giữ nguyên cabin, vô lăng, càng nâng và decal)
  { file: 'vehicle_forklift_orange_a01.glb', ratio: 0.12, error: 0.0005, desc: 'Xe Nâng Yale Cam' },
  { file: 'vehicle_forklift_blue_a01.glb', ratio: 0.12, error: 0.0005, desc: 'Xe Nâng Yale Xanh' },

  // 2. Trạm Robot Đa Trục 4 Tay (592k tris -> giảm về ~60k tris)
  { file: 'robotic_system_a01.glb', ratio: 0.10, error: 0.0005, desc: 'Robot Đa Trục 4 Tay' },

  // 3. Động Cơ Điện EV (545k tris -> giảm về ~45k tris)
  { file: 'engineAssembly_electric_engine_a01.glb', ratio: 0.08, error: 0.0005, desc: 'Động Cơ Điện EV' },

  // 4. Băng Chuyền Công Nghiệp (229k tris -> giảm về ~25k tris)
  { file: 'conveyor_belt_a05.glb', ratio: 0.10, error: 0.0005, desc: 'Băng Chuyền SimReady' },

  // 5. Kệ Hàng Công Nghiệp (284k tris -> giảm về ~25k tris)
  { file: 'rack_h3m_s02.glb', ratio: 0.08, error: 0.0005, desc: 'Kệ Hàng Công Nghiệp H3m' },

  // 6. Xe Kéo Pallet Thấp (180k tris -> giảm về ~20k tris)
  { file: 'palletJack_lowProfile_a01.glb', ratio: 0.10, error: 0.0005, desc: 'Xe Kéo Pallet Thấp' },

  // 7. Cụm Bánh Lốp Xe (227k tris -> giảm về ~25k tris, giữ vân lốp và mâm thể thao)
  { file: 'wheelAssembly_tire_c01.glb', ratio: 0.10, error: 0.0008, desc: 'Cụm Bánh Lốp Xe EV' },

  // 8. Cản Trước & Nắp Capo & Cánh Cửa Ô Tô (các chi tiết dập cong CAD)
  { file: 'bodyPart_hood_c01.glb', ratio: 0.08, error: 0.0005, desc: 'Nắp Capo EV' },
  { file: 'bodyPart_bumper_front_d01.glb', ratio: 0.10, error: 0.0005, desc: 'Cản Trước EV' },
  { file: 'bodyPart_door_front_b01.glb', ratio: 0.10, error: 0.0005, desc: 'Cánh Cửa Trước EV' },

  // 9. Pallet & Cụm Hàng Hóa & Thùng
  { file: 'pallet_assembly_a02.glb', ratio: 0.15, error: 0.0005, desc: 'Cụm Pallet Gỗ A02' },
  { file: 'pallet_assembly_b01.glb', ratio: 0.15, error: 0.0005, desc: 'Cụm Pallet Gỗ B01' },
  { file: 'storage_tire_rack_c01.glb', ratio: 0.15, error: 0.0005, desc: 'Giá Để Lốp Xe' },
  { file: 'barrier_gate_safetyDock_a02.glb', ratio: 0.15, error: 0.0005, desc: 'Rào Chắn An Toàn Cửa Xuất Hàng' },
  { file: 'crate_blue_a01.glb', ratio: 0.15, error: 0.0005, desc: 'Thùng Nhựa Xanh' },
  { file: 'drum_plastic_blue_a01.glb', ratio: 0.20, error: 0.0005, desc: 'Phuy Nhựa Xanh' }
];

function getTris(filePath) {
  const buf = fs.readFileSync(filePath);
  const jsonLen = buf.readUInt32LE(12);
  const jsonChunk = buf.subarray(20, 20 + jsonLen).toString('utf8');
  const gltf = JSON.parse(jsonChunk);
  let tris = 0;
  if (gltf.meshes) {
    for (const mesh of gltf.meshes) {
      for (const prim of mesh.primitives) {
        if (prim.indices !== undefined) {
          const acc = gltf.accessors[prim.indices];
          tris += acc.count / 3;
        } else if (prim.attributes && prim.attributes.POSITION !== undefined) {
          const acc = gltf.accessors[prim.attributes.POSITION];
          tris += acc.count / 3;
        }
      }
    }
  }
  return { tris: Math.round(tris), sizeMb: (buf.length / 1024 / 1024).toFixed(2) };
}

const dir = path.join(__dirname, '../public/models/simready');
const backupDir = path.join(__dirname, '../public/models/simready_cad_backup');
if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

console.log('=== BẮT ĐẦU TỐI ƯU HÓA TOÀN DIỆN MÔ HÌNH 3D SIMREADY ===\n');

const results = [];

for (const cfg of MODELS_CONFIG) {
  const inputPath = path.join(dir, cfg.file);
  const backupPath = path.join(backupDir, cfg.file);
  const tempPath = path.join(dir, 'tmp_' + cfg.file);

  if (!fs.existsSync(inputPath)) {
    console.log(`[SKIP] Không tìm thấy file: ${cfg.file}`);
    continue;
  }

  // Sao lưu file CAD gốc nếu chưa có bản backup
  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(inputPath, backupPath);
  }

  const before = getTris(backupPath);

  console.log(`\n▶ Đang xử lý: ${cfg.desc} (${cfg.file})`);
  console.log(`  Gốc: ${before.tris.toLocaleString()} triangles | ${before.sizeMb} MB`);

  try {
    const cmd = `npx @gltf-transform/cli simplify "${backupPath}" "${tempPath}" --ratio ${cfg.ratio} --error ${cfg.error} --lock-border true`;
    execSync(cmd, { stdio: 'pipe' });

    if (fs.existsSync(tempPath)) {
      const after = getTris(tempPath);
      const reduction = (((before.tris - after.tris) / before.tris) * 100).toFixed(1);
      console.log(`  Sau tối ưu: ${after.tris.toLocaleString()} triangles | ${after.sizeMb} MB (Giảm ${reduction}%)`);

      // Ghi đè file chính
      fs.copyFileSync(tempPath, inputPath);
      fs.unlinkSync(tempPath);

      results.push({
        file: cfg.file,
        desc: cfg.desc,
        beforeTris: before.tris,
        afterTris: after.tris,
        beforeSize: before.sizeMb,
        afterSize: after.sizeMb,
        reduction: reduction + '%'
      });
    }
  } catch (err) {
    console.error(`  [LỖI] khi tối ưu ${cfg.file}:`, err.message);
  }
}

console.log('\n=== TỔNG KẾT KẾT QUẢ TỐI ƯU HÓA TOÀN BỘ 3D ASSETS ===');
console.table(results);

fs.writeFileSync(path.join(__dirname, '../tests/optimization_summary.json'), JSON.stringify(results, null, 2));
