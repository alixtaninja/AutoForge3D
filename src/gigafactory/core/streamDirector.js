import * as THREE from 'three';
import {
  getAllBuildingsSpec,
  getBuildingSpecById,
  getBuildingStageAtMonth,
  bpTo3JS,
} from '../config/masterSpecLoader.js';

/**
 * Supported YouTube Streamer & Auto-Director camera modes.
 */
export const CAMERA_MODES = Object.freeze({
  MANUAL: 'MANUAL',
  DRONE_ORBIT: 'DRONE_ORBIT',
  ACTIVE_CONSTRUCTION_FOLLOW: 'ACTIVE_CONSTRUCTION_FOLLOW',
  HIGHWAY_STREET_VIEW: 'HIGHWAY_STREET_VIEW',
  BLUEPRINT_TOP_DOWN: 'BLUEPRINT_TOP_DOWN',
});

const VALID_MODE_SET = new Set(Object.values(CAMERA_MODES));

const DEFAULT_ACTIVE_SWITCH_INTERVAL_SEC = 12.0;

// Precomputed highway coordinates from RD-SOUTH-MAIN (y_center = 45m, x: 0..2500m)
const SOUTH_BOULEVARD_Z = bpTo3JS(1250, 45, 0).z; // ~163.75
const SPINE_SOUTH_Z = bpTo3JS(1250, 430, 0).z; // ~67.5

/**
 * Smooth YouTube Stream Camera Director for the 350Ha EV Gigafactory.
 * Supports 5 camera modes and frame-rate independent lerp interpolation
 * without fighting OrbitControls in MANUAL mode.
 */
export class StreamDirectorController {
  /**
   * @param {Object|THREE.Camera} [cameraOrOptions]
   * @param {import('three/examples/jsm/controls/OrbitControls.js').OrbitControls} [controlsArg]
   * @param {import('./constructionTimeline.js').ConstructionTimelineController} [timelineArg]
   */
  constructor(cameraOrOptions = {}, controlsArg = null, timelineArg = null) {
    let options = {};
    if (cameraOrOptions && (cameraOrOptions.isCamera || cameraOrOptions.isObject3D)) {
      options = {
        camera: cameraOrOptions,
        controls: controlsArg,
        timeline: timelineArg,
      };
    } else if (cameraOrOptions && typeof cameraOrOptions === 'object') {
      options = cameraOrOptions;
    }

    this.camera = options.camera || null;
    this.controls = options.controls || null;
    this.timeline = options.timeline || null;

    this.mode = VALID_MODE_SET.has(options.initialMode)
      ? options.initialMode
      : CAMERA_MODES.DRONE_ORBIT;

    this.activeSwitchInterval =
      Number(options.activeSwitchInterval) > 0
        ? Number(options.activeSwitchInterval)
        : DEFAULT_ACTIVE_SWITCH_INTERVAL_SEC;

    this.lerpSpeed = Number(options.lerpSpeed) > 0 ? Number(options.lerpSpeed) : 2.8;
    this.autoManualOnInteract = options.autoManualOnInteract !== false;

    this._elapsedTime = 0;
    this._activeFocusTimer = 0;
    this._activeFocusIndex = 0;
    this._currentFocusLabel = 'Toàn Khu 350Ha';
    this._currentFocusBuildingId = null;

    this._desiredPosition = new THREE.Vector3(0, 145, 250);
    this._desiredTarget = new THREE.Vector3(0, 6, 0);

    // One-shot glide target when user clicks a plot in MANUAL mode
    this._oneShotActive = false;
    this._oneShotTimer = 0;

    /** @type {Set<(mode: string, info: Object) => void>} */
    this._modeListeners = new Set();

    this._buildings = getAllBuildingsSpec();

    this._handleControlsStart = () => {
      this._oneShotActive = false;
      if (this.autoManualOnInteract && this.mode !== CAMERA_MODES.MANUAL) {
        this.setMode(CAMERA_MODES.MANUAL);
      }
    };

    if (this.controls && typeof this.controls.addEventListener === 'function') {
      this.controls.addEventListener('start', this._handleControlsStart);
    }
  }

  /**
   * Attaches or updates camera, OrbitControls, and timeline references.
   */
  attach({ camera, controls, timeline } = {}) {
    if (camera) this.camera = camera;
    if (controls && controls !== this.controls) {
      if (this.controls && typeof this.controls.removeEventListener === 'function') {
        this.controls.removeEventListener('start', this._handleControlsStart);
      }
      this.controls = controls;
      if (typeof this.controls.addEventListener === 'function') {
        this.controls.addEventListener('start', this._handleControlsStart);
      }
    }
    if (timeline) this.timeline = timeline;
  }

  /**
   * Switches the active camera director mode.
   * @param {string} mode
   * @returns {string}
   */
  setMode(mode) {
    if (!VALID_MODE_SET.has(mode)) {
      console.warn(`[StreamDirectorController] Unknown camera mode: ${mode}`);
      return this.mode;
    }

    const changed = this.mode !== mode;
    this.mode = mode;
    this._oneShotActive = false;

    if (mode === CAMERA_MODES.ACTIVE_CONSTRUCTION_FOLLOW) {
      this._activeFocusTimer = 0;
      this._selectNextActiveHotspot(true);
    } else if (mode === CAMERA_MODES.DRONE_ORBIT) {
      this._currentFocusLabel = 'Toàn Cảnh 350Ha (Drone Orbit)';
      this._currentFocusBuildingId = null;
    } else if (mode === CAMERA_MODES.HIGHWAY_STREET_VIEW) {
      this._currentFocusLabel = 'Đại Lộ Nam 6 Làn (RD-SOUTH-MAIN)';
      this._currentFocusBuildingId = null;
    } else if (mode === CAMERA_MODES.BLUEPRINT_TOP_DOWN) {
      this._currentFocusLabel = 'Bản Đồ Quy Hoạch 350Ha (2D Top-Down)';
      this._currentFocusBuildingId = null;
    } else {
      this._currentFocusLabel = 'Điều Khiển Tự Do (OrbitControls)';
      this._currentFocusBuildingId = null;
    }

    if (changed) {
      this._emitModeChange();
    }

    return this.mode;
  }

  getMode() {
    return this.mode;
  }

  getFocusInfo() {
    return {
      mode: this.mode,
      label: this._currentFocusLabel,
      buildingId: this._currentFocusBuildingId,
    };
  }

  /**
   * Smoothly glides the camera to inspect a specific building/plot.
   * In MANUAL mode, performs a brief one-shot transition then hands control back to OrbitControls.
   * @param {string|Object} buildingIdOrSpec
   */
  focusOnBuilding(buildingIdOrSpec) {
    const spec =
      typeof buildingIdOrSpec === 'string'
        ? getBuildingSpecById(buildingIdOrSpec)
        : buildingIdOrSpec;

    if (!spec || !spec.bounds3JS) return;

    const { centerX, centerZ, widthX, depthZ, heightY } = spec.bounds3JS;
    const span = Math.max(widthX, depthZ, 40);
    const dist = span * 0.9 + 28;
    const camY = Math.max(22, heightY * 1.35 + span * 0.25);

    this._desiredTarget.set(centerX, Math.max(3, heightY * 0.4), centerZ);
    this._desiredPosition.set(centerX + dist * 0.72, camY, centerZ + dist * 0.72);
    this._currentFocusBuildingId = spec.id;
    this._currentFocusLabel = `${spec.id} — ${spec.name || spec.id}`;

    if (this.mode === CAMERA_MODES.MANUAL) {
      this._oneShotActive = true;
      this._oneShotTimer = 1.6;
    }
  }

  /**
   * Registers a callback for camera mode changes.
   * @param {(mode: string, info: Object) => void} cb
   * @returns {() => void}
   */
  onModeChange(cb) {
    if (typeof cb !== 'function') {
      throw new TypeError('onModeChange callback must be a function');
    }
    this._modeListeners.add(cb);
    return () => {
      this._modeListeners.delete(cb);
    };
  }

  _emitModeChange() {
    const info = this.getFocusInfo();
    for (const cb of this._modeListeners) {
      try {
        cb(this.mode, info);
      } catch (err) {
        console.error('[StreamDirectorController] onModeChange listener error:', err);
      }
    }
  }

  _getCurrentMonth() {
    if (this.timeline && typeof this.timeline.currentMonth === 'number') {
      return this.timeline.currentMonth;
    }
    return 12.0;
  }

  _getActiveHotspotsForMonth(month) {
    const candidates = [];

    // Month 2.0 - 5.5: Road infrastructure, streetlights, traffic lights & signage
    if (month >= 2.0 && month <= 5.5) {
      candidates.push({
        id: 'RD-SOUTH-MAIN',
        label: 'Đại Lộ Nam 6 Làn — Đèn Đường & Tín Hiệu',
        centerX: -30,
        centerZ: SOUTH_BOULEVARD_Z,
        span: 95,
        heightY: 12,
      });
      candidates.push({
        id: 'RD-SPINE-SOUTH',
        label: 'Trục Xương Sống Nam & Cổng Logistics',
        centerX: -65,
        centerZ: SPINE_SOUTH_Z,
        span: 105,
        heightY: 14,
      });
    }

    // Score buildings by active construction intensity at `month`
    for (const b of this._buildings) {
      const state = this.timeline
        ? this.timeline.getBuildingState(b.id)
        : getBuildingStageAtMonth(b.id, month);

      let priority = 0;
      if (state.stageIndex === 2) {
        // Steel frame + tower cranes: highest visual drama
        priority = 100 + Math.sin(state.stageProgress * Math.PI) * 20;
      } else if (state.stageIndex === 1) {
        // Foundation & concrete mixer trucks
        priority = 80 + Math.sin(state.stageProgress * Math.PI) * 15;
      } else if (state.stageIndex === 3) {
        // Envelope cladding & rooftop solar
        priority = 65 + Math.sin(state.stageProgress * Math.PI) * 15;
      } else if (state.stageIndex === 0 && month < 4.5) {
        // Earthwork & excavation
        priority = 50;
      } else if (state.stageIndex === 4 && month >= 21.0) {
        // Operational showcase (PG01 test track, IOC01, F05, LY01)
        if (b.id === 'PG01' || b.id === 'IOC01' || b.id === 'F05' || b.id === 'LY01') {
          priority = 90;
        } else {
          priority = 40;
        }
      }

      if (priority > 0) {
        const { centerX, centerZ, widthX, depthZ, heightY } = b.bounds3JS;
        candidates.push({
          id: b.id,
          label: `${b.id} — ${b.name || b.id}`,
          centerX,
          centerZ,
          span: Math.max(widthX, depthZ, 45),
          heightY: Math.max(6, heightY),
          priority,
        });
      }
    }

    // Fallback to spine factories if nothing matched
    if (candidates.length === 0) {
      const fallbackIds = ['F03', 'F05', 'IOC01', 'PG01'];
      for (const id of fallbackIds) {
        const b = getBuildingSpecById(id);
        if (b) {
          candidates.push({
            id: b.id,
            label: `${b.id} — ${b.name || b.id}`,
            centerX: b.bounds3JS.centerX,
            centerZ: b.bounds3JS.centerZ,
            span: Math.max(b.bounds3JS.widthX, b.bounds3JS.depthZ, 50),
            heightY: Math.max(8, b.bounds3JS.heightY),
            priority: 50,
          });
        }
      }
    }

    candidates.sort((a, b) => (b.priority || 75) - (a.priority || 75));
    return candidates.slice(0, 6);
  }

  _selectNextActiveHotspot(resetIndex = false) {
    const month = this._getCurrentMonth();
    const hotspots = this._getActiveHotspotsForMonth(month);
    if (hotspots.length === 0) return null;

    if (resetIndex) {
      this._activeFocusIndex = 0;
    } else {
      this._activeFocusIndex = (this._activeFocusIndex + 1) % hotspots.length;
    }

    const spot = hotspots[this._activeFocusIndex];
    this._currentFocusLabel = spot.label;
    this._currentFocusBuildingId = spot.id;
    return spot;
  }

  _computeModeTargets(dt) {
    this._elapsedTime += dt;

    switch (this.mode) {
      case CAMERA_MODES.DRONE_ORBIT: {
        const angle = this._elapsedTime * 0.085;
        const radiusX = 335;
        const radiusZ = 235;
        const height = 140 + Math.sin(this._elapsedTime * 0.17) * 18;

        this._desiredPosition.set(
          Math.cos(angle) * radiusX,
          height,
          Math.sin(angle) * radiusZ
        );
        this._desiredTarget.set(0, 6, 0);
        break;
      }

      case CAMERA_MODES.ACTIVE_CONSTRUCTION_FOLLOW: {
        this._activeFocusTimer += dt;
        const month = this._getCurrentMonth();
        const hotspots = this._getActiveHotspotsForMonth(month);

        if (this._activeFocusTimer >= this.activeSwitchInterval) {
          this._activeFocusTimer = 0;
          this._selectNextActiveHotspot(false);
        }

        const spot =
          hotspots.find((h) => h.id === this._currentFocusBuildingId) ||
          hotspots[this._activeFocusIndex % Math.max(1, hotspots.length)];

        if (spot) {
          this._currentFocusLabel = spot.label;
          this._currentFocusBuildingId = spot.id;

          const orbitAngle = this._elapsedTime * 0.18;
          const radius = spot.span * 0.85 + 36;
          const camHeight = Math.max(24, spot.heightY * 1.45 + spot.span * 0.22);

          this._desiredTarget.set(
            spot.centerX,
            Math.max(3, spot.heightY * 0.45),
            spot.centerZ
          );
          this._desiredPosition.set(
            spot.centerX + Math.cos(orbitAngle) * radius,
            camHeight,
            spot.centerZ + Math.sin(orbitAngle) * radius
          );
        }
        break;
      }

      case CAMERA_MODES.HIGHWAY_STREET_VIEW: {
        // Smooth low-angle cruise along RD-SOUTH-MAIN (6-lane South Main Blvd)
        const cycle = (this._elapsedTime * 0.055) % (Math.PI * 2);
        const cruiseX = Math.sin(cycle) * 215;
        const dir = Math.cos(cycle) >= 0 ? 1 : -1;

        this._desiredPosition.set(
          cruiseX,
          7.5,
          SOUTH_BOULEVARD_Z + 4.5
        );
        this._desiredTarget.set(
          cruiseX + dir * 70,
          9.0,
          SOUTH_BOULEVARD_Z - 32
        );
        break;
      }

      case CAMERA_MODES.BLUEPRINT_TOP_DOWN: {
        // High-altitude orthographic-like urban planning view (0.5 Z offset avoids gimbal lock)
        this._desiredPosition.set(0, 520, 0.5);
        this._desiredTarget.set(0, 0, 0);
        break;
      }

      case CAMERA_MODES.MANUAL:
      default:
        break;
    }
  }

  /**
   * Frame update called in the main render loop.
   * Smoothly interpolates camera.position and controls.target in auto modes.
   * Does NOT interfere with OrbitControls in MANUAL mode.
   *
   * @param {number} dt - Frame delta time in seconds
   */
  update(dt) {
    const safeDt = Number.isFinite(dt) && dt > 0 ? Math.min(dt, 0.25) : 0.016;

    if (!this.camera) return;

    if (this.mode === CAMERA_MODES.MANUAL) {
      if (this._oneShotActive) {
        this._oneShotTimer -= safeDt;
        const alpha = 1 - Math.exp(-this.lerpSpeed * 1.4 * safeDt);
        this.camera.position.lerp(this._desiredPosition, alpha);
        if (this.controls && this.controls.target) {
          this.controls.target.lerp(this._desiredTarget, alpha);
        }
        if (
          this._oneShotTimer <= 0 ||
          this.camera.position.distanceTo(this._desiredPosition) < 0.5
        ) {
          this._oneShotActive = false;
        }
      }
      return;
    }

    this._computeModeTargets(safeDt);

    const smoothAlpha = 1 - Math.exp(-this.lerpSpeed * safeDt);
    this.camera.position.lerp(this._desiredPosition, smoothAlpha);

    if (this.controls && this.controls.target) {
      this.controls.target.lerp(this._desiredTarget, smoothAlpha);
    } else {
      this.camera.lookAt(this._desiredTarget);
    }
  }

  /**
   * Cleans up listeners.
   */
  destroy() {
    if (this.controls && typeof this.controls.removeEventListener === 'function') {
      this.controls.removeEventListener('start', this._handleControlsStart);
    }
    this._modeListeners.clear();
  }
}

export default StreamDirectorController;
