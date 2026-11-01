#pragma once
#include "CoreMinimal.h"
#include "Subsystems/GameInstanceSubsystem.h"
#include "DhakaMissionSubsystem.generated.h"

USTRUCT(BlueprintType)
struct FDhakaMission
{
    GENERATED_BODY()
    UPROPERTY(EditAnywhere, BlueprintReadWrite) FName Id = NAME_None;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) FText Title;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) FText Description;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) int32 Reward = 0;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) bool bCompleted = false;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) FVector Target = FVector::ZeroVector;
};

UCLASS()
class DHAKAOPENWORLDGAME_API UDhakaMissionSubsystem : public UGameInstanceSubsystem
{
    GENERATED_BODY()
public:
    UPROPERTY(BlueprintReadOnly) TArray<FDhakaMission> Missions;
    UPROPERTY(BlueprintReadOnly) int64 Wallet = 12500;
    UPROPERTY(BlueprintReadOnly) int32 ActiveMissionIndex = INDEX_NONE;
    virtual void Initialize(FSubsystemCollectionBase& Collection) override;
    UFUNCTION(BlueprintCallable) bool StartMission(FName MissionId);
    UFUNCTION(BlueprintCallable) bool CompleteActiveMission();
    UFUNCTION(BlueprintCallable) void AddWallet(int64 Amount);
};
