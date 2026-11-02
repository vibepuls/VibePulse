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

print(f"Checked {checked} C++ header/source files.")
if errors:
    print(f"FAILED: {len(errors)} source sanity issue(s):")
    for error in errors:
        print(f" - {error}")
    sys.exit(1)
print("PASS: lightweight source sanity checks only. This does NOT replace UnrealHeaderTool, compilation, editor playtesting, or packaging.")
