#include "DhakaCharacterAnimInstance.h"
#include "DhakaPlayerCharacter.h"
#include "GameFramework/CharacterMovementComponent.h"

void UDhakaCharacterAnimInstance::NativeInitializeAnimation()
{
    Super::NativeInitializeAnimation();
    CachedCharacter=Cast<ADhakaPlayerCharacter>(TryGetPawnOwner());
}
void UDhakaCharacterAnimInstance::NativeUpdateAnimation(float DeltaSeconds)
{
    Super::NativeUpdateAnimation(DeltaSeconds);
    if(!CachedCharacter) CachedCharacter=Cast<ADhakaPlayerCharacter>(TryGetPawnOwner());
    if(!CachedCharacter) { GroundSpeed=0.f; Direction=0.f; VerticalSpeed=0.f; bIsMoving=false; bIsInAir=false; bIsSprinting=false; return; }
    const FVector Velocity=CachedCharacter->GetVelocity();
    GroundSpeed=Velocity.Size2D();
    Direction=CalculateDirection(Velocity,CachedCharacter->GetActorRotation());
    VerticalSpeed=Velocity.Z;
    bIsMoving=GroundSpeed>8.f;
    if(const UCharacterMovementComponent* Move=CachedCharacter->GetCharacterMovement())
    {
        bIsInAir=Move->IsFalling();
        bIsSprinting=Move->MaxWalkSpeed>500.f && bIsMoving;
    }
}
