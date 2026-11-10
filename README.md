# 🏭 AutoForge 3D — Mô Phỏng Nhà Máy Sản Xuất Xe Hơi (Digital Twin & Strategy Game)

**AutoForge 3D** là ứng dụng mô phỏng **Digital Twin nhà máy sản xuất ô tô thời gian thực** được xây dựng bằng **Three.js** và **Vite**, lấy cảm hứng từ phong cách giao diện **3D Strategy / Tycoon Management Game** (tương tự *WareTrack 3D Warehouse App*).

Người dùng có thể quan sát trực quan toàn bộ quy trình lắp ráp một chiếc xe hơi điện hiện đại từ tấm kim loại dập nguyên khối cho đến khi hoàn thiện kiểm định LiDAR và xuất xưởng lên xe tải Container.

---

## ✨ Tính Năng Nổi Bật

### 1. Dây Chuyền Sản Xuất 6 Công Đoạn Tự Động (Multi-Stage Car Assembly)
Mỗi chiếc xe trên băng chuyền biến đổi hình học 3D trực tiếp khi đi qua từng trạm:
1. **Trạm 1 (`STAMP-01`) — Máy Dập Thủy Lực 2000T**: Dập tấm hợp kim tạo khung sàn Skateboard và cụm Pin cơ sở.
2. **Trạm 2 (`WELD-02`) — Trạm Hàn Robot Laser BIW**: 4 cánh tay Robot 6 trục KUKA hàn khung vỏ *Body-in-White* kèm hiệu ứng hạt tia lửa hàn (Particle Sparks) thời gian thực.
3. **Trạm 3 (`PAINT-03`) — Buồng Sơn Tĩnh Điện Nano**: Buồng kính trong suốt với Robot phun sơn chuyển đổi bề mặt thép thô sang lớp sơn bóng Metallic theo màu người dùng chọn.
4. **Trạm 4 (`POWR-04`) — Lắp Ráp Động Cơ & Pin EV**: Cánh tay Robot lắp đặt hệ thống treo và 4 bánh xe hợp kim quay đồng bộ.
5. **Trạm 5 (`TRIM-05`) — Nội Thất, Kính & Điện Tử AI**: Lắp kính chắn gió Panorama, dải đèn pha Matrix LED và đèn hậu.
6. **Trạm 6 (`QAQC-06`) — Cổng Quét Kiểm Định 3D LiDAR**: Cổng vòm quét chùm tia laser 360° kiểm tra chất lượng trước khi xuất xưởng.

### 2. Đội Xe Tự Hành AGV, Kho Thông Minh & Cảng Xuất Hàng
- **4 Robot tự hành AGV (`AGV-01` → `AGV-04`)**: Di chuyển liên tục trên làn từ trường giữa 8 kệ kho cao tầng (`RACK-N1..N4`, `RACK-S1..S4`) và dây chuyền chính để tiếp liệu Thép cuộn, Pin Lithium và Vi mạch AI.
- **2 Xe Container Vận Tải (`TRUCK-01`, `TRUCK-02`)**: Đậu tại cổng Dock xuất hàng, có thể điều lệnh xuất bến giao xe thành phẩm và tự động quay lại nhận lô mới.

### 3. Tương Tác 3D Như Một Trò Chơi Chiến Thuật (Interactive 3D Raycasting & HUD)
- **Click chọn bất kỳ đối tượng 3D nào** (Khung xe hơi, Trạm sản xuất, Cánh tay Robot, Xe AGV, Kệ kho, Xe tải) để mở bảng **Inspector** xem thông số kỹ thuật thời gian thực (Số VIN, Tiến độ %, Nhiệt độ Servo, Chu kỳ Takt, Công suất kW).
- **Đặt lệnh sản xuất xe mới**: Tùy chọn dòng xe (*Apex CyberSUV*, *Veloce AeroSedan*, *Quantum HyperGT*) và 6 màu sơn ngoại thất rồi đưa trực tiếp vào đầu dây chuyền.
- **Giả lập sự cố & Bảo trì**: Cho phép kích hoạt/khôi phục chế độ dừng bảo trì tại từng trạm sản xuất (đèn Andon chuyển đỏ, giảm tốc độ chuyền và OEE).
- **Hệ thống Camera đa góc nhìn**: Toàn cảnh nhà máy, cận cảnh từng trạm, bản đồ 2.5D từ trên xuống, hoặc **Camera bám theo (Follow Cam)** một chiếc xe trên chuyền hay một robot AGV.
- **Chuyển đổi Ca Ngày / Ca Đêm**: Thay đổi ánh sáng môi trường và bật hệ thống đèn chiếu điểm LED cao áp trong nhà xưởng.

---

## 🚀 Hướng Dẫn Chạy Dự Án

```bash
# 1. Cài đặt dependencies
npm install

# 2. Chạy máy chủ phát triển (Development Server)
npm run dev

# 3. Đóng gói bản dựng Production
npm run build
```

---

## 🛠️ Công Nghệ Sử Dụng
- **3D Engine**: [Three.js](https://threejs.org/) (`WebGLRenderer`, `PCFSoftShadowMap`, `ACESFilmicToneMapping`, `OrbitControls`, `Raycaster`, Procedural Canvas Textures & Geometry)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **UI / HUD**: Vanilla CSS3 Glassmorphism + HTML5 Semantic HUD
