#pragma once
#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DhakaWetRoadEffect.generated.h"

class UInstancedStaticMeshComponent;
class ADhakaWeatherController;

UCLASS()
class DHAKAOPENWORLDGAME_API ADhakaWetRoadEffect : public AActor
{
    GENERATED_BODY()
public:
    ADhakaWetRoadEffect();
    virtual void BeginPlay() override;
    virtual void Tick(float DeltaSeconds) override;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Wet Road", meta=(ClampMin="0",ClampMax="500")) int32 PuddleCount = 120;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Wet Road") int32 RandomSeed = 2026;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Wet Road") float AreaExtent = 160000.f;
private:
    UPROPERTY(VisibleAnywhere) TObjectPtr<UInstancedStaticMeshComponent> Puddles;
    float RefreshTimer = 0.f;
    bool bPuddlesVisible = false;
    void UpdateWeatherVisibility();
};