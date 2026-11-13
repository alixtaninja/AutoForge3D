# Architectural Visual Reference — EV Gigafactory 350Ha Digital Twin

> **Scope**: Real-world architectural benchmark and PBR visual specification for all 24 buildings (`F01..UT05`) in the AutoForge3D 350Ha EV Gigafactory City-Builder & 24-Month EPC Time-Lapse Engine.  
> **Coordinate & Scale Reference**: `src/gigafactory/config/masterSpecLoader.js` (`WORLD_SCALE = 0.25`, `HEIGHT_SCALE = 0.35`, `SCENIC_PROP_BOOST = 1.65`).

---

## 1. Global Real-World Gigafactory Benchmarks

| Benchmark Plant | Area / Scale | Architectural Signature | Adopted in AutoForge3D |
| :--- | :--- | :--- | :--- |
| **Tesla Gigafactory Shanghai (GF3) & Berlin-Brandenburg (GF4)** | ~86–300 ha | Linear spine process flow; insulated white/cool-gray corrugated sandwich cladding with dark charcoal fascia; massive flat-roof Solar PV arrays; Giga-Press high-bay aluminum casting halls; structural pack integration. | Linear spine `F01 → F02 → F03 → F04 → F05`; cool-gray insulated envelope (`#CBD5E1` / `#E2E8F0`) with dark parapet trim (`#1E293B`); full-coverage rooftop Solar PV (`#1E3A8A`). |
| **Xiaomi EV Super Factory (Beijing Yizhuang)** | ~72 ha | 9,100T Hyper-Casting; 100% Dark Factory BIW; crisp minimalist industrial aesthetic with horizontal clerestory glazing bands; automated high-bay AS/RS warehouse (`WH01`); integrated rooftop test/utilities. | 9,100T Giga-Casting `F01`; Dark Factory `F03`; 32m high-bay `WH01`; horizontal daylight glazing strips (`#93C5FD` / `#38BDF8` emissive-tint); clean-room AHU rooftop arrays. |
| **BYD Zhengzhou / Hefei Mega-Plant** | ~350+ ha | Co-located 40 GWh Blade/CTB Battery Cell + Pack Gigafactory (`F06A/F06B`) with vehicle assembly; extensive photovoltaic carport canopies over finished-vehicle marshalling yards; modular long-span H-column steel grids. | Co-located `F06A` (700m × 320m) + `F06B` + `F07`; Solar Carport Canopies in `LY01`; `24m × 24m` and `24m × 30m` standardized structural steel H-column bays. |
| **VinFast Hai Phong (335 ha) & North Carolina** | ~335 ha | Schuler Servo Stamping with `-6m` scrap basement; Dürr 3-story RoDip-E Eco-Smart Paint Shop with RTO VOC abatement stacks; On-site Supplier Park (`F08-1..5`) connected by enclosed elevated skybridges; iconic corporate glass IOC tower + proving ground. | `-6m` basement on `F02`; 3-tier `28.5m` Paint Shop `F04` with dual RTO stacks (`38m`); 5-building Supplier Park `F08-1..5`; 5 enclosed Skybridges `SB-01..05`; 8-story glass `IOC01` + `3.8 km` `PG01`. |

---

## 2. Structural & Facade Typologies

### 2.1 Curtain Walls & Insulated Metal Cladding
1. **Primary Insulated Sandwich Panels (PIR / Rockwool)**:
   - **Base Cladding**: Cool industrial off-white / light slate (`#E2E8F0` / `#CBD5E1`, `roughness: 0.55`, `metalness: 0.25`) with subtle vertical rib relief.
   - **Functional Accent Band**: Continuous upper-fascia or mid-wall horizontal stripe using each building's `color_hex` from `gigafactory_digital_twin_spec.json` for instant aerial legibility in YouTube livestream drone shots.
   - **Plinth / Dado Wall**: Reinforced precast concrete base (`#64748B`, `roughness: 0.88`) up to `+2.5m` to resist forklift/truck impact.
2. **Horizontal Clerestory Glazing**:
   - Continuous ribbon windows (`roughness: 0.12`, `metalness: 0.20`, `opacity: 0.65`) below the roof truss line on `F01–F05`, `F06A/B`, `F07`, `F08-1..5`, and `RD01`, emitting warm/cool interior light during dusk or operational phases.
3. **Full-Height Glass Curtain Wall (`IOC01`)**:
   - 8-story (`36m` height) corporate headquarters & AI Data Center using low-E deep-sky blue reflective curtain wall glazing (`#1565C0` / `#38BDF8`) framed by dark anodized aluminum mullions (`#0F172A`) on a `9m × 12m` column grid, crowned with a rooftop Helipad (`H`).
4. **Logistics Dock Doors & Aprons**:
   - Recessed sectional overhead doors (`#334155`) with dock levelers, yellow safety bollards (`#FACC15`), and concrete truck aprons on `F05` (88 dock doors), `WH01` (24 dock doors), and `F08-1..5`.

---

## 3. Roof Styles & Rooftop Mechanical Systems

| Roof Typology | Target Buildings | Architectural & Mechanical Details |
| :--- | :--- | :--- |
| **Flat Membrane Roof + Solar PV Array** | `F01`, `F02`, `F05`, `F06B`, `F07`, `F08-1..5`, `F09`, `WH01` | Low-slope TPO/standing-seam deck (`#94A3B8`) topped with `10°`-tilted dark-blue monocrystalline Solar PV rows (`#1E3A8A`, `metalness: 0.55`, `roughness: 0.22`) targeting `120 MWp` site-wide generation. |
| **Sawtooth Daylight Roof + Solar** | `F03` (`550m × 460m` BIW Dark Factory) | North-facing clerestory sawtooth monitors alternating with south-sloped Solar PV panels, breaking up the massive `290,000 m²` roof plane. |
| **3-Tier Stepped Roof + RTO Stacks** | `F04` (`28.5m` 3-Story Eco-Smart Paint Shop) | Stepped 3-floor massing (`+0m`, `+9m`, `+18m`) hosting **2 Regenerative Thermal Oxidizer (RTO) VOC abatement towers** with **38m brushed stainless-steel exhaust stacks**, plus high-capacity clean-room **AHU arrays** (`#0288D1`). |
| **Dry-Room AHU & NMP Recovery Roof** | `F06A` (`700m × 320m` 40 GWh Cell Plant) | **28 Munters Dry-Room Dehumidification AHU units** (`-50°C` dew point) arranged in twin rooftop rows, flanked by `26m` NMP solvent distillation towers on the West end and high-bay formation/aging volume on the East. |
| **Smelter Exhaust & Ventilation Louvers** | `F01` (Giga-Casting) | **6 StrikoMelter aluminum melting furnace exhaust stacks** along the West bay (`F01-Z1`) and heavy-duty ridge gravity ventilators. |
| **Solar Carport Canopies** | `LY01` (`630m × 120m` Finished Vehicle Yard) | Open-sided galvanized steel T-frame canopies (`6m` clearance) supporting continuous PV roofs over marshalling lanes and `800V` DC fast chargers. |
| **Corporate Helipad & Cooling Deck** | `IOC01` (`36m` 8-Story Tower) | Architectural roof parapet concealing chillers + elevated circular Helipad deck with perimeter safety markings. |

---

## 4. E-Shape General Assembly (`F05`) & Elevated Skybridges

- **E-Shape Dock-to-Line Topology (`F05`, `650m × 460m`)**:
  - **North Spine (`650m × 160m`)**: Doors-Off, Trim Line 1 & 2, AMR Kitting Supermarket.
  - **3 South-Facing Fingers (`West: 180m`, `Center: 190m`, `East: 180m` × `300m` long)**: Cockpit/Front-End, Chassis + 48-Axis Servo Marriage, Final Line + OTA Roll-Off.
  - **2 U-Shaped Internal Truck Courts**: Allows JIT/JIS trailers direct dock-to-line access across **88 dock doors** without crossing internal AGV/AMR lanes.
- **5 Enclosed Elevated Skybridges (`SB-01..05`)**:
  - Steel Warren-truss spans on T-shaped concrete/steel piers at `+9.5m` to `+18.0m` clearance, enclosed with transparent polycarbonate/glass side walls so viewers can see BIW shells (`SB-01`), painted bodies (`SB-02`), CTB battery packs (`SB-03`), E-axles (`SB-04`), and JIS seats/cockpits (`SB-05`) moving across roads.

---

## 5. Color Palette & Functional Zone Coding

| Cluster | Building IDs | Primary Accent (`color_hex`) | Cladding / Secondary | Visual Role |
| :--- | :--- | :--- | :--- | :--- |
| **Primary Manufacturing** | `F01`, `F02`, `F03` | `#E65100`, `#F57C00`, `#D84315` (Thermal Orange-Red) | `#E2E8F0` Cool White, `#334155` Charcoal | Heavy metal forming, casting, and robotic welding |
| **Eco-Smart Paint** | `F04` | `#0288D1` (Clean-Room Sky Blue) | `#F1F5F9` White, `#CBD5E1` Stainless Stacks | 3-story clean-room & RTO VOC abatement |
| **Assembly & EOL** | `F05`, `F09` | `#2E7D32`, `#388E3C` (Eco-EV Green) | `#E2E8F0` White, `#1E3A8A` Solar PV | Final vehicle marriage & ADAS calibration |
| **Battery & Powertrain** | `F06A`, `F06B`, `F07` | `#6A1B9A`, `#8E24AA`, `#4527A0` (High-Tech Purple) | `#E2E8F0` White, `#94A3B8` Dry-Room AHUs | 40 GWh Cell, CTB Pack & 800V SiC E-Axle |
| **Supplier Park** | `F08-1..5` | `#00838F` (JIS Teal) | `#E2E8F0` White, `#475569` Silos/Docks | On-site molding, seats, hot-stamping, harnesses |
| **Logistics & Testing** | `WH01`, `LY01`, `PG01` | `#546E7A`, `#607D8B`, `#455A64` (Industrial Slate) | `#1E3A8A` Solar Carports, `#26292E` Asphalt | 32m AS/RS, Solar Yard & 3.8km Proving Ground |
| **Admin & R&D** | `IOC01`, `RD01`, `UT05` | `#1565C0`, `#1976D2`, `#C62828` | `#38BDF8` Curtain Glass, `#F8FAFC` Fire Bays | 8-story HQ tower, Wind Tunnel, EV Fire Station |
| **Utilities & Energy** | `UT01..UT04` | `#FBC02D`, `#F9A825`, `#F57F17`, `#0097A7` | `#CBD5E1` Cryo Tanks, `#EAB308` BESS | 220kV Substation, 42k RT CUB, Cryo Gas, ZLD Water |

---

## 6. 5-Stage EPC Construction Visual Progression (`stageRenderer.js`)

1. **Stage 0 — `SURVEY` (Survey & Excavation)**:
   - Compaction earthwork pad (brown-ochre soil `#8B6F47`), recessed excavation pit for buildings with `basement_z < 0` (`F02`, `UT04`), perimeter soil berms, red-and-white survey stakes, and active **Excavator** (`buildExcavatorTwin`) + **Bulldozer** (`buildBulldozerTwin`).
2. **Stage 1 — `FOUNDATION` (Piling & Foundation)**:
   - Lean concrete blinding slab (`#CBD5E1`), `InstancedMesh` spun-concrete pile caps & footings aligned to `column_grid_m`, **Rebar Cage & Formwork** (`buildRebarCageAndFormworkTwin`), **Plywood Formwork Stacks** (`buildPlywoodFormworkStackTwin`), **Concrete Pile Stacks** (`buildConcretePileStackTwin`), and an animated **Concrete Mixer Truck** (`buildConcreteMixerTruckTwin`) with rotating spiral drum.
3. **Stage 2 — `STEEL_FRAME` (Structural Steel Grid)**:
   - `InstancedMesh` structural **H-columns** and **roof trusses/girders** rising bay-by-bay along `column_grid_m`, intermediate concrete floor slabs for multi-story buildings (`floors > 1`), **1–4 animated slewing Tower Cranes** (`buildTowerCraneTwin`), **Crawler Crane** (`buildCrawlerCraneTwin`), **Steel Girder Stacks** (`buildSteelGirderStackTwin`), and green safety-net **Scaffolding Bays** (`buildScaffoldingBayTwin`).
4. **Stage 3 — `ENVELOPE` (Cladding, Dock Doors & Rooftop Solar)**:
   - Insulated metal cladding rising from bottom to top, horizontal clerestory glazing bands, `InstancedMesh` logistics **Dock Doors**, and `InstancedMesh` **Rooftop Solar PV panels** installing progressively across the roof deck while cranes/scaffolding demobilize.
5. **Stage 4 — `OPERATIONAL` (Completed Building + Cutaway X-Ray Support)**:
   - Full architectural exterior (`buildCompletedExteriorFn` or procedural fallback) with rooftop **AHU arrays**, **RTO/smelter stacks**, **LED building signage**, and **Cutaway X-Ray mode** (`isCutaway = true`) to reveal interior production lines.
