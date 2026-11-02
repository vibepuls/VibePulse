#pragma once
#include "CoreMinimal.h"
#include "GameFramework/SaveGame.h"
#include "DhakaEconomySaveGame.generated.h"

UCLASS()
class DHAKAOPENWORLDGAME_API UDhakaEconomySaveGame : public USaveGame
{
    GENERATED_BODY()
public:
    UPROPERTY() TMap<FName,int32> Inventory;
    UPROPERTY() TArray<FName> OwnedProperties;
    UPROPERTY() int32 PlayerLevel=1;
    UPROPERTY() int64 Experience=0;
    UPROPERTY() FDateTime LastIncomeClaimUtc;
    UPROPERTY() int32 Version=2;
};
