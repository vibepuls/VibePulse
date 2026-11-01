using UnrealBuildTool;
public class DhakaOpenWorldGame : ModuleRules
{
    public DhakaOpenWorldGame(ReadOnlyTargetRules Target) : base(Target)
    {
        PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;
        PublicDependencyModuleNames.AddRange(new string[] {
            "Core", "CoreUObject", "Engine", "InputCore", "AIModule",
            "NavigationSystem", "ProceduralMeshComponent", "UMG", "Slate", "SlateCore"
        });
    }
}
