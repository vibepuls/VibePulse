# Dhaka Open World — Unreal Engine 5 source project

This folder contains the native UE5/C++ project scaffold alongside the VibePulse browser game. The web game at `/dhaka-drive` remains the currently integrated play target; this native project is separate and does not replace or break the existing React application.

## Included native gameplay source
- Procedural city actor with configurable grid, roads, sidewalks, curbs, asphalt patch/pothole silhouettes, buildings, shopfront props and utility-wire silhouettes.
- Physics-driven vehicle pawn with throttle, steering, braking, chase camera, weather-sensitive tire grip and switchable Sedan/CNG/Rickshaw/Bus/Motorcycle handling profiles; press **N** while driving to cycle types.
- Game-instance mission subsystem, destination markers/HUD, rewards, timed-progress autosave, mission switching and versioned SaveGame persistence; use **1–9 or 0** to start a listed mission from the native HUD.
- Four district property terminals; press **F** near a property sign to purchase an investment, and **P** to claim eligible 24-hour property income.
- Procedural district-inspired landmarks: Old Dhaka/Lalbagh, markets, Gulshan/Banani, Motijheel, Farmgate, Dhanmondi, Uttara and Sadarghat.
- Procedural vehicle generator with body shell, glazing, wheels/rims, trim and basic interior pieces; sedan, bus, motorcycle, rickshaw, CNG and boat categories.
- Procedural street-life and citizen generators, clothing-style variants, and lightweight wandering/walk-cycle motion.
- Timed traffic signals, basic traffic following/red-light stopping, randomized grid turns, lane offsets, distant-traffic recycling around the active player, and differentiated procedural car/bus/truck/CNG/motorcycle/rickshaw/emergency silhouettes with wheel components and flashing emergency lights. Ordinary traffic now slows or stops to give approaching emergency vehicles local right-of-way; this does not yet replace graph-based routing or intersection reservations.
- Platform-aware crowd/traffic caps reduce spawned agents on mobile compared with PC.
- Blueprint-callable economy subsystem for shop purchase/sale, inventory records, property ownership/income and XP progression; interactive tea/fuchka/jhalmuri/fruit/general-shop stalls can be used with **E** when standing nearby and show transaction feedback in the HUD; **F** near a property sign buys that investment and **P** claims eligible 24-hour property income.
- Procedural instanced rain and puddle instances shown during rain/monsoon; vehicle grip and pedestrian pace respond to weather; pedestrians use swept collision checks, flee briefly after vehicle impacts, and use distance-based tick-rate/visual LOD.
- Native audio director with assignable city-traffic, market, rain, riverfront and engine loops, district-proximity market zones, plus horn/rickshaw-bell/vendor one-shot events. Successful vendor purchases trigger the vendor event. No audio assets are bundled; assign original/licensed files in Unreal Editor.
- GameMode spawns city, landmarks, street-life, signals, traffic, pedestrians, weather and audio routing. Touch steering/throttle/brake zones, right-side camera drag and PC controls are present; press **F6** to cycle Clear/Smog/Rain/Monsoon/Fog and **F7** to advance the time by three hours.

## Open and build
- GitHub Actions runs the lightweight native-source sanity validator on changes to this folder; this is not a substitute for UnrealHeaderTool, a UE5 compile, playtesting, or packaging.
1. Optional source sanity check (not an Unreal build): run `python Scripts/validate_native_source.py` from this folder.
2. Install Unreal Engine 5.5 and matching C++ toolchain (Visual Studio with Desktop development with C++ on Windows).
3. Open `DhakaOpenWorldGame.uproject` in Unreal Editor and generate project files.
4. Open the Entry map or create a level and select `ADhakaGameMode`.
5. Build Development Editor, then package Windows/Android after installing required SDKs.

## Important implementation boundary
This is an active native-game rebuild, not a finished AAA-scale game. It has not yet been compiled or visually validated in UE5.5. Remaining major requirements include production Chaos vehicle/wheel/suspension physics and damage deformation; complete skeletal anatomy/fingers/facial rigs and Control Rig/Animation Blueprints; graph-based traffic with lane changes/overtaking, bus stops and robust avoidance; NavMesh/Behavior Tree pedestrian interactions; wet-road materials, puddles/splashes and thunder/lightning; licensed spatial sound assets, attenuation/zones and final mix; full mission/shop/inventory/garage/property UI; secure server-authoritative multiplayer/dedicated servers and VibePulse backend integration; LOD/World Partition/streaming/performance work; automated gameplay tests; and Windows/Android/iOS packaging and device QA. Do not mark these complete until implemented and tested. The browser game remains separate from the native UE5 deliverable.

## Native controls
- Driving: **W/S** throttle/reverse, **A/D** steering, **Space** brake, **C** exit to on-foot mode.
- Walking: **W/A/S/D** move relative to camera, mouse look, **Shift** sprint, **Space** jump, **E** or **C** enter a nearby unoccupied vehicle.
- Persistence: **F5** save; **F9** load.
- Touch driving: drag left side to steer; upper-right accelerates; lower-right brakes; drag the middle-right area to rotate the camera.
- Vehicle types: press **N** to cycle Sedan/CNG/Rickshaw/Bus/Motorcycle. Weather/time: **F6** cycles weather, **F7** advances time. Mission slots: **1–9 / 0**. Property: **F** buy near a sign, **P** claim rent. Vendors: **E** buy when nearby.
- Horn: **H**; rickshaw bell: **B** (requires sound assets assigned in the editor).
