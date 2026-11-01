#pragma once
#include "CoreMinimal.h"
#include "GameFramework/GameModeBase.h"
#include "DhakaGameMode.generated.h"

UCLASS()
class DHAKAOPENWORLDGAME_API ADhakaGameMode : public AGameModeBase
{
    GENERATED_BODY()
public:
    ADhakaGameMode();
    virtual void BeginPlay() override;
    UPROPERTY(EditDefaultsOnly, Category="World") TSubclassOf<class ADhakaCityGenerator> CityGeneratorClass;
    UPROPERTY(EditDefaultsOnly, Category="World") TSubclassOf<class ADhakaVehiclePawn> VehiclePawnClass;
};
