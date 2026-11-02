# Dhaka Open World — Unreal Engine 5 source project

This folder contains the native UE5/C++ project scaffold alongside the VibePulse browser game. The web game at `/dhaka-drive` remains the currently integrated play target; this native project is a separate build target and does not replace or break the existing React application.

## Included native gameplay source
- Procedural city actor with configurable grid, generated roads, building blocks, shopfront props, and overhead utility-wire silhouettes.
- Physics-driven vehicle pawn with throttle, steering, braking, chase camera and adjustable handling parameters.
- Game-instance mission subsystem with exploration, CNG taxi, delivery, bus-route, street-sprint and riverfront objectives plus reward wallet.
- SaveGame data model for location, travel distance, wallet, mission IDs, weather and time of day.
- UE5 ProceduralMeshComponent-based city geometry plus procedural Old Dhaka/Lalbagh-inspired courtyard, Old Dhaka market blocks, Gulshan/Banani and Motijheel tower silhouettes, Farmgate-inspired flyover, Dhanmondi lake/park, Uttara residential blocks, and Sadarghat riverfront/launch silhouettes.
- Modular procedural vehicle generator with configurable body dimensions, body shell, glazing, wheel/rim components, exterior trim and basic interior pieces; includes sedan, bus, motorcycle, rickshaw, CNG and boat categories.
- Procedural street-life generator for tea/food stalls, shop awnings, display props, plastic chairs, tables, barriers, drain covers, trees, lamps, signs and electric poles.
- Procedural citizen generator with seeded body/face parts, clothing-style variants (shirt/trousers, T-shirt/jeans, panjabi, saree, salwar kameez, school uniform, office/traditional clothing and jacket), and lightweight local wandering/walk-cycle motion.
- Timed directional traffic signals are generated at central intersections; traffic agents check red lights and follow vehicles ahead at a basic level.
- A native HUD displays wallet, active mission, destination distance and countdown; a pulsing world-space beacon marks the active destination; mission rewards and completion/failure states are saved in a versioned SaveGame slot.
- Weather Rain/Monsoon states drive an instanced procedural rain effect that follows the player; pedestrians perform swept collision checks and sidestep or wait when blocked.
- GameMode now spawns the district landmark, street-life, traffic-signal and procedural citizen generators. Mobile vehicle input includes touch zones for steering, acceleration and braking.

## Open and build
1. Install Unreal Engine 5.5 and the matching C++ toolchain (Visual Studio with the Desktop development with C++ workload on Windows).
2. Open `DhakaOpenWorldGame.uproject` in Unreal Editor and allow project files to be generated.
3. Open the default Entry map or create a level and select `ADhakaGameMode`. The GameMode automatically generates the city, spawns the player vehicle, ambient traffic, pedestrian crowd and weather controller.
4. Build Development Editor first, then package Windows or Android from Unreal's Platforms menu after installing the relevant Android SDK/NDK and platform components.

## Important implementation boundary
This is an active native-game rebuild, not yet a finished AAA-scale game. The new procedural generators are source implementations and have not yet been compiled or visually validated in Unreal Engine 5.5. Remaining major requirements include production-grade Chaos vehicle/wheel physics and damage deformation; complete skeletal anatomy/fingers/facial rigs and Control Rig/Animation Blueprints; navigable lane graph with traffic lights, overtaking, bus stops and robust collision avoidance; NavMesh/Behavior Tree pedestrian interactions; wet-road materials, puddles/splashes and thunder/lightning; spatial sound assets/mix; full mission, shop, inventory, garage, property and progression UI; secure server-authoritative multiplayer/dedicated servers and VibePulse backend integration; complete LOD/World Partition/streaming/performance work; automated gameplay tests; and Windows/Android/iOS packaging and device QA. Do not treat these items as complete until they are implemented and tested in the matching Unreal toolchain. The browser game remains separate and is not the native UE5 deliverable.

## Native controls
- Driving: **W/S** throttle/reverse, **A/D** steering, **Space** brake, **C** exit to on-foot mode.
- Walking: **W/A/S/D** move relative to camera, mouse to look, **Shift** sprint, **Space** jump, **E** or **C** enter a nearby unoccupied vehicle.
- Persistence: **F5** save location, travel distance, wallet and completed mission IDs; **F9** load.
- Touchscreen driving: touch/drag on the left side to steer; upper-right to accelerate; lower-right to brake.
