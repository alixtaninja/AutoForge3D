# BẢNG ĐIỀU PHỐI ĐA TÁC NHÂN QUA GITHUB (MULTI-AGENT DISPATCH BOARD)
## Dự án: EV Gigafactory 350 Ha — Kịch Bản Phát Triển Thành Phố Công Nghiệp (City-Builder Engine)
> **Nhánh phát triển chính**: `feat/ev-gigafactory-city-builder`  
> **Quy tắc phối hợp giữa các Agent / Phiên làm việc**:
> 1. Mỗi Agent nhận một Gói công việc (`PKG-xx`) độc lập theo bảng bên dưới.
> 2. Trước khi làm việc: chạy `git pull --rebase origin feat/ev-gigafactory-city-builder` để lấy mã nguồn và trạng thái mới nhất.
> 3. Trong khi làm: chỉ sửa đổi/thêm mới các file thuộc phạm vi phân công của gói công việc đó.
> 4. Sau khi hoàn thành: cập nhật trạng thái `[x]` vào bảng điều phối này, ghi chú commit ID, chạy `npm run build` kiểm tra lỗi, commit và push lên nhánh `feat/ev-gigafactory-city-builder`.

---

## 1. MA TRẬN PHÂN CHIA GÓI CÔNG VIỆC CHO CÁC AGENT (WORK PACKAGE MATRIX)

| Mã Gói | Tác Nhân Phụ Trách (Agent Role) | Nhiệm vụ Trọng Tâm | Tệp Tin Thuộc Quyền Soạn Thảo (Scope Files) | Trạng Thái | Người/Agent Thực Hiện & Commit |
|---|---|---|---|---|---|
| **`PKG-00`** | `Chief_Orchestrator_Agent` | Khởi tạo nền tảng 350ha, Bộ chuyển đổi chế độ xem trên Navbar ("Riverside Demo" ↔ "Gigafactory 350Ha"), Bộ nạp Spec `masterSpecLoader.js` & Thanh kéo EPC 24 tháng | `src/gigafactory/config/*`, `src/gigafactory/core/constructionTimeline.js`, `src/main.js`, `index.html` | `[x] Ready for Execution` | *Pending* |
| **`PKG-01`** | `UrbanPlanner_CivilInfra_Agent` | Quy hoạch địa hình 350ha, 24 phân lô đất cắm mốc, hồ điều hòa, Mạng lưới đường đại lộ 6 làn & đường nội khu, vạch kẻ đường, vỉa hè | `src/gigafactory/infra/terrainAndEarthwork.js`, `src/gigafactory/infra/roadNetworkBuilder.js` | `[ ] Queued` | *Pending* |
| **`PKG-02`** | `CivilProps_Traffic_Agent` | Dựng hệ thống `InstancedMesh`: 600 cột đèn đường LED, 32 cụm đèn tín hiệu 3 màu, 180 biển chỉ dẫn phân khu, hàng rào, trạm gác & hàng cây xanh | `src/gigafactory/infra/trafficPropsBuilder.js`, `src/gigafactory/core/instancedPool.js` | `[ ] Queued` | *Pending* |
| **`PKG-03`** | `ConstructionFleet_Forge_Agent` | Chế tạo Three.js Twins nhóm máy công trình: Cẩu tháp 60m (`TowerCrane`), Cẩu bánh xích 250T, Xe lu, Xe ủi, Máy xúc, Xe bồn bê tông, Xe đầu kéo | `src/gigafactory/assets/heavyMachineryTwins.js` | `[ ] Queued` | *Pending* |
| **`PKG-04`** | `ConstructionMaterial_Forge_Agent`| Chế tạo Three.js Twins nhóm vật tư: Kiện ván ép cốt pha, Bó cuộn thép, Bó dầm thép chữ H, Chồng cọc bê tông móng, Hệ giàn giáo bao che | `src/gigafactory/assets/constructionMaterialsTwins.js` | `[ ] Queued` | *Pending* |
| **`PKG-05`** | `RealWorld_ArchResearcher_Agent` | Nghiên cứu ảnh thực tế Tesla Shanghai/Texas, Xiaomi Beijing, VinFast Hải Phòng; xuất file đối chiếu kiến trúc thực tế | `docs/ev-gigafactory-blueprint/Architectural_Visual_Reference.md` | `[ ] Queued` | *Pending* |
| **`PKG-06`** | `SpineFactories_EPC_Builder_Agent` | Dựng 5 giai đoạn thi công cho Trục Xương Sống: F01 (Đúc 9100T), F02 (Dập Schuler), F03 (Hàn BIW), F04 (Sơn 3 tầng), F05 (Lắp ráp Chữ E) & 5 Skybridge | `src/gigafactory/builders/spineFactoriesBuilder.js`, `src/gigafactory/builders/skybridgesBuilder.js` | `[ ] Queued` | *Pending* |
| **`PKG-07`** | `EnergyBattery_EPC_Builder_Agent` | Dựng thi công Cụm Phía Bắc: Siêu xưởng Cell Pin 40GWh (F06A), Pack Pin (F06B), Động cơ E-Axle (F07), Trạm 220kV & BESS (UT01), CUB (UT02..UT04) | `src/gigafactory/builders/northEnergyBatteryBuilder.js` | `[ ] Queued` | *Pending* |
| **`PKG-08`** | `SupplierRd_EPC_Builder_Agent` | Dựng thi công Cụm Phía Nam: Kho AS/RS cao 32m (WH01), 5 Xưởng Phụ trợ (F08-1..5), Tháp Điều hành Kính 8 tầng (IOC01), Viện R&D & Va chạm (RD01) | `src/gigafactory/builders/southSupplierRdBuilder.js` | `[ ] Queued` | *Pending* |
| **`PKG-09`** | `TestingYard_ProcessLine_Agent` | Dựng Đường thử 16 địa hình PG01 (3.8km), Trung tâm EOL F09, Bãi xe Solar LY01, và Dây chuyền máy móc bên trong xưởng (Chế độ Mở Mái Roof Cutaway) | `src/gigafactory/builders/eastTestingYardBuilder.js`, `src/gigafactory/builders/interiorProductionLines.js` | `[ ] Queued` | *Pending* |
| **`PKG-10`** | `StreamDirector_PerfQA_Agent` | Chế độ Đạo diễn Camera YouTube (Drone Orbit, Active Construction Follow), HUD Thông số EPC, Script Puppeteer chụp ảnh nghiệm thu & kiểm thử 60 FPS | `src/gigafactory/core/streamDirector.js`, `src/gigafactory/qa/visualAuditRunner.cjs` | `[ ] Queued` | *Pending* |

---

## 2. HƯỚNG DẪN DÀNH CHO CÁC AGENT / PHIÊN LÀM VIỆC KHI NHẬN VIỆC (AGENT DISPATCH INSTRUCTIONS)

Khi một AI Agent hoặc người dùng ở phiên làm việc mới muốn tham gia:
1. Mở file này (`docs/ev-gigafactory-blueprint/MULTI_AGENT_DISPATCH_BOARD.md`).
2. Chọn gói công việc có trạng thái `[ ] Queued` theo thứ tự ưu tiên hoặc độc lập (ví dụ `PKG-01`, `PKG-03`, `PKG-04` có thể làm hoàn toàn song song).
3. Đổi trạng thái từ `[ ] Queued` thành `[🟡 In Progress by <Agent_Name>]`.
4. Đọc đặc tả chi tiết trong [Agentic_City_Builder_Master_Plan.md](./Agentic_City_Builder_Master_Plan.md) và [gigafactory_digital_twin_spec.json](./gigafactory_digital_twin_spec.json).
5. Sau khi hoàn thành code và test:
   - Chạy `npm run build` để đảm bảo bundle không bị lỗi.
   - Chạy script kiểm tra nếu có.
   - Đổi trạng thái thành `[x] Completed (Commit <hash>)`.
   - `git commit` và `git push origin feat/ev-gigafactory-city-builder`.
