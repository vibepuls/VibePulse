#pragma once
#include "CoreMinimal.h"
#include "GameFramework/Pawn.h"
#include "DhakaVehiclePawn.generated.h"

UENUM(BlueprintType)
enum class EDhakaPlayerVehicleType : uint8 { Sedan, CNG, Rickshaw, Bus, Motorcycle };

UCLASS()
class DHAKAOPENWORLDGAME_API ADhakaVehiclePawn : public APawn
{
    GENERATED_BODY()
public:
    ADhakaVehiclePawn();
    virtual void Tick(float DeltaSeconds) override;
    UPROPERTY(BlueprintReadOnly, Category="Vehicle Condition", meta=(ClampMin="0",ClampMax="100")) float FuelPercent=100.f;
    UPROPERTY(BlueprintReadOnly, Category="Vehicle Condition", meta=(ClampMin="0",ClampMax="100")) float ConditionPercent=100.f;
    UFUNCTION(BlueprintCallable, Category="Vehicle Condition") void AddFuel(float Amount);
    UFUNCTION(BlueprintCallable, Category="Vehicle Condition") void RepairVehicle(float Amount);
    virtual void SetupPlayerInputComponent(UInputComponent* PlayerInputComponent) override;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) TObjectPtr<class UBoxComponent> PhysicsBody;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) TObjectPtr<class UStaticMeshComponent> Body;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) class USpringArmComponent* SpringArm;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) class UCameraComponent* Camera;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Vehicle") float Acceleration = 2400.f;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Vehicle") float MaxSpeed = 4200.f;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Vehicle") float BrakeStrength = 3600.f;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Vehicle") float SteeringRate = 68.f;
    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="Vehicle") EDhakaPlayerVehicleType VehicleType = EDhakaPlayerVehicleType::Sedan;
    UFUNCTION(BlueprintCallable, Category="Vehicle") void ConfigureVehicleType(EDhakaPlayerVehicleType NewType);
    UPROPERTY(BlueprintReadOnly) float Speed = 0.f;
    UPROPERTY(BlueprintReadOnly) float TravelDistanceKm = 0.f;
    UPROPERTY(BlueprintReadWrite) FLinearColor PaintColor = FLinearColor(0.72f,0.08f,0.07f,1.f);
    UPROPERTY(BlueprintReadOnly) bool bOccupied = true;
    void SetOccupied(bool bValue) { bOccupied=bValue; }
    void SetDriverController(class AController* Controller) { DriverController=Controller; }
    UFUNCTION(BlueprintCallable) void ToggleVehicleMode();
    UFUNCTION(BlueprintCallable) void SetPaintColor(FLinearColor NewColor);
private:
    UPROPERTY() TObjectPtr<class UMaterialInstanceDynamic> BodyMaterial;
    UPROPERTY() TObjectPtr<class AController> DriverController;
    UPROPERTY() TArray<TObjectPtr<class UStaticMeshComponent>> VisualParts;
    TArray<FVector> DefaultVisualScales;
    TArray<FVector> DefaultVisualLocations;
    float ThrottleInput = 0.f;
    float SteeringInput = 0.f;
    float BrakeInput = 0.f;
    UFUNCTION() void HandleVehicleHit(UPrimitiveComponent* HitComponent,AActor* OtherActor,UPrimitiveComponent* OtherComp,FVector NormalImpulse,const FHitResult& Hit);
    void InputThrottle(float Value);
    void InputSteer(float Value);
    void InputBrake(float Value);
    void SaveProgress();
    void LoadProgress();
    void CycleCamera();
    void PlayHornInput();
    void PlayRickshawBellInput();
    void UseFuelInput();
    void UseRepairInput();
    void CycleVehicleType();
    void CycleWeatherInput();
    void AdvanceTimeInput();
    void SelectMissionSlot(float Value);
    int32 LastMissionSlot = 0;
    void HandleTouchPressed(ETouchIndex::Type FingerIndex, FVector Location);
    void HandleTouchMoved(ETouchIndex::Type FingerIndex, FVector Location);
    void HandleTouchReleased(ETouchIndex::Type FingerIndex, FVector Location);
    void UpdateTouchControls(FVector Location);
    bool bTouchSteeringActive = false;
    bool bTouchThrottleActive = false;
    bool bTouchBrakeActive = false;
    bool bTouchCameraActive = false;
    FVector LastTouchLocation = FVector::ZeroVector;
    int32 CameraModeIndex = 0;
    float WeatherQueryTimer = 0.f;
    float CachedWeatherGrip = 1.f;
};
