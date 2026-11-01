#include "DhakaPedestrian.h"
#include "GameFramework/CharacterMovementComponent.h"
#include "Components/CapsuleComponent.h"
#include "UObject/ConstructorHelpers.h"

ADhakaPedestrian::ADhakaPedestrian()
{
    PrimaryActorTick.bCanEverTick=true;
    GetCapsuleComponent()->InitCapsuleSize(38.f,92.f);
    GetCharacterMovement()->MaxWalkSpeed=WalkSpeed;
    GetCharacterMovement()->bOrientRotationToMovement=true;
    bUseControllerRotationYaw=false;
    static ConstructorHelpers::FObjectFinder<USkeletalMesh> Mannequin(TEXT("/Engine/EngineMeshes/SkeletalCube.SkeletalCube"));
    if(Mannequin.Succeeded()) GetMesh()->SetSkeletalMesh(Mannequin.Object);
}
void ADhakaPedestrian::Tick(float Dt)
{
    Super::Tick(Dt); if(Dt<=0.f)return;
    if(State==EDhakaPedestrianState::Wait||State==EDhakaPedestrianState::Shop||State==EDhakaPedestrianState::Talk){GetCharacterMovement()->StopMovementImmediately();return;}
    const FVector Delta=Destination-GetActorLocation();
    if(Delta.Size2D()<=ArrivalRadius){State=EDhakaPedestrianState::Wait;return;}
    GetCharacterMovement()->MaxWalkSpeed=WalkSpeed*(State==EDhakaPedestrianState::Cross?1.15f:1.f);
    AddMovementInput(Delta.GetSafeNormal2D(),1.f);
}
