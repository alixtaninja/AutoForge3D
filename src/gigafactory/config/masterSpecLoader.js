import masterSpec from '../../../docs/ev-gigafactory-blueprint/gigafactory_digital_twin_spec.json' with { type: 'json' };
import manifest from '../../../docs/ev-gigafactory-blueprint/construction_stages_manifest.json' with { type: 'json' };
import {
  CONSTRUCTION_STAGES,
  EPOCH_BY_ID,
  EPOCHS,
  STAGE_NAMES,
  STREAM_MODE_CONFIG,
  TOTAL_EPC_MONTHS,
  getBuildingSchedule,
  getBuildingStageAtMonth,
  getEpochAtMonth,
} from './constructionStagesSpec.js';

/**
 * Smart Scenic Scale constants for the 350ha EV Gigafactory Digital Twin.
 * Blueprint site: 2500m (X) x 1400m (Y), centered at (1250, 700).
 */
export const WORLD_SCALE = 0.25;
export const HEIGHT_SCALE = 0.35;
export const SCENIC_PROP_BOOST = 1.65;

export const SITE_CENTER_X_BP = 1250;
export const SITE_CENTER_Y_BP = 700;

/**
 * Converts blueprint coordinates (meters, SW origin) to Three.js world coordinates.
 * Y_bp (South -> North) maps to -Z in Three.js.
 *
 * @param {number} xBp
 * @param {number} yBp
 * @param {number} [zBp=0]
 * @returns {{ x: number, y: number, z: number }}
 */
export function bpTo3JS(xBp, yBp, zBp = 0) {
  return {
    x: (xBp - SITE_CENTER_X_BP) * WORLD_SCALE,
    y: zBp * HEIGHT_SCALE,
    z: (SITE_CENTER_Y_BP - yBp) * WORLD_SCALE,
  };
}

/**
 * Converts a building/zone blueprint bounding box into Three.js coordinates & dimensions.
 *
 * @param {{ x_min: number, y_min: number, width_x: number, length_y: number, height_z?: number, basement_z?: number }} bounds_m
 * @returns {{ centerX: number, centerZ: number, widthX: number, depthZ: number, heightY: number, basementY: number, minX: number, maxX: number, minZ: number, maxZ: number }}
 */
export function bpBoundsTo3JS(bounds_m) {
  const xMinBp = bounds_m.x_min;
  const xMaxBp = bounds_m.x_min + bounds_m.width_x;
  const yMinBp = bounds_m.y_min;
  const yMaxBp = bounds_m.y_min + bounds_m.length_y;

  const pSW = bpTo3JS(xMinBp, yMinBp, 0);
  const pNE = bpTo3JS(xMaxBp, yMaxBp, 0);

  const minX = Math.min(pSW.x, pNE.x);
  const maxX = Math.max(pSW.x, pNE.x);
  const minZ = Math.min(pSW.z, pNE.z);
  const maxZ = Math.max(pSW.z, pNE.z);

  const widthX = bounds_m.width_x * WORLD_SCALE;
  const depthZ = bounds_m.length_y * WORLD_SCALE;
  const heightY = (bounds_m.height_z ?? 0) * HEIGHT_SCALE;
  const basementY = (bounds_m.basement_z ?? 0) * HEIGHT_SCALE;

  return {
    centerX: (minX + maxX) * 0.5,
    centerZ: (minZ + maxZ) * 0.5,
    widthX,
    depthZ,
    heightY,
    basementY,
    minX,
    maxX,
    minZ,
    maxZ,
  };
}

const CACHED_BUILDINGS_SPEC = Object.freeze(
  (masterSpec.buildings || []).map((building) => {
    const bounds3JS = bpBoundsTo3JS(building.bounds_m);
    const schedule = getBuildingSchedule(building.id);
    const columnGrid3JS = Array.isArray(building.column_grid_m)
      ? [
          building.column_grid_m[0] * WORLD_SCALE,
          building.column_grid_m[1] * WORLD_SCALE,
        ]
      : [0, 0];

    return {
      ...building,
      bounds3JS,
      position: {
        x: bounds3JS.centerX,
        y: 0,
        z: bounds3JS.centerZ,
      },
      columnGrid3JS,
      startMonth: schedule.startMonth,
      endMonth: schedule.endMonth,
    };
  })
);

const CACHED_SKYBRIDGES_SPEC = Object.freeze(
  (masterSpec.skybridges || []).map((sb) => ({
    ...sb,
    waypoints3JS: (sb.waypoints_xyz_m || []).map(([x, y, z]) => bpTo3JS(x, y, z)),
    width3JS: (sb.width_m ?? 8) * WORLD_SCALE,
    height3JS: (sb.height_m ?? 5) * HEIGHT_SCALE,
  }))
);

const CACHED_ROAD_CORRIDORS_SPEC = Object.freeze(
  (manifest.road_network_spec?.main_boulevards || []).map((road) => {
    const isHorizontal = Array.isArray(road.x_range);
    const bounds_m = isHorizontal
      ? {
          x_min: road.x_range[0],
          y_min: road.y_center - road.width_m * 0.5,
          width_x: road.x_range[1] - road.x_range[0],
          length_y: road.width_m,
          height_z: 0,
        }
      : {
          x_min: road.x_center - road.width_m * 0.5,
          y_min: road.y_range[0],
          width_x: road.width_m,
          length_y: road.y_range[1] - road.y_range[0],
          height_z: 0,
        };

    const bounds3JS = bpBoundsTo3JS(bounds_m);

    return {
      ...road,
      orientation: isHorizontal ? 'horizontal' : 'vertical',
      bounds_m,
      bounds3JS,
      width3JS: road.width_m * WORLD_SCALE,
    };
  })
);

const CACHED_AGV_CORRIDORS_SPEC = Object.freeze(
  (masterSpec.agv_ground_corridors || []).map((corridor) => ({
    ...corridor,
    waypoints3JS: (corridor.waypoints_xy_m || []).map(([x, y]) => bpTo3JS(x, y, 0)),
  }))
);

/**
 * Returns all 24 Gigafactory buildings (F01..UT05) with converted Three.js bounds
 * and EPC construction schedule (startMonth, endMonth).
 */
export function getAllBuildingsSpec() {
  return CACHED_BUILDINGS_SPEC;
}

/**
 * Returns a single building spec by ID, or null if not found.
 * @param {string} buildingId
 */
export function getBuildingSpecById(buildingId) {
  return CACHED_BUILDINGS_SPEC.find((b) => b.id === buildingId) || null;
}

/**
 * Returns all 5 elevated skybridges (SB-01..SB-05) with Three.js waypoints.
 */
export function getSkybridgesSpec() {
  return CACHED_SKYBRIDGES_SPEC;
}

/**
 * Returns all 8 main road boulevards with Three.js bounds and orientation.
 */
export function getRoadCorridorsSpec() {
  return CACHED_ROAD_CORRIDORS_SPEC;
}

/**
 * Returns all AGV/AMR ground corridors with Three.js waypoints.
 */
export function getAgvCorridorsSpec() {
  return CACHED_AGV_CORRIDORS_SPEC;
}

/**
 * Returns production KPIs from the master specification.
 */
export function getProjectKpis() {
  return masterSpec.production_kpis;
}

/**
 * Returns the raw master digital twin JSON spec.
 */
export function getMasterSpecRaw() {
  return masterSpec;
}

export {
  CONSTRUCTION_STAGES,
  EPOCH_BY_ID,
  EPOCHS,
  STAGE_NAMES,
  STREAM_MODE_CONFIG,
  TOTAL_EPC_MONTHS,
  getBuildingSchedule,
  getBuildingStageAtMonth,
  getEpochAtMonth,
};
