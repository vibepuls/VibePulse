#pragma once
#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DhakaRainEffect.generated.h"

UCLASS()
class DHAKAOPENWORLDGAME_API ADhakaRainEffect : public AActor
{
    GENERATED_BODY()
public:
    ADhakaRainEffect();
    virtual void BeginPlay() override;
    virtual void Tick(float DeltaSeconds) override;
    UFUNCTION(BlueprintCallable) void SetRainIntensity(float NewIntensity);
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Rain", meta=(ClampMin="0",ClampMax="1")) float Intensity=0.f;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Rain", meta=(ClampMin="100",ClampMax="5000")) int32 MaximumDrops=700;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Rain") float Radius=1800.f;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Rain") float Height=1500.f;
private:
    UPROPERTY(VisibleAnywhere) TObjectPtr<class USceneComponent> SceneRoot;
    UPROPERTY(VisibleAnywhere) TObjectPtr<class UInstancedStaticMeshComponent> Drops;
    TArray<FVector> LocalDropPositions;
    TArray<float> DropSpeeds;
    void RebuildRain();
};
