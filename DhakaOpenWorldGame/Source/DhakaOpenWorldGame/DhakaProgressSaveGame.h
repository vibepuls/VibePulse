#pragma once
#include "CoreMinimal.h"
#include "GameFramework/SaveGame.h"
#include "DhakaMissionSubsystem.h"
#include "DhakaProgressSaveGame.generated.h"

UCLASS()
class DHAKAOPENWORLDGAME_API UDhakaProgressSaveGame : public USaveGame
{
    GENERATED_BODY()
public:
    UPROPERTY() int64 Wallet = 12500;
    UPROPERTY() TArray<FDhakaMission> Missions;
    UPROPERTY() FName ActiveMissionId = NAME_None;
    UPROPERTY() int32 Version = 1;
};
