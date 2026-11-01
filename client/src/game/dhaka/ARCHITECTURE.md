# Dhaka Open World — technical architecture

## Runtime target
Current integration target: Vite + React + Three.js WebGL at `/dhaka-drive`. Unity/Unreal are alternative native implementations, not simultaneous runtimes. This package is additive and does not replace the existing page until each system has been integrated and regression-tested.

## Runtime layers
1. **Game bootstrap** — owns renderer, scene, camera, render loop, lifecycle and resize.
2. **World streaming** — grid-cell activation, distance-based visibility, object pools and disposal.
3. **Simulation** — fixed-step movement, traffic, pedestrian state machines and collision queries.
4. **Presentation** — models, materials, animation, audio emitters, particles and lighting.
5. **Player systems** — input mapping, vehicle/on-foot controller, camera rigs, interaction and missions.
6. **UI** — responsive HUD, minimap, pause/settings, mission tracker and input hints.
7. **Persistence/networking** — versioned local save first; authoritative server validation for any multiplayer/economy features.

## Suggested directory map
```text
client/src/game/dhaka/
  config/
    GameSettings.json
    PhysicsConfig.json
  core/
    GameRuntime.js
    FixedStepLoop.js
    WorldStreamer.js
    ObjectPool.js
  systems/
    VehicleController.js
    TrafficAI.js
    PedestrianAI.js
    CollisionWorld.js
    MissionSystem.js
    AudioManager.js
  input/
    InputMap.js
    TouchControls.js
  world/
    DhakaWorldBuilder.js
    DistrictRegistry.js
    LandmarkRegistry.js
  ui/
    GameHUD.jsx
    TouchDriveControls.jsx
  assets/
    manifest.json
  tests/
    vehicle-controller.test.js
```

## Performance budgets
- Desktop target: 60 FPS; mobile target: stable 30–60 FPS based on device capability.
- Cap device pixel ratio; avoid unbounded shadow maps and per-frame allocations.
- Pool traffic/pedestrian objects. Update distant agents less frequently and use squared-distance tests.
- Use instancing for repeated windows, streetlights, trees and traffic props.
- Use spatial hashing or a grid for collision and nearest-neighbor traffic queries; avoid nested all-pairs scans at scale.
- Stream city cells by player position and dispose geometry/materials when cells unload.
- Load GLTF/texture/audio assets asynchronously; provide fallback primitives and never assume remote assets exist.
- Respect reduced-motion settings and pause simulation when the tab is hidden.

## Physics and coordinate contract
- World units are meters; +Y is up.
- Vehicle heading 0 points toward +Z; movement uses the same convention in the vehicle controller.
- Simulation should use a fixed timestep with a capped accumulator.
- Collision response must not teleport the player. Resolve movement against the spatial index and damp speed once per collision event.
- Tune physics only after validating on desktop and touch devices; JSON values are starting points, not certified real-world vehicle physics.

## AI behavior
- Traffic: lane-follow, speed adaptation, safe following distance, pedestrian yielding, randomized route intent and despawn/recycle outside the active radius.
- Pedestrians: walk/wait/cross/idle states; crossings require a safety predicate from the collision/traffic system.
- Police: escalation state machine (idle, observe, pursue, search, disengage) must use explicit game rules, not hidden real-world tracking.
- Mission objectives and rewards must be server-authoritative if connected to user accounts or wallets.

## Dhaka content pack
Use licensed or original assets for Dhaka roads, signs, rickshaws, CNGs, buses, trucks, market stalls, pedestrians, streetlights and landmarks. Bengali text should use a bundled Bengali-capable font. Street ambience and azan should be optional, mixed at respectful levels, and controlled by a separate audio setting.

## Production gates before calling this production-ready
- Integrate modules behind the existing game interface without deleting current features.
- Add unit tests for steering sign, forward/reverse movement, braking, collision recovery and touch-pointer cancellation.
- Add browser/device profiling, low-memory tests, missing-asset fallback, accessibility checks and a deployment smoke test.
- Add server-side validation for saves, missions and any economy. Never trust client-side wallet/reward values.
- A GTA V-scale experience requires original/appropriately licensed assets, extensive QA and a substantially larger engineering effort; the current browser implementation remains a scalable prototype until these gates pass.


## Implemented gameplay modules in this repository

- `systems/VehicleController.js`: throttle, braking, reverse, steering and weather traction.
- `systems/TrafficAI.js`: nearby-cell spatial indexing, following-distance response, pedestrian yielding and opportunistic lane changes.
- `systems/PedestrianAI.js`: walk/wait/cross/idle state machine.
- `systems/MissionSystem.js`: timed missions, multi-stop routes, checkpoints, completion records and replay.
- `systems/SaveManager.js`: versioned, validated local save data.
- `systems/WeatherSystem.js`: clear/smog/rain/monsoon/fog presets, local rain particles, fog and wet-road material response.
- `systems/AudioManager.js`: generated engine, horn, rickshaw bell, mission-complete tones and weather ambience.
- `systems/CollisionWorld.js`: reusable spatial broad-phase grid.
- `tests/systems.test.js`: automated tests for vehicle movement, mission rewards/routes, saves and collision-grid queries.
- `/api/dhaka-game`: authenticated profile, leaderboard, session, mission-reward and nearby-player presence endpoints; mission rewards are computed server-side and limited to one claim per mission per day.
- `/DhakaOpenWorldGame`: separate UE5 C++ source project with procedural city, vehicle, traffic, pedestrian, weather, mission and save-game classes.

## Multiplayer and release boundary

The browser shared-world implementation uses authenticated HTTP heartbeats and 3-second nearby-player polling. It is a lightweight presence/synchronization layer, not a dedicated authoritative Unreal multiplayer server. The native Unreal source has not been compiled in this environment. Production release still requires building/testing in Unreal Engine 5.5, Android SDK/NDK setup for Android packaging, device profiling, dedicated-server/network QA, and appropriate original/licensed assets and sound. Do not treat local browser money as VibePulse points; only the backend-verified game score is synced to the online leaderboard.
