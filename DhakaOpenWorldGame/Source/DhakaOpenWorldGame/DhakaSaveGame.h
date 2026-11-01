#pragma once
#include "CoreMinimal.h"
#include "GameFramework/SaveGame.h"
#include "DhakaSaveGame.generated.h"

UCLASS()
class DHAKAOPENWORLDGAME_API UDhakaSaveGame : public USaveGame
{
    GENERATED_BODY()
public:
    UPROPERTY(BlueprintReadWrite) FVector PlayerLocation = FVector(-520,-520,100);
    UPROPERTY(BlueprintReadWrite) FRotator PlayerRotation = FRotator::ZeroRotator;
    UPROPERTY(BlueprintReadWrite) float TravelDistanceKm = 0.f;
    UPROPERTY(BlueprintReadWrite) int64 Wallet = 12500;
    UPROPERTY(BlueprintReadWrite) TArray<FName> CompletedMissionIds;
    UPROPERTY(BlueprintReadWrite) FString Weather = TEXT("Clear");
    UPROPERTY(BlueprintReadWrite) float DayTimeHours = 14.f;
};
