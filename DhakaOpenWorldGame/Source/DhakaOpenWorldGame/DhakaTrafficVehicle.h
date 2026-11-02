#pragma once
#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DhakaTrafficVehicle.generated.h"

UENUM(BlueprintType)
enum class EDhakaTrafficVehicleType : uint8 { Car, Bus, Truck, CNG, Motorcycle, Rickshaw, Emergency };

UCLASS()
class DHAKAOPENWORLDGAME_API ADhakaTrafficVehicle : public AActor
{
    GENERATED_BODY()
public:
    ADhakaTrafficVehicle();
    virtual void Tick(float DeltaSeconds) override;
    UPROPERTY(VisibleAnywhere) TObjectPtr<class UBoxComponent> TrafficRoot;
    UPROPERTY(VisibleAnywhere) TObjectPtr<class UStaticMeshComponent> Body;
    UPROPERTY(VisibleAnywhere) TObjectPtr<class UStaticMeshComponent> WheelFrontLeft;
    UPROPERTY(VisibleAnywhere) TObjectPtr<class UStaticMeshComponent> WheelFrontRight;
    UPROPERTY(VisibleAnywhere) TObjectPtr<class UStaticMeshComponent> WheelRearLeft;
    UPROPERTY(VisibleAnywhere) TObjectPtr<class UStaticMeshComponent> WheelRearRight;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Traffic|Vehicle Type") EDhakaTrafficVehicleType VehicleType = EDhakaTrafficVehicleType::Car;
    UFUNCTION(BlueprintCallable, Category="Traffic|Vehicle Type") void ConfigureVehicleType(EDhakaTrafficVehicleType NewType);
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Traffic") FVector RouteDirection = FVector(1,0,0);
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Traffic") float CruiseSpeed = 650.f;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Traffic") float AccelerationRate = 220.f;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Traffic") float LaneOffset = 0.f;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Traffic") float BrakeDistance = 600.f;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Traffic") bool bYieldToPlayer = true;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Traffic", meta=(ClampMin="0",ClampMax="1")) float TurnChance = 0.18f;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Traffic") bool bAllowTurns = true;
protected:
    virtual void BeginPlay() override;
private:
    float CurrentSpeed = 0.f;
    float AIUpdateTimer = 0.f;
    bool bRedSignalAhead = false;
    float CachedFollowingSpeedLimit = 650.f;
    int64 LastIntersectionKey = MIN_int64;
};
