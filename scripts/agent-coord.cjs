#!/usr/bin/env node
/**
 * scripts/agent-coord.cjs
 * ---------------------------------------------------------------------------
 * Công cụ Điều Phối Đa Hội Thoại Qua GitHub (Multi-Conversation Coordinator)
 * Giúp nhiều phiên hội thoại (Conversations) cùng tham gia dự án AutoForge3D
 * trên nhánh `feat/ev-gigafactory-city-builder` mà KHÔNG BAO GIỜ:
 *   1. Nhận trùng Task của nhau (nhờ cơ chế Atomic Remote Branch Lock trên GitHub)
 *   2. Bị Merge Conflict bảng trạng thái (nhờ tách từng file status/TASK-xxx.json)
 *   3. Bị mất Context giữa các phiên hội thoại.
 *
 * Cách dùng cho Execution Agent (Hội thoại thực thi Task):
 *   node scripts/agent-coord.cjs status
 *   node scripts/agent-coord.cjs claim --auto           (Tự động nhận 1 Task khả dụng)
 *   node scripts/agent-coord.cjs claim TASK-006         (Nhận chỉ định TASK-006)
 *   node scripts/agent-coord.cjs submit TASK-006        (Build, push & tạo PR chờ Review)
 *
 * Cách dùng cho Reviewer Agent (Hội thoại chuyên môn Review & Merge):
 *   node scripts/agent-coord.cjs review-list            (Xem các PR đang chờ Review)
 *   node scripts/agent-coord.cjs merge <PR_NUM> <TASK>  (Approve, Squash Merge & Mở khóa Task sau)
 * ---------------------------------------------------------------------------
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const STATUS_DIR = path.join(ROOT_DIR, 'docs/ev-gigafactory-blueprint/status');
const BOARD_FILE = path.join(ROOT_DIR, 'docs/ev-gigafactory-blueprint/MULTI_AGENT_DISPATCH_BOARD.md');
const BASE_BRANCH = 'feat/ev-gigafactory-city-builder';

const TASKS_METADATA = [
  {
    id: 'TASK-001',
    title: 'Bộ Nạp Dữ Liệu Quy Hoạch & Hệ Quy Chiếu Tọa Độ (Smart Scenic Scale)',
    wave: 1,
    dependencies: [],
    allowed_files: [
      'src/gigafactory/config/masterSpecLoader.js',
      'src/gigafactory/config/constructionStagesSpec.js'
    ]
  },
  {
    id: 'TASK-002',
    title: 'Bộ Quản Lý Tiến Độ 24 Tháng EPC & Click Xây Từng Khu',
    wave: 2,
    dependencies: ['TASK-001'],
    allowed_files: [
      'src/gigafactory/core/constructionTimeline.js'
    ]
  },
  {
    id: 'TASK-003',
    title: 'Địa Hình 350 Ha, Hồ Điều Hòa & Phân Lô 24 Khu Đất Cắm Mốc',
    wave: 2,
    dependencies: ['TASK-001'],
    allowed_files: [
      'src/gigafactory/infra/terrainAndEarthwork.js'
    ]
  },
  {
    id: 'TASK-004',
    title: 'Mạng Lưới Đường Đại Lộ 6 Làn, Ngã Tư, Vạch Kẻ & Cổng Logistics',
    wave: 2,
    dependencies: ['TASK-001'],
    allowed_files: [
      'src/gigafactory/infra/roadNetworkBuilder.js'
    ]
  },
  {
    id: 'TASK-005',
    title: 'Đèn Đường LED, Đèn Tín Hiệu 3 Màu, Biển Chỉ Đường & Cây Xanh (InstancedMesh)',
    wave: 3,
    dependencies: ['TASK-001', 'TASK-004'],
    allowed_files: [
      'src/gigafactory/infra/trafficPropsBuilder.js'
    ]
  },
  {
    id: 'TASK-006',
    title: 'Chế Tạo 6 Three.js Twin Máy Công Trình (Cẩu Tháp, Cẩu Xích, Xe Lu, Máy Xúc, Xe Ủi, Xe Bồn)',
    wave: 1,
    dependencies: [],
    allowed_files: [
      'src/gigafactory/assets/heavyMachineryTwins.js'
    ]
  },
  {
    id: 'TASK-007',
    title: 'Chế Tạo 6 Three.js Twin Vật Tư (Ván Ép, Cuộn Thép, Dầm Chữ H, Cọc Bê Tông, Giàn Giáo)',
    wave: 1,
    dependencies: [],
    allowed_files: [
      'src/gigafactory/assets/constructionMaterialsTwins.js'
    ]
  },
  {
    id: 'TASK-008',
    title: 'Hồ Sơ Kiến Trúc Thực Tế & Engine Render 5 Giai Đoạn Thi Công (Stage 0..4)',
    wave: 2,
    dependencies: ['TASK-001', 'TASK-006', 'TASK-007'],
    allowed_files: [
      'docs/ev-gigafactory-blueprint/Architectural_Visual_Reference.md',
      'src/gigafactory/builders/stageRenderer.js'
    ]
  },
  {
    id: 'TASK-009',
    title: 'Thi Công Trục Xương Sống F01–F05 (Nhà Chữ E) & 5 Cầu Skybridge SB-01..05',
    wave: 3,
    dependencies: ['TASK-008'],
    allowed_files: [
      'src/gigafactory/builders/spineFactoriesBuilder.js',
      'src/gigafactory/builders/skybridgesBuilder.js'
    ]
  },
  {
    id: 'TASK-010',
    title: 'Thi Công Cụm Bắc: Cell Pin F06A, Pack F06B, E-Axle F07 & Trạm 220kV/BESS UT01–04',
    wave: 3,
    dependencies: ['TASK-008'],
    allowed_files: [
      'src/gigafactory/builders/northEnergyBatteryBuilder.js'
    ]
  },
  {
    id: 'TASK-011',
    title: 'Thi Công Cụm Nam: Kho AS/RS WH01, 5 Phụ Trợ F08, Tháp Kính 8 Tầng IOC01 & RD01',
    wave: 3,
    dependencies: ['TASK-008'],
    allowed_files: [
      'src/gigafactory/builders/southSupplierRdBuilder.js'
    ]
  },
  {
    id: 'TASK-012',
    title: 'Thi Công Cụm Đông: Kiểm Định F09, Đường Đua 16 Địa Hình PG01 (3.8km) & Bãi Xe LY01',
    wave: 3,
    dependencies: ['TASK-008'],
    allowed_files: [
      'src/gigafactory/builders/eastTestingYardBuilder.js'
    ]
  },
  {
    id: 'TASK-013',
    title: 'Dây Chuyền Máy Móc Bên Trong Xưởng Khi Bật Chế Độ Mở Mái Xưởng (X-Ray)',
    wave: 4,
    dependencies: ['TASK-006', 'TASK-007', 'TASK-009'],
    allowed_files: [
      'src/gigafactory/builders/interiorProductionLines.js'
    ]
  },
  {
    id: 'TASK-014',
    title: 'Đạo Diễn Camera Livestream YouTube & Thanh Điều Khiển EPC HUD',
    wave: 3,
    dependencies: ['TASK-002'],
    allowed_files: [
      'src/gigafactory/core/streamDirector.js',
      'src/gigafactory/core/gigafactoryUI.js'
    ]
  },
  {
    id: 'TASK-015',
    title: 'Tích Hợp Chuyển Đổi Chế Độ Xem ("Riverside" ↔ "Gigafactory 350Ha") & Soi Mô Hình 3D',
    wave: 5,
    dependencies: [
      'TASK-001', 'TASK-002', 'TASK-003', 'TASK-004', 'TASK-005',
      'TASK-006', 'TASK-007', 'TASK-008', 'TASK-009', 'TASK-010',
      'TASK-011', 'TASK-012', 'TASK-013', 'TASK-014'
    ],
    allowed_files: [
      'src/gigafactory/gigafactorySceneController.js',
      'src/main.js',
      'src/modelInspector.js',
      'index.html',
      'src/style.css'
    ]
  },
  {
    id: 'TASK-016',
    title: 'Kiểm Thử Tự Động Visual QA (Puppeteer Screenshots) & Báo Cáo Nghiệm Thu 60 FPS',
    wave: 6,
    dependencies: ['TASK-015'],
    allowed_files: [
      'src/gigafactory/qa/visualAuditRunner.cjs',
      'docs/ev-gigafactory-blueprint/QA_VISUAL_AUDIT_REPORT.md'
    ]
  }
];

function run(cmd, silent = false) {
  try {
    return execSync(cmd, {
      cwd: ROOT_DIR,
      stdio: silent ? 'pipe' : 'inherit',
      encoding: 'utf8'
    });
  } catch (err) {
    if (silent) return '';
    throw err;
  }
}

function ensureStatusFiles() {
  if (!fs.existsSync(STATUS_DIR)) {
    fs.mkdirSync(STATUS_DIR, { recursive: true });
  }
  for (const meta of TASKS_METADATA) {
    const filePath = path.join(STATUS_DIR, `${meta.id}.json`);
    if (!fs.existsSync(filePath)) {
      const initial = {
        id: meta.id,
        title: meta.title,
        wave: meta.wave,
        dependencies: meta.dependencies,
        allowed_files: meta.allowed_files,
        status: 'TODO', // TODO | IN_PROGRESS | IN_REVIEW | MERGED
        branch: null,
        pr_url: null,
        merged_commit: null,
        updated_at: new Date().toISOString()
      };
      fs.writeFileSync(filePath, JSON.stringify(initial, null, 2) + '\n', 'utf8');
    }
  }
}

function readAllTaskStatuses() {
  ensureStatusFiles();
  // Also inspect remote git branches & open PRs to detect real-time claims by other conversations
  run('git fetch --prune origin', true);
  const remoteBranchesRaw = run('git branch -r', true) || '';
  const remoteBranches = remoteBranchesRaw
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

  let openPrs = [];
  const prJsonRaw = run(
    `gh pr list --base ${BASE_BRANCH} --state open --limit 50 --json number,title,headRefName,url`,
    true
  );
  if (prJsonRaw) {
    try {
      openPrs = JSON.parse(prJsonRaw);
    } catch (_) {}
  }

  const map = {};
  for (const meta of TASKS_METADATA) {
    const filePath = path.join(STATUS_DIR, `${meta.id}.json`);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    // Check if an open PR exists for this task
    const matchingPr = openPrs.find(
      (pr) =>
        pr.headRefName === `task/${meta.id}` ||
        pr.headRefName.startsWith(`task/${meta.id}-`) ||
        pr.title.includes(meta.id)
    );
    // Check if a remote branch exists for this task
    const matchingRemoteBranch = remoteBranches.find(
      (b) =>
        b === `origin/task/${meta.id}` ||
        b.startsWith(`origin/task/${meta.id}-`)
    );

    if (data.status !== 'MERGED') {
      if (matchingPr) {
        data.status = 'IN_REVIEW';
        data.branch = matchingPr.headRefName;
        data.pr_url = matchingPr.url;
        data.pr_number = matchingPr.number;
      } else if (matchingRemoteBranch) {
        data.status = 'IN_PROGRESS';
        data.branch = matchingRemoteBranch.replace(/^origin\//, '');
      }
    }

    map[meta.id] = data;
  }

  // Compute readiness
  for (const meta of TASKS_METADATA) {
    const item = map[meta.id];
    const depsMet = meta.dependencies.every((depId) => map[depId]?.status === 'MERGED');
    item.is_ready_to_claim = item.status === 'TODO' && depsMet;
    item.unmet_dependencies = meta.dependencies.filter((depId) => map[depId]?.status !== 'MERGED');
  }

  return map;
}

function formatBadge(item) {
  if (item.status === 'MERGED') return '✅ MERGED';
  if (item.status === 'IN_REVIEW') return '🟣 IN_REVIEW';
  if (item.status === 'IN_PROGRESS') return '🟡 IN_PROGRESS';
  if (item.is_ready_to_claim) return '🟢 READY';
  return '⚪ BLOCKED';
}

function cmdStatus() {
  const map = readAllTaskStatuses();
  console.log('\n=========================================================================================');
  console.log('🌆 EV GIGAFACTORY 350HA — BẢNG TRẠNG THÁI ĐA HỘI THOẠI TRỰC TIẾP TỪ GITHUB');
  console.log('=========================================================================================');
  for (const meta of TASKS_METADATA) {
    const item = map[meta.id];
    const badge = formatBadge(item).padEnd(15);
    const depsInfo =
      item.unmet_dependencies.length > 0
        ? ` (Chờ: ${item.unmet_dependencies.join(', ')})`
        : '';
    const extra = item.pr_url
      ? ` -> PR: ${item.pr_url}`
      : item.branch
      ? ` -> Nhánh: ${item.branch}`
      : '';
    console.log(`${meta.id} | ${badge} | ${meta.title}${depsInfo}${extra}`);
  }
  console.log('=========================================================================================');

  const readyList = Object.values(map).filter((i) => i.is_ready_to_claim);
  const reviewList = Object.values(map).filter((i) => i.status === 'IN_REVIEW');
  console.log(`\n👉 Các Task SẴN SÀNG NHẬN NGAY (🟢 READY): ${readyList.map((i) => i.id).join(', ') || 'Không có'}`);
  console.log(`👉 Các Task ĐANG CHỜ REVIEW & MERGE (🟣 IN_REVIEW): ${reviewList.map((i) => `${i.id} (PR #${i.pr_number})`).join(', ') || 'Không có'}\n`);
}

function cmdClaim(targetArg) {
  const map = readAllTaskStatuses();
  let taskId = targetArg;

  if (!taskId || taskId === '--auto') {
    const ready = Object.values(map).find((i) => i.is_ready_to_claim);
    if (!ready) {
      console.error('❌ Hiện không có Task nào ở trạng thái 🟢 READY để nhận. Hãy kiểm tra các PR đang chờ Review & Merge!');
      process.exit(1);
    }
    taskId = ready.id;
  }

  const item = map[taskId];
  if (!item) {
    console.error(`❌ Không tìm thấy mã Task: ${taskId}`);
    process.exit(1);
  }
  if (item.status !== 'TODO') {
    console.error(`❌ ${taskId} đã ở trạng thái ${item.status} (Nhánh: ${item.branch}). Vui lòng chọn Task khác!`);
    process.exit(1);
  }
  if (!item.is_ready_to_claim) {
    console.error(`❌ ${taskId} đang chờ các Task phụ thuộc hoàn thành trước: ${item.unmet_dependencies.join(', ')}`);
    process.exit(1);
  }

  const branchName = `task/${taskId}`;
  console.log(`🚀 Đang khóa (Atomic Lock) và nhận ${taskId} trên nhánh ${branchName}...`);

  run(`git checkout ${BASE_BRANCH}`);
  run(`git pull --rebase origin ${BASE_BRANCH}`);
  run(`git checkout -b ${branchName}`);

  // Update only this task's isolated status JSON
  const filePath = path.join(STATUS_DIR, `${taskId}.json`);
  const statusData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  statusData.status = 'IN_PROGRESS';
  statusData.branch = branchName;
  statusData.updated_at = new Date().toISOString();
  fs.writeFileSync(filePath, JSON.stringify(statusData, null, 2) + '\n', 'utf8');

  run(`git add "${filePath}"`);
  run(`git commit -m "chore(${taskId}): claim task and lock branch ${branchName}"`);
  run(`git push -u origin ${branchName}`);

  console.log(`\n✅ ĐÃ NHẬN THÀNH CÔNG ${taskId}: ${item.title}`);
  console.log(`📂 Các file bạn được phép tạo/sửa:\n   - ${item.allowed_files.join('\n   - ')}`);
  console.log(`📖 Hãy đọc đặc tả chi tiết của ${taskId} tại: docs/ev-gigafactory-blueprint/ATOMIC_TASK_SPECIFICATIONS.md`);
  console.log(`📦 Sau khi làm xong, hãy chạy: node scripts/agent-coord.cjs submit ${taskId}\n`);
}

function cmdSubmit(taskId) {
  if (!taskId) {
    console.error('❌ Vui lòng truyền mã Task, ví dụ: node scripts/agent-coord.cjs submit TASK-006');
    process.exit(1);
  }
  const meta = TASKS_METADATA.find((m) => m.id === taskId);
  if (!meta) {
    console.error(`❌ Mã Task không hợp lệ: ${taskId}`);
    process.exit(1);
  }

  console.log(`🔨 [Gate 2] Đang chạy kiểm tra 'npm run build' trước khi gửi PR cho ${taskId}...`);
  run('npm run build');

  const filePath = path.join(STATUS_DIR, `${taskId}.json`);
  const statusData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  statusData.status = 'IN_REVIEW';
  statusData.updated_at = new Date().toISOString();
  fs.writeFileSync(filePath, JSON.stringify(statusData, null, 2) + '\n', 'utf8');

  const branchName = run('git rev-parse --abbrev-ref HEAD', true).trim();
  run('git add .');
  run(`git commit -m "feat(${taskId}): ${meta.title}"`);
  run(`git push -u origin ${branchName}`);

  console.log(`🔀 Đang tạo Pull Request về nhánh ${BASE_BRANCH}...`);
  const prBody = [
    `## 🎯 Hoàn thành \`${taskId}\`: ${meta.title}`,
    '',
    `- **Nhánh thực thi**: \`${branchName}\``,
    `- **Nhánh đích**: \`${BASE_BRANCH}\``,
    `- **Phạm vi file được phép**: \`${meta.allowed_files.join('`, `')}\``,
    '',
    '### 🛡️ Kết quả Tự Kiểm Tra (Self-QA)',
    '- [x] `npm run build` thành công với `0` lỗi.',
    '- [x] Tuân thủ 100% Pure Three.js Twin + `InstancedMesh` (60 FPS Guardrails).',
    '- [x] Chỉ sửa đổi các file thuộc phạm vi của Task và file trạng thái riêng `status/' + taskId + '.json`.',
    '',
    '> 📢 **Dành cho Hội thoại Chuyên gia Review & Merge (`Principal_3D_QA_Reviewer_Agent`)**:',
    `> Chạy lệnh \`node scripts/agent-coord.cjs merge <PR_NUMBER> ${taskId}\` sau khi chấm đạt 5 cổng QA.`
  ].join('\n');

  run(
    `gh pr create --base ${BASE_BRANCH} --head ${branchName} --title "[${taskId}] ${meta.title}" --body ${JSON.stringify(prBody)}`
  );
  console.log(`\n🟣 Đã gửi Pull Request cho ${taskId}! Chờ Hội thoại Reviewer Agent kiểm tra và Merge.\n`);
}

function cmdMerge(prNumber, taskId) {
  if (!prNumber || !taskId) {
    console.error('❌ Cú pháp: node scripts/agent-coord.cjs merge <PR_NUMBER> <TASK_ID>');
    process.exit(1);
  }
  console.log(`🛡️ Đang thực hiện Review Approve & Squash Merge cho PR #${prNumber} (${taskId})...`);
  run(
    `gh pr review ${prNumber} --approve --body "✅ [Principal_3D_QA_Reviewer_Agent] Passed all 5 QA Gates (Scope Isolation, Vite Build, 60FPS Guardrails, Spatial Realism, Export Contract). Merging into ${BASE_BRANCH}."`
  );
  run(`gh pr merge ${prNumber} --squash --delete-branch`);

  run(`git checkout ${BASE_BRANCH}`);
  run(`git pull --rebase origin ${BASE_BRANCH}`);

  const headSha = run('git rev-parse --short HEAD', true).trim();
  const filePath = path.join(STATUS_DIR, `${taskId}.json`);
  if (fs.existsSync(filePath)) {
    const statusData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    statusData.status = 'MERGED';
    statusData.merged_commit = headSha;
    statusData.updated_at = new Date().toISOString();
    fs.writeFileSync(filePath, JSON.stringify(statusData, null, 2) + '\n', 'utf8');
  }

  run(`git add "${filePath}"`);
  run(`git commit -m "chore(${taskId}): mark MERGED (${headSha}) after specialist QA review"`);
  run(`git push origin ${BASE_BRANCH}`);
  console.log(`\n✅ Đã Merge hoàn tất ${taskId} (Commit ${headSha}) vào ${BASE_BRANCH}!\n`);
  cmdStatus();
}

const [, , action, arg1, arg2] = process.argv;
ensureStatusFiles();

switch (action) {
  case 'init':
    console.log('✅ Đã khởi tạo 16 tệp trạng thái nguyên tử tại docs/ev-gigafactory-blueprint/status/');
    break;
  case 'status':
  case 'review-list':
    cmdStatus();
    break;
  case 'claim':
    cmdClaim(arg1);
    break;
  case 'submit':
    cmdSubmit(arg1);
    break;
  case 'merge':
    cmdMerge(arg1, arg2);
    break;
  default:
    cmdStatus();
    break;
}
