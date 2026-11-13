import {
  STAGE_NAMES,
  TOTAL_EPC_MONTHS,
  getAllBuildingsSpec,
  getBuildingStageAtMonth,
  getEpochAtMonth,
} from '../config/masterSpecLoader.js';

export const EPC_KPI_TARGETS = Object.freeze({
  steelTonsErected: 145000,
  concreteCubicMeters: 680000,
  solarMegawatts: 120,
  robotsInstalled: 1820,
});

export const VALID_PLAYBACK_SPEEDS = Object.freeze([1, 2, 5, 10]);

const MAX_STAGE_INDEX = STAGE_NAMES.length - 1;

function clamp(value, min, max) {
  if (value <= min) return min;
  if (value >= max) return max;
  return value;
}

/**
 * Manages the 24-month EPC construction timeline, playback controls,
 * per-building manual stage overrides, and real-time EPC KPIs.
 */
export class ConstructionTimelineController {
  /**
   * @param {Object} [options]
   * @param {number} [options.initialMonth=0]
   * @param {boolean} [options.autoPlay=false]
   * @param {number} [options.playbackSpeed=1]
   */
  constructor(options = {}) {
    this.totalMonths = TOTAL_EPC_MONTHS;
    this.currentMonth = clamp(Number(options.initialMonth) || 0, 0, this.totalMonths);
    this.isPlaying = Boolean(options.autoPlay);
    this.playbackSpeed = this._normalizeSpeed(options.playbackSpeed ?? 1);

    /** @type {Map<string, { stageIndex: number, stageProgress: number }>} */
    this._overrides = new Map();

    /** @type {Set<Function>} */
    this._listeners = new Set();

    // Precompute building weights by footprint area for realistic KPI scaling
    const buildings = getAllBuildingsSpec();
    this._buildings = buildings;
    let totalArea = 0;
    this._buildingWeights = new Map();

    for (const b of buildings) {
      const area = Math.max(
        1,
        (b.bounds_m?.width_x ?? 50) * (b.bounds_m?.length_y ?? 50)
      );
      this._buildingWeights.set(b.id, area);
      totalArea += area;
    }

    if (totalArea > 0) {
      for (const [id, area] of this._buildingWeights.entries()) {
        this._buildingWeights.set(id, area / totalArea);
      }
    }
  }

  _normalizeSpeed(speed) {
    const num = Number(speed);
    if (!Number.isFinite(num) || num <= 0) return 1;
    return num;
  }

  /**
   * Starts or resumes timeline playback.
   * If already at the end (24.0), restarts from month 0.0.
   */
  play() {
    if (this.currentMonth >= this.totalMonths) {
      this.currentMonth = 0;
    }
    if (!this.isPlaying) {
      this.isPlaying = true;
      this._emit();
    } else {
      this._emit();
    }
  }

  /**
   * Pauses timeline playback.
   */
  pause() {
    if (this.isPlaying) {
      this.isPlaying = false;
      this._emit();
    }
  }

  /**
   * Toggles play/pause state and returns the new `isPlaying` value.
   * @returns {boolean}
   */
  togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
    return this.isPlaying;
  }

  /**
   * Jumps to a specific month in [0.0, 24.0].
   * @param {number} month
   * @returns {number}
   */
  setMonth(month) {
    const clamped = clamp(Number(month) || 0, 0, this.totalMonths);
    if (clamped !== this.currentMonth) {
      this.currentMonth = clamped;
      this._emit();
    }
    return this.currentMonth;
  }

  /**
   * Sets playback speed (e.g. 1, 2, 5, 10 months/second).
   * @param {number} speed
   * @returns {number}
   */
  setSpeed(speed) {
    const normalized = this._normalizeSpeed(speed);
    if (normalized !== this.playbackSpeed) {
      this.playbackSpeed = normalized;
      this._emit();
    }
    return this.playbackSpeed;
  }

  /**
   * Advances the timeline by `dt` seconds when `isPlaying` is true.
   * @param {number} dt - Elapsed time in seconds
   * @returns {ReturnType<ConstructionTimelineController['getState']>}
   */
  update(dt) {
    if (!this.isPlaying) {
      return this.getState();
    }

    const safeDt = Number.isFinite(dt) && dt > 0 ? dt : 0;
    if (safeDt === 0) {
      return this.getState();
    }

    const prevMonth = this.currentMonth;
    const nextMonth = clamp(
      prevMonth + safeDt * this.playbackSpeed,
      0,
      this.totalMonths
    );

    this.currentMonth = nextMonth;
    if (this.currentMonth >= this.totalMonths) {
      this.isPlaying = false;
    }

    if (nextMonth !== prevMonth || !this.isPlaying) {
      this._emit();
    }

    return this.getState();
  }

  /**
   * Manually advances a building's construction stage by +1 (up to stage 4: OPERATIONAL).
   * @param {string} buildingId
   * @returns {{ stageIndex: number, stageProgress: number, stageName: string, isOverridden: boolean }}
   */
  advanceBuildingStage(buildingId) {
    const current = this.getBuildingState(buildingId);
    const nextStageIndex = Math.min(MAX_STAGE_INDEX, current.stageIndex + 1);
    return this.setBuildingStage(buildingId, nextStageIndex, 1);
  }

  /**
   * Manually sets a building's construction stage (0..4) and optional progress (0..1).
   * @param {string} buildingId
   * @param {number} stageIndex
   * @param {number} [stageProgress=1]
   * @returns {{ stageIndex: number, stageProgress: number, stageName: string, isOverridden: boolean }}
   */
  setBuildingStage(buildingId, stageIndex, stageProgress = 1) {
    if (!buildingId) {
      throw new Error('buildingId is required for setBuildingStage');
    }

    const clampedStage = Math.round(clamp(Number(stageIndex) || 0, 0, MAX_STAGE_INDEX));
    const clampedProgress = clamp(Number(stageProgress) ?? 1, 0, 1);

    this._overrides.set(buildingId, {
      stageIndex: clampedStage,
      stageProgress: clampedProgress,
    });

    this._emit();
    return this.getBuildingState(buildingId);
  }

  /**
   * Clears manual override(s). If `buildingId` is omitted, clears all overrides.
   * @param {string} [buildingId]
   */
  clearOverrides(buildingId) {
    let changed = false;
    if (buildingId) {
      changed = this._overrides.delete(buildingId);
    } else if (this._overrides.size > 0) {
      this._overrides.clear();
      changed = true;
    }

    if (changed) {
      this._emit();
    }
  }

  /**
   * Returns the effective stage state for a building, accounting for manual overrides.
   * @param {string} buildingId
   * @returns {{ stageIndex: number, stageProgress: number, stageName: string, isOverridden: boolean }}
   */
  getBuildingState(buildingId) {
    const override = this._overrides.get(buildingId);
    if (override) {
      return {
        stageIndex: override.stageIndex,
        stageProgress: override.stageProgress,
        stageName: STAGE_NAMES[override.stageIndex],
        isOverridden: true,
      };
    }

    const scheduled = getBuildingStageAtMonth(buildingId, this.currentMonth);
    return {
      stageIndex: scheduled.stageIndex,
      stageProgress: scheduled.stageProgress,
      stageName: scheduled.stageName,
      isOverridden: false,
    };
  }

  /**
   * Returns a map of buildingId -> building stage state for all 24 buildings.
   * @returns {Record<string, { stageIndex: number, stageProgress: number, stageName: string, isOverridden: boolean }>}
   */
  getAllBuildingStates() {
    const states = {};
    for (const b of this._buildings) {
      states[b.id] = this.getBuildingState(b.id);
    }
    return states;
  }

  /**
   * Computes real-time EPC KPIs from the current building states and timeline month.
   */
  getKpis() {
    let concreteRatio = 0;
    let steelRatio = 0;
    let solarRatio = 0;
    let robotRatio = 0;

    for (const b of this._buildings) {
      const weight = this._buildingWeights.get(b.id) ?? 1 / Math.max(1, this._buildings.length);
      const { stageIndex, stageProgress } = this.getBuildingState(b.id);

      // Concrete poured in Stage 1 (FOUNDATION)
      if (stageIndex > 1) {
        concreteRatio += weight;
      } else if (stageIndex === 1) {
        concreteRatio += weight * stageProgress;
      }

      // Structural steel erected in Stage 2 (STEEL_FRAME)
      if (stageIndex > 2) {
        steelRatio += weight;
      } else if (stageIndex === 2) {
        steelRatio += weight * stageProgress;
      }

      // Rooftop solar installed in Stage 3 (ENVELOPE)
      if (stageIndex > 3) {
        solarRatio += weight;
      } else if (stageIndex === 3) {
        solarRatio += weight * stageProgress;
      }

      // Robots & automation installed late Stage 3 -> Stage 4 (OPERATIONAL)
      if (stageIndex === 4) {
        robotRatio += weight * (0.35 + 0.65 * stageProgress);
      } else if (stageIndex === 3) {
        robotRatio += weight * (0.35 * stageProgress);
      }
    }

    const activeEpoch = getEpochAtMonth(this.currentMonth);

    return {
      steelTonsErected: Math.round(EPC_KPI_TARGETS.steelTonsErected * clamp(steelRatio, 0, 1)),
      concreteCubicMeters: Math.round(
        EPC_KPI_TARGETS.concreteCubicMeters * clamp(concreteRatio, 0, 1)
      ),
      solarMegawatts: Number(
        (EPC_KPI_TARGETS.solarMegawatts * clamp(solarRatio, 0, 1)).toFixed(1)
      ),
      robotsInstalled: Math.round(EPC_KPI_TARGETS.robotsInstalled * clamp(robotRatio, 0, 1)),
      activeEpoch,
    };
  }

  /**
   * Returns a complete immutable snapshot of the timeline controller state.
   */
  getState() {
    const kpis = this.getKpis();
    const buildings = this.getAllBuildingStates();

    return {
      currentMonth: this.currentMonth,
      totalMonths: this.totalMonths,
      isPlaying: this.isPlaying,
      playbackSpeed: this.playbackSpeed,
      activeEpoch: kpis.activeEpoch,
      steelTonsErected: kpis.steelTonsErected,
      concreteCubicMeters: kpis.concreteCubicMeters,
      solarMegawatts: kpis.solarMegawatts,
      robotsInstalled: kpis.robotsInstalled,
      kpis,
      buildings,
      overrideCount: this._overrides.size,
    };
  }

  /**
   * Registers a state update listener. Returns an unsubscribe function.
   * @param {(state: ReturnType<ConstructionTimelineController['getState']>) => void} cb
   * @returns {() => void}
   */
  onUpdate(cb) {
    if (typeof cb !== 'function') {
      throw new TypeError('onUpdate callback must be a function');
    }
    this._listeners.add(cb);
    return () => {
      this._listeners.delete(cb);
    };
  }

  _emit() {
    if (this._listeners.size === 0) return;
    const state = this.getState();
    for (const cb of this._listeners) {
      try {
        cb(state);
      } catch (err) {
        console.error('[ConstructionTimelineController] onUpdate listener error:', err);
      }
    }
  }
}

export default ConstructionTimelineController;
