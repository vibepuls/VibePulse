#pragma once

#include "CoreMinimal.h"
#include "Animation/AnimInstance.h"
#include "DhakaCharacterAnimInstance.generated.h"

/** Locomotion state exported to ABP_PlayerDhaka's state machine and blend spaces. */
UCLASS(Blueprintable, Transient)
class DHAKAOPENWORLDGAME_API UDhakaCharacterAnimInstance : public UAnimInstance
{
    GENERATED_BODY()
public:
    virtual void NativeInitializeAnimation() override;
    virtual void NativeUpdateAnimation(float DeltaSeconds) override;

    UPROPERTY(BlueprintReadOnly, Category="Locomotion") float GroundSpeed=0.f;
    UPROPERTY(BlueprintReadOnly, Category="Locomotion") float Direction=0.f;
    UPROPERTY(BlueprintReadOnly, Category="Locomotion") float VerticalSpeed=0.f;
    UPROPERTY(BlueprintReadOnly, Category="Locomotion") bool bIsMoving=false;
    UPROPERTY(BlueprintReadOnly, Category="Locomotion") bool bIsInAir=false;
    UPROPERTY(BlueprintReadOnly, Category="Locomotion") bool bIsSprinting=false;

private:
    UPROPERTY(Transient) TObjectPtr<class ADhakaPlayerCharacter> CachedCharacter;
};
