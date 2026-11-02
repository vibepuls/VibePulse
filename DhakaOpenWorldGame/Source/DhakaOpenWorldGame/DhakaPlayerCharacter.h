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
    virtual void Tick(float DeltaSeconds) override;
    virtual float TakeDamage(float DamageAmount, FDamageEvent const& DamageEvent, AController* EventInstigator, AActor* DamageCauser) override;
    UPROPERTY(BlueprintReadOnly, Category="Player Stats", meta=(ClampMin="0",ClampMax="100")) float Health=100.f;
    UPROPERTY(BlueprintReadOnly, Category="Player Stats", meta=(ClampMin="0",ClampMax="100")) float Stamina=100.f;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) TObjectPtr<class USpringArmComponent> CameraArm;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) TObjectPtr<class UCameraComponent> Camera;
    UPROPERTY(BlueprintReadOnly) TObjectPtr<class ADhakaVehiclePawn> NearbyVehicle;
    void SetNearbyVehicle(class ADhakaVehiclePawn* Vehicle) { NearbyVehicle=Vehicle; }
private:
    UPROPERTY() TObjectPtr<class UStaticMeshComponent> ProceduralTorso;
    UPROPERTY() TObjectPtr<class UStaticMeshComponent> ProceduralHead;
    UPROPERTY() TObjectPtr<class UStaticMeshComponent> ProceduralLeftArm;
    UPROPERTY() TObjectPtr<class UStaticMeshComponent> ProceduralRightArm;
    UPROPERTY() TObjectPtr<class UStaticMeshComponent> ProceduralLeftLeg;
    UPROPERTY() TObjectPtr<class UStaticMeshComponent> ProceduralRightLeg;
    float ProceduralAnimationTime=0.f;
    void MoveForward(float Value);
    void MoveRight(float Value);
    void Turn(float Value);
    void LookUp(float Value);
    void StartSprint();
    void StopSprint();
    void InteractVehicle();
    void InteractProperty();
    void ClaimPropertyIncome();
    void SelectMissionSlot(float Value);
    void CycleWeatherInput();
    void AdvanceTimeInput();
    void CycleGraphicsQuality();
    int32 LastMissionSlot = 0;
    void StartJump();
    void StopJump();
    void CycleCamera();
    void UseFirstAidInput();
    void UseFoodInput();
    void UseFuelInput();
    void UseRepairInput();
    void HandleTouchPressed(ETouchIndex::Type FingerIndex,FVector Location);
    void HandleTouchMoved(ETouchIndex::Type FingerIndex,FVector Location);
    void HandleTouchReleased(ETouchIndex::Type FingerIndex,FVector Location);
    FVector TouchStartLocation=FVector::ZeroVector;
    FVector LastTouchLocation=FVector::ZeroVector;
    float TouchMoveForward=0.f;
    float TouchMoveRight=0.f;
    bool bTouchMoveActive=false;
    bool bTouchLookActive=false;
    bool bFirstPerson = false;
    float NormalWalkSpeed = 420.f;
    float SprintSpeed = 720.f;
};
