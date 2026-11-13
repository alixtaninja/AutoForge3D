# AGENTS.md — Quy Chuẩn Phối Hợp Đa Hội Thoại Qua GitHub (`AutoForge3D`)

> **Chào mừng Agent ở phiên hội thoại mới!**  
> Dự án này được phát triển song song bởi **nhiều phiên hội thoại (Multi-Conversation Workflow)** thông qua GitHub. Hãy đọc tệp này đầu tiên để nắm toàn bộ ngữ cảnh mà không cần lịch sử trò chuyện cũ.

---

## 1. Ngữ Cảnh Dự Án & Nhánh Làm Việc Chính

- **Repository**: `alixtaninja/AutoForge3D` (`/home/antigravity/alixtaninja/AutoForge3D`)
- **Nhánh Tích Hợp Chính (Integration Branch)**: `feat/ev-gigafactory-city-builder`
- **Nhánh Sản Xuất Cũ (Baseline)**: `main` (chứa nhà máy đơn lẻ *Riverside Auto Plant Demo* chạy 100% bằng Three.js Twin ở 60 FPS)
- **Mục tiêu trên nhánh `feat/ev-gigafactory-city-builder`**:
  Xây dựng **Siêu Tổ Hợp EV Gigafactory 350Ha (Industrial City-Builder & 24-Month EPC Construction Time-Lapse)** có thể stream lên YouTube, tích hợp song song với *Riverside Demo* qua nút chuyển đổi trên Top Navbar (`🏭 Riverside Demo` ↔ `🌆 Siêu Tổ Hợp Gigafactory 350Ha`).

---

## 2. Cơ Chế Chống Trùng Lặp & Chống Merge Conflict Giữa Nhiều Hội Thoại

Khi nhiều hội thoại cùng chạy đồng thời trên các máy ảo khác nhau:
1. **Không sửa chung 1 file Markdown khi nhận Task**: Mỗi Task (`TASK-001` .. `TASK-016`) có một tệp trạng thái JSON riêng biệt tại `docs/ev-gigafactory-blueprint/status/TASK-xxx.json`.
2. **Khóa Task nguyên tử (Atomic Remote Branch Lock) bằng `scripts/agent-coord.cjs`**:
   - Khi một hội thoại chạy `node scripts/agent-coord.cjs claim --auto` (hoặc `claim TASK-xxx`), công cụ sẽ tự động `git fetch --prune origin` để kiểm tra các nhánh `origin/task/TASK-*` và các Pull Request đang mở trên GitHub, chọn Task sẵn sàng (`🟢 READY`), tạo nhánh `task/TASK-xxx` và **`git push -u origin task/TASK-xxx` ngay lập tức**.
   - Nhờ đó, hội thoại thứ 2 chạy sau đó vài giây sẽ thấy `origin/task/TASK-xxx` đã có người nhận và tự động chuyển sang nhận Task tiếp theo!

---

## 3. Quy Trình 3 Bước Dành Cho Hội Thoại Thực Thi Task (Execution Conversation)

### Bước 1: Kiểm tra trạng thái & Nhận Task tự động
Chạy lệnh sau trong thư mục `/home/antigravity/alixtaninja/AutoForge3D`:
```bash
git fetch origin
git checkout feat/ev-gigafactory-city-builder
git pull --rebase origin feat/ev-gigafactory-city-builder
node scripts/agent-coord.cjs status
```
Để tự động nhận 1 Task đang `🟢 READY` (hoặc nhận chỉ định `TASK-xxx`):
```bash
node scripts/agent-coord.cjs claim --auto
# Hoặc nhận chỉ định: node scripts/agent-coord.cjs claim TASK-006
```

### Bước 2: Đọc Đặc Tả & Viết Code Trong Phạm Vi Cô Lập
- Đọc yêu cầu kỹ thuật của `TASK-xxx` vừa nhận tại:
  - [`docs/ev-gigafactory-blueprint/ATOMIC_TASK_SPECIFICATIONS.md`](docs/ev-gigafactory-blueprint/ATOMIC_TASK_SPECIFICATIONS.md)
  - Dữ liệu tọa độ 350ha: [`docs/ev-gigafactory-blueprint/gigafactory_digital_twin_spec.json`](docs/ev-gigafactory-blueprint/gigafactory_digital_twin_spec.json)
  - Dữ liệu kịch bản xây dựng: [`docs/ev-gigafactory-blueprint/construction_stages_manifest.json`](docs/ev-gigafactory-blueprint/construction_stages_manifest.json)
- **Quy tắc bắt buộc**:
  1. Chỉ tạo/sửa đúng các file nằm trong mục `allowed_files` của `TASK-xxx`.
  2. **100% Pure Three.js Twins** (không tự động tải file `.glb` nặng khi khởi động).
  3. Dùng `THREE.InstancedMesh` hoặc `mergeGeometries` cho các vật thể lặp lại (`> 20` lần) để giữ **60 FPS** (`< 350 Draw Calls`).

### Bước 3: Kiểm tra Build & Gửi Pull Request chờ Review
Khi hoàn thành code của `TASK-xxx`, chạy lệnh duy nhất sau để tự động kiểm tra `npm run build`, cập nhật `status/TASK-xxx.json`, push nhánh và mở Pull Request về `feat/ev-gigafactory-city-builder`:
```bash
node scripts/agent-coord.cjs submit TASK-xxx
```

---

## 4. Quy Trình Dành Cho Hội Thoại Chuyên Gia Review & Merge (Reviewer Conversation)

Khi một hội thoại được giao vai trò **`Principal_3D_QA_Reviewer_Agent`**:
1. Xem danh sách các PR đang ở trạng thái `🟣 IN_REVIEW`:
   ```bash
   git fetch origin
   git checkout feat/ev-gigafactory-city-builder
   git pull --rebase origin feat/ev-gigafactory-city-builder
   node scripts/agent-coord.cjs review-list
   ```
2. Kiểm tra từng PR theo **5 Cổng Chất Lượng (5-Gate QA Rubric)** trong [`docs/ev-gigafactory-blueprint/REVIEW_AND_MERGE_PROTOCOL.md`](docs/ev-gigafactory-blueprint/REVIEW_AND_MERGE_PROTOCOL.md):
   ```bash
   gh pr view <PR_NUMBER>
   gh pr diff <PR_NUMBER> --name-only
   gh pr checkout <PR_NUMBER>
   npm run build
   ```
3. Nếu đạt chuẩn, chạy lệnh tự động Approve, Squash Merge vào `feat/ev-gigafactory-city-builder`, xóa nhánh phụ và mở khóa các Task phụ thuộc tiếp theo:
   ```bash
   node scripts/agent-coord.cjs merge <PR_NUMBER> <TASK_ID>
   ```
