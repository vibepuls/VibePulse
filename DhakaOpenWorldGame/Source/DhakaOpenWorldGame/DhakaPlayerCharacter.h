#pragma once
#include "CoreMinimal.h"
#include "GameFramework/Character.h"
#include "DhakaPlayerCharacter.generated.h"

UCLASS()
class DHAKAOPENWORLDGAME_API ADhakaPlayerCharacter : public ACharacter
{
    GENERATED_BODY()
public:
    ADhakaPlayerCharacter();
    virtual void SetupPlayerInputComponent(UInputComponent* PlayerInputComponent) override;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) TObjectPtr<class USpringArmComponent> CameraArm;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) TObjectPtr<class UCameraComponent> Camera;
    UPROPERTY(BlueprintReadOnly) TObjectPtr<class ADhakaVehiclePawn> NearbyVehicle;
    void SetNearbyVehicle(class ADhakaVehiclePawn* Vehicle) { NearbyVehicle=Vehicle; }
private:
    void MoveForward(float Value);
    void MoveRight(float Value);
    void Turn(float Value);
    void LookUp(float Value);
    void StartSprint();
    void StopSprint();
    void InteractVehicle();
    float NormalWalkSpeed = 420.f;
    float SprintSpeed = 720.f;
};
