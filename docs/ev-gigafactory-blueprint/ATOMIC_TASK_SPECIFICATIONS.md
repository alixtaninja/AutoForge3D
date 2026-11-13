# ĐẶC TẢ KỸ THUẬT CHI TIẾT 16 TASK NGUYÊN TỬ (ATOMIC TASK SPECIFICATIONS)
## Dự án: EV Gigafactory 350Ha — Industrial City-Builder & EPC Time-Lapse Engine

> **Mục đích**: Tài liệu này định nghĩa **Hợp đồng Kỹ thuật (Technical Contract)** cho từng Task từ `TASK-001` đến `TASK-016`.  
> Mỗi AI Agent khi nhận một `TASK-xxx` từ [MULTI_AGENT_DISPATCH_BOARD.md](./MULTI_AGENT_DISPATCH_BOARD.md) **phải** tuân thủ đúng đường dẫn file, tên hàm `export`, cấu trúc tham số và tiêu chuẩn nghiệm thu dưới đây để các module tự động khớp nối với nhau 100%.

---

## QUY ƯỚC HỆ TỌA ĐỘ CHUNG & TỶ LỆ HIỂN THỊ (SMART SCENIC SCALE)

Mọi module trong `src/gigafactory/` đều sử dụng chung bộ chuyển đổi tọa độ được định nghĩa tại `src/gigafactory/config/masterSpecLoader.js`:

- **Tọa độ Bản vẽ gốc (`gigafactory_digital_twin_spec.json`)**:
  - `X_bp`: `0 .. 2500` (mét, Tây sang Đông)
  - `Y_bp`: `0 .. 1400` (mét, Nam lên Bắc)
  - `Z_bp`: `-6 .. +36` (mét, Cao độ thẳng đứng)
- **Hệ số Tỷ lệ Thông minh (`Smart Scenic Scale`)**:
  - `WORLD_SCALE = 0.25`: Khu đất `2500m × 1400m` được ánh xạ thành mặt phẳng `625 × 350` đơn vị Three.js (tâm `(0, 0, 0)` tại chính giữa khu đất `X_bp = 1250, Y_bp = 700`).
  - `HEIGHT_SCALE = 0.35`: Tôn chiều cao các nhà xưởng, cẩu tháp và cầu nối Skybridge thêm 40% so với mặt bằng ngang để góc quay Drone / YouTube Stream nhìn hùng vĩ, nổi khối rõ ràng.
  - `SCENIC_PROP_BOOST = 1.65`: Áp dụng cho xe cẩu, xe lu, máy xúc, xe bồn, đèn đường, đèn tín hiệu giao thông, biển báo chỉ đường, ván ép, cuộn thép để người xem Livestream nhìn thấy rõ hoạt động thi công từ góc máy trung cảnh.
- **Công thức chuyển đổi chuẩn**:
  ```js
  export const WORLD_SCALE = 0.25;
  export const HEIGHT_SCALE = 0.35;
  export const SCENIC_PROP_BOOST = 1.65;

  export function bpTo3JS(xBp, yBp, zBp = 0) {
    return {
      x: (xBp - 1250) * WORLD_SCALE,
      y: zBp * HEIGHT_SCALE,
      z: (700 - yBp) * WORLD_SCALE // Y_bp hướng Bắc -> -Z trong Three.js
    };
  }
  ```

---

## DANH MỤC 16 TASK NGUYÊN TỬ (ATOMIC TASKS)

---

### 🔹 `TASK-001`: Bộ Nạp Dữ Liệu Quy Hoạch & Hệ Quy Chiếu Tọa Độ (`masterSpecLoader.js` & `constructionStagesSpec.js`)
- **Phụ thuộc**: Không (`Root Task`)
- **Agent đề xuất**: `Chief_Orchestrator_Agent` hoặc `Google Jules`
- **File được phép tạo/sửa**:
  - `src/gigafactory/config/masterSpecLoader.js` (Tạo mới)
  - `src/gigafactory/config/constructionStagesSpec.js` (Tạo mới)
- **Yêu cầu chi tiết**:
  1. Import hoặc nhúng dữ liệu từ `docs/ev-gigafactory-blueprint/gigafactory_digital_twin_spec.json` và `docs/ev-gigafactory-blueprint/construction_stages_manifest.json`.
  2. Export các hằng số `WORLD_SCALE`, `HEIGHT_SCALE`, `SCENIC_PROP_BOOST` và các hàm tiện ích:
     - `bpTo3JS(xBp, yBp, zBp = 0)` -> `{ x, y, z }`
     - `bpBoundsTo3JS(bounds_m)` -> `{ centerX, centerZ, widthX, depthZ, heightY, basementY, minX, maxX, minZ, maxZ }`
     - `getAllBuildingsSpec()` -> Trả về mảng 24 tòa nhà kèm tọa độ đã quy đổi sang Three.js và lịch trình tháng xây dựng (`startMonth`, `endMonth`) của từng tòa.
     - `getSkybridgesSpec()` -> Trả về mảng 5 cầu nối `SB-01..05` đã quy đổi tọa độ.
     - `getRoadCorridorsSpec()` -> Trả về mảng 8 đại lộ chính đã quy đổi tọa độ.
     - `getBuildingStageAtMonth(buildingId, currentMonth)` -> Trả về `{ stageIndex: 0..4, stageProgress: 0..1, stageName: 'SURVEY' | 'FOUNDATION' | 'STEEL_FRAME' | 'ENVELOPE' | 'OPERATIONAL' }`.
- **Tiêu chí nghiệm thu (DoD)**:
  - `npm run build` thành công.
  - Hàm `getAllBuildingsSpec()` trả về đủ 24 hạng mục (`F01..UT05`) không bị chồng lấn tọa độ.

---

### 🔹 `TASK-002`: Bộ Quản Lý Tiến Độ Xây Dựng 24 Tháng EPC & Tương Tác Click Xây Từng Khu (`constructionTimeline.js`)
- **Phụ thuộc**: `TASK-001`
- **File được phép tạo/sửa**:
  - `src/gigafactory/core/constructionTimeline.js` (Tạo mới)
- **Yêu cầu chi tiết**:
  1. Xây dựng class `ConstructionTimelineController`:
     - Quản lý `currentMonth` (`0.0` đến `24.0`), trạng thái `isPlaying` (`true/false`), `playbackSpeed` (`1`, `2`, `5`, `10` tháng/giây).
     - Cho phép **Manual Override theo từng tòa nhà**: `advanceBuildingStage(buildingId)` hoặc `setBuildingStage(buildingId, stageIndex)` khi người dùng click trực tiếp vào một lô đất/nhà xưởng trên màn hình Stream để kích hoạt xây ngay khu đó!
     - Tính toán KPI thời gian thực theo tiến độ để hiển thị lên HUD:
       - `steelTonsErected` (`0 -> 145,000 tấn`)
       - `concreteCubicMeters` (`0 -> 680,000 m³`)
       - `solarMegawatts` (`0 -> 120 MWp`)
       - `robotsInstalled` (`0 -> 1,820 robot`)
       - `activeEpoch` (`E0..E6` kèm mô tả tiếng Việt đang diễn ra).
     - Phát sự kiện callback `onUpdate(state)` mỗi khi `currentMonth` hoặc trạng thái tòa nhà thay đổi.
- **Tiêu chí nghiệm thu (DoD)**:
  - Có đầy đủ method `play()`, `pause()`, `setMonth(m)`, `setSpeed(s)`, `advanceBuildingStage(id)`, `update(dt)`.

---

### 🔹 `TASK-003`: Quy Hoạch Địa Hình 350 Ha, Hồ Điều Hòa & Phân Lô 24 Khu Đất Cắm Mốc (`terrainAndEarthwork.js`)
- **Phụ thuộc**: `TASK-001`
- **File được phép tạo/sửa**:
  - `src/gigafactory/infra/terrainAndEarthwork.js` (Tạo mới)
- **Yêu cầu chi tiết**:
  1. Export hàm `buildGigafactoryTerrain(scene, spec)`:
     - Tạo nền đất tổng thể mở rộng `900 × 600` đơn vị Three.js xung quanh khu đất `625 × 350` (gồm thảm cỏ sinh thái, vành đai cây xanh cách ly, bờ sông/kênh thoát nước phía Đông và Hồ điều hòa sinh thái có mặt nước phản chiếu).
     - Dựng tường rào bảo vệ chu vi khu công nghiệp 350 ha.
     - Tạo **24 Ô Phân Lô Đất Xây Dựng (`Plot Pads`)** đúng tọa độ `bpBoundsTo3JS(b.bounds_m)`:
       - Ở `Stage 0 (Survey & Earthwork)`: Hiển thị nền đất san lấp màu nâu cát, viền cọc mốc trắc địa màu đỏ-trắng, hàng rào tôn xanh công trường và bảng tên phân khu nổi (`F01 GIGA-CASTING`, `F05 GENERAL ASSEMBLY`, v.v.).
       - Gắn `userData = { isGigafactoryPlot: true, buildingId: b.id, buildingSpec: b }` vào từng lô đất để người dùng có thể Click chọn xem thông tin hoặc bấm nút **"🏗️ Thi Công Bậc Tiếp Theo"**.
  2. Export hàm `updateTerrainEarthworkByMonth(terrainGroup, timelineState)` để chuyển đổi bề mặt lô đất từ đất đào móng -> nền bê tông xám phẳng khi tòa nhà đạt `Stage >= 1`.
- **Ngân sách hiệu năng**: `< 15.000 triangles`, `< 30 Draw Calls`.

---

### 🔹 `TASK-004`: Mạng Lưới Đường Đại Lộ 6 Làn, Ngã Tư, Vòng Xuyến & Cổng Logistics (`roadNetworkBuilder.js`)
- **Phụ thuộc**: `TASK-001`
- **File được phép tạo/sửa**:
  - `src/gigafactory/infra/roadNetworkBuilder.js` (Tạo mới)
- **Yêu cầu chi tiết**:
  1. Export hàm `buildGigafactoryRoadNetwork()`:
     - Đọc 8 tuyến đường chính từ `getRoadCorridorsSpec()` (`RD-SOUTH-MAIN` 6 làn, `RD-SPINE-SOUTH`, `RD-SPINE-NORTH`, `RD-WEST-LOGISTICS`, `RD-CROSS-1..4`) và các nhánh rẽ vào 24 khu nhà.
     - Hỗ trợ **2 trạng thái thi công đường** theo `currentMonth`:
       - `Tháng 0 .. 2.5` (Đang làm đường): Mặt đường cấp phối đá dăm/đất đầm nén, có đoạn đang rải nhựa đen một nửa để đặt Xe lu (`Road Roller`) và Xe rải thảm nhựa hoạt động!
       - `Tháng >= 2.5` (Đường hoàn thiện): Mặt nhựa Asphalt đen mịn (`#26292E`), bó vỉa bê tông hai bên, dải phân cách trồng cỏ giữa Đại lộ Nam 6 làn, vạch kẻ phân làn đứt đoạn màu trắng, vạch liền vàng, vạch sang đường đi bộ (`Zebra Crossing`) tại 12 ngã tư, và 2 Cổng Chào + Trạm Cân Điện Tử tại Cổng Tây (Logistics) & Cổng Nam (R&D/Admin).
  2. Gom toàn bộ vạch kẻ đường bằng `BufferGeometryUtils.mergeGeometries` hoặc `InstancedMesh` để chỉ tốn **1 Draw Call** cho toàn bộ vạch kẻ đường của 350 ha!
- **Ngân sách hiệu năng**: `< 12.000 triangles`, `< 15 Draw Calls`.

---

### 🔹 `TASK-005`: Hạ Tầng Giao Thông Thông Minh — Đèn Đường, Đèn Tín Hiệu 3 Màu, Biển Chỉ Đường & Cây Xanh (`trafficPropsBuilder.js`)
- **Phụ thuộc**: `TASK-001`, `TASK-004`
- **File được phép tạo/sửa**:
  - `src/gigafactory/infra/trafficPropsBuilder.js` (Tạo mới)
- **Yêu cầu chi tiết**:
  1. Export hàm `buildTrafficAndUrbanProps()` trả về `{ group, updateTrafficLights(elapsedTime, currentMonth) }`:
     - **Hệ thống Đèn Đường Cao Áp LED + Pin Mặt Trời (`~320 cột`, dùng `InstancedMesh`)**: Dựng dọc hai bên các đại lộ; gồm thân cột thép mạ kẽm cao vươn ra đường, tấm pin mặt trời nhỏ trên đỉnh và bầu đèn LED phát sáng vàng/trắng ấm.
     - **Hệ thống Đèn Tín Hiệu Giao Thông 3 Màu (`32 cột` tại 8 ngã tư lớn)**: Cột cần vươn chữ L sơn xám đậm, hộp đèn 3 bóng **Đỏ - Vàng - Xanh lá** (`emissive` đổi màu theo chu kỳ 12 giây thực tế: Bắc-Nam Xanh thì Đông-Tây Đỏ và ngược lại!).
     - **Hệ thống Biển Báo Chỉ Đường Phân Khu (`48 biển chỉ dẫn`, dùng CanvasTexture sắc nét)**:
       - Biển cổng long môn (Overhead Highway Gantry Signs) bắc ngang Đại lộ Nam và Trục Tây: nền xanh dương cao tốc (`#0D47A1`), chữ trắng phản quang chỉ hướng: `⬆️ F01-F03: CASTING & BIW | ➡️ F04-F05: PAINT & ASSEMBLY | ⬅️ WH01: AS/RS LOGISTICS`.
       - Biển giới hạn tốc độ (`40 km/h`), biển cảnh báo xe tự hành AGV băng qua đường.
     - **Vành đai Cây Xanh Đô Thị (`~800 cây`, dùng `InstancedMesh`)**: Trồng dọc đại lộ và quanh hồ điều hòa (xuất hiện dần từ `Epoch 1` đến `Epoch 5`).
- **Ngân sách hiệu năng**: Dùng `InstancedMesh` triệt để, tổng `< 25 Draw Calls`, `< 35.000 triangles`.

---

### 🔹 `TASK-006`: Chế Tạo Bộ Three.js Twin Máy Công Trình Hạng Nặng (`heavyMachineryTwins.js`)
- **Phụ thuộc**: Không (Độc lập hoàn toàn — có thể làm song song ngay lập tức!)
- **Agent đề xuất**: `ConstructionFleet_Forge_Agent` hoặc `Google Jules`
- **File được phép tạo/sửa**:
  - `src/gigafactory/assets/heavyMachineryTwins.js` (Tạo mới)
- **Yêu cầu chi tiết**:
  Xây dựng 6 hàm tạo mô hình 3D Three.js Twin chất lượng cao, tỷ lệ công nghiệp chân thực, có khớp chuyển động (`userData.joints` hoặc hàm `animate`) để vừa chạy ngoài đại công trường 350ha, vừa xem cận cảnh được trong `🔬 Soi Mô Hình 3D`:
  1. `buildTowerCraneTwin(options = { height: 42, jibLength: 38, color: 0xF59E0B })`:
     - Chân đế bê tông đối trọng, thân tháp khung giằng mắt cáo chữ X màu vàng cam công trình, buồng lái kính trên đỉnh, cần chính (`Jib`) dài có xe con (`Trolley`), cần đối trọng gắn khối bê tông xám, dây cáp đôi và móc cẩu đang treo một dầm thép chữ H. Hỗ trợ xoay `slewingPivot.rotation.y`. (`~1.400 tris`)
  2. `buildCrawlerCraneTwin(options)`:
     - Cẩu bánh xích 250 tấn (2 dải bánh xích đen bản rộng, thân xoay màu đỏ/vàng Liebherr/Manitowoc, cần khung mắt cáo vươn nghiêng 65°, cáp treo). (`~1.200 tris`)
  3. `buildRoadRollerTwin(options)`:
     - Xe lu rung làm đường Hamm/Dynapac (Trống lu thép tròn lớn sáng bóng phía trước có khung gạt bùn, khớp nối giữa, cabin kính có mái che vàng + đèn cảnh báo xoay, động cơ sau và 2 bánh lốp gai lớn). (`~950 tris`)
  4. `buildExcavatorTwin(options)`:
     - Máy xúc đào đất thủy lực Komatsu/CAT (Bánh xích kép, thân xoay 360°, cabin kính lệch trái, cần chính `Boom` + tay gầu `Stick` + gầu đào răng thép `Bucket` + xi-lanh thủy lực mạ crôm). (`~1.150 tris`)
  5. `buildBulldozerTwin(options)`:
     - Xe ủi đất hạng nặng CAT D9 (Lưỡi ủi thép cong khổng lồ phía trước có 2 xi-lanh nâng, bánh xích tam giác cao, khoang máy khỏe khoắn, cày xới đất phía sau). (`~980 tris`)
  6. `buildConcreteMixerTruckTwin(options)` & `buildHeavyFlatbedTrailerTwin(options)`:
     - Xe bồn trộn bê tông (Đầu xe tải 4 trục, bồn trộn hình giọt nước nghiêng 15° có dải xoắn ốc màu xanh/trắng xoay tròn khi chạy, phễu đổ bê tông phía sau). (`~1.250 tris`)
     - Xe đầu kéo rơ-moóc sàn thấp chở dầm thép/cuộn tôn/máy công nghiệp. (`~1.100 tris`)
  7. Export danh mục `CONSTRUCTION_MACHINERY_CATALOG` để dễ dàng đăng ký vào `ModelInspectorModal`.
- **Tiêu chí nghiệm thu (DoD)**:
  - Mỗi model `< 1.800 triangles`, dùng vật liệu PBR (`MeshStandardMaterial` metalness/roughness hợp lý), đặt đáy chuẩn tại `y = 0`.
  - `npm run build` thành công.

---

### 🔹 `TASK-007`: Chế Tạo Bộ Three.js Twin Vật Tư Xây Dựng & Công Nghiệp (`constructionMaterialsTwins.js`)
- **Phụ thuộc**: Không (Độc lập hoàn toàn — có thể làm song song ngay lập tức!)
- **Agent đề xuất**: `ConstructionMaterial_Forge_Agent` hoặc `Google Jules`
- **File được phép tạo/sửa**:
  - `src/gigafactory/assets/constructionMaterialsTwins.js` (Tạo mới)
- **Yêu cầu chi tiết**:
  Xây dựng 6 hàm tạo mô hình vật tư phục vụ thi công và sản xuất:
  1. `buildPlywoodFormworkStackTwin()`: Kiện ván ép cốt pha phủ phim đen & ván gỗ thông xếp chồng trên thanh đà gỗ, buộc đai thép đen, có tấm bạt che một góc. (`~180 tris`)
  2. `buildSteelCoilTwin(options = { isAluminum: false })`: Cuộn thép/nhôm cán nguội khổng lồ (hình trụ rỗng tâm `CylinderGeometry` lồng nhau hoặc `LatheGeometry`, bề mặt kim loại ánh bạc, đai thép buộc ngang/dọc, đặt trên giá đỡ gỗ/thép chữ V chống lăn, có nhãn mã QR). (`~320 tris`)
  3. `buildSteelGirderStackTwin()`: Bó dầm thép kết cấu chữ H / chữ I dài 12m (sơn chống rỉ màu đỏ oxit sắt `#8D2B1D` hoặc xám kẽm) xếp 2 tầng trên gỗ kê. (`~260 tris`)
  4. `buildConcretePileStackTwin()`: Chồng cọc ống bê tông ly tâm dự ứng lực (đầu bọc vành thép) & ống cống bê tông thoát nước xếp hình tháp. (`~280 tris`)
  5. `buildScaffoldingBayTwin(options = { width: 12, height: 10 })`: Mô-đun giàn giáo khung thép công trình kèm tấm sàn thao tác, thang leo và lớp **lưới bao che an toàn màu xanh lá/xanh dương bán trong suốt** bên ngoài. (`~240 tris`)
  6. `buildRebarCageAndFormworkTwin()`: Lồng thép đài móng đan ô vuông + ván khuôn bê tông đang chờ đổ bê tông móng. (`~220 tris`)
  7. Export danh mục `CONSTRUCTION_MATERIALS_CATALOG`.
- **Tiêu chí nghiệm thu (DoD)**:
  - Nhẹ (`< 350 triangles/model`), nhìn ra chất liệu gỗ ván ép, thép cuộn, dầm chữ H, cọc bê tông ngay lập tức.

---

### 🔹 `TASK-008`: Nghiên Cứu Kiến Trúc Thực Tế & Bộ Dựng Hình 5 Giai Đoạn Thi Công (`Architectural_Visual_Reference.md` & `stageRenderer.js`)
- **Phụ thuộc**: `TASK-001`, `TASK-006`, `TASK-007`
- **File được phép tạo/sửa**:
  - `docs/ev-gigafactory-blueprint/Architectural_Visual_Reference.md` (Tạo mới)
  - `src/gigafactory/builders/stageRenderer.js` (Tạo mới)
- **Yêu cầu chi tiết**:
  1. Trong `Architectural_Visual_Reference.md`: Tổng hợp đặc trưng hình khối, màu sắc mặt dựng, cấu trúc mái (Mái phẳng Solar, Mái răng cưa Sawtooth, Mái 3 tầng kèm ống khói RTO, Tòa tháp kính 8 tầng) đối chiếu từ nhà máy thực tế của **Tesla Shanghai/Berlin, Xiaomi Beijing, BYD Zhengzhou, VinFast Hải Phòng**.
  2. Trong `src/gigafactory/builders/stageRenderer.js`:
     - Xây dựng bộ khung render tự động 5 giai đoạn xây dựng (`Stage 0..4`) cho bất kỳ tòa nhà công nghiệp nào dựa trên `stageIndex` và `stageProgress`:
       - **Stage 0 (`Survey & Excavation`)**: Hố đào đất, đống đất đắp, Máy xúc (`ExcavatorTwin`), Xe ủi (`BulldozerTwin`), Xe ben đứng làm việc.
       - **Stage 1 (`Foundation & Piling`)**: Hàng cọc bê tông nhô lên, đài móng bê tông xám, lồng thép (`RebarCage`), Kiện ván ép cốt pha (`PlywoodFormworkStackTwin`), Xe trộn bê tông (`ConcreteMixerTruckTwin`) đang đổ móng.
       - **Stage 2 (`Structural Steel Erection`)**: Lưới cột thép chữ H (`InstancedMesh`) mọc lên theo đúng bước cột `column_grid_m`, dàn vì kèo mái thép, sàn bê tông từng tầng; xung quanh đặt 1–4 Cẩu tháp (`TowerCraneTwin`) và Cẩu bánh xích (`CrawlerCraneTwin`) có cần xoay tự động + Bó dầm thép chữ H dưới đất + Giàn giáo lưới xanh bao quanh.
       - **Stage 3 (`Envelope, Cladding & Rooftop Solar`)**: Vách tôn cách nhiệt hiện dần từ dưới lên trên, dải kính lấy sáng ngang, các cổng bốc hàng Dock Doors, tấm Pin mặt trời áp mái lắp dần.
       - **Stage 4 (`Completed Operational Building`)**: Tòa nhà hoàn chỉnh 100% với đầy đủ thiết bị trên mái (AHU, Chiller, Ống khói, Đèn hiệu, Bảng tên LED phát sáng của xưởng).

---

### 🔹 `TASK-009`: Thi Công Trục Xương Sống Sản Xuất Chính `F01–F05` & 5 Cầu Băng Tải `Skybridge SB-01..05` (`spineFactoriesBuilder.js` & `skybridgesBuilder.js`)
- **Phụ thuộc**: `TASK-008`
- **File được phép tạo/sửa**:
  - `src/gigafactory/builders/spineFactoriesBuilder.js` (Tạo mới)
  - `src/gigafactory/builders/skybridgesBuilder.js` (Tạo mới)
- **Yêu cầu chi tiết**:
  1. Dựng kiến trúc đặc trưng (không phải khối hộp đơn điệu!) cho 5 đại xưởng trung tâm:
     - **`F01` (Xưởng Đúc Giga-Casting 9.100T)**: Mái cao 22m, có **6 Tháp ống khói lò nấu chảy nhôm** cao vút phía Tây, hệ cửa thông gió lam thép lớn và dải màu Cam Đỏ (`#E65100`).
     - **`F02` (Xưởng Dập Liên Hoàn Schuler)**: Mái cao 24m, có tầng hầm phế liệu `-6m` nhìn thấy ở Stage 1, kho bãi tập kết nhiều **Cuộn thép/nhôm (`SteelCoilTwin`)** phía Tây, dải màu Cam Vàng (`#F57C00`).
     - **`F03` (Xưởng Hàn BIW Dark Factory)**: Đại xưởng rộng nhất (`550m × 460m`), mái lấy sáng răng cưa kết hợp Pin mặt trời, các trạm biến áp hàn bên hông, dải màu Đỏ Đậm (`#D84315`).
     - **`F04` (Xưởng Sơn Sinh Thái 3 Tầng)**: Kiến trúc giật cấp **3 tầng cao 28.5m** rõ rệt, trên mái có **2 Tháp đốt khí thải RTO kèm ống khói inox cao 38m** và dãy buồng điều hòa AHU phòng sạch màu xanh dương (`#0288D1`).
     - **`F05` (Xưởng Lắp Ráp Tổng Thành — Thiết Kế Hình Chữ E Đặc Trưng)**: Bắt buộc dựng đúng **hình khối Chữ E** (1 thân ngang phía Bắc + 3 nhánh dọc hướng xuống phía Nam tạo thành 2 sân bốc dỡ hàng chữ U ở giữa cho xe tải chạy vào 88 cổng Dock!), dải màu Xanh Lá (`#2E7D32`).
  2. Trong `skybridgesBuilder.js`:
     - Dựng 5 Cầu băng tải trên cao `SB-01` đến `SB-05` có trụ đỡ chữ T bằng bê tông/thép, dầm cầu khung giàn thép, vách kính trong suốt hai bên để nhìn thấy **thân vỏ xe / khối pin đang chạy băng qua đường lớn** ở cao độ `+9.5m .. +18m`!

---

### 🔹 `TASK-010`: Thi Công Cụm Phía Bắc — Nhà Máy Cell Pin `F06A`, Pack Pin `F06B`, Động Cơ `F07` & Trạm Năng Lượng `UT01–UT04` (`northEnergyBatteryBuilder.js`)
- **Phụ thuộc**: `TASK-008`
- **File được phép tạo/sửa**:
  - `src/gigafactory/builders/northEnergyBatteryBuilder.js` (Tạo mới)
- **Yêu cầu chi tiết**:
  1. **`F06A` (Siêu Nhà Máy Cell Pin 40GWh — dài 700m)**: Kiến trúc 2 tầng hiện đại màu Tím Công Nghệ (`#6A1B9A`), trên mái có 28 tổ hợp máy hút ẩm phòng khô (`Munters Dry-Room AHU`), phía Tây có tháp chưng cất thu hồi dung môi NMP cao 26m, phía Đông là khu High-Bay cao tầng ủ pin.
  2. **`F06B` (Xưởng Pack Pin CTB)** & **`F07` (Xưởng Động Cơ E-Axle 2 tầng)**: Dải kính phòng sạch tầng 2, nối trực tiếp vào cầu `SB-03` và `SB-04`.
  3. **`UT01` (Trạm Biến Áp 220kV & BESS 100MWh)**: Không phải nhà hộp kín — dựng **Sân phân phối điện 220kV ngoài trời** (giàn cổng thép cao áp, sứ cách điện, 3 máy biến áp 125MVA có cánh tản nhiệt) + **40 Container Pin Lưu Trữ BESS màu trắng-vàng** xếp thành 4 dãy thẳng tắp!
  4. **`UT02` (Trung tâm Chiller CUB)**: Nhà 2 tầng kèm **12 Tháp giải nhiệt nước (Cooling Towers)** có cánh quạt trên đỉnh.
  5. **`UT03` (Trạm Khí Công Nghiệp)**: Cụm **8 Bồn chứa khí hóa lỏng Cryogenic (`N2, Ar, CO2, He`)** hình trụ đứng màu trắng bạc cao 18m + dàn hóa hơi.
  6. **`UT04` (Nhà Máy Xử Lý Nước Tuần Hoàn ZLD)**: Cụm **6 Bể lắng sinh học & bể xử lý nước hình tròn** có cầu quay gạt bùn + nhà màng lọc RO.

---

### 🔹 `TASK-011`: Thi Công Cụm Phía Nam — Kho Tự Động `WH01`, 5 Xưởng Phụ Trợ `F08-1..5`, Tháp Điều Hành `IOC01` & Viện `RD01` (`southSupplierRdBuilder.js`)
- **Phụ thuộc**: `TASK-008`
- **File được phép tạo/sửa**:
  - `src/gigafactory/builders/southSupplierRdBuilder.js` (Tạo mới)
- **Yêu cầu chi tiết**:
  1. **`WH01` (Kho Tự Động Cao Tầng AS/RS — cao 32m)**: Khối nhà High-Bay đồ sộ màu Xám Xanh (`#546E7A`), có 24 cổng xuất nhập hàng xe đầu kéo phía Tây và trạm xuất phát đội xe AMR phía Đông.
  2. **`F08-1` đến `F08-5` (Khu Công Nghiệp Phụ Trợ Nội Khu)**: 5 nhà xưởng đồng bộ màu Xanh Cổ Vịt (`#00838F`); riêng `F08-1` (Ép nhựa) có dãy Silo chứa hạt nhựa bên hông; `F08-2` (Ghế JIS) và `F08-5` nối trực tiếp lên cầu `SB-05`.
  3. **`IOC01` (Tòa Tháp Điều Hành Trung Tâm, AI Data Center & Văn Phòng — 8 tầng, cao 36m)**: Kiến trúc biểu tượng của toàn tổ hợp — mặt dựng kính Curtain Wall xanh biếc phân chia 8 tầng rõ rệt, sảnh đón có mái vòm lớn, cảnh quan đài phun nước phía trước và sân đỗ trực thăng (`Helipad`) trên đỉnh mái!
  4. **`RD01` (Viện R&D, Hầm Gió & Nhà Thử Va Chạm)**: Gồm khối nghiên cứu 2 tầng, **Ống Hầm Gió Khí Động Học (`Climatic Wind Tunnel`)** hình ống khép kín lớn và **Đường Kéo Thử Va Chạm (`Crash Test Track` dài 200m)** nối vào buồng chụp ảnh tốc độ cao.
  5. **`UT05` (Trạm Cứu Hỏa Xe Điện, Y Tế & Căng Tin)**: Tòa nhà 3 tầng màu Đỏ Cứu Hỏa (`#C62828`) có 4 cửa gara xe cứu hỏa chuyên dụng.

---

### 🔹 `TASK-012`: Thi Công Trung Tâm Kiểm Định `F09`, Đường Thử 16 Địa Hình `PG01` (3.8km) & Bãi Xe Điện Mặt Trời `LY01` (`eastTestingYardBuilder.js`)
- **Phụ thuộc**: `TASK-008`
- **File được phép tạo/sửa**:
  - `src/gigafactory/builders/eastTestingYardBuilder.js` (Tạo mới)
- **Yêu cầu chi tiết**:
  1. **`PG01` (Đường Thử Xe Đa Địa Hình Khép Kín 3.8km — `630m × 220m`)**:
     - Vòng đua tốc độ cao hình Oval bao ngoài có **2 khúc cua nghiêng góc Parabol (Banked Oval Track)** kèm hộ lan an toàn đỏ-trắng.
     - Bên trong lòng vòng đua bố trí trực quan các làn thử đặc biệt:
       - Làn đá cuội Bỉ (`Belgian Pavé`) & Làn gợn sóng (`Twist Track`).
       - Cụm **3 Cầu Dốc Thử Leo Dốc (`15%`, `20%`, `30%`)** nhô cao rõ rệt.
       - **Máng Thử Lội Nước Sâu 400mm (`Water Wading Trough`)** có mặt nước xanh trong.
       - Bãi thử phanh ABS và đỗ xe tự động AI.
     - Cho **6–10 chiếc Xe Điện (`buildSleekCar`)** chạy thử liên tục trên vòng đua Oval và qua các làn địa hình khi ở giai đoạn vận hành (`Epoch 6`)!
  2. **`LY01` (Bãi Lưu Kho Xe Thành Phẩm Có Mái Pin Mặt Trời)**: Dựng hàng chục dãy **Mái che Carport lợp Pin mặt trời** (`InstancedMesh`) cùng hàng trăm chiếc xe điện đủ màu sắc đỗ ngay ngắn chờ xuất xưởng + các trụ sạc siêu tốc `800V`.
  3. **`F09` (Trung Tâm Kiểm Định EOL & ADAS)**: Nhà xưởng 7 cổng kiểm định nối giữa cửa ra của `F05` và đường vào `PG01`.

---

### 🔹 `TASK-013`: Dây Chuyền Sản Xuất Nội Thất Xưởng Khi Bật Chế Độ "Mở Mái Xưởng (X-Ray)" (`interiorProductionLines.js`)
- **Phụ thuộc**: `TASK-006`, `TASK-007`, `TASK-009`
- **File được phép tạo/sửa**:
  - `src/gigafactory/builders/interiorProductionLines.js` (Tạo mới)
- **Yêu cầu chi tiết**:
  - Khi người dùng bật nút **`🏠 Mở Mái Xưởng (X-Ray)`** (hoặc khi tòa nhà đang ở `Stage 3/4` và camera zoom lại gần), hiển thị dây chuyền máy móc tiêu biểu bên trong các nhà xưởng chính (tái sử dụng tối đa `buildOptimizedLODRobotArm`, `buildMultiArmStationTwin`, `buildConveyorTwin`, `buildForkliftTwin`, `buildRackTwin`, `buildElectricEngineTwin`, `buildWheelTwin` từ `src/threejsTwins.js` & `src/factoryBuilder.js`):
    - **`F01`**: 6 Đảo đúc Giga-Press 9.100T khổng lồ + Robot gắp phôi đúc.
    - **`F02`**: Kho cuộn tôn (`SteelCoilTwin`) + 4 Dây chuyền máy dập cổng vòm Schuler.
    - **`F03`**: Hàng dãy cánh tay Robot hàn màu cam hoạt động dọc chuyền BIW.
    - **`F04`**: Dây chuyền bể nhúng sơn và buồng phun sơn 3 tầng.
    - **`F05`**: Dây chuyền chữ E với thân xe di chuyển, trạm Marriage ghép Pin và xe hoàn thiện chạy ra cửa Đông.
    - **`WH01`**: 24 Dãy kệ cao tầng (`buildRackTwin` nhân bản qua `InstancedMesh`).

---

### 🔹 `TASK-014`: Đạo Diễn Camera Livestream YouTube & Giao Diện Điều Khiển Thành Phố (`streamDirector.js` & `gigafactoryUI.js`)
- **Phụ thuộc**: `TASK-002`
- **File được phép tạo/sửa**:
  - `src/gigafactory/core/streamDirector.js` (Tạo mới)
  - `src/gigafactory/core/gigafactoryUI.js` (Tạo mới)
- **Yêu cầu chi tiết**:
  1. **`streamDirector.js` (Auto-Director cho YouTube Stream)**:
     - Hỗ trợ 5 chế độ Camera:
       - `MANUAL`: Người dùng tự xoay/zoom bằng chuột (`OrbitControls`).
       - `DRONE_ORBIT`: Bay vòng tròn điện ảnh mượt mà quanh toàn bộ tổ hợp 350 ha.
       - `ACTIVE_CONSTRUCTION_FOLLOW`: Tự động tìm khu nhà đang thi công sôi động nhất ở tháng hiện tại (ví dụ: Tháng 4 zoom vào xe lu làm đường & lắp đèn giao thông; Tháng 8 zoom vào đổ bê tông móng `F01/F02`; Tháng 12 bay quanh dàn Cẩu tháp đang lắp khung thép `F03/F04/F05`; Tháng 23 bám theo xe điện chạy trên đường đua `PG01`) và chuyển góc quay mềm mại mỗi `12 giây`!
       - `HIGHWAY_STREET_VIEW`: Góc nhìn thấp dọc Đại lộ chính nhìn thấy đèn đường, đèn giao thông đổi màu, biển báo và cầu Skybridge bắc ngang đầu.
       - `BLUEPRINT_TOP_DOWN`: Góc nhìn quy hoạch đô thị thẳng đứng từ trên cao.
  2. **`gigafactoryUI.js` (Thanh Điều Khiển EPC & Livestream HUD)**:
     - Tạo thanh điều khiển nổi chuyên nghiệp ở cạnh dưới (khi ở chế độ Gigafactory 350Ha):
       - Nút `▶ Play / ⏸ Pause Time-Lapse`, chọn tốc độ (`1x`, `3x`, `10x`), thanh trượt `Tháng 0.0 -> Tháng 24.0` kèm nhãn Kỷ nguyên (`Epoch 0..6`).
       - Các nút chọn chế độ Camera Đạo diễn (`🚁 Drone Orbit`, `🏗️ Auto-Focus Thi Công`, `🚦 Góc Nhìn Đại Lộ`, `📐 Quy Hoạch 2D`).
       - Bảng chỉ số EPC nhảy số trực tiếp (`Thép kết cấu: xx,xxx Tấn`, `Bê tông: xxx,xxx m³`, `Điện mặt trời: xxx MWp`, `Robot: x,xxx`).
       - Khi click vào một lô đất/nhà xưởng bất kỳ: Hiển thị nút **`⚡ Xây Ngay Bậc Tiếp Theo (Stage +1)`** để Streamer có thể biểu diễn xây dựng từng tòa nhà theo yêu cầu khán giả!

---

### 🔹 `TASK-015`: Tích Hợp Chuyển Đổi Chế Độ Xem ("Riverside Demo" ↔ "Gigafactory 350Ha") & Đăng Ký Soi Mô Hình 3D (`gigafactorySceneController.js`, `main.js`, `modelInspector.js`)
- **Phụ thuộc**: `TASK-001` .. `TASK-014`
- **File được phép tạo/sửa**:
  - `src/gigafactory/gigafactorySceneController.js` (Tạo mới)
  - `src/main.js` (Cập nhật tích hợp)
  - `src/modelInspector.js` (Đăng ký thêm các model Máy công trình & Vật tư vào danh sách Soi Mô Hình 3D)
  - `index.html` & `src/style.css` (Thêm nút chuyển đổi chế độ trên Top Navbar + CSS cho thanh EPC Timeline)
- **Yêu cầu chi tiết**:
  1. Thêm nút chuyển đổi nổi bật trên Top Navbar:
     - `🏭 Nhà Máy Đơn Lẻ (Riverside)` ↔ `🌆 Siêu Tổ Hợp 350Ha (City-Builder)`
  2. Khi chuyển sang `🌆 Siêu Tổ Hợp 350Ha`:
     - Ẩn `campusGroup` của Riverside Demo (`campusGroup.visible = false`), bật `gigafactoryGroup.visible = true`, mở rộng khoảng cách sương mù (`scene.fog`) và `camera.far = 2500` để nhìn bao quát toàn bộ thành phố 350 ha không bị cắt hình.
     - Hiển thị thanh điều khiển `EPC Time-Lapse & YouTube Stream Director`.
  3. Khi chuyển về `🏭 Nhà Máy Đơn Lẻ (Riverside)`:
     - Khôi phục nguyên vẹn góc nhìn, sương mù và hoạt động của nhà máy Riverside như ban đầu.
  4. Tích hợp toàn bộ mô hình Máy công trình (`TASK-006`) và Vật tư xây dựng (`TASK-007`) vào `🔬 Soi Mô Hình 3D` để người dùng và QA Agent có thể kiểm tra từng chiếc xe cẩu, xe lu, cuộn thép.

---

### 🔹 `TASK-016`: Kiểm Thử Tự Động Visual QA (Puppeteer Screenshots) & Nghiệm Thu Hiệu Năng 60 FPS Toàn Tổ Hợp (`visualAuditRunner.cjs`)
- **Phụ thuộc**: `TASK-015`
- **Agent đề xuất**: `Principal_3D_QA_Reviewer_Agent`
- **File được phép tạo/sửa**:
  - `src/gigafactory/qa/visualAuditRunner.cjs` (Tạo mới)
  - `docs/ev-gigafactory-blueprint/QA_VISUAL_AUDIT_REPORT.md` (Tạo mới)
- **Yêu cầu chi tiết**:
  1. Viết script Puppeteer tự động mở chế độ `🌆 Siêu Tổ Hợp 350Ha`, chụp ảnh nghiệm thu ở 5 mốc thời gian:
     - `Month 1` (San lấp địa hình & phân lô)
     - `Month 4` (Đường đại lộ, đèn đường, đèn giao thông, biển chỉ đường)
     - `Month 8` (Đào móng sâu, ván ép cốt pha, xe bồn bê tông)
     - `Month 13` (Rừng cẩu tháp lắp dựng đại khung thép `F01–F05` & `Skybridge`)
     - `Month 24` (Thành phố công nghiệp 350 ha hoàn chỉnh + Đường đua `PG01` + Tháp kính `IOC01`)
  2. Chụp ảnh kiểm tra các model Máy công trình & Vật tư trong `🔬 Soi Mô Hình 3D`.
  3. Đo và ghi nhận `renderer.info.render.triangles` (`< 450.000`) và `renderer.info.render.calls` (`< 350`) vào `QA_VISUAL_AUDIT_REPORT.md`.
