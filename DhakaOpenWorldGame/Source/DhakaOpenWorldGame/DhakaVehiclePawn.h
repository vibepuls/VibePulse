#pragma once
#include "CoreMinimal.h"
#include "GameFramework/Pawn.h"
#include "DhakaVehiclePawn.generated.h"

UCLASS()
class DHAKAOPENWORLDGAME_API ADhakaVehiclePawn : public APawn
{
    GENERATED_BODY()
public:
    ADhakaVehiclePawn();
    virtual void Tick(float DeltaSeconds) override;
    virtual void SetupPlayerInputComponent(UInputComponent* PlayerInputComponent) override;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) class UStaticMeshComponent* Body;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) class USpringArmComponent* SpringArm;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) class UCameraComponent* Camera;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Vehicle") float Acceleration = 2400.f;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Vehicle") float MaxSpeed = 4200.f;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Vehicle") float BrakeStrength = 3600.f;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Vehicle") float SteeringRate = 68.f;
    UPROPERTY(BlueprintReadOnly) float Speed = 0.f;
    UPROPERTY(BlueprintReadWrite) FLinearColor PaintColor = FLinearColor(0.72f,0.08f,0.07f,1.f);
private:
    float ThrottleInput = 0.f;
    float SteeringInput = 0.f;
    float BrakeInput = 0.f;
    void InputThrottle(float Value);
    void InputSteer(float Value);
    void InputBrake(float Value);
};
