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
    virtual void Tick(float DeltaSeconds) override;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) TObjectPtr<class USceneComponent> Root;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) TObjectPtr<class UStaticMeshComponent> Torso;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) TObjectPtr<class UStaticMeshComponent> Head;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) TObjectPtr<class UStaticMeshComponent> LeftLeg;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) TObjectPtr<class UStaticMeshComponent> RightLeg;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Crowd") EDhakaPedestrianState State = EDhakaPedestrianState::Walk;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Crowd") float WalkSpeed = 150.f;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Crowd") FVector Destination = FVector::ZeroVector;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Crowd") float ArrivalRadius = 120.f;
private:
    float WaitRemaining = 0.f;
};
