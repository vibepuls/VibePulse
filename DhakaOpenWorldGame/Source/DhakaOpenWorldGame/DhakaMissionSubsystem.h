#pragma once
#include "CoreMinimal.h"
#include "TimerManager.h"
#include "Subsystems/GameInstanceSubsystem.h"
#include "DhakaMissionSubsystem.generated.h"

UENUM(BlueprintType)
enum class EDhakaMissionType : uint8
{
    Exploration, Taxi, Rickshaw, BusRoute, Delivery, Race, Business, Property, DailyChallenge, WeeklyChallenge
};

USTRUCT(BlueprintType)
struct FDhakaMission
{
    GENERATED_BODY()
    UPROPERTY(EditAnywhere, BlueprintReadWrite) FName Id = NAME_None;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) FText Title;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) FText Description;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) int32 Reward = 0;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) bool bCompleted = false;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) bool bFailed = false;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) FVector Target = FVector::ZeroVector;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) EDhakaMissionType Type = EDhakaMissionType::Exploration;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, meta=(ClampMin="100")) float TargetRadius = 450.f;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, meta=(ClampMin="0")) float TimeLimitSeconds = 0.f;
};

UCLASS()
class DHAKAOPENWORLDGAME_API UDhakaMissionSubsystem : public UGameInstanceSubsystem
{
    GENERATED_BODY()
public:
    UPROPERTY(BlueprintReadOnly) TArray<FDhakaMission> Missions;
    UPROPERTY(BlueprintReadOnly) int64 Wallet = 12500;
    UPROPERTY(BlueprintReadOnly) int32 ActiveMissionIndex = INDEX_NONE;
    UPROPERTY(BlueprintReadOnly) float ActiveMissionTimeRemaining = 0.f;
    UPROPERTY(BlueprintReadOnly) FString LastMissionResult;
    virtual void Initialize(FSubsystemCollectionBase& Collection) override;
    virtual void Deinitialize() override;
    UFUNCTION(BlueprintCallable) bool StartMission(FName MissionId);
    UFUNCTION(BlueprintCallable) bool CompleteActiveMission();
    UFUNCTION(BlueprintCallable) void FailActiveMission();
    UFUNCTION(BlueprintCallable) void AddWallet(int64 Amount);
    UFUNCTION(BlueprintCallable) bool SaveProgress();
    UFUNCTION(BlueprintCallable) bool LoadProgress();
    UFUNCTION(BlueprintCallable) void EnsureMissionMonitor();
private:
    FTimerHandle MissionUpdateTimer;
    float MissionAutosaveTimer = 0.f;
    void UpdateActiveMission();
    void StartMissionMonitor();
};