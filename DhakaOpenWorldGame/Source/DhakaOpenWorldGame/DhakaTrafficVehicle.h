#pragma once
#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DhakaTrafficVehicle.generated.h"

UCLASS()
class DHAKAOPENWORLDGAME_API ADhakaTrafficVehicle : public AActor
{
    GENERATED_BODY()
public:
    ADhakaTrafficVehicle();
    virtual void Tick(float DeltaSeconds) override;
    UPROPERTY(VisibleAnywhere) TObjectPtr<class UStaticMeshComponent> Body;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Traffic") FVector RouteDirection = FVector(1,0,0);
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Traffic") float CruiseSpeed = 650.f;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Traffic") float AccelerationRate = 220.f;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Traffic") float LaneOffset = 0.f;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Traffic") float BrakeDistance = 600.f;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Traffic") bool bYieldToPlayer = true;
protected:
    virtual void BeginPlay() override;
private:
    float CurrentSpeed = 0.f;
    float AIUpdateTimer = 0.f;
    bool bRedSignalAhead = false;
    float CachedFollowingSpeedLimit = 650.f;
};
