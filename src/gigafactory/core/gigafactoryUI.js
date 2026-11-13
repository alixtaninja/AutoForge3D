import {
  CONSTRUCTION_STAGES,
  STAGE_NAMES,
  TOTAL_EPC_MONTHS,
  getBuildingSpecById,
} from '../config/masterSpecLoader.js';
import { CAMERA_MODES } from './streamDirector.js';

const STYLE_ELEMENT_ID = 'gigafactory-hud-styles';

const CAMERA_BUTTONS = [
  { mode: CAMERA_MODES.DRONE_ORBIT, label: '🚁 Drone Orbit' },
  { mode: CAMERA_MODES.ACTIVE_CONSTRUCTION_FOLLOW, label: '🏗️ Auto-Focus Thi Công' },
  { mode: CAMERA_MODES.HIGHWAY_STREET_VIEW, label: '🚦 Góc Nhìn Đại Lộ' },
  { mode: CAMERA_MODES.BLUEPRINT_TOP_DOWN, label: '📐 Quy Hoạch 2D' },
  { mode: CAMERA_MODES.MANUAL, label: '🖱️ Tự Do' },
];

const SPEED_OPTIONS = [1, 3, 10];

const STAGE_BY_INDEX = Object.values(CONSTRUCTION_STAGES).reduce((acc, item) => {
  acc[item.index] = item;
  return acc;
}, {});

function formatInt(value) {
  return Math.round(Number(value) || 0).toLocaleString('en-US');
}

function formatSolar(value) {
  const num = Number(value) || 0;
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });
}

function injectHudStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ELEMENT_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ELEMENT_ID;
  style.textContent = `
    .gf-hud-root {
      position: fixed;
      left: 50%;
      bottom: 16px;
      transform: translateX(-50%);
      z-index: 45;
      width: min(1240px, calc(100vw - 28px));
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
    }

    .gf-hud-root.gf-hidden {
      display: none !important;
    }

    .gf-plot-card {
      align-self: flex-end;
      width: min(390px, 100%);
      background: rgba(15, 23, 42, 0.92);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      border: 1px solid rgba(148, 163, 184, 0.28);
      border-radius: 14px;
      padding: 12px 14px;
      color: #f8fafc;
      box-shadow: 0 16px 36px rgba(2, 6, 23, 0.42);
      pointer-events: auto;
      display: none;
      flex-direction: column;
      gap: 8px;
    }

    .gf-plot-card.gf-open {
      display: flex;
    }

    .gf-plot-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 8px;
    }

    .gf-plot-title-wrap {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .gf-plot-id {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      font-weight: 700;
      color: #38bdf8;
      letter-spacing: 0.04em;
    }

    .gf-plot-name {
      font-size: 13px;
      font-weight: 700;
      color: #f8fafc;
      line-height: 1.3;
    }

    .gf-plot-close {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(148, 163, 184, 0.25);
      color: #cbd5e1;
      border-radius: 8px;
      width: 26px;
      height: 26px;
      cursor: pointer;
      font-size: 12px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .gf-plot-close:hover {
      background: rgba(255, 255, 255, 0.16);
      color: #ffffff;
    }

    .gf-plot-stage-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 11px;
      color: #cbd5e1;
    }

    .gf-stage-badge {
      background: rgba(37, 99, 235, 0.25);
      border: 1px solid rgba(96, 165, 250, 0.45);
      color: #93c5fd;
      padding: 2px 8px;
      border-radius: 999px;
      font-weight: 700;
      font-size: 11px;
    }

    .gf-plot-progress-track {
      width: 100%;
      height: 6px;
      border-radius: 999px;
      background: rgba(148, 163, 184, 0.22);
      overflow: hidden;
    }

    .gf-plot-progress-fill {
      height: 100%;
      border-radius: 999px;
      background: linear-gradient(90deg, #38bdf8, #22c55e);
      transition: width 0.2s ease;
    }

    .gf-advance-btn {
      width: 100%;
      border: none;
      border-radius: 10px;
      padding: 9px 12px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      color: #0f172a;
      background: linear-gradient(135deg, #facc15, #f59e0b);
      box-shadow: 0 6px 16px rgba(245, 158, 11, 0.28);
      transition: transform 0.14s ease, filter 0.14s ease;
    }

    .gf-advance-btn:hover:not(:disabled) {
      transform: translateY(-1px);
      filter: brightness(1.06);
    }

    .gf-advance-btn:disabled {
      background: rgba(34, 197, 94, 0.2);
      color: #86efac;
      border: 1px solid rgba(34, 197, 94, 0.4);
      box-shadow: none;
      cursor: default;
    }

    .gf-hud-bar {
      background: rgba(15, 23, 42, 0.9);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(148, 163, 184, 0.26);
      border-radius: 16px;
      padding: 10px 14px;
      color: #f8fafc;
      box-shadow: 0 20px 44px rgba(2, 6, 23, 0.45);
      pointer-events: auto;
      display: flex;
      flex-direction: column;
      gap: 9px;
    }

    .gf-row-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }

    .gf-playback-group {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .gf-play-btn {
      border: none;
      border-radius: 10px;
      padding: 6px 13px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      color: #ffffff;
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
      display: inline-flex;
      align-items: center;
      gap: 5px;
      min-width: 96px;
      justify-content: center;
    }

    .gf-play-btn.gf-playing {
      background: linear-gradient(135deg, #dc2626, #b91c1c);
    }

    .gf-speed-group {
      display: inline-flex;
      background: rgba(30, 41, 59, 0.95);
      border: 1px solid rgba(148, 163, 184, 0.24);
      border-radius: 9px;
      padding: 2px;
      gap: 2px;
    }

    .gf-speed-btn {
      border: none;
      background: transparent;
      color: #cbd5e1;
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      font-weight: 700;
      padding: 4px 8px;
      border-radius: 7px;
      cursor: pointer;
    }

    .gf-speed-btn.gf-active {
      background: #38bdf8;
      color: #0f172a;
    }

    .gf-slider-wrap {
      flex: 1;
      min-width: 240px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .gf-slider-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      font-size: 11px;
    }

    .gf-month-label {
      font-family: 'JetBrains Mono', monospace;
      font-weight: 700;
      color: #38bdf8;
      white-space: nowrap;
    }

    .gf-epoch-label {
      color: #e2e8f0;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .gf-epoch-badge {
      display: inline-block;
      background: rgba(56, 189, 248, 0.18);
      border: 1px solid rgba(56, 189, 248, 0.45);
      color: #7dd3fc;
      font-family: 'JetBrains Mono', monospace;
      font-weight: 700;
      font-size: 10px;
      padding: 1px 6px;
      border-radius: 6px;
      margin-right: 5px;
    }

    .gf-month-slider {
      width: 100%;
      accent-color: #38bdf8;
      cursor: pointer;
      height: 5px;
    }

    .gf-kpi-strip {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .gf-kpi-pill {
      background: rgba(30, 41, 59, 0.9);
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 9px;
      padding: 4px 10px;
      font-size: 11px;
      font-weight: 600;
      color: #cbd5e1;
      white-space: nowrap;
    }

    .gf-kpi-pill strong {
      font-family: 'JetBrains Mono', monospace;
      color: #ffffff;
      font-weight: 700;
    }

    .gf-row-bottom {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      flex-wrap: wrap;
      border-top: 1px solid rgba(148, 163, 184, 0.16);
      padding-top: 8px;
    }

    .gf-cam-group {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }

    .gf-cam-btn {
      border: 1px solid rgba(148, 163, 184, 0.25);
      background: rgba(30, 41, 59, 0.88);
      color: #e2e8f0;
      border-radius: 9px;
      padding: 5px 10px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.14s ease, border-color 0.14s ease;
    }

    .gf-cam-btn:hover {
      background: rgba(51, 65, 85, 0.95);
    }

    .gf-cam-btn.gf-active {
      background: rgba(37, 99, 235, 0.92);
      border-color: #60a5fa;
      color: #ffffff;
    }

    .gf-hud-hint {
      font-size: 10px;
      color: #94a3b8;
      display: flex;
      align-items: center;
      gap: 5px;
      white-space: nowrap;
    }

    .gf-hud-hint kbd {
      background: rgba(148, 163, 184, 0.18);
      border: 1px solid rgba(148, 163, 184, 0.35);
      border-radius: 4px;
      padding: 1px 5px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      color: #e2e8f0;
    }
  `;
  document.head.appendChild(style);
}

/**
 * Manages the floating bottom EPC Time-Lapse & YouTube Streamer HUD bar
 * and the Selected Plot Card for the 350Ha EV Gigafactory mode.
 */
export class GigafactoryUIManager {
  /**
   * @param {Object} [options]
   * @param {HTMLElement} [options.container]
   * @param {import('./constructionTimeline.js').ConstructionTimelineController} [options.timeline]
   * @param {import('./streamDirector.js').StreamDirectorController} [options.streamDirector]
   * @param {(buildingId: string, newState: Object) => void} [options.onStageAdvance]
   * @param {boolean} [options.visible=false]
   */
  constructor(options = {}) {
    this.container =
      options.container || (typeof document !== 'undefined' ? document.body : null);
    this.timeline = options.timeline || null;
    this.streamDirector = options.streamDirector || null;
    this.onStageAdvance =
      typeof options.onStageAdvance === 'function' ? options.onStageAdvance : null;

    this._isGigafactoryMode = Boolean(options.visible);
    this._isHudHiddenByUser = false;
    this._selectedBuildingSpec = null;

    this._unsubTimeline = null;
    this._unsubDirector = null;

    injectHudStyles();
    this._buildDom();
    this._bindEvents();
    this._syncSubscriptions();
    this._applyVisibility();

    if (this.timeline) {
      this.update(this.timeline.getState());
    }
    if (this.streamDirector) {
      this._syncCameraButtons(this.streamDirector.getMode());
    }
  }

  _buildDom() {
    if (typeof document === 'undefined' || !this.container) return;

    this.rootEl = document.createElement('section');
    this.rootEl.className = 'gf-hud-root gf-hidden';
    this.rootEl.setAttribute('aria-label', 'EPC Time-Lapse & YouTube Streamer HUD');

    // 1. Selected Plot Card
    this.plotCardEl = document.createElement('div');
    this.plotCardEl.className = 'gf-plot-card';
    this.plotCardEl.innerHTML = `
      <div class="gf-plot-header">
        <div class="gf-plot-title-wrap">
          <span class="gf-plot-id" data-gf="plot-id">F01</span>
          <span class="gf-plot-name" data-gf="plot-name">Khu Công Nghiệp</span>
        </div>
        <button type="button" class="gf-plot-close" data-gf="plot-close" title="Đóng thẻ phân khu">✕</button>
      </div>
      <div class="gf-plot-stage-row">
        <span class="gf-stage-badge" data-gf="plot-stage-badge">Stage 0 • Khảo sát</span>
        <span data-gf="plot-progress-pct">0%</span>
      </div>
      <div class="gf-plot-progress-track">
        <div class="gf-plot-progress-fill" data-gf="plot-progress-fill" style="width: 0%;"></div>
      </div>
      <button type="button" class="gf-advance-btn" data-gf="plot-advance-btn">
        ⚡ Xây Ngay Bậc Tiếp Theo (Stage +1)
      </button>
    `;

    // 2. Main Floating Bottom HUD Bar
    this.barEl = document.createElement('div');
    this.barEl.className = 'gf-hud-bar';

    const speedButtonsHtml = SPEED_OPTIONS.map(
      (spd) =>
        `<button type="button" class="gf-speed-btn" data-gf-speed="${spd}">${spd}x</button>`
    ).join('');

    const camButtonsHtml = CAMERA_BUTTONS.map(
      (btn) =>
        `<button type="button" class="gf-cam-btn" data-gf-cam="${btn.mode}">${btn.label}</button>`
    ).join('');

    this.barEl.innerHTML = `
      <div class="gf-row-top">
        <div class="gf-playback-group">
          <button type="button" class="gf-play-btn" data-gf="play-btn">▶ Play</button>
          <div class="gf-speed-group" role="group" aria-label="Tốc độ Time-Lapse">
            ${speedButtonsHtml}
          </div>
        </div>

        <div class="gf-slider-wrap">
          <div class="gf-slider-meta">
            <span class="gf-month-label" data-gf="month-label">Tháng 0.0 / 24.0</span>
            <span class="gf-epoch-label" data-gf="epoch-label">
              <span class="gf-epoch-badge">E0</span>Khảo sát & San lấp 350 ha
            </span>
          </div>
          <input
            type="range"
            class="gf-month-slider"
            data-gf="month-slider"
            min="0"
            max="${TOTAL_EPC_MONTHS}"
            step="0.1"
            value="0"
            aria-label="Thanh thời gian xây dựng 24 tháng EPC"
          />
        </div>

        <div class="gf-kpi-strip">
          <span class="gf-kpi-pill">Thép: <strong data-gf="kpi-steel">0</strong> Tấn</span>
          <span class="gf-kpi-pill">Bê tông: <strong data-gf="kpi-concrete">0</strong> m³</span>
          <span class="gf-kpi-pill">Solar: <strong data-gf="kpi-solar">0</strong> MWp</span>
          <span class="gf-kpi-pill">Robot: <strong data-gf="kpi-robots">0</strong></span>
        </div>
      </div>

      <div class="gf-row-bottom">
        <div class="gf-cam-group" role="group" aria-label="Chế độ Camera Đạo Diễn">
          ${camButtonsHtml}
        </div>
        <div class="gf-hud-hint">
          <span>Ẩn/Hiện HUD quay YouTube:</span>
          <kbd>H</kbd>
        </div>
      </div>
    `;

    this.rootEl.appendChild(this.plotCardEl);
    this.rootEl.appendChild(this.barEl);
    this.container.appendChild(this.rootEl);

    // Cache element references
    this.els = {
      playBtn: this.barEl.querySelector('[data-gf="play-btn"]'),
      speedBtns: Array.from(this.barEl.querySelectorAll('[data-gf-speed]')),
      monthSlider: this.barEl.querySelector('[data-gf="month-slider"]'),
      monthLabel: this.barEl.querySelector('[data-gf="month-label"]'),
      epochLabel: this.barEl.querySelector('[data-gf="epoch-label"]'),
      kpiSteel: this.barEl.querySelector('[data-gf="kpi-steel"]'),
      kpiConcrete: this.barEl.querySelector('[data-gf="kpi-concrete"]'),
      kpiSolar: this.barEl.querySelector('[data-gf="kpi-solar"]'),
      kpiRobots: this.barEl.querySelector('[data-gf="kpi-robots"]'),
      camBtns: Array.from(this.barEl.querySelectorAll('[data-gf-cam]')),
      plotId: this.plotCardEl.querySelector('[data-gf="plot-id"]'),
      plotName: this.plotCardEl.querySelector('[data-gf="plot-name"]'),
      plotClose: this.plotCardEl.querySelector('[data-gf="plot-close"]'),
      plotStageBadge: this.plotCardEl.querySelector('[data-gf="plot-stage-badge"]'),
      plotProgressPct: this.plotCardEl.querySelector('[data-gf="plot-progress-pct"]'),
      plotProgressFill: this.plotCardEl.querySelector('[data-gf="plot-progress-fill"]'),
      plotAdvanceBtn: this.plotCardEl.querySelector('[data-gf="plot-advance-btn"]'),
    };
  }

  _bindEvents() {
    if (!this.rootEl) return;

    this.els.playBtn.addEventListener('click', () => {
      if (this.timeline) {
        this.timeline.togglePlay();
      }
    });

    for (const btn of this.els.speedBtns) {
      btn.addEventListener('click', () => {
        const speed = Number(btn.getAttribute('data-gf-speed')) || 1;
        if (this.timeline) {
          this.timeline.setSpeed(speed);
        }
      });
    }

    this.els.monthSlider.addEventListener('input', (e) => {
      const month = Number(e.target.value);
      if (this.timeline && Number.isFinite(month)) {
        this.timeline.setMonth(month);
      }
    });

    for (const btn of this.els.camBtns) {
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-gf-cam');
        if (this.streamDirector && mode) {
          this.streamDirector.setMode(mode);
          this._syncCameraButtons(mode);
        }
      });
    }

    this.els.plotClose.addEventListener('click', () => {
      this.clearSelection();
    });

    this.els.plotAdvanceBtn.addEventListener('click', () => {
      if (!this._selectedBuildingSpec || !this.timeline) return;
      const id = this._selectedBuildingSpec.id;
      const newState = this.timeline.advanceBuildingStage(id);
      if (this.onStageAdvance) {
        this.onStageAdvance(id, newState);
      }
      this._renderSelectedPlotCard(this.timeline.getState());
    });

    this._onKeyDown = (e) => {
      if (!this._isGigafactoryMode) return;
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;

      const tag = e.target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target?.isContentEditable) {
        return;
      }

      if (e.key === 'h' || e.key === 'H') {
        this.toggleHudVisibility();
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this._onKeyDown);
    }
  }

  _syncSubscriptions() {
    if (this._unsubTimeline) {
      this._unsubTimeline();
      this._unsubTimeline = null;
    }
    if (this._unsubDirector) {
      this._unsubDirector();
      this._unsubDirector = null;
    }

    if (this.timeline && typeof this.timeline.onUpdate === 'function') {
      this._unsubTimeline = this.timeline.onUpdate((state) => this.update(state));
    }

    if (this.streamDirector && typeof this.streamDirector.onModeChange === 'function') {
      this._unsubDirector = this.streamDirector.onModeChange((mode) => {
        this._syncCameraButtons(mode);
      });
    }
  }

  /**
   * Attaches or replaces timeline / streamDirector instances.
   */
  attach({ timeline, streamDirector } = {}) {
    if (timeline) this.timeline = timeline;
    if (streamDirector) this.streamDirector = streamDirector;
    this._syncSubscriptions();

    if (this.timeline) {
      this.update(this.timeline.getState());
    }
    if (this.streamDirector) {
      this._syncCameraButtons(this.streamDirector.getMode());
    }
  }

  /**
   * Shows the Gigafactory HUD (called when entering Gigafactory 350Ha mode).
   */
  show() {
    this._isGigafactoryMode = true;
    this._isHudHiddenByUser = false;
    this._applyVisibility();
  }

  /**
   * Hides the Gigafactory HUD (called when returning to Riverside Demo).
   */
  hide() {
    this._isGigafactoryMode = false;
    this._applyVisibility();
  }

  setVisible(visible) {
    if (visible) {
      this.show();
    } else {
      this.hide();
    }
  }

  /**
   * Toggles HUD visibility for clean YouTube recording (bound to `H` key).
   */
  toggleHudVisibility() {
    this._isHudHiddenByUser = !this._isHudHiddenByUser;
    this._applyVisibility();
    return !this._isHudHiddenByUser;
  }

  _applyVisibility() {
    if (!this.rootEl) return;
    const shouldShow = this._isGigafactoryMode && !this._isHudHiddenByUser;
    this.rootEl.classList.toggle('gf-hidden', !shouldShow);
  }

  /**
   * Displays the Selected Plot Card for a clicked building/plot.
   * @param {string|Object} buildingIdOrSpec
   */
  selectBuilding(buildingIdOrSpec) {
    const spec =
      typeof buildingIdOrSpec === 'string'
        ? getBuildingSpecById(buildingIdOrSpec)
        : buildingIdOrSpec;

    if (!spec) {
      this.clearSelection();
      return;
    }

    this._selectedBuildingSpec = spec;
    this.plotCardEl?.classList.add('gf-open');
    this._renderSelectedPlotCard(this.timeline ? this.timeline.getState() : null);
  }

  clearSelection() {
    this._selectedBuildingSpec = null;
    this.plotCardEl?.classList.remove('gf-open');
  }

  _syncCameraButtons(activeMode) {
    if (!this.els?.camBtns) return;
    for (const btn of this.els.camBtns) {
      const mode = btn.getAttribute('data-gf-cam');
      btn.classList.toggle('gf-active', mode === activeMode);
    }
  }

  _renderSelectedPlotCard(timelineState) {
    if (!this._selectedBuildingSpec || !this.els) return;

    const spec = this._selectedBuildingSpec;
    this.els.plotId.textContent = spec.id;
    this.els.plotName.textContent = spec.name || spec.id;

    let stageIndex = 0;
    let stageProgress = 0;

    if (timelineState?.buildings?.[spec.id]) {
      stageIndex = timelineState.buildings[spec.id].stageIndex;
      stageProgress = timelineState.buildings[spec.id].stageProgress;
    } else if (this.timeline) {
      const bState = this.timeline.getBuildingState(spec.id);
      stageIndex = bState.stageIndex;
      stageProgress = bState.stageProgress;
    }

    const stageMeta = STAGE_BY_INDEX[stageIndex] || {
      index: stageIndex,
      name: STAGE_NAMES[stageIndex] || 'SURVEY',
      labelVi: 'Đang thi công',
    };

    const pct = Math.round(Math.max(0, Math.min(1, stageProgress)) * 100);
    this.els.plotStageBadge.textContent = `Stage ${stageIndex}/4 • ${stageMeta.labelVi}`;
    this.els.plotProgressPct.textContent = `${pct}%`;
    this.els.plotProgressFill.style.width = `${pct}%`;

    const isMaxStage = stageIndex >= STAGE_NAMES.length - 1;
    this.els.plotAdvanceBtn.disabled = isMaxStage;
    this.els.plotAdvanceBtn.textContent = isMaxStage
      ? '✅ Đã Hoàn Thành (Stage 4)'
      : '⚡ Xây Ngay Bậc Tiếp Theo (Stage +1)';
  }

  /**
   * Updates HUD controls, Epoch badge, KPI counters, and Selected Plot Card.
   * @param {ReturnType<import('./constructionTimeline.js').ConstructionTimelineController['getState']>} state
   */
  update(state) {
    if (!state || !this.els) return;

    // Play / Pause button
    const isPlaying = Boolean(state.isPlaying);
    this.els.playBtn.textContent = isPlaying ? '⏸ Pause' : '▶ Play';
    this.els.playBtn.classList.toggle('gf-playing', isPlaying);

    // Speed buttons
    for (const btn of this.els.speedBtns) {
      const spd = Number(btn.getAttribute('data-gf-speed'));
      btn.classList.toggle('gf-active', spd === state.playbackSpeed);
    }

    // Month slider & label
    const monthVal = Number(state.currentMonth) || 0;
    this.els.monthSlider.value = monthVal.toFixed(1);
    this.els.monthLabel.textContent = `Tháng ${monthVal.toFixed(1)} / ${TOTAL_EPC_MONTHS.toFixed(1)}`;

    // Epoch badge & description
    const epoch = state.activeEpoch;
    if (epoch) {
      this.els.epochLabel.innerHTML = `<span class="gf-epoch-badge">${epoch.epoch_id}</span>${epoch.name}`;
    }

    // Live EPC KPI counters
    this.els.kpiSteel.textContent = formatInt(state.steelTonsErected);
    this.els.kpiConcrete.textContent = formatInt(state.concreteCubicMeters);
    this.els.kpiSolar.textContent = formatSolar(state.solarMegawatts);
    this.els.kpiRobots.textContent = formatInt(state.robotsInstalled);

    if (this._selectedBuildingSpec) {
      this._renderSelectedPlotCard(state);
    }
  }

  /**
   * Removes DOM nodes and detaches all listeners.
   */
  destroy() {
    if (this._unsubTimeline) {
      this._unsubTimeline();
      this._unsubTimeline = null;
    }
    if (this._unsubDirector) {
      this._unsubDirector();
      this._unsubDirector = null;
    }
    if (typeof window !== 'undefined' && this._onKeyDown) {
      window.removeEventListener('keydown', this._onKeyDown);
    }
    if (this.rootEl && this.rootEl.parentNode) {
      this.rootEl.parentNode.removeChild(this.rootEl);
    }
  }
}

export default GigafactoryUIManager;
