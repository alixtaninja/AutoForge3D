# LỘ TRÌNH TRIỂN KHAI & MASTER TO-DO LIST: HỆ SINH THÁI TỔ HỢP NHÀ MÁY XE ĐIỆN (KẾ HOẠCH 1, 2 & 3)

Tài liệu này quản lý trạng thái thiết kế của **Kế hoạch 1** (đã hoàn tất hồ sơ thiết kế gốc) và lập **Danh mục Công việc Chi tiết (To-Do List)** cho **Kế hoạch 2**, **Kế hoạch 3** cùng các gói công việc bàn giao cho các AI chuyên biệt thực thi.

---

## 1. TRẠNG THÁI KẾ HOẠCH 1: TỔ HỢP GIGAFACTORY TÍCH HỢP (`350 HA` | `300.000 – 500.000 XE/NĂM`)

- [x] **WP-1.1**: Phân tích đối sánh công nghệ Tesla (Shanghai/Berlin/Texas), Trung Quốc (Xiaomi EV/BYD/Zeekr) và VinFast (Hải Phòng/Bắc Carolina).
- [x] **WP-1.2**: Thiết lập hệ tọa độ không gian 3D chuẩn (`X: 0..2500m`, `Y: 0..1400m`, `Z: -6m..+36m`) và quy hoạch 24 công trình chức năng + 5 cầu nối Skybridge.
- [x] **WP-1.3**: Thiết kế dây chuyền công nghệ, phân vùng mặt bằng và danh mục máy móc (BOM) cho 8 nhà máy sản xuất chính (`F01` Đúc 9100T, `F02` Dập Schuler, `F03` Hàn BIW Dark Factory, `F04` Sơn Dürr 3 tầng, `F05` Lắp ráp chữ E, `F06A` Cell Pin 40GWh, `F06B` Pack Pin CTB, `F07` Động cơ E-Axle & SiC).
- [x] **WP-1.4**: Thiết kế Khu công nghiệp phụ trợ nội khu (`F08-1` đến `F08-5`), Trung tâm Kiểm định EOL (`F09`), Đường thử 16 địa hình (`PG01`), Kho tự động AS/RS (`WH01`), Viện R&D & Thử va chạm (`RD01`), Hạ tầng Năng lượng 350 MVA + BESS 100MWh + Nước thải tuần hoàn ZLD (`UT01–UT05`).
- [x] **WP-1.5**: Xuất đặc tả kỹ thuật máy đọc [gigafactory_digital_twin_spec.json](./gigafactory_digital_twin_spec.json) và Bản thiết kế chi tiết [EV_Gigafactory_Master_Plan_Phase1.md](./EV_Gigafactory_Master_Plan_Phase1.md).

---

## 2. TO-DO LIST KẾ HOẠCH 2: SIÊU TỔ HỢP MEGA-FACTORY (`550 – 650 HA` | `500.000 – 1.000.000 XE/NĂM`)
*(Tham chiếu: BYD Zhengzhou Mega-Base, Tesla Gigafactory Shanghai mở rộng, NIO NeoPark)*

> [!NOTE]
> **Mục tiêu Kế hoạch 2**: Nâng cấp từ Gigafactory tích hợp lên **Siêu Thành Phố Công Nghiệp Xe Điện Tự Chủ Toàn Trình (Self-Contained EV Industrial Megaplex)** có khả năng xuất xưởng `1 xe mỗi 20–25 giây` (trên 2 trục dây chuyền song song) và tích hợp trực tiếp cảng xuất khẩu đường biển / đường sắt.

### Danh mục công việc cần triển khai khi kích hoạt Kế hoạch 2:
- [ ] **TODO-2.1: Quy hoạch Tổng mặt bằng Siêu Tổ hợp `600 ha` (`X: 3.000m × Y: 2.000m`)**
  - Thiết kế **Trục Xương Sống Đôi (Dual-Spine Architecture)**: Nhánh Bắc chuyên sản xuất dòng xe Phổ thông/Đô thị (`500.000 xe/năm`, công nghệ **Tesla Unboxed Process** lắp ráp mô-đun song song); Nhánh Nam chuyên sản xuất dòng xe SUV/Sedan Cao cấp & Xe Thương mại/Bus Điện (`500.000 xe/năm`).
- [ ] **TODO-2.2: Thiết kế Cụm Nhà máy Tinh chế Nguyên liệu & Bán dẫn Nội khu (Deep Upstream Integration)**
  - `M01`: Nhà máy tổng hợp vật liệu cực dương LFP/LMFP & Tái chế Pin khép kín (*Battery Recycling Hydrometallurgy Plant* — thu hồi 98% Lithium, Nickel, Cobalt từ pin cũ).
  - `M02`: Nhà máy chế tạo Bán dẫn công suất & Đóng gói Module **SiC / IGBT Wafer Packaging & PCB Hub** cùng sản xuất Cảm biến Lidar/Camera/Domain Controller ADAS.
  - `M03`: Trung tâm Chế tạo Khuôn mẫu Siêu lớn (**Mega Tool & Die Foundry** — tự chế tạo khuôn dập Schuler và khuôn đúc Giga-casting 9.100T–16.000T).
- [ ] **TODO-2.3: Thiết kế Đảo Đúc Siêu Cấp `12.000T – 16.000T` (One-Piece Underbody Casting)**
  - Nâng cấp từ đúc 2 mảnh (Sàn trước + Sàn sau) lên đúc nguyên khối toàn bộ sàn xe trong 1 lần bắn nhôm duy nhất cho các dòng xe cỡ B/C.
- [ ] **TODO-2.4: Thiết kế Cảng Xuất Khẩu Ro-Ro Chuyên Dụng & Ga Đường Sắt Hàng Hóa Nội Khu (`PORT-01` & `RAIL-01`)**
  - Bến cảng nước sâu tiếp nhận tàu chở ô tô **Ro-Ro sức chứa 7.000 – 9.200 xe (PCTC)**: Xe thành phẩm từ bãi `LY01` sử dụng chế độ tự lái **Autonomous Fleet Marshalling (V2X)** tự chạy theo đoàn lên thẳng boong tàu Ro-Ro hoặc toa tàu hỏa 2 tầng mà không cần tài xế.
- [ ] **TODO-2.5: Thiết kế Khu Đô Thị Chuyên Gia & Học Viện Đào Tạo Kỹ Thuật (`CAMPUS-01`)**
  - Khu lưu trú thông minh cho 20.000 kỹ sư/kỹ thuật viên, trường đào tạo nghề Robot/Pin, bệnh viện và trung tâm thương mại.

---

## 3. TO-DO LIST KẾ HOẠCH 3: TỔ HỢP TIÊU CHUẨN PHÂN KỲ GIAI ĐOẠN (`150 – 250 HA` | `150.000 – 250.000 XE/NĂM`)
*(Tham chiếu: VinFast Bắc Carolina Mỹ, VinFast Subang Indonesia, VinFast Tamil Nadu Ấn Độ)*

> [!TIP]
> **Mục tiêu Kế hoạch 3**: Thiết kế mô hình **Nhà máy Vệ tinh Quốc tế (Global Regional Hub)** tối ưu hóa vốn đầu tư ban đầu (**Smart Phased CAPEX**), rút ngắn thời gian xây dựng xuống còn **15 – 18 tháng** để nhanh chóng thâm nhập các thị trường bản địa và hưởng ưu đãi thuế quan nội khối.

### Danh mục công việc cần triển khai khi kích hoạt Kế hoạch 3:
- [ ] **TODO-3.1: Quy hoạch Mặt bằng Mô-đun Mở rộng 3 Bước trên Khu đất `180 ha` (`X: 1.500m × Y: 1.200m`)**
  - **Bước 3A (Tháng 1–15 | Công suất `50.000 – 80.000 xe/năm` - CKD/SKD Thông minh)**: Xây dựng trước Xưởng Hàn BIW mô-đun, Xưởng Sơn tinh gọn (`30 JPH`), Xưởng Lắp ráp GA, Xưởng Đóng gói Pack Pin (từ Cell nhập khẩu) và Đường thử tiêu chuẩn.
  - **Bước 3B (Tháng 16–30 | Nâng lên `150.000 xe/năm` - Nội địa hóa 60%)**: Lắp đặt thêm Xưởng Dập Liên Hoàn (`F02`), Đảo đúc Giga-casting đôi (`2×9.100T`) và Khu phụ trợ ép nhựa/ghế.
  - **Bước 3C (Tháng 31–48 | Đạt đỉnh `250.000 xe/năm` - Tự chủ toàn phần)**: Bổ sung Nhà máy sản xuất Cell Pin `20 GWh` và Xưởng chế tạo Động cơ E-Axle tại chỗ.
- [ ] **TODO-3.2: Thiết kế Nhà Xưởng Hợp Khối Đa Năng (Compact Multi-Shop Building)**
  - Hợp nhất Xưởng Hàn BIW + Xưởng Lắp Ráp GA + Kho Logistics dưới **một mái nhà liên thông duy nhất** (`600m × 360m`) để giảm 30% chi phí kết cấu thép, hệ thống HVAC và chiều dài băng tải cầu nối.
- [ ] **TODO-3.3: Thiết kế Dây chuyền Đổi Mẫu Siêu Linh Hoạt (Ultra-Flexible Multi-Platform Line)**
  - Cho phép lắp ráp tới **6 mẫu xe khác nhau** (từ xe Mini-EV cỡ A, SUV cỡ B/C/D đến Xe bán tải điện Pickup và Xe buýt điện) trên cùng một dây chuyền với tốc độ `30 – 45 JPH`.

---

## 4. DANH SÁCH GÓI CÔNG VIỆC BÀN GIAO CHO CÁC AI TIẾP THEO (DOWNSTREAM AI WORK PACKAGES)

Bất kỳ AI nào tiếp nhận dự án này có thể thực thi ngay theo thứ tự ưu tiên sau:

| Mã Gói AI | Loại AI Thực Thi | Nhiệm vụ cụ thể cần thực hiện dựa trên Bản Thiết Kế | Đầu vào sử dụng |
|---|---|---|---|
| **`AI-PKG-01`** | **AI Dựng Hình 3D / WebGL (`viz3d` / Three.js)** | Dựng cảnh 3D tương tác toàn bộ tổ hợp 350 ha với 24 tòa nhà, 5 cầu Skybridge, hệ thống pin mặt trời áp mái, đoàn xe AGV chạy giữa các xưởng và cho phép bay camera (Fly-through) vào bên trong từng phân xưởng. | `gigafactory_digital_twin_spec.json` + Chương II & III của Master Plan |
| **`AI-PKG-02`** | **AI OpenUSD / Digital Twin (`SimReady` / `Isaac Sim`)** | Tạo cấu trúc Stage OpenUSD (`/World/Gigafactory`), đặt các tài sản 3D chuẩn vật lý (Robot ABB/KUKA, Máy đúc 9100T, Máy dập Schuler, Băng tải Skillet, AMR) và mô phỏng luồng Takt Time 40 giây/xe. | `gigafactory_digital_twin_spec.json` + Bảng BOM Thiết bị |
| **`AI-PKG-03`** | **AI Kiến trúc & Kết cấu BIM/MEP** | Sinh bản vẽ mặt bằng móng cọc (đặc biệt hố móng máy dập `-6m` và móng đảo đúc 9100T tải trọng `60 tấn/m²`), hệ khung kèo thép khẩu độ `24×30m`, sơ đồ cấp điện 220kV, ống nước Chiller và phòng khô `-50°C`. | Bảng tọa độ 2.3 & Chương IV |
| **`AI-PKG-04`** | **AI Tự động hóa Công nghiệp (PLC / MES / SCADA)** | Viết cấu trúc dữ liệu MES (Tracking mã VIN qua 8 xưởng), kịch bản điều phối 850 xe tự hành AMR/AGV theo thời gian thực và ma trận khóa liên động an toàn cho 1.820 robot. | Chương III & Chương V |
| **`AI-PKG-05`** | **AI Kinh tế Dự án & Chuỗi cung ứng (CAPEX / OPEX / EPC)** | Lập bảng dự toán chi phí đầu tư (CAPEX cho xây dựng & máy móc), chi phí vận hành (OPEX điện, nước, nhân sự) và biểu đồ tiến độ thi công EPC 24 tháng. | Toàn bộ BOM Thiết bị & Định biên Nhân sự |
