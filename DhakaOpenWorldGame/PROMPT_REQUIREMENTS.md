# Dhaka Open World — Master Prompt Acceptance Matrix

This file is an engineering QA checklist for the user's complete 17-part master prompt. It is not a substitute for implementing or testing the game. A requirement is only "done" after the native UE5 implementation is built and verified in-editor/on target devices.

Legend: **PARTIAL** = some source exists but does not satisfy the whole requirement; **NOT DONE** = no verified complete implementation; **VERIFY** = code exists but requires UE5 compile/playtest.

## Delivery objective
- [ ] Playable, immersive Dhaka open world inspired by GTA V.
- [ ] Native Unreal Engine 5 C++ project compiles and packages for Windows and Android.
- [ ] Architecture prepared for iOS and tested where possible.
- [ ] No missing methods/dependencies/placeholders; source is connected and automated tests pass.

## Part 1 — Engine and technology
- [ ] UE5 C++ gameplay framework, Procedural Mesh / runtime mesh / Geometry Script as appropriate.
- [ ] Chaos Vehicle Physics, Chaos Destruction, Niagara, materials/shaders.
- [ ] Procedural animation, Control Rig, Animation Blueprints.
- [ ] AI, Behavior Trees, Navigation Mesh.
- [ ] World Partition and Level Streaming.
- [ ] Gameplay Ability System where appropriate.
- [ ] Unreal networking, dedicated-server architecture, mobile optimization.
- [ ] Blender-compatible procedural asset pipeline.
Status: **PARTIAL** — UE5 C++ and ProceduralMeshComponent source exists; advanced engine integrations are not yet complete or validated.

## Part 2 — Procedural asset framework
- [ ] Vehicles, human characters, buildings, roads, sidewalks, vendors, furniture, trees, traffic infrastructure, environment, interiors and roadside assets.
- [ ] Configurable parameters, realistic proportions, materials, collision, LOD/performance and save/load as appropriate.
- [ ] Reusable modular geometry, not one static box per object.
Status: **PARTIAL** — city, vehicle, citizen, landmark and street-life generators exist; interiors, LODs, save/load for generated assets and performance validation remain.

## Part 3 — Vehicles
- [ ] Exterior: body panels, hood, roof, trunk, bumpers, doors/handles, all windows, mirrors, lights, grille, plates, wheel arches, tires/rims, exhaust and accessories.
- [ ] Interior: dashboard, steering, seats, console, selector, pedals, door panels, mirrors, instrument cluster, interior lights, functional doors, seatbelts and controls.
- [ ] Physics: suspension, wheel rotation, steering, torque, transmission, braking, tire friction, mass, weight transfer, collision, damage/deformation.
- [ ] Distinct handling profiles for sedan, hatchback, SUV, luxury, microbus, city/minibus/school bus, coach, truck, pickup, covered/delivery van, ambulance, police/fire, motorcycle, scooter, bicycle, cycle/battery rickshaw, CNG, handcart, passenger boat and river launch.
- [ ] Color/body/interior/performance variants and authentic Bangladesh references.
Status: **PARTIAL** — configurable modular procedural vehicle generator and a separate force-driven vehicle pawn exist; production-grade vehicle meshes, Chaos wheel physics, functional doors/seatbelts, damage/deformation and category-specific handling are not done.

## Part 4 — Human characters
- [ ] Head, neck, torso, arms/hands/fingers, legs/feet, facial geometry, eyes/brows/nose/mouth/ears, hair/facial hair and body-type controls.
- [ ] Clothing: shirts, T-shirts, trousers, jeans, panjabi, saree, salwar kameez, school/office/traditional/casual clothing, jackets, shoes/sandals and head coverings.
- [ ] Fabric textures, wrinkles, realistic fit.
- [ ] Skeletal/procedural animations: walk/run/stand/turn/sit/talk/eat/shop/carry/enter/exit/drive/ride/interact, blending and IK.
Status: **PARTIAL** — procedural primitive citizen and clothing-style variants exist; full anatomy/fingers, cloth simulation, skeletal rigs, facial animation, Control Rig and IK are not done.

## Part 5 — Dhaka city
- [ ] Road networks, intersections, flyovers, bridges, underpasses, sidewalks, buildings, markets/shops, residential/commercial areas, parks/lakes, bus terminals, railway stations and riverfronts.
- [ ] Distinctive Old Dhaka, Gulshan, Banani, Motijheel, Dhanmondi, Mirpur, Uttara, Farmgate, Sadarghat, Jatrabari, Mohakhali and Shahbagh.
- [ ] Configurable building/road/traffic/pedestrian/environment density.
Status: **PARTIAL** — procedural grid/river/city blocks plus district-inspired landmarks exist; accurate geographic street networks, all listed areas and density-aware streaming are not complete.

## Part 6 — Roads and sidewalks
- [ ] Asphalt/concrete/markings, cracks, potholes, patches, speed breakers, drain covers/drains, uneven surfaces, barriers/signs/lights/poles/wires, construction materials and dust.
- [ ] Broken/uneven sidewalks, crossings, ramps, curbs, drainage, furniture and roadside trees.
Status: **PARTIAL** — base road grid and selected roadside props exist; realistic road surface damage, sidewalk geometry, markings and routing are incomplete.

## Part 7 — Vendors and crowded footpaths
- [ ] Tea, food, fuchka, chotpoti, jhalmuri, fruit/vegetable/clothing stalls, retail shops, push/handcarts, temporary/tarpaulin stalls, umbrellas, chairs/tables, cooking equipment and shelves.
- [ ] Natural sidewalk placement, customer/vendor interactions, crowding and pedestrian routing around obstacles.
Status: **PARTIAL** — procedural stall/furniture props exist; complete vendor interaction/economy and obstacle-aware crowd routing are not done.

## Part 8 — Traffic
- [ ] Road graph, lanes, lane following, lights/intersections, spawn/despawn, density, lane changes/overtaking, collision avoidance, congestion/queues, bus stops, crossings, blockages and emergency vehicles.
- [ ] Traffic rules vary by road, time and density; Dhaka-specific irregular behavior.
Status: **PARTIAL** — ambient vehicles move along simple directions and yield to player; lane graph, signals, realistic intersection logic, buses/emergency behaviors and robust collision avoidance are not done.

## Part 9 — Pedestrian AI/crowds
- [ ] Sidewalk walking, road crossing, vehicle/obstacle/vendor avoidance, shop gathering, bus-stop waiting, boarding/exiting, shopping, vendor interactions, talking, weather/event/player reactions.
- [ ] Personality profiles, distance-based updates and low-detail distant crowd simulation.
Status: **PARTIAL** — simple walkers, wait states and local wanderers exist; behavior-tree/navmesh interactions, boarding, personality and scalable LOD crowd system are not done.

## Part 10 — Player gameplay
- [ ] Third-/first-person movement, walking/running/jumping/sitting/interacting, enter/exit/drive/switch vehicles.
- [ ] Character customization, inventory, currency, missions, shops, garages, property, save/load and progression.
Status: **PARTIAL** — walking/driving/camera switching, basic wallet/missions and SaveGame exist; full inventory, shop/garage/property UI and robust progression are not done.

## Part 11 — Weather/environment
- [ ] Day/night, sunrise/sunset, dynamic lighting, rain/heavy rain/monsoon/fog, wet roads/puddles/splashes, shadows, streetlights/headlights/reflections.
- [ ] Weather affects visibility, vehicle handling, pedestrian behavior and visuals.
Status: **PARTIAL** — time-of-day lighting and fog density are present; rain particles, wet-road materials, puddles, splashes and gameplay effects are not done.

## Part 12 — Sound
- [ ] Engines/horns/rickshaw bells/motorcycles/buses/traffic/pedestrian/vendor/market/construction/rain/thunder/river/boats and indoor/outdoor ambience.
- [ ] Spatial audio, attenuation, zones and original/licensed assets.
Status: **NOT DONE** — no verified complete soundscape/assets.

## Part 13 — Missions/activities
- [ ] Taxi, rickshaw, bus, delivery, races, exploration, vehicle collection, business/property, daily/weekly challenges and social activities.
- [ ] Objectives, rewards, progression and save-state integration.
Status: **PARTIAL** — several basic point-to-point missions and wallet rewards exist; mission-specific vehicle requirements, timers, business/property/challenges and UI are incomplete.

## Part 14 — Multiplayer/VibePulse
- [ ] Sessions, profiles, friends, shared city, racing, co-op missions, sync, leaderboards, achievements, gameplay sharing, game events and community challenges.
- [ ] Secure authentication, statistics, server-authoritative progression and anti-cheat.
Status: **NOT DONE for native UE5** — existing browser-game backend APIs do not by themselves provide UE networking or a dedicated server.

## Part 15 — Mobile/PC
- [ ] Android/iOS touch joystick, driving/camera controls, graphics settings, performance/memory optimization, LOD/crowd/traffic scaling.
- [ ] Windows keyboard/mouse/controller, resolution/graphics/draw-distance settings.
- [ ] Tested playable builds on supported devices.
Status: **PARTIAL** — keyboard/mouse/controller mappings and basic touch driving zones exist; graphics UI, full scalability, iOS setup and packaged device QA are not done.

## Part 16 — Project output
- [ ] Complete C++ classes/source/headers, procedural generators, traffic/pedestrian/mission/UI/input/multiplayer/save/audio/material/shader/build/platform config and backend interfaces.
- [ ] Systems wired together, no empty methods/missing dependencies/placeholders.
- [ ] Automated tests and packaging instructions.
Status: **PARTIAL** — project source and build instructions exist; no successful UE5 compile, automated gameplay test run or packaged build has been verified.

## Part 17 — Final delivery
- [ ] Open, compile, test and package in UE5.
- [ ] Document third-party assets, SDKs, services and licenses.
- [ ] Confirm realistic Dhaka experience, mobile/PC support and VibePulse integration.
Status: **NOT DONE** — do not declare the game complete until all above checks pass in the actual UE5 toolchain.
