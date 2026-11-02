#pragma once
#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DhakaPedestrian.generated.h"

UENUM(BlueprintType)
enum class EDhakaPedestrianState : uint8 { Walk, Wait, Cross, Shop, Talk, BoardVehicle };

UCLASS()
class DHAKAOPENWORLDGAME_API ADhakaPedestrian : public AActor
{
    GENERATED_BODY()
public:
    ADhakaPedestrian();
    virtual void BeginPlay() override;
    virtual void Tick(float DeltaSeconds) override;
    void ReactToVehicleImpact(const FVector& VehicleForward,float Severity);
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) TObjectPtr<class USceneComponent> Root;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) TObjectPtr<class UCapsuleComponent> CollisionCapsule;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) TObjectPtr<class UStaticMeshComponent> Torso;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) TObjectPtr<class UStaticMeshComponent> Head;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) TObjectPtr<class UStaticMeshComponent> LeftLeg;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) TObjectPtr<class UStaticMeshComponent> RightLeg;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) TObjectPtr<class UStaticMeshComponent> LeftArm;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) TObjectPtr<class UStaticMeshComponent> RightArm;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) TObjectPtr<class UStaticMeshComponent> Hair;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) TObjectPtr<class UStaticMeshComponent> LeftEye;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) TObjectPtr<class UStaticMeshComponent> RightEye;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) TObjectPtr<class UStaticMeshComponent> Nose;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) TObjectPtr<class UStaticMeshComponent> Mouth;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) TObjectPtr<class UStaticMeshComponent> LeftHand;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) TObjectPtr<class UStaticMeshComponent> RightHand;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) TObjectPtr<class UStaticMeshComponent> LeftFoot;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) TObjectPtr<class UStaticMeshComponent> RightFoot;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Crowd") EDhakaPedestrianState State = EDhakaPedestrianState::Walk;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Crowd") float WalkSpeed = 150.f;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Crowd") FVector Destination = FVector::ZeroVector;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Crowd") float ArrivalRadius = 120.f;
private:
    float WaitRemaining = 0.f;
    float WalkPhase = 0.f;
    float WeatherRefreshTimer = 0.f;
    float CrowdLodRefreshTimer = 0.f;
    bool bVisualsHiddenForDistance = false;
    float WeatherWalkMultiplier = 1.f;
    float BaseWalkSpeed = 150.f;
    float FleeRemaining = 0.f;
    bool bWalkingToCrosswalk = false;
    bool bCrossingRoad = false;
    UPROPERTY() TObjectPtr<class ADhakaWeatherController> WeatherController;
};
