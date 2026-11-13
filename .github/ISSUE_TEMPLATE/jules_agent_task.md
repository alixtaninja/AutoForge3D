---
name: "🤖 Giao Task Cho Google Jules / Coding Agent (EV Gigafactory 350Ha)"
about: "Tạo Issue gắn nhãn 'jules' để Google Jules tự động đọc AGENTS.md, viết code và mở Pull Request"
title: "[TASK-00X] Tên Task từ MULTI_AGENT_DISPATCH_BOARD.md"
labels: ["jules", "ev-gigafactory"]
assignees: []
---

## 📌 Hướng dẫn cho Google Jules / Autonomous Coding Agent

Hãy đọc kỹ các tệp ngữ cảnh sau trên nhánh **`feat/ev-gigafactory-city-builder`** trước khi thực thi:
1. [`/AGENTS.md`](../../AGENTS.md) — Quy tắc kiến trúc, lệnh build và quy trình nhánh.
2. [`docs/ev-gigafactory-blueprint/ATOMIC_TASK_SPECIFICATIONS.md`](../../docs/ev-gigafactory-blueprint/ATOMIC_TASK_SPECIFICATIONS.md) — Hợp đồng kỹ thuật chi tiết của Task này.
3. [`docs/ev-gigafactory-blueprint/MULTI_AGENT_DISPATCH_BOARD.md`](../../docs/ev-gigafactory-blueprint/MULTI_AGENT_DISPATCH_BOARD.md) — Bảng trạng thái điều phối.

---

## 🎯 Mã Task Cần Thực Hiện
- **Task ID**: `TASK-00X` *(Thay X bằng số thứ tự Task từ 001 đến 016)*
- **Nhánh cơ sở (Base Branch)**: `feat/ev-gigafactory-city-builder`
- **Nhánh làm việc (Head Branch)**: `task/TASK-00X-short-description`

---

## ✅ Tiêu chí Hoàn thành (Acceptance Criteria)
- [ ] Chỉ tạo/sửa đúng các file được cấp phép cho `TASK-00X` trong `ATOMIC_TASK_SPECIFICATIONS.md`.
- [ ] Đảm bảo đúng tên hàm `export` và cấu trúc dữ liệu trả về.
- [ ] Tuân thủ quy tắc 100% Pure Three.js Twin + `THREE.InstancedMesh` cho các vật thể lặp lại (giữ 60 FPS).
- [ ] Chạy `npm run build` thành công với `0` lỗi.
- [ ] Cập nhật trạng thái của `TASK-00X` trong `docs/ev-gigafactory-blueprint/MULTI_AGENT_DISPATCH_BOARD.md` sang `🟣 IN_REVIEW` và mở Pull Request nhắm vào nhánh `feat/ev-gigafactory-city-builder`.
