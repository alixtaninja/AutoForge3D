# AutoForge 3D — Lộ Trình Tính Năng Tương Lai (Future Roadmap & Backlog)

> **Trạng thái hiện tại (Baseline):**
> Nhà máy trực tuyến (Live Factory) đang chạy **100% bằng mô hình Three.js Twin** siêu nhẹ (`0 MB GLB Stream` lúc khởi động, đạt 60 FPS ổn định). Toàn bộ các file NVIDIA SimReady GLB (đã tinh gọn `-75%` polygon) vẫn được lưu trữ tại `public/models/simready/` để phục vụ cho **🔬 Soi Mô Hình 3D** (`src/modelInspector.js`), **📊 Benchmark Lab** (`src/benchmarkLab.js`), và làm nền tảng cho cơ chế Hybrid LOD trong tương lai.

---

## 1. Ưu Tiên Cao — Hybrid `THREE.LOD` & Tự Nạp SimReady GLB Khi Zoom Cận Cảnh

### Mục tiêu
Kết hợp tốc độ tức thì của **Three.js Twin** ở góc nhìn toàn cảnh với độ chi tiết CAD cơ khí của **NVIDIA SimReady GLB** khi người dùng zoom sát vào một thiết bị cụ thể, giúp mở rộng quy mô lên hàng chục nhà xưởng mà không gây tràn VRAM/RAM hoặc nghẽn băng thông.

### Kiến trúc đề xuất
- **Ngưỡng khoảng cách Camera (`camera.position.distanceTo(object.position)`):**
  - `d < 18m` (**Close-up / Inspection**): Tự động kích hoạt `loadSingleSimReadyAsset(key)` (lazy-load qua network + cache) để hot-swap từ Three.js Twin sang SimReady GLB (bản tinh gọn 33k–58k hoặc bản chuẩn).
  - `18m <= d <= 45m` (**Operational View**): Dùng **Three.js Twin** (0.2k–4.6k tris) giữ nguyên toàn bộ animation (cánh tay robot gắp, xe nâng chạy, băng chuyền quay).
  - `d > 45m` (**Campus Overview / Far Culling**): Ẩn bớt chi tiết phụ nhỏ (ốc vít, thanh giằng mảnh) hoặc chuyển sang bounding/proxy siêu nhẹ.
- **Quản lý bộ nhớ & Cache (LRU Memory Manager):**
  - Giới hạn số lượng SimReady GLB được giữ trong GPU memory cùng lúc (ví dụ tối đa `8–12` cụm thiết bị gần camera nhất).
  - Khi camera di chuyển ra xa (`d > 25m` trong hơn `10s`), chuyển lại về Three.js Twin và gọi `geometry.dispose()` / `material.dispose()` cho GLB ở phân khu cũ nếu vượt ngưỡng bộ nhớ.
- **Đồng bộ trạng thái Animation khi Swap:**
  - Truyền góc khớp hiện tại (`baseYaw`, `shoulderPitch`, `elbowPitch`, `wristPitch`) từ Three.js Twin sang rig của SimReady GLB khi swap để chuyển động không bị giật cục.
- **Tùy chọn người dùng (UI Toggle):**
  - Thêm công tắc trên thanh điều khiển: `Auto HD Zoom (SimReady GLB)` (Bật/Tắt) để người dùng máy yếu có thể khóa cứng ở chế độ `100% Three.js Twin`.

### Checklist triển khai
- [ ] Xây dựng `HybridLodController` trong `src/lodController.js` theo dõi khoảng cách camera mỗi `250ms` (throttled, không chạy mỗi frame).
- [ ] Bổ sung debounce khi người dùng đang kéo/zoom nhanh để tránh tải nhầm GLB của các máy lướt qua.
- [ ] Hiển thị badge nhỏ `HD GLB Loaded` trên thẻ Inspector bên phải khi đối tượng đang chọn được nâng cấp lên SimReady GLB.
- [ ] Kiểm thử chuyển đổi qua lại Twin ↔ GLB nhiều lần để đảm bảo không rò rỉ bộ nhớ WebGL (`renderer.info.memory.geometries`).

---

## 2. Ưu Tiên Trung Bình — Tối Ưu Mở Rộng Đa Nhà Xưởng & Đa Dây Chuyền (Multi-Factory Scalability)

Khi triển khai nhiều nhà xưởng, nhiều dây chuyền và hàng trăm cánh tay robot cùng lúc:

- [ ] **`THREE.InstancedMesh` cho các vật thể tĩnh lặp lại:**
  - Gom toàn bộ `rack_h3m_s02_twin`, `conveyor_belt_a05_twin`, pallet gỗ, rào chắn an toàn, thùng hàng vào `InstancedMesh` để giảm hàng trăm Draw Calls xuống còn **1 Draw Call / loại vật liệu**.
- [ ] **Draw Call Batching (`BufferGeometryUtils.mergeGeometries`):**
  - Gộp các chi tiết tĩnh trong cùng một khung nhà xưởng theo từng vật liệu chuẩn (`steel`, `darkSteel`, `safetyYellow`).
- [ ] **Zone / Frustum Animation Freezing:**
  - Tạm dừng `updateSimulation()` cho các dây chuyền hoặc nhà xưởng nằm ngoài vùng nhìn thấy của camera (`THREE.Frustum` hoặc theo khoảng cách phân khu) để tiết kiệm CPU.
- [ ] **Multi-Factory Switcher & Lazy Scene Mounting:**
  - Cho phép chuyển đổi giữa các nhà máy (`PLT-01 Riverside`, `PLT-02 Austin`, `PLT-03 Detroit`) mà chỉ mount geometry của nhà máy đang hoạt động.

---

## 3. Ưu Tiên Tiếp Theo — Mở Rộng Bộ Thư Viện Three.js Twin & Công Cụ

- [ ] **Bổ sung Three.js Twin cho các asset phụ còn lại trong SimReady:**
  - `bodyPart_hood_c01` (Nắp capo ô tô)
  - `bodyPart_door_b01` (Cửa xe ô tô)
  - `bodyPart_bumper_a01` (Cản trước/sau)
  - `palletJack_lowProfile_a01` (Xe nâng tay thủy lực)
  - `storage_tire_rack_c01` (Giá để lốp xe)
- [ ] **Tích hợp kiểm thử tự động Visual QA:**
  - Lưu script chụp ảnh so sánh tự động (`Puppeteer`) mỗi khi chỉnh sửa hình khối Three.js Twin để đảm bảo tính chân thực và tỷ lệ chính xác.

---

## 4. Ghi Chú Bổ Sung (Dành Cho Các Tính Năng Phát Sinh)

> *Khu vực này dùng để ghi nhận nhanh các yêu cầu mới phát sinh trong quá trình phát triển:*

- *(Chưa có ghi chú thêm — cập nhật trực tiếp tại đây khi phát sinh tính năng mới)*
