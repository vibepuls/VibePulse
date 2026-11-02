#pragma once
#include "CoreMinimal.h"
#include "GameFramework/HUD.h"
#include "DhakaOpenWorldHUD.generated.h"

/** Lightweight native HUD for wallet, active destination mission, and mission timer. */
UCLASS()
class DHAKAOPENWORLDGAME_API ADhakaOpenWorldHUD : public AHUD
{
    GENERATED_BODY()
public:
    virtual void DrawHUD() override;
};
