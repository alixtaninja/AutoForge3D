import manifest from '../../../docs/ev-gigafactory-blueprint/construction_stages_manifest.json' with { type: 'json' };

/**
 * Canonical 5-stage EPC construction lifecycle for each building.
 */
export const STAGE_NAMES = Object.freeze([
  'SURVEY',
  'FOUNDATION',
  'STEEL_FRAME',
  'ENVELOPE',
  'OPERATIONAL',
]);

export const CONSTRUCTION_STAGES = Object.freeze({
  SURVEY: {
    index: 0,
    name: 'SURVEY',
    labelVi: 'Khảo sát & San lấp',
  },
  FOUNDATION: {
    index: 1,
    name: 'FOUNDATION',
    labelVi: 'Ép cọc & Đổ móng',
  },
  STEEL_FRAME: {
    index: 2,
    name: 'STEEL_FRAME',
    labelVi: 'Lắp dựng Khung thép',
  },
  ENVELOPE: {
    index: 3,
    name: 'ENVELOPE',
    labelVi: 'Hoàn thiện Vỏ & Mái Solar',
  },
  OPERATIONAL: {
    index: 4,
    name: 'OPERATIONAL',
    labelVi: 'Vận hành Toàn trình',
  },
});

export const STREAM_MODE_CONFIG = Object.freeze({
  ...(manifest.stream_mode_config || {}),
});

export const TOTAL_EPC_MONTHS = STREAM_MODE_CONFIG.total_epc_months ?? 24;

/**
 * Epoch definitions E0..E6 from construction_stages_manifest.json.
 */
export const EPOCHS = Object.freeze(
  (manifest.epochs || []).map((epoch) => Object.freeze({ ...epoch }))
);

export const EPOCH_BY_ID = Object.freeze(
  EPOCHS.reduce((acc, epoch) => {
    acc[epoch.epoch_id] = epoch;
    return acc;
  }, {})
);

/**
 * Per-building 24-month EPC construction windows aligned with Epochs E0..E6.
 */
export const BUILDING_CONSTRUCTION_SCHEDULES = Object.freeze({
  // Utilities & early power infrastructure (E2 substation energized first)
  UT01: { startMonth: 4.0, endMonth: 9.5 },
  UT02: { startMonth: 6.0, endMonth: 16.0 },
  UT03: { startMonth: 6.5, endMonth: 16.0 },
  UT04: { startMonth: 5.5, endMonth: 16.5 },
  UT05: { startMonth: 8.0, endMonth: 17.5 },

  // Primary manufacturing spine (F01..F05)
  F01: { startMonth: 5.0, endMonth: 16.0 },
  F02: { startMonth: 5.0, endMonth: 16.5 },
  F03: { startMonth: 6.0, endMonth: 17.0 },
  F04: { startMonth: 6.0, endMonth: 18.0 },
  F05: { startMonth: 6.0, endMonth: 18.0 },

  // Automated high-bay warehouse
  WH01: { startMonth: 7.0, endMonth: 16.0 },

  // Battery & powertrain cluster
  F06A: { startMonth: 8.0, endMonth: 18.5 },
  F06B: { startMonth: 9.0, endMonth: 18.5 },
  F07: { startMonth: 9.0, endMonth: 18.5 },

  // On-site supplier park (F08-1..F08-5)
  'F08-1': { startMonth: 10.0, endMonth: 18.0 },
  'F08-2': { startMonth: 10.0, endMonth: 18.0 },
  'F08-3': { startMonth: 10.0, endMonth: 18.0 },
  'F08-4': { startMonth: 10.0, endMonth: 18.0 },
  'F08-5': { startMonth: 10.0, endMonth: 18.5 },

  // Admin, R&D & testing/yard cluster
  IOC01: { startMonth: 7.0, endMonth: 18.0 },
  RD01: { startMonth: 9.0, endMonth: 19.0 },
  F09: { startMonth: 11.0, endMonth: 20.0 },
  LY01: { startMonth: 13.0, endMonth: 21.0 },
  PG01: { startMonth: 14.0, endMonth: 21.5 },
});

function clamp01(value) {
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

/**
 * Returns the active Epoch (E0..E6) for a continuous month in [0, 24].
 * @param {number} currentMonth
 */
export function getEpochAtMonth(currentMonth = 0) {
  const m = Math.max(0, Math.min(TOTAL_EPC_MONTHS, Number(currentMonth) || 0));
  for (let i = 0; i < EPOCHS.length; i += 1) {
    const epoch = EPOCHS[i];
    const nextEpoch = EPOCHS[i + 1];
    const upperBound = nextEpoch ? nextEpoch.month_range[0] : TOTAL_EPC_MONTHS + 0.001;
    if (m >= epoch.month_range[0] && m < upperBound) {
      return epoch;
    }
  }
  return EPOCHS[EPOCHS.length - 1] || null;
}

/**
 * Returns { startMonth, endMonth } for a given building ID.
 * @param {string} buildingId
 */
export function getBuildingSchedule(buildingId) {
  return BUILDING_CONSTRUCTION_SCHEDULES[buildingId] || { startMonth: 6.0, endMonth: 18.0 };
}

/**
 * Computes the construction stage (0..4) and normalized progress (0..1)
 * for a building at a given month in the 24-month EPC timeline.
 *
 * @param {string} buildingId
 * @param {number} currentMonth
 * @returns {{ stageIndex: number, stageProgress: number, stageName: 'SURVEY'|'FOUNDATION'|'STEEL_FRAME'|'ENVELOPE'|'OPERATIONAL' }}
 */
export function getBuildingStageAtMonth(buildingId, currentMonth = 0) {
  const m = Math.max(0, Number(currentMonth) || 0);
  const { startMonth, endMonth } = getBuildingSchedule(buildingId);

  if (m < startMonth) {
    const surveyProgress = startMonth > 0 ? clamp01(m / startMonth) : 0;
    return {
      stageIndex: 0,
      stageProgress: surveyProgress,
      stageName: STAGE_NAMES[0],
    };
  }

  if (m >= endMonth) {
    return {
      stageIndex: 4,
      stageProgress: 1,
      stageName: STAGE_NAMES[4],
    };
  }

  const duration = Math.max(0.001, endMonth - startMonth);
  const t = clamp01((m - startMonth) / duration);

  // Active construction phases: FOUNDATION [0, 0.30), STEEL_FRAME [0.30, 0.68), ENVELOPE [0.68, 1.0)
  if (t < 0.30) {
    return {
      stageIndex: 1,
      stageProgress: clamp01(t / 0.30),
      stageName: STAGE_NAMES[1],
    };
  }

  if (t < 0.68) {
    return {
      stageIndex: 2,
      stageProgress: clamp01((t - 0.30) / 0.38),
      stageName: STAGE_NAMES[2],
    };
  }

  return {
    stageIndex: 3,
    stageProgress: clamp01((t - 0.68) / 0.32),
    stageName: STAGE_NAMES[3],
  };
}

export function getManifestRaw() {
  return manifest;
}
