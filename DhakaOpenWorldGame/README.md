# Dhaka Open World — Unreal Engine 5 source project

This folder contains the native UE5/C++ project scaffold alongside the VibePulse browser game. The web game at `/dhaka-drive` remains the currently integrated play target; this native project is separate and does not replace or break the existing React application.

## Included native gameplay source
- Procedural city actor with configurable grid, roads, sidewalks, curbs, asphalt patch/pothole silhouettes, buildings, shopfront props and utility-wire silhouettes.
- Physics-driven vehicle pawn with throttle, steering, braking, chase camera and adjustable handling parameters.
- Game-instance mission subsystem, destination markers/HUD, rewards, and SaveGame persistence.
- Procedural district-inspired landmarks: Old Dhaka/Lalbagh, markets, Gulshan/Banani, Motijheel, Farmgate, Dhanmondi, Uttara and Sadarghat.
- Procedural vehicle generator with body shell, glazing, wheels/rims, trim and basic interior pieces; sedan, bus, motorcycle, rickshaw, CNG and boat categories.
- Procedural street-life and citizen generators, clothing-style variants, and lightweight wandering/walk-cycle motion.
- Timed traffic signals, basic traffic following/red-light stopping, randomized grid turns, and differentiated procedural car/bus/truck/CNG/motorcycle/rickshaw/emergency silhouettes with wheel components.\n- Platform-aware crowd/traffic caps reduce spawned agents on mobile compared with PC.
- Blueprint-callable economy subsystem for shop purchase/sale, inventory records, property ownership/income and XP progression.
- Procedural instanced rain; vehicle grip and pedestrian pace respond to weather; pedestrians use swept collision checks.
- Native audio director with assignable city-traffic, market, rain, riverfront and engine loops, plus horn/rickshaw-bell/vendor one-shot events. No audio assets are bundled; assign original/licensed files in Unreal Editor.
- GameMode spawns city, landmarks, street-life, signals, traffic, pedestrians, weather and audio routing. Basic touch-driving zones and PC controls are present.

## Open and build
1. Install Unreal Engine 5.5 and matching C++ toolchain (Visual Studio with Desktop development with C++ on Windows).
2. Open `DhakaOpenWorldGame.uproject` in Unreal Editor and generate project files.
3. Open the Entry map or create a level and select `ADhakaGameMode`.
4. Build Development Editor, then package Windows/Android after installing required SDKs.

## Important implementation boundary
This is an active native-game rebuild, not a finished AAA-scale game. It has not yet been compiled or visually validated in UE5.5. Remaining major requirements include production Chaos vehicle/wheel/suspension physics and damage deformation; complete skeletal anatomy/fingers/facial rigs and Control Rig/Animation Blueprints; graph-based traffic with lane changes/overtaking, bus stops and robust avoidance; NavMesh/Behavior Tree pedestrian interactions; wet-road materials, puddles/splashes and thunder/lightning; licensed spatial sound assets, attenuation/zones and final mix; full mission/shop/inventory/garage/property UI; secure server-authoritative multiplayer/dedicated servers and VibePulse backend integration; LOD/World Partition/streaming/performance work; automated gameplay tests; and Windows/Android/iOS packaging and device QA. Do not mark these complete until implemented and tested. The browser game remains separate from the native UE5 deliverable.

## Native controls
- Driving: **W/S** throttle/reverse, **A/D** steering, **Space** brake, **C** exit to on-foot mode.
- Walking: **W/A/S/D** move relative to camera, mouse look, **Shift** sprint, **Space** jump, **E** or **C** enter a nearby unoccupied vehicle.
- Persistence: **F5** save; **F9** load.
- Touch driving: drag left side to steer; upper-right accelerates; lower-right brakes.
