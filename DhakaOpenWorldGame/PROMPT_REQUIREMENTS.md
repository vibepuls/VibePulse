# Dhaka Open World — Master Prompt Acceptance Matrix

This is the QA checklist for the full 17-part master prompt. A requirement is only "done" after native UE5 code compiles and is verified in-editor/on target devices. Source-only progress is not proof of a finished game.

Legend: **PARTIAL** = some source exists but the full requirement is unmet; **NOT DONE** = no verified complete implementation.

## Delivery objective
- [ ] Playable, immersive Dhaka open world inspired by GTA V.
- [ ] Native UE5 project compiles and packages for Windows and Android.
- [ ] iOS project configuration and testing where supported.
- [ ] No missing methods/dependencies/placeholders; automated tests pass.

## Part 1 — Engine and technology
- [ ] UE5 C++ gameplay framework and procedural mesh/runtime geometry.
- [ ] Chaos Vehicle Physics/Destruction, Niagara, production materials/shaders.
- [ ] Control Rig, Animation Blueprints, IK.
- [ ] AI Behavior Trees, Navigation Mesh, World Partition/Level Streaming.
- [ ] Gameplay Ability System where appropriate.
- [ ] Unreal networking, dedicated-server architecture and mobile optimization.
- [ ] Blender-compatible procedural asset pipeline.
Status: **PARTIAL** — C++ and ProceduralMeshComponent source exists; advanced integrations are not complete or validated.

## Part 2 — Procedural asset framework
- [ ] Vehicles, humans, buildings, roads, sidewalks, vendors, furniture, trees, traffic infrastructure, interiors and roadside assets.
- [ ] Configurable parameters, realistic proportions, materials, collision, LOD/performance and save/load.
- [ ] Reusable modular geometry and performance-aware batching.
Status: **PARTIAL** — city, vehicle, citizen, landmark and street-life generators exist; interiors, LODs, batching, save/load of generated assets and performance validation remain.

## Part 3 — Vehicles
- [ ] Complete exterior and interior: panels, doors/handles, windows, mirrors, lights, grille, plates, tires/rims, dashboard, seats, pedals, instruments and controls.
- [ ] Functional doors/seatbelts; suspension, wheel rotation, steering, torque, transmission, braking, tire friction, mass/weight transfer, collision and damage/deformation.
- [ ] Distinct handling profiles for sedan, hatchback, SUV, luxury, microbus, bus/coach, truck/pickup/van, emergency vehicles, motorcycles/scooters/bicycles, rickshaws, CNG, handcart and river craft.
- [ ] Color/body/interior/performance variants and authentic Bangladesh references.
Status: **PARTIAL** — configurable procedural vehicle and force-driven pawn exist; production meshes, Chaos wheel/suspension physics, functional doors/seatbelts and damage remain; the player pawn now cycles Sedan/CNG/Rickshaw/Bus/Motorcycle profiles, saves the selected type and enforces CNG/rickshaw/bus requirements for corresponding missions. source now animates visible wheel spin, switches headlights/brake lights based on time/braking, and applies weather-sensitive lateral tire-grip forces to the player vehicle.

## Part 4 — Human characters
- [ ] Complete anatomy, hands/fingers, facial geometry, eyes/brows/nose/mouth/ears, hair/facial hair and body types.
- [ ] Bangladesh clothing variants, footwear/headwear, realistic fabric fit/textures.
- [ ] Skeletal/procedural animations for walk/run/stand/turn/sit/talk/eat/shop/carry/enter/exit/drive/ride/interact, blending and IK.
Status: **PARTIAL** — modular primitive citizens and clothing-style variants exist; skeletal rigs, full anatomy, cloth, facial animation, Control Rig and IK remain.

## Part 5 — Dhaka city
- [ ] Roads/intersections/flyovers/bridges/underpasses, sidewalks, markets, homes/business districts, parks/lakes, bus/rail terminals and riverfronts.
- [ ] Distinct Old Dhaka, Gulshan, Banani, Motijheel, Dhanmondi, Mirpur, Uttara, Farmgate, Sadarghat, Jatrabari, Mohakhali and Shahbagh.
- [ ] Configurable density and streamed districts.
Status: **PARTIAL** — grid, river and district-inspired landmarks exist; accurate geographic roads, all listed areas and density-aware streaming remain.

## Part 6 — Roads and sidewalks
- [ ] Asphalt/concrete/markings, cracks, potholes, patches, speed breakers, drains/covers, uneven surfaces, barriers, signs, lights, poles/wires, construction materials/dust.
- [ ] Broken/uneven sidewalks, crossings, ramps, curbs, drainage, furniture and roadside trees.
Status: **PARTIAL** — base road grid now includes generated sidewalk slabs, curbs, random asphalt patch/pothole silhouettes and selected props; realistic broken pavement, crossings/ramps, detailed markings, drainage and routing remain.

## Part 7 — Vendors and crowded footpaths
- [ ] Tea, fuchka, chotpoti, jhalmuri, fruit/vegetable/clothing stalls, retail shops, pushcarts, tarpaulins, umbrellas, seating and cooking/shelf props.
- [ ] Natural placement, vendor/customer interaction, crowding and obstacle-aware routing.
Status: **PARTIAL** — procedural stalls/furniture and interactable cha/fuchka/jhalmuri/fruit/general-shop actors now exist; pressing E near a vendor purchases its stocked item through the economy subsystem, with transaction feedback in the HUD. Full customer NPC behavior, obstacle-aware crowd routing and richer shop menus remain.

## Part 8 — Traffic
- [ ] Road/lane graph, lane following, signals/intersections, spawn/despawn, density, lane changes/overtaking, collision avoidance, queues, bus stops, crossings, blockages and emergency vehicles.
- [ ] Road/time/density-based traffic rules and Dhaka-specific behavior.
Status: **PARTIAL** — timed signals, basic following/red-light stopping, configurable randomized turns, and differentiated procedural car/bus/truck/CNG/motorcycle/rickshaw/emergency silhouettes with wheel components exist in source. Lane offsets, flashing emergency-light components and distant-traffic recycling around the player are now present; a full graph-based route planner, lane changes/overtaking, intersection reservations, emergency priority behavior and robust avoidance remain.

## Part 9 — Pedestrian AI/crowds
- [ ] Sidewalk walking, crossing, obstacle/vendor/vehicle avoidance, gathering, bus-stop waiting, boarding/exiting, shopping, talking and reactions to weather/events/player.
- [ ] Personality profiles, distance-based updates and low-detail distant crowds.
Status: **PARTIAL** — simple walkers/local wanderers now use swept collision checks to sidestep or briefly wait around blocked paths; Behavior Tree/NavMesh routing, crossing logic, boarding and personality remain; a distance-based tick-rate/visual LOD is now present in source but needs device profiling.

## Part 10 — Player gameplay
- [ ] First-/third-person movement, walk/run/jump/sit/interact, enter/exit/drive/switch vehicles.
- [ ] Customization, inventory, currency, missions, shops, garages, property, save/load and progression.
Status: **PARTIAL** — movement/driving/camera, wallet and SaveGame foundations exist. Mission subsystem now has destination-radius completion, timed objectives, failure state and expanded exploration/taxi/rickshaw/bus/delivery/race/property/daily/weekly entries; a full mission map/menu, vehicle-type enforcement, item-use effects, garage/repair UI and comprehensive progression remain; property signs now allow nearby purchases and P claims eligible daily rent. a basic native HUD now displays wallet, active objective, destination distance and timer, a pulsing world-space destination beacon marks the current target, and wallet/mission state has a SaveGame slot implementation.

## Part 11 — Weather/environment
- [ ] Day/night, sunrise/sunset, dynamic light, rain/heavy rain/monsoon/fog, wet roads/puddles/splashes, shadows, streetlights/headlights/reflections.
- [ ] Weather affects visibility, handling, pedestrian behavior and visuals.
Status: **PARTIAL** — time-of-day lighting/fog and save/restore of selected weather/time exist; a procedural instanced-rain actor is connected to Rain/Monsoon intensity in source; vehicle steering/braking grip and pedestrian walking pace respond to weather, and vehicle headlights/brake lights react to time/braking. Niagara-quality rain, reflective wet-road materials, water splashes, thunder/lightning and visibility gameplay effects remain; a procedural puddle-instance layer now appears during rain/monsoon.

## Part 12 — Sound
- [ ] Engines, horns, rickshaw bells, motorcycles, buses, traffic, pedestrians/vendors/markets, construction, rain/thunder, river/boats and indoor/outdoor ambience.
- [ ] Spatial audio, attenuation, zones and original/licensed assets.
Status: **PARTIAL** — a native audio director exposes assignable loops for city traffic, market, rain, riverfront and player engine plus horn/rickshaw-bell/vendor one-shots and a rain toggle. Original/licensed audio assets are not bundled or assigned; category-specific vehicle audio, thunder/construction/boat sounds, spatial attenuation and mix validation remain; market loops are now gated by district proximity and successful vendor purchases trigger the configurable vendor-call event.

## Part 13 — Missions/activities
- [ ] Taxi, rickshaw, bus, delivery, races, exploration, vehicle collection, business/property, daily/weekly challenges and social activities.
- [ ] Objectives, rewards, progression and saved state.
Status: **PARTIAL** — timed destination missions and wallet rewards are implemented in source; the economy subsystem adds inventory, shops, property purchase/income and XP progression APIs; completing a mission awards XP as well as wallet currency; timed mission progress is saved periodically and mission switching no longer automatically fails the previous mission. Interactive street vendors and district property terminals support nearby purchases; P claims eligible daily property income. A native HUD mission list now starts missions with number keys 1–9/0; a full mission map, vehicle requirements, business simulation, garage/repair UI, and the full activity set remain.

## Part 14 — Multiplayer/VibePulse
- [ ] Sessions, profiles, friends, shared city, racing, co-op, sync, leaderboards, achievements, gameplay sharing, events/community challenges.
- [ ] Secure authentication, statistics, server-authoritative progression and anti-cheat.
Status: **NOT DONE for native UE5** — browser backend APIs do not automatically provide UE networking or a dedicated server.

## Part 15 — Mobile/PC
- [ ] Android/iOS touch joystick, driving/camera controls, graphics settings, memory/performance optimization and LOD/crowd/traffic scaling.
- [ ] Windows keyboard/mouse/controller, resolution/graphics/draw-distance settings.
- [ ] Playable builds tested on supported devices.
Status: **PARTIAL** — keyboard/mouse/controller mappings, touch steering/throttle/brake zones, right-side camera drag and platform-aware traffic/crowd caps exist; graphics settings UI, full scalability, iOS setup and packaged device QA remain; F6/F7 provide native weather/time cycling controls for gameplay testing.

## Part 16 — Project output
- [ ] Complete connected C++ source for world, traffic, pedestrian, missions, UI, input, multiplayer, save/audio/material/platform/backend systems.
- [ ] No missing dependencies or placeholders; automated tests and packaging instructions.
Status: **PARTIAL** — source/build instructions and a lightweight Python source-sanity checker exist, with mission HUD/persistence, differentiated traffic, audio routing and procedural rain/puddle additions; no successful UE5 compile, automated gameplay test or packaged build has been verified.

## Part 17 — Final delivery
- [ ] Open, compile, test and package in UE5.
- [ ] Document third-party assets, SDKs, services and licenses.
- [ ] Verify realistic Dhaka experience, PC/mobile support and VibePulse integration.
Status: **NOT DONE** — only mark complete after actual UE5 build, playtest and platform package verification.
