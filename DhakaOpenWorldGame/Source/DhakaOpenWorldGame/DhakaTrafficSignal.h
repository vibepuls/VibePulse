#pragma once
#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DhakaTrafficSignal.generated.h"

class USceneComponent;
class UStaticMeshComponent;

UENUM(BlueprintType)
enum class EDhakaSignalPhase : uint8 { MainGreen, MainYellow, CrossGreen };

/** Simple timed intersection signal; main axis is editable for the road direction. */
UCLASS(BlueprintType)
class DHAKAOPENWORLDGAME_API ADhakaTrafficSignal : public AActor
{
    GENERATED_BODY()
public:
    ADhakaTrafficSignal();
    virtual void Tick(float DeltaSeconds) override;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Traffic Signal") FVector MainRoadDirection=FVector(1,0,0);
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Traffic Signal", meta=(ClampMin="5",ClampMax="90")) float MainGreenSeconds=18.f;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Traffic Signal", meta=(ClampMin="2",ClampMax="10")) float YellowSeconds=3.f;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Traffic Signal", meta=(ClampMin="5",ClampMax="90")) float CrossGreenSeconds=18.f;
    UPROPERTY(BlueprintReadOnly, Category="Traffic Signal") EDhakaSignalPhase Phase=EDhakaSignalPhase::MainGreen;
    UFUNCTION(BlueprintPure, Category="Traffic Signal") bool IsRedForDirection(FVector TravelDirection) const;
private:
    UPROPERTY(VisibleAnywhere) TObjectPtr<USceneComponent> SceneRoot;
    UPROPERTY(VisibleAnywhere) TObjectPtr<UStaticMeshComponent> Pole;
    UPROPERTY(VisibleAnywhere) TObjectPtr<UStaticMeshComponent> Head;
    UPROPERTY(VisibleAnywhere) TObjectPtr<UStaticMeshComponent> RedLamp;
    UPROPERTY(VisibleAnywhere) TObjectPtr<UStaticMeshComponent> YellowLamp;
    UPROPERTY(VisibleAnywhere) TObjectPtr<UStaticMeshComponent> GreenLamp;
    float PhaseElapsed=0.f;
    void ApplyLampMaterials();
};
