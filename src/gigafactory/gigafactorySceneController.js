import * as THREE from 'three';
import { getAllBuildingsSpec } from './config/masterSpecLoader.js';
import { ConstructionTimelineController } from './core/constructionTimeline.js';
import {
  buildGigafactoryTerrain,
  updateTerrainEarthworkByMonth,
} from './infra/terrainAndEarthwork.js';
import { buildGigafactoryRoadNetwork } from './infra/roadNetworkBuilder.js';
import { buildTrafficAndUrbanProps } from './infra/trafficPropsBuilder.js';
import { buildSpineFactories } from './builders/spineFactoriesBuilder.js';
import { buildSkybridges } from './builders/skybridgesBuilder.js';
import { buildNorthEnergyAndBattery } from './builders/northEnergyBatteryBuilder.js';
import { buildSouthSupplierAndRd } from './builders/southSupplierRdBuilder.js';
import { buildEastTestingAndYard } from './builders/eastTestingYardBuilder.js';
import { buildInteriorProductionLines } from './builders/interiorProductionLines.js';
import { StreamDirectorController, CAMERA_MODES } from './core/streamDirector.js';
import { GigafactoryUIManager } from './core/gigafactoryUI.js';

/**
 * Orchestrates the 350Ha EV Gigafactory City-Builder & EPC Time-Lapse Engine.
 * Lazily initializes all terrain, road, traffic, building, skybridge, interior,
 * camera director, and HUD subsystems on first activation.
 */
export class GigafactorySceneController {
  /**
   * @param {Object} options
   * @param {THREE.Scene} options.scene
   * @param {THREE.PerspectiveCamera} options.camera
   * @param {import('three/addons/controls/OrbitControls.js').OrbitControls} options.controls
   */
  constructor({ scene, camera, controls }) {
    this.scene = scene;
    this.camera = camera;
    this.controls = controls;

    this.group = new THREE.Group();
    this.group.name = 'Gigafactory350HaScene';
    this.group.visible = false;

    this.initialized = false;
    this.isActive = false;
    this.isCutaway = false;

    this._elapsedTime = 0;
    this._dirtyTimelineVisuals = true;
    this._unsubTimeline = null;

    // Saved Riverside Demo camera/fog state for clean restoration
    this._savedState = null;

    // Subsystems (lazily created in _init)
    this.buildingsSpec = null;
    this.timeline = null;
    this.terrainHandle = null;
    this.roadNetwork = null;
    this.trafficProps = null;
    this.spineFactories = null;
    this.skybridges = null;
    this.northEnergy = null;
    this.southSupplier = null;
    this.eastTesting = null;
    this.interiorLines = null;
    this.streamDirector = null;
    this.uiManager = null;
  }

  _init() {
    if (this.initialized) return;

    this.buildingsSpec = getAllBuildingsSpec();

    this.timeline = new ConstructionTimelineController({
      initialMonth: 0,
      autoPlay: false,
      playbackSpeed: 1,
    });

    this._unsubTimeline = this.timeline.onUpdate(() => {
      this._dirtyTimelineVisuals = true;
    });

    // 1. Terrain & 24 Surveyed Plot Pads
    this.terrainHandle = buildGigafactoryTerrain(null, this.buildingsSpec);
    this.group.add(this.terrainHandle.group);

    // 2. Road Network (8 Boulevards + Spurs + Gates)
    this.roadNetwork = buildGigafactoryRoadNetwork();
    this.group.add(this.roadNetwork.group);

    // 3. Smart Traffic Infrastructure (Streetlights, 3-Color Signals, Gantry Signs, Trees)
    this.trafficProps = buildTrafficAndUrbanProps();
    this.group.add(this.trafficProps.group);

    // 4. Production Spine (F01..F05) & Skybridges (SB-01..05)
    this.spineFactories = buildSpineFactories(this.timeline);
    this.group.add(this.spineFactories.group);

    this.skybridges = buildSkybridges(this.timeline);
    this.group.add(this.skybridges.group);

    // 5. North Energy & Battery Cluster (F06A, F06B, F07, UT01..UT04)
    this.northEnergy = buildNorthEnergyAndBattery(this.timeline);
    this.group.add(this.northEnergy.group);

    // 6. South Supplier, AS/RS, IOC01 Tower, R&D (WH01, F08-1..5, IOC01, RD01, UT05)
    this.southSupplier = buildSouthSupplierAndRd(this.timeline);
    this.group.add(this.southSupplier.group);

    // 7. East Testing, Proving Ground & Solar Yard (F09, PG01, LY01)
    this.eastTesting = buildEastTestingAndYard(this.timeline);
    this.group.add(this.eastTesting.group);

    // 8. Interior Production Lines (visible in X-Ray cutaway or close zoom at Stage 3/4)
    this.interiorLines = buildInteriorProductionLines(this.timeline);
    this.group.add(this.interiorLines.group);

    // 9. YouTube Stream Camera Director & EPC HUD
    this.streamDirector = new StreamDirectorController({
      camera: this.camera,
      controls: this.controls,
      timeline: this.timeline,
      initialMode: CAMERA_MODES.DRONE_ORBIT,
    });

    this.uiManager = new GigafactoryUIManager({
      timeline: this.timeline,
      streamDirector: this.streamDirector,
      visible: false,
      onStageAdvance: () => {
        this._dirtyTimelineVisuals = true;
      },
    });

    this.scene.add(this.group);
    this.initialized = true;
    this._dirtyTimelineVisuals = true;
  }

  /**
   * Activates the 350Ha EV Gigafactory City-Builder mode.
   * Saves Riverside fog/camera state and expands fog + camera.far for 350Ha scale.
   */
  activate() {
    if (!this.initialized) {
      this._init();
    }

    if (!this._savedState) {
      this._savedState = {
        fog: this.scene.fog ? this.scene.fog.clone() : null,
        background: this.scene.background ? this.scene.background.clone() : null,
        cameraFar: this.camera.far,
        cameraPos: this.camera.position.clone(),
        controlsTarget: this.controls.target.clone(),
        minDistance: this.controls.minDistance,
        maxDistance: this.controls.maxDistance,
      };
    }

    this.isActive = true;
    this.group.visible = true;

    // Expand atmospheric fog & camera far plane for 350Ha scale (625 x 350 world units)
    this.scene.background = new THREE.Color(0xe6eff8);
    this.scene.fog = new THREE.Fog(0xe6eff8, 700, 2600);
    this.camera.far = 3000;
    this.camera.updateProjectionMatrix();

    this.controls.minDistance = 18;
    this.controls.maxDistance = 950;

    // Position camera for an immediate sweeping overview on entry
    if (this.streamDirector.getMode() === CAMERA_MODES.MANUAL) {
      this.camera.position.set(0, 145, 250);
      this.controls.target.set(0, 6, 0);
      this.controls.update();
    }

    this._dirtyTimelineVisuals = true;
    this._syncAllSubsystems(0, this._elapsedTime);

    this.uiManager.show();
  }

  /**
   * Deactivates Gigafactory mode and restores original Riverside Demo fog & camera.
   */
  deactivate() {
    this.isActive = false;
    this.group.visible = false;

    if (this.timeline) {
      this.timeline.pause();
    }
    if (this.uiManager) {
      this.uiManager.hide();
    }

    if (this._savedState) {
      this.scene.fog = this._savedState.fog ? this._savedState.fog.clone() : null;
      if (this._savedState.background) {
        this.scene.background = this._savedState.background.clone();
      }
      this.camera.far = this._savedState.cameraFar;
      this.camera.position.copy(this._savedState.cameraPos);
      this.camera.updateProjectionMatrix();

      this.controls.target.copy(this._savedState.controlsTarget);
      this.controls.minDistance = this._savedState.minDistance;
      this.controls.maxDistance = this._savedState.maxDistance;
      this.controls.update();

      this._savedState = null;
    }
  }

  /**
   * Synchronizes the X-Ray Roof Cutaway state with Gigafactory buildings & interiors.
   * @param {boolean} enabled
   */
  setCutaway(enabled) {
    this.isCutaway = Boolean(enabled);
    this._dirtyTimelineVisuals = true;
  }

  /**
   * Raycasts against the 24 Gigafactory plot pads and selects the clicked plot in the HUD.
   * @param {THREE.Raycaster} raycaster
   * @returns {boolean} True if a Gigafactory plot was hit
   */
  handlePointerClick(raycaster) {
    if (!this.isActive || !this.initialized || !this.terrainHandle?.plotMeshes) {
      return false;
    }

    const hits = raycaster.intersectObjects(this.terrainHandle.plotMeshes, false);
    if (hits.length === 0) {
      return false;
    }

    const hitData = hits[0].object?.userData;
    const buildingTarget = hitData?.buildingSpec || hitData?.buildingId;
    if (!buildingTarget) {
      return false;
    }

    this.uiManager.selectBuilding(buildingTarget);
    if (this.streamDirector) {
      this.streamDirector.focusOnBuilding(buildingTarget);
    }
    return true;
  }

  _syncAllSubsystems(dt, elapsedTime) {
    const month = this.timeline.currentMonth;

    if (this._dirtyTimelineVisuals) {
      updateTerrainEarthworkByMonth(this.terrainHandle, this.timeline);
      this.roadNetwork.updateRoadsByMonth(month);
      this._dirtyTimelineVisuals = false;
    }

    this.trafficProps.updateTrafficLights(elapsedTime, month);
    this.spineFactories.update(elapsedTime, month, this.isCutaway);
    this.skybridges.update(elapsedTime, month);
    this.northEnergy.update(elapsedTime, month, this.isCutaway);
    this.southSupplier.update(elapsedTime, month, this.isCutaway);
    this.eastTesting.update(elapsedTime, month, this.isCutaway);
    this.interiorLines.update(elapsedTime, month, this.isCutaway, this.camera.position);

    if (this.streamDirector) {
      this.streamDirector.update(dt);
    }
  }

  /**
   * Per-frame update called from main.js animate() when Gigafactory mode is active.
   * @param {number} dt
   * @param {number} elapsedTime
   */
  update(dt, elapsedTime) {
    if (!this.isActive || !this.initialized) return;

    this._elapsedTime = elapsedTime;
    this.timeline.update(dt);
    this._syncAllSubsystems(dt, elapsedTime);
  }
}

export default GigafactorySceneController;
