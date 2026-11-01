# Dhaka Open World — Unreal Engine 5 source project

This folder contains the native UE5/C++ project scaffold alongside the VibePulse browser game. The web game at `/dhaka-drive` remains the currently integrated play target; this native project is a separate build target and does not replace or break the existing React application.

## Included native gameplay source
- Procedural city actor with configurable grid, generated roads, building blocks, shopfront props, and overhead utility-wire silhouettes.
- Physics-driven vehicle pawn with throttle, steering, braking, chase camera and adjustable handling parameters.
- Game-instance mission subsystem with exploration, CNG taxi, delivery, bus-route, street-sprint and riverfront objectives plus reward wallet.
- SaveGame data model for location, travel distance, wallet, mission IDs, weather and time of day.
- UE5 ProceduralMeshComponent-based generated city geometry; all geometry is original and generated at runtime/editor construction.

## Open and build
1. Install Unreal Engine 5.5 and the matching C++ toolchain (Visual Studio with the Desktop development with C++ workload on Windows).
2. Open `DhakaOpenWorldGame.uproject` in Unreal Editor and allow project files to be generated.
3. Open the default Entry map or create a level and select `ADhakaGameMode`. The GameMode automatically generates the city, spawns the player vehicle, ambient traffic, pedestrian crowd and weather controller.
4. Build Development Editor first, then package Windows or Android from Unreal's Platforms menu after installing the relevant Android SDK/NDK and platform components.

## Important implementation boundary
A complete GTA V-scale production game cannot be truthfully represented as finished by adding a source scaffold. This native source provides working core classes to extend and package; advanced skeletal character art/animation, authored interiors, dedicated-server multiplayer, licensed sound/asset packs, extensive QA, and final platform packaging still require an Unreal toolchain, asset production, backend configuration and device testing. The VibePulse browser implementation remains playable while native systems are developed.

## Native controls
- Driving: **W/S** throttle/reverse, **A/D** steering, **Space** brake, **C** exit to on-foot mode.
- Walking: **W/A/S/D** move relative to camera, mouse to look, **Shift** sprint, **Space** jump, **E** or **C** enter a nearby unoccupied vehicle.
- Persistence: **F5** save location, travel distance, wallet and completed mission IDs; **F9** load.
