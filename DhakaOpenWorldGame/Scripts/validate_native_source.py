#!/usr/bin/env python3
"""Lightweight source sanity checks for DhakaOpenWorldGame (not an Unreal build)."""
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "Source"
errors = []
checked = 0

def strip_comments_and_strings(text: str) -> str:
    # Keep newlines so diagnostic locations remain roughly useful.
    text = re.sub(r"/\*.*?\*/", lambda m: "\n" * m.group(0).count("\n"), text, flags=re.S)
    text = re.sub(r"//[^\n]*", "", text)
    text = re.sub(r'"(?:\\.|[^"\\])*"', '""', text)
    text = re.sub(r"'(?:\\.|[^'\\])*'", "''", text)
    return text

for path in sorted(SOURCE.rglob("*")):
    if path.suffix not in {".h", ".cpp"}:
        continue
    checked += 1
    raw = path.read_text(encoding="utf-8", errors="replace")
    rel = path.relative_to(ROOT)
    if "\\n" in raw:
        errors.append(f"{rel}: contains literal backslash-n text")
    includes = re.findall(r'^\s*#include\s+"([^"]+)"', raw, flags=re.M)
    duplicates = sorted({name for name in includes if includes.count(name) > 1})
    if duplicates:
        errors.append(f"{rel}: duplicate quoted includes: {', '.join(duplicates)}")
    generated = [name for name in includes if name.endswith(".generated.h")]
    if path.suffix == ".h" and re.search(r"\b(UCLASS|USTRUCT|UENUM|UINTERFACE)\b", raw):
        if len(generated) != 1:
            errors.append(f"{rel}: reflected header must include exactly one .generated.h, found {len(generated)}")
        elif includes[-1] != generated[0]:
            errors.append(f"{rel}: .generated.h must be the final include")
    for name in includes:
        if name.endswith(".generated.h") or "/" in name or "\\" in name:
            continue
        candidates = [path.parent / name, SOURCE / "DhakaOpenWorldGame" / name, SOURCE / name]
        if not any(candidate.is_file() for candidate in candidates) and name.startswith("Dhaka"):
            errors.append(f"{rel}: local project include not found in source tree: {name}")
    cleaned = strip_comments_and_strings(raw)
    depth = 0
    for char in cleaned:
        if char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth < 0:
                errors.append(f"{rel}: closing brace appears before matching opening brace")
                break
    if depth != 0:
        errors.append(f"{rel}: unbalanced braces (final depth {depth})")

# Cross-file catalog/input checks catch common wiring regressions before a UE build.
MODULE = SOURCE / "DhakaOpenWorldGame"
def require_tokens(relative_path: str, tokens: list[str]) -> None:
    path = ROOT / relative_path
    if not path.is_file():
        errors.append(f"{relative_path}: required project file is missing")
        return
    source = path.read_text(encoding="utf-8", errors="replace")
    for token in tokens:
        if token not in source:
            errors.append(f"{relative_path}: required integration token is missing: {token}")

require_tokens("Source/DhakaOpenWorldGame/DhakaMissionSubsystem.cpp", [
    '"explore_lalbagh"', '"taxi_gulshan"', '"market_delivery"', '"bus_route"',
    '"rickshaw_neighborhood"', "StartMissionBySlot", "ActiveMissionTimeRemaining"
])
require_tokens("Source/DhakaOpenWorldGame/DhakaEconomySubsystem.cpp", [
    '"tea_cup"', '"fuchka_plate"', '"jhalmuri_packet"', '"fruit_bag"',
    '"old_dhaka_shop"', '"dhanmondi_flat"', '"uttara_garage"', '"gulshan_office"',
    "PurchaseItem", "PurchaseProperty", "ClaimPropertyIncome", "UseItem", "first_aid", "fuel_can", "repair_kit"
])
require_tokens("Source/DhakaOpenWorldGame/DhakaVendorStall.cpp", [
    '"tea_cup"', '"fuchka_plate"', '"jhalmuri_packet"', '"fruit_bag"', '"water_bottle"'
])
require_tokens("Source/DhakaOpenWorldGame/DhakaGameMode.cpp", [
    "DhakaVendorStall", "DhakaPropertyTerminal", "TrafficCount", "PedestrianCount",
    '"old_dhaka_shop"', '"dhanmondi_flat"', '"uttara_garage"', '"gulshan_office"'
])
require_tokens("Source/DhakaOpenWorldGame/DhakaVehiclePawn.h", [
    "EDhakaPlayerVehicleType", "Sedan", "CNG", "Rickshaw", "Bus", "Motorcycle", "ConfigureVehicleType"
])
require_tokens("Source/DhakaOpenWorldGame/DhakaMissionSubsystem.cpp", [
    "EDhakaPlayerVehicleType::CNG", "EDhakaPlayerVehicleType::Rickshaw", "EDhakaPlayerVehicleType::Bus"
])
require_tokens("Config/DefaultInput.ini", [
    'AxisName="MissionSlot"', 'ActionName="CycleVehicleType"', 'ActionName="BuyProperty"',
    'ActionName="ClaimRent"', 'ActionName="UseFirstAid"', 'ActionName="UseFood"', 'ActionName="UseFuel"', 'ActionName="UseRepair"', 'ActionName="Horn"', 'ActionName="RickshawBell"',
    'ActionName="CycleWeather"', 'ActionName="AdvanceTime"'
])

require_tokens("Source/DhakaOpenWorldGame/DhakaWeatherController.cpp", [
    "CycleWeather", "AdvanceTimeOfDay", "SetWeather", "SetTimeOfDay", "LightningCountdown", "LightningFlashRemaining", "PlayThunder"
])
require_tokens("Source/DhakaOpenWorldGame/DhakaVehiclePawn.cpp", [
    "EDhakaPlayerVehicleType::CNG", "EDhakaPlayerVehicleType::Rickshaw",
    "EDhakaPlayerVehicleType::Bus", "bTouchCameraActive", "SetBoxExtent", "FuelPercent", "ConditionPercent", "HandleVehicleHit", "EffectiveGrip", "ConditionSpeedLimit"
])

require_tokens("Source/DhakaOpenWorldGame/DhakaPlayerCharacter.cpp", [
    "Stamina=FMath::Max", "void ADhakaPlayerCharacter::StartSprint(){if(Stamina>1.f)", "UseFirstAidInput", "UseFoodInput", "UseFuelInput", "UseRepairInput", "BindTouch", "HandleTouchPressed", "TouchMoveForward", "TakeDamage"
])
require_tokens("Source/DhakaOpenWorldGame/DhakaVehiclePawn.cpp", [
    "FuelPercent", "ConditionPercent", "HandleVehicleHit", "UseFuelInput", "UseRepairInput", "VehicleFuelPercent", "VehicleConditionPercent"
])
require_tokens("Source/DhakaOpenWorldGame/DhakaOpenWorldHUD.cpp", [
    "HEALTH", "STAMINA", "FUEL", "VEHICLE CONDITION", "F1: First Aid", "BAG", "Mobile: drag left side"
])

require_tokens("Source/DhakaOpenWorldGame/DhakaPedestrian.cpp", [
    "ReactToVehicleImpact", "FleeRemaining", "BaseWalkSpeed"
])

require_tokens("Source/DhakaOpenWorldGame/DhakaTrafficVehicle.cpp", [
    "bBlockedAhead", "TargetLaneShift", "CandidateShift", "CurrentLaneShift", "IsRedForDirection",
    "ADhakaPedestrian", "YieldDistance", "SafeSpeed", "ReactToVehicleImpact"
])
require_tokens("Source/DhakaOpenWorldGame/DhakaTrafficVehicle.cpp", [
    "EDhakaTrafficVehicleType::Emergency", "AheadOfEmergency", "YieldFactor", "Distance<330.f"
])

require_tokens("Source/DhakaOpenWorldGame/DhakaCityGenerator.cpp", [
    "Zebra crossings", "Drainage channels", "CrossX", "RiverHalfWidth"
])

require_tokens("Source/DhakaOpenWorldGame/DhakaEconomyWidget.cpp", [
    "PurchaseItem", "SellItem", "PurchaseProperty", "ClaimPropertyIncome", "WALLET", "UseItem", "InventoryLabel", "UseFood", "UseFuel", "UseRepair", "SellWater", "SellSnack", "SellTea", "SellFuchka", "SellJhalmuri", "SellFruit", "MissionPicker", "OnMissionSelected", "NextVehicleType", "PaintVehicleRed", "PaintVehicleBlue", "PaintVehicleGreen"
])

# Prevent duplicate runtime controls from silently stacking in the native economy panel.
widget_path = MODULE / "DhakaEconomyWidget.cpp"
if widget_path.is_file():
    widget_source = widget_path.read_text(encoding="utf-8", errors="replace")
    for label, token in [
        ("inventory label construction", 'InventoryLabel=WidgetTree->ConstructWidget<UTextBlock>(UTextBlock::StaticClass(),TEXT("InventoryLabel"))'),
        ("food-use button", 'AddActionButton(Actions,TEXT("Use Food/Drink  |  F2"),Button)'),
        ("fuel-use button", 'AddActionButton(Actions,TEXT("Use Fuel Can  |  F3"),Button)'),
        ("repair-use button", 'AddActionButton(Actions,TEXT("Use Repair Kit  |  F4"),Button)'),
    ]:
        count = widget_source.count(token)
        if count != 1:
            errors.append(f"Source/DhakaOpenWorldGame/DhakaEconomyWidget.cpp: expected one {label}, found {count}")

require_tokens("Source/DhakaOpenWorldGame/DhakaOpenWorldHUD.cpp", [
    "CreateWidget<UDhakaEconomyWidget>", "SetInputMode(FInputModeGameAndUI())"
])

require_tokens("Source/DhakaOpenWorldGame/DhakaAudioDirector.cpp", [
    "EmergencySirenLoop", "bEmergencyNearby", "PlayThunder"
])


print(f"Checked {checked} C++ header/source files and cross-file gameplay wiring.")
if errors:
    print(f"FAILED: {len(errors)} source sanity issue(s):")
    for error in errors:
        print(f" - {error}")
    sys.exit(1)
print("PASS: lightweight source sanity checks only. This does NOT replace UnrealHeaderTool, compilation, editor playtesting, or packaging.")
